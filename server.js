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
      EVENTNAME: req.body.EVENTNAME || 'UNKNOWN',
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
      "eventParams.PAGETITLE": pagetitle
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

// 추가: 특정 PAGETITLE의 이벤트 이름 목록을 가져오는 API
app.get('/api/eventnames/:pagetitle', async (req, res) => {
  try {
    const pagetitle = req.params.pagetitle;
    
    const eventNames = await TaggingMap.aggregate([
      { $match: { "eventParams.PAGETITLE": pagetitle } },
      { $unwind: "$eventParams" },
      { $match: { "eventParams.PAGETITLE": pagetitle } },
      { $group: { _id: "$eventParams.EVENTNAME" } },
      { $project: { _id: 0, eventname: "$_id" } }
    ]);
    
    res.json(eventNames);
  } catch (error) {
    console.error('Error fetching event names:', error);
    res.status(500).send('Error fetching event names');
  }
});

// 추가: 특정 PAGETITLE 및 EVENTNAME의 URL 목록을 가져오는 API
app.get('/api/urls/:pagetitle/:eventname', async (req, res) => {
  try {
    const { pagetitle, eventname } = req.params;
    
    const urls = await TaggingMap.aggregate([
      { 
        $match: { 
          "PAGETITLE": pagetitle,
          "eventParams.EVENTNAME": eventname
        } 
      },
      { $group: { _id: "$URL" } },
      { $project: { _id: 0, url: "$_id" } }
    ]);
    
    res.json(urls);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).send('Error fetching URLs');
  }
});

// 추가: 특정 PAGETITLE, EVENTNAME, URL의 시간 목록을 가져오는 API
app.get('/api/times/:pagetitle/:eventname/:url', async (req, res) => {
  try {
    const { pagetitle, eventname } = req.params;
    const url = decodeURIComponent(req.params.url);
    
    const times = await TaggingMap.aggregate([
      { 
        $match: { 
          "PAGETITLE": pagetitle,
          "eventParams.EVENTNAME": eventname,
          "URL": url
        } 
      },
      { 
        $project: { 
          _id: 0, 
          time: "$TIME",
          timestamp: "$timestamp" 
        } 
      },
      { $sort: { timestamp: -1 } }
    ]);
    
    res.json(times);
  } catch (error) {
    console.error('Error fetching times:', error);
    res.status(500).send('Error fetching times');
  }
});

// server.js의 /api/taggingmaps/filtered 엔드포인트 수정
app.get('/api/taggingmaps/filtered', async (req, res) => {
  try {
    const { pagetitle, eventname, time } = req.query;
    let url = req.query.url;
    
    // URL이 이중으로 인코딩된 경우 처리
    if (url && url.includes('%25')) {
      url = decodeURIComponent(url);
      console.log('URL after first decoding:', url);
    }
    
    console.log('Filter parameters:', { 
      pagetitle, 
      eventname, 
      url, 
      time 
    });
    
    // MongoDB 쿼리 실행
    const taggingMaps = await TaggingMap.find({
      //"PAGETITLE": pagetitle,
      "eventParams.EVENTNAME": eventname,
      //"URL": url,
      "TIME": { $regex: time.split('.')[0] } // 밀리초를 제외하고 비교
    });
    
    console.log(`Found ${taggingMaps.length} matching documents`);
    
    if (taggingMaps.length === 0) {
      // 결과가 없을 때 디버깅 정보 제공
      console.log('No results found. Performing diagnostic query...');
      
      // URL만 일치하는 문서 확인
      const urlMatches = await TaggingMap.countDocuments({ "URL": url });
      console.log(`Documents with matching URL: ${urlMatches}`);
      
      // PAGETITLE만 일치하는 문서 확인
      const pagetitleMatches = await TaggingMap.countDocuments({ "eventParams.PAGETITLE": pagetitle });
      console.log(`Documents with matching PAGETITLE: ${pagetitleMatches}`);
      
      // EVENTNAME만 일치하는 문서 확인
      const eventnameMatches = await TaggingMap.countDocuments({ "eventParams.EVENTNAME": eventname });
      console.log(`Documents with matching EVENTNAME: ${eventnameMatches}`);
      
      // TIME만 일치하는 문서 확인
      const timeMatches = await TaggingMap.countDocuments({ "TIME": time });
      console.log(`Documents with matching TIME: ${timeMatches}`);
    }
    
    res.json(taggingMaps);
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