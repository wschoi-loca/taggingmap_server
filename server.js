const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const fs = require('fs');
require('dotenv').config(); // 환경 변수 로드
const taggingMap = require('./models/taggingMap'); // 모델

const app = express();

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Helmet 설정 - Heroku 배포와 프론트엔드 호환성을 위해 일부 옵션 조정
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://taggingmap-server.herokuapp.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// MongoDB connection - Heroku 환경변수 사용
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taggingMapSystem';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Ensure the 'uploads' directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Serve static files from the 'uploads' directory
app.use('/static/uploads', express.static(uploadsDir));

// Routes
app.post('/api/taggingMaps', upload.single('image'), async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    let eventParams = {};
    
    try {
      // 방어적 코딩: eventParams가 있을 때만 파싱 시도
      if (req.body.eventParams) {
        eventParams = JSON.parse(req.body.eventParams);
      } else if (req.body.jsonData) {
        // 이전 버전 호환성 유지
        eventParams = JSON.parse(req.body.jsonData);
      } else {
        // 없으면 빈 객체 사용
        console.log('No eventParams or jsonData found in request');
      }
    } catch (e) {
      console.error('JSON parsing error:', e, 'Original data:', req.body.eventParams || req.body.jsonData);
      // 오류가 발생해도 계속 진행 (빈 객체 사용)
      eventParams = {};
    }
    
    // 파일 업로드 처리
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    
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
    const taggingMaps = await taggingMap.find();
    res.json(taggingMaps);
  } catch (error) {
    console.error('Error fetching taggingMaps:', error);
    res.status(500).send('Error fetching taggingMaps');
  }
});

// 프론트엔드 서빙 (Heroku 배포를 위해 추가)
if (process.env.NODE_ENV === 'production') {
  // 프론트엔드 빌드 파일들을 정적으로 서빙
  app.use(express.static(path.join(__dirname, 'taggingmap_front/dist')));
  
  // 나머지 모든 GET 요청을 Vue 앱의 index.html로 리다이렉트
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'taggingmap_front/dist/index.html'));
  });
}

// 상태 확인용 엔드포인트 (Heroku가 제대로 작동하는지 확인하기 위함)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});