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
    const isPopup = req.query.isPopup === 'true';
    
    // 기본 매치 조건
    let matchCondition = {
      "PAGETITLE": pagetitle
    };
    
    // eventParams 내 EVENTNAME에서 팝업 필터링 조건
    let eventParamsMatch = {
      "eventParams.PAGETITLE": pagetitle
    };
    
    if (isPopup) {
      eventParamsMatch["eventParams.EVENTNAME"] = { $regex: /popup/ };
    }
    
    // EVENTTYPE을 그룹화하여 고유값 추출
    const eventTypes = await TaggingMap.aggregate([
      { $match: matchCondition },
      // 팝업 필터링이 활성화된 경우 팝업 이벤트가 포함된 문서만 선택
      ...(isPopup ? [{
        $match: {
          eventParams: {
            $elemMatch: {
              "EVENTNAME": { $regex: /popup/ }
            }
          }
        }
      }] : []),
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
// 특정 PAGETITLE 및 EVENTTYPE의 URL 목록을 가져오는 API
app.get('/api/urls/:pagetitle/:eventtype', async (req, res) => {
  try {
    const { pagetitle, eventtype } = req.params;
    const isPopup = req.query.isPopup === 'true';
    
    // 기본 매치 조건
    let matchCondition = {
      "PAGETITLE": pagetitle,
      "EVENTTYPE": eventtype
    };
    
    // 팝업 필터링 조건 구성
    let pipeline = [
      { $match: matchCondition }
    ];
    
    // 팝업 필터링이 활성화된 경우 추가 필터링 단계 삽입
    if (isPopup) {
      // 1. 문서를 언윈드하여 eventParams 배열 항목별로 처리
      pipeline.push({ $unwind: "$eventParams" });
      
      // 2. EVENTNAME에 popup이 포함된 항목만 필터링
      pipeline.push({
        $match: {
          "eventParams.EVENTNAME": { 
            $in: ["popup_view", "popup_click"] 
          }
        }
      });
      
      // 3. URL이 존재하고 null이 아닌 문서만 선택
      pipeline.push({
        $match: {
          "URL": { $ne: null, $exists: true }
        }
      });
      
      // 4. 다시 원래 문서로 그룹화
      pipeline.push({
        $group: {
          _id: "$URL",
          doc: { $first: "$$ROOT" }
        }
      });
    }
    
    // 최종 그룹화 및 출력 형식 지정
    pipeline = pipeline.concat([
      { $group: { _id: "$URL" } },
      // null 값 필터링
      { $match: { _id: { $ne: null } } },
      { $project: { _id: 0, url: "$_id" } },
      { $sort: { url: 1 } }
    ]);
    
    // MongoDB 집계 파이프라인 실행
    const urls = await TaggingMap.aggregate(pipeline);
    
    // 빈 결과일 경우 빈 배열 반환
    if (urls.length === 0) {
      console.log(`No URLs found for ${pagetitle} with popup filter: ${isPopup}`);
    }
    
    res.json(urls);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).send('Error fetching URLs');
  }
});
// 특정 PAGETITLE, EVENTTYPE, URL의 시간 목록을 가져오는 API
app.get('/api/times/:pagetitle/:eventtype/:url', async (req, res) => {
  try {
    const { pagetitle, eventtype } = req.params;
    let url = decodeURIComponent(req.params.url);
    const isPopup = req.query.isPopup === 'true';
    
    console.log('Fetching times for:', { pagetitle, eventtype, url, isPopup });
    
    // URL이 'null' 문자열인 경우 에러 응답
    if (url === 'null' || !url) {
      console.error('Invalid URL parameter: null or empty');
      return res.status(400).json({ error: 'URL cannot be null' });
    }
    
    // URL 디코딩 처리
    while (url.includes('%')) {
      const decodedUrl = decodeURIComponent(url);
      if (decodedUrl === url) break;
      url = decodedUrl;
    }
    
    let matchCondition = {
      "PAGETITLE": pagetitle,
      "EVENTTYPE": eventtype,
      "URL": url
    };
    
    // MongoDB 집계 파이프라인
    let pipeline = [{ $match: matchCondition }];
    
    if (isPopup) {
      pipeline.push({ $unwind: "$eventParams" });
      pipeline.push({
        $match: {
          "eventParams.EVENTNAME": { 
            $in: ["popup_view", "popup_click"] 
          }
        }
      });
      pipeline.push({
        $group: {
          _id: "$_id",
          timestamp: { $first: "$timestamp" } // timestamp 필드만 유지
        }
      });
    }
    
    // 최종 프로젝션 및 정렬 - timestamp 만 반환
    pipeline = pipeline.concat([
      { 
        $project: { 
          _id: 0, 
          timestamp: "$timestamp" // time 필드 제거, timestamp만 사용
        } 
      },
      { $sort: { timestamp: -1 } }
    ]);
    
    const times = await TaggingMap.aggregate(pipeline);
    console.log(`Found ${times.length} times`);
    
    res.json(times);
  } catch (error) {
    console.error('Error fetching times:', error);
    res.status(500).send('Error fetching times');
  }
});

// 필터링된 태깅맵 데이터 API
app.get('/api/taggingmaps/filtered', async (req, res) => {
  try {
    const { pagetitle, eventtype, timestamp } = req.query; // time 대신 timestamp 사용
    let url = req.query.url;
    const isPopup = req.query.isPopup === 'true';
    
    // URL 디코딩 처리
    if (url && url.includes('%')) {
      url = decodeURIComponent(url);
    }
    
    // 기본 쿼리 조건 - timestamp 사용
    let query = {
      "PAGETITLE": pagetitle,
      "EVENTTYPE": eventtype,
      "URL": url,
      "timestamp": timestamp // TIME 대신 timestamp 사용
    };
    
    // 팝업 필터링 처리를 위한 집계 파이프라인
    if (isPopup) {
      const pipeline = [
        { $match: query },
        { $unwind: "$eventParams" },
        { $match: { "eventParams.EVENTNAME": {  $in: ["popup_view", "popup_click"] } } },
        { $group: { 
          _id: "$_id",
          doc: { $first: "$$ROOT" },
          popup_params: { $push: "$eventParams" }
        }},
        {
          $addFields: {
            "doc.filtered_eventParams": "$popup_params"
          }
        },
        { $replaceRoot: { newRoot: "$doc" } }
      ];
      
      const taggingMaps = await TaggingMap.aggregate(pipeline);
      console.log(`Found ${taggingMaps.length} matching documents with popup events`);
      res.json(taggingMaps);
    } else {
      // 팝업 필터링이 없는 경우 기존 로직 사용
      const taggingMaps = await TaggingMap.find(query);
      console.log(`Found ${taggingMaps.length} matching documents with all events`);
      res.json(taggingMaps);
    }
    
  } catch (error) {
    console.error('Error fetching filtered data:', error);
    res.status(500).send('Error fetching filtered data');
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


// Deployed: 2025-05-20 07:30:15 by wschoi-loca
