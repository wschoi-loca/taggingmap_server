const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config(); // 환경 변수 로드
const TaggingMap = require('./models/taggingMap'); // 모델

const app = express();

// Cloudinary 설정 - 제공된 계정 정보 사용
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary 스토리지 설정
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'taggingmap',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
    format: async (req, file) => {
      if (file.mimetype.includes('png')) return 'png';
      if (file.mimetype.includes('jpeg') || file.mimetype.includes('jpg')) return 'jpg';
      return 'png';
    },
    public_id: (req, file) => `${Date.now()}-${uuidv4().substring(0, 8)}`
  }
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Helmet 설정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"], 
      connectSrc: ["'self'", "https://taggingmap-server.herokuapp.com", "https://taggingmap-server-bd06b783e6ac.herokuapp.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taggingMapSystem';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// 로컬 업로드 디렉토리 생성 (폴백용)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// 로컬 폴백용 스토리지 설정
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${uuidv4().substring(0, 8)}${path.extname(file.originalname)}`);
  }
});

// 업로드 처리를 위한 multer 설정
const storage = cloudinaryStorage;
const upload = multer({ storage: storage });

// 로컬 파일 서빙
app.use('/uploads', express.static(uploadsDir));

// 1. 정적 파일 서빙 (Vue 앱)
app.use(express.static(path.join(__dirname, 'taggingmap_front/dist')));

// 2. API Routes
app.post('/api/taggingMaps', upload.single('image'), async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    let eventParams = {};
    
    try {
      if (req.body.eventParams) {
        eventParams = JSON.parse(req.body.eventParams);
      } else if (req.body.jsonData) {
        eventParams = JSON.parse(req.body.jsonData);
      } else {
        console.log('No eventParams or jsonData found in request');
      }
    } catch (e) {
      console.error('JSON parsing error:', e, 'Original data:', req.body.eventParams || req.body.jsonData);
      eventParams = {};
    }
    
    let imageUrl = '';
    
    // Cloudinary 응답에서 이미지 URL 가져오기
    if (req.file) {
      console.log('Uploaded file info:', req.file);
      imageUrl = req.file.path || ''; // Cloudinary URL
    }
    
    // 새로운 태깅맵 생성
    const newTaggingMap = new TaggingMap({
      TIME: req.body.TIME || new Date().toISOString(),
      EVENTTYPE: req.body.EVENTTYPE || 'UNKNOWN',
      PAGETITLE: req.body.PAGETITLE || '',
      URL: req.body.URL || '',
      eventParams: eventParams,
      image: imageUrl,
      timestamp: req.body.timestamp || new Date().toISOString()
    });
    
    // DB에 저장
    await newTaggingMap.save();
    res.status(200).send('Page data saved successfully');
    
  } catch (error) {
    console.error('Error saving page data:', error.message);
    res.status(500).send('Error saving page data');
  }
});

app.get('/api/taggingMaps', async (req, res) => {
  try {
    const taggingMaps = await TaggingMap.find();
    res.json(taggingMaps);
  } catch (error) {
    console.error('Error fetching taggingMaps:', error);
    res.status(500).send('Error fetching taggingMaps');
  }
});

// 모든 고유 PAGETITLE 목록을 가져오는 API
app.get('/api/pagetitles', async (req, res) => {
  try {
    const titles = await TaggingMap.aggregate([
      { $unwind: "$eventParams" },
      { $group: { _id: "$eventParams.PAGETITLE" } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, pagetitle: "$_id" } }
    ]);
    
    res.json(titles);
  } catch (error) {
    console.error('Error fetching page titles:', error);
    res.status(500).send('Error fetching page titles');
  }
});

// 특정 PAGETITLE에 대한 데이터를 가져오는 API
app.get('/api/taggingmaps/page/:pagetitle', async (req, res) => {
  try {
    const pagetitle = req.params.pagetitle.replace(/\//g, '>');
    
    const data = await TaggingMap.find({
      "PAGETITLE": pagetitle
    });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching page data:', error);
    res.status(500).send('Error fetching page data');
  }
});

// 상태 확인 엔드포인트
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'Server is running', 
    cloudinary: 'Configured',
    cloudName: cloudinary.config().cloud_name
  });
});

// 특정 PAGETITLE의 이벤트 타입 목록을 가져오는 API
app.get('/api/eventtypes/:pagetitle', async (req, res) => {
  try {
    const pagetitle = req.params.pagetitle;
    
    // 기본 매치 조건
    let matchCondition = {
      "PAGETITLE": pagetitle
    };
    
    // EVENTTYPE을 그룹화하여 고유값 추출
    const eventTypes = await TaggingMap.aggregate([
      { $match: matchCondition },
      { $group: { _id: "$EVENTTYPE" } },
      { $project: { _id: 0, eventtype: "$_id" } },
      { $sort: { eventtype: 1 } }
    ]);
    
    res.json(eventTypes);
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).send('Error fetching event types');
  }
});

// 특정 PAGETITLE 및 EVENTTYPE의 URL 목록을 가져오는 API
// 필터링된 URL 목록 API 엔드포인트 수정
app.get('/api/urls/:pagetitle/:eventtype', async (req, res) => {
  try {
    const { pagetitle, eventtype } = req.params;
    const isPopup = req.query.isPopup === 'true';
    
    if (!pagetitle || !eventtype) {
      return res.status(400).json({ error: '페이지 제목과 이벤트 유형은 필수입니다.' });
    }

    // 기본 쿼리 조건
    const matchCondition = {
      PAGETITLE: pagetitle,
      EVENTTYPE: eventtype
    };
    
    // 팝업 필터 조건 처리
    if (isPopup) {
      matchCondition['eventParams.EVENTNAME'] = { $in: ['popup_view', 'popup_click'] };
    }
    
    // 고급 검색 필터 처리
    const fieldQueries = [];
    
    // 요청에서 모든 필드 파라미터 추출
    for (const key in req.query) {
      // 기본 파라미터 제외
      if (key !== 'isPopup') {
        // _exists 필드는 값의 존재 여부만 확인
        if (key.endsWith('_exists') && req.query[key] === 'true') {
          const fieldName = key.replace('_exists', '');
          
          fieldQueries.push({
            [`eventParams`]: { 
              $elemMatch: { 
                [fieldName]: { $exists: true, $ne: null, $ne: "" }
              }
            }
          });
        } 
        // 일반 필드는 포함 검색
        else if (!key.endsWith('_exists')) {
          fieldQueries.push({
            [`eventParams`]: { 
              $elemMatch: { 
                [key]: { $regex: `.*${req.query[key]}.*`, $options: 'i' } 
              }
            }
          });
        }
      }
    }
    
    // 필드 쿼리 조건이 있으면 $and로 처리
    if (fieldQueries.length > 0) {
      matchCondition['$and'] = fieldQueries;
    }
    
    // URL 목록 조회 (중복 제거)
    const urls = await TaggingMap.aggregate([
      { $match: matchCondition },
      { $group: { _id: "$URL", url: { $first: "$URL" } } },
      { $project: { _id: 0, url: 1 } },
      { $sort: { url: 1 } }
    ]);
    
    res.json(urls);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).send({ error: 'URL 목록을 가져오는데 실패했습니다.' });
  }
});

// 특정 PAGETITLE, EVENTTYPE, URL의 시간 목록을 가져오는 API
// 필터링된 타임스탬프 목록 API 엔드포인트 수정
app.get('/api/times/:pagetitle/:eventtype/:url', async (req, res) => {
  try {
    const { pagetitle, eventtype, url } = req.params;
    const isPopup = req.query.isPopup === 'true';
    const decodedUrl = decodeURIComponent(url);
    
    if (!pagetitle || !eventtype || !url) {
      return res.status(400).json({ error: '페이지 제목, 이벤트 유형, URL은 필수입니다.' });
    }

    // 기본 쿼리 조건
    const matchCondition = {
      PAGETITLE: pagetitle,
      EVENTTYPE: eventtype,
      URL: decodedUrl
    };
    
    // 팝업 필터 조건 처리
    if (isPopup) {
      matchCondition['eventParams.EVENTNAME'] = { $in: ['popup_view', 'popup_click'] };
    }
    
    // 고급 검색 필터 처리
    const fieldQueries = [];
    
    // 요청에서 모든 필드 파라미터 추출
    for (const key in req.query) {
      // 기본 파라미터 제외
      if (key !== 'isPopup') {
        // _exists 필드는 값의 존재 여부만 확인
        if (key.endsWith('_exists') && req.query[key] === 'true') {
          const fieldName = key.replace('_exists', '');
          
          fieldQueries.push({
            [`eventParams`]: { 
              $elemMatch: { 
                [fieldName]: { $exists: true, $ne: null, $ne: "" }
              }
            }
          });
        } 
        // 일반 필드는 포함 검색
        else if (!key.endsWith('_exists')) {
          fieldQueries.push({
            [`eventParams`]: { 
              $elemMatch: { 
                [key]: { $regex: `.*${req.query[key]}.*`, $options: 'i' } 
              }
            }
          });
        }
      }
    }
    
    // 필드 쿼리 조건이 있으면 $and로 처리
    if (fieldQueries.length > 0) {
      matchCondition['$and'] = fieldQueries;
    }
    
    // 타임스탬프 목록 조회 (중복 제거, 최신순 정렬)
    const times = await TaggingMap.aggregate([
      { $match: matchCondition },
      { $group: { _id: "$TIME", timestamp: { $first: "$TIME" } } },
      { $project: { _id: 0, timestamp: 1 } },
      { $sort: { timestamp: -1 } }
    ]);
    
    res.json(times);
  } catch (error) {
    console.error('Error fetching times:', error);
    res.status(500).send({ error: '타임스탬프 목록을 가져오는데 실패했습니다.' });
  }
});

// server.js의 '/api/taggingmaps/filtered' 엔드포인트 수정
app.get('/api/taggingmaps/filtered', async (req, res) => {
  try {
    const { pagetitle, eventtype, url, timestamp, isPopup } = req.query;
    
    // 필수 필터 검증
    if (!pagetitle || !eventtype || !url || !timestamp) {
      return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
    }
    
    // 기본 검색 조건
    const query = {
      PAGETITLE: pagetitle,
      EVENTTYPE: eventtype,
      URL: url,
      TIME: timestamp
    };
    
    // 고급 검색 필터 처리
    const eventParamsFilters = [];
    
    // 요청에서 모든 필드 파라미터 추출
    for (const key in req.query) {
      // 기본 파라미터 제외
      if (!['pagetitle', 'eventtype', 'url', 'timestamp', 'isPopup'].includes(key)) {
        // _exists 필드는 값의 존재 여부만 확인
        if (key.endsWith('_exists') && req.query[key] === 'true') {
          const fieldName = key.replace('_exists', '');
          eventParamsFilters.push({
            [fieldName]: { $exists: true, $ne: null, $ne: "" }
          });
        } 
        // 일반 필드는 포함 검색
        else if (!key.endsWith('_exists')) {
          eventParamsFilters.push({
            [key]: { $regex: `.*${req.query[key]}.*`, $options: 'i' }
          });
        }
      }
    }
    
    // 이벤트 파라미터 필터가 있으면 $elemMatch로 처리
    if (eventParamsFilters.length > 0) {
      query.eventParams = {
        $elemMatch: {
          $or: eventParamsFilters
        }
      };
    }
    
    // 팝업 필터 처리
    if (isPopup === 'true') {
      query['eventParams.EVENTNAME'] = { $in: ['popup_view', 'popup_click'] };
    }
    
    const taggingMaps = await TaggingMap.find(query).limit(1);
    
    if (taggingMaps.length === 0) {
      return res.json([]);
    }
    
    res.json(taggingMaps);
  } catch (error) {
    console.error('Error fetching filtered taggingmap data:', error);
    res.status(500).send({ error: '필터링된 태깅맵 데이터를 가져오는데 실패했습니다.' });
  }
});

// 서버 측 - 집계된 데이터만 반환하는 새 엔드포인트 구현
// server.js에 추가할 새 API 엔드포인트
app.get('/api/taggingMaps/summary', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const eventType = req.query.eventType || '';
    
    // 검색 조건 구성
    const matchCondition = {};
    
    // 페이지 타이틀 검색
    if (search) {
      matchCondition.PAGETITLE = { $regex: `.*${search}.*`, $options: 'i' };
    }
    
    // 이벤트 타입 검색
    if (eventType) {
      matchCondition.EVENTTYPE = eventType;
    }
    
    // 필드별 고급 검색 처리
    const fieldQueries = [];

    // 쿼리 디버깅
    console.log("쿼리 파라미터:", req.query);
    
    // 요청에서 모든 필드 파라미터 추출
    for (const key in req.query) {
      // _exists 필드는 값의 존재 여부만 확인
      if (key.endsWith('_exists') && req.query[key] === 'true') {
        const fieldName = key.replace('_exists', '');
        console.log(`필드 존재 쿼리: ${fieldName}`);
        
        // 수정된 쿼리 - 배열 내 필드 검색 수정
        const existsQuery = {};
        existsQuery[`eventParams`] = { 
          $elemMatch: { 
            [fieldName]: { $exists: true, $ne: null, $ne: "" }
          }
        };
        fieldQueries.push(existsQuery);
      } 
      // 일반 필드는 포함 검색
      else if (
        !['page', 'limit', 'search', 'eventType'].includes(key) && 
        !key.endsWith('_exists')
      ) {
        const fieldQuery = {};
        fieldQuery[`eventParams.${key}`] = { 
          $regex: `.*${req.query[key]}.*`, 
          $options: 'i' 
        };
        fieldQueries.push(fieldQuery);
      }
    }
    
    // 로그 추가
    console.log("필드 쿼리:", JSON.stringify(fieldQueries, null, 2));

    // eventParams 내 필드 검색 조건이 있으면 처리
    if (fieldQueries.length > 0) {
      matchCondition['$or'] = fieldQueries;
    }
    
    // MongoDB 집계 파이프라인 사용
    const pipeline = [
      ...(Object.keys(matchCondition).length > 0 ? [{ $match: matchCondition }] : []),
      {
        $group: {
          _id: "$PAGETITLE",
          urls: {
            $addToSet: {
              url: "$URL",
              time: "$TIME",
              eventType: "$EVENTTYPE"
            }
          }
        }
      },
      { $sort: { _id: 1 } },
      { $skip: skip },
      { $limit: limit }
    ];
    
    const summaryData = await TaggingMap.aggregate(pipeline);
    
    // 처리된 데이터 형식 구성
    const processedData = summaryData.map(item => {
      const urlsMap = {};
      
      // URL별 타임스탬프 및 이벤트 유형 집계
      item.urls.forEach(u => {
        if (u.url) {
          if (!urlsMap[u.url]) {
            urlsMap[u.url] = {
              distinctTimes: new Set(),
              eventNames: new Set()
            };
          }
          if (u.time) urlsMap[u.url].distinctTimes.add(u.time);
          if (u.eventType) urlsMap[u.url].eventNames.add(u.eventType);
        }
      });
      
      // 반환 형식 구성
      return {
        pagetitle: item._id,
        urls: Object.keys(urlsMap).map(url => ({
          url,
          distinctCount: urlsMap[url].distinctTimes.size,
          eventNames: Array.from(urlsMap[url].eventNames)
        }))
      };
    });
    
    // 전체 페이지 수 계산을 위한 카운트
    const countPipeline = [
      ...(Object.keys(matchCondition).length > 0 ? [{ $match: matchCondition }] : []),
      {
        $group: {
          _id: "$PAGETITLE"
        }
      },
      { $count: "total" }
    ];
    
    const total = await TaggingMap.aggregate(countPipeline);
    
    res.json({
      data: processedData,
      pagination: {
        page,
        limit,
        total: total.length > 0 ? total[0].total : 0
      }
    });
  } catch (error) {
    console.error('Error fetching summary data:', error);
    res.status(500).send('Error fetching summary data');
  }
});

// 태깅맵 삭제 API
app.delete('/api/taggingmaps/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { imageUrl } = req.body;
    
    console.log(`태깅맵 삭제 요청. ID: ${id}, 이미지 URL: ${imageUrl}`);
    
    // MongoDB에서 태깅맵 데이터 삭제
    const result = await TaggingMap.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).send('삭제할 태깅맵을 찾을 수 없습니다.');
    }
    
    // Cloudinary에서 이미지 삭제
    if (imageUrl && imageUrl.includes('cloudinary.com')) {
      try {
        // 이미지 URL에서 public_id 추출
        // 예: https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/taggingmap/abcdefg.jpg
        const urlParts = imageUrl.split('/');
        const filenameWithExt = urlParts[urlParts.length - 1];
        const filename = filenameWithExt.split('.')[0];
        const folder = urlParts[urlParts.length - 2];
        const public_id = `${folder}/${filename}`;
        
        console.log(`Cloudinary 이미지 삭제 시도. Public ID: ${public_id}`);
        
        // Cloudinary에서 이미지 삭제
        await cloudinary.uploader.destroy(public_id);
        
        console.log('Cloudinary 이미지 삭제 성공');
      } catch (cloudinaryError) {
        console.error('Cloudinary 이미지 삭제 오류:', cloudinaryError);
        // 이미지 삭제 실패해도 계속 진행 (MongoDB 데이터는 이미 삭제됨)
      }
    }
    
    res.status(200).send('태깅맵이 성공적으로 삭제되었습니다.');
  } catch (error) {
    console.error('태깅맵 삭제 오류:', error);
    res.status(500).send(`태깅맵 삭제 실패: ${error.message}`);
  }
});

// 3. 모든 나머지 요청은 Vue Router가 처리하도록 설정
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'taggingmap_front/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Cloudinary configured for cloud: ${cloudinary.config().cloud_name}`);
});

// Deployed: 2025-05-20 09:57:42 by wschoi-loca