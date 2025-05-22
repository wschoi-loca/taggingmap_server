const express = require('express');
const router = express.Router();
const TaggingMap = require('../models/taggingMap');
const authMiddleware = require('../middleware/auth'); // 인증 미들웨어 추가
const roleCheck = require('../middleware/roleCheck'); // 역할 확인 미들웨어 추가
const cloudinary = require('../config/cloudinary'); // Cloudinary 설정 추가
const multer = require('multer'); // 파일 업로드 처리
const path = require('path');
const fs = require('fs');

// 파일 업로드를 위한 Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 기본 경로에 인증 미들웨어 적용 (모든 요청 인증 필요)
router.use(authMiddleware);

// 공개 라우트 (인증 없이 접근 가능) - 별도 정의
const publicRoutes = express.Router();

// 1. 모든 고유 PAGETITLE 목록 가져오기 (공개)
publicRoutes.get('/api/pagetitles', async (req, res) => {
  try {
    const titles = await TaggingMap.aggregate([
      { $unwind: "$eventParams" },
      { $group: { _id: "$eventParams.PAGETITLE" } },
      { $sort: { _id: 1 } }, // PAGETITLE 알파벳 순 정렬
      { $project: { _id: 0, pagetitle: "$_id" } }
    ]);
    
    res.json(titles);
  } catch (error) {
    console.error('Error fetching page titles:', error);
    res.status(500).send('Error fetching page titles');
  }
});

// 2. 특정 PAGETITLE의 모든 고유 EVENTNAME 목록 (공개)
publicRoutes.get('/api/eventnames/:pagetitle', async (req, res) => {
  try {
    const pagetitle = req.params.pagetitle;
    
    const eventNames = await TaggingMap.aggregate([
      { $match: { "eventParams.PAGETITLE": pagetitle } },
      { $unwind: "$eventParams" },
      { $group: { _id: "$eventParams.EVENTNAME" } },
      { $project: { _id: 0, eventname: "$_id" } }
    ]);
    
    res.json(eventNames);
  } catch (error) {
    console.error('Error fetching event names:', error);
    res.status(500).send('Error fetching event names');
  }
});

// 3. 특정 PAGETITLE과 EVENTNAME의 모든 고유 URL 목록 (공개)
publicRoutes.get('/api/urls/:pagetitle/:eventname', async (req, res) => {
  try {
    const { pagetitle, eventname } = req.params;
    
    const urls = await TaggingMap.aggregate([
      { 
        $match: { 
          "eventParams.PAGETITLE": pagetitle,
          "EVENTNAME": eventname
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

// 4. 특정 PAGETITLE, EVENTNAME, URL의 모든 고유 TIME 목록 (공개)
publicRoutes.get('/api/times/:pagetitle/:eventname/:url', async (req, res) => {
  try {
    const { pagetitle, eventname, url } = req.params;
    const decodedUrl = decodeURIComponent(url);
    
    const times = await TaggingMap.aggregate([
      { 
        $match: { 
          "eventParams.PAGETITLE": pagetitle,
          "EVENTNAME": eventname,
          "URL": decodedUrl
        } 
      },
      { $sort: { "timestamp": -1 } }, // 시간 내림차순 정렬
      { $project: { _id: 0, time: "$TIME", timestamp: "$timestamp" } }
    ]);
    
    res.json(times);
  } catch (error) {
    console.error('Error fetching times:', error);
    res.status(500).send('Error fetching times');
  }
});

// 5. 필터링된 데이터 가져오기 (공개)
publicRoutes.get('/api/taggingmaps/filtered', async (req, res) => {
  try {
    const { pagetitle, eventname, url, time } = req.query;
    
    if (!pagetitle) {
      return res.status(400).json({ error: 'PAGETITLE is required' });
    }
    
    const query = { "eventParams.PAGETITLE": pagetitle };
    
    if (eventname) {
      query["EVENTNAME"] = eventname;
    }
    
    if (url) {
      query["URL"] = decodeURIComponent(url);
    }
    
    if (time) {
      query["TIME"] = time;
    }
    
    const data = await TaggingMap.find(query).sort({ timestamp: -1 });
    res.json(data);
  } catch (error) {
    console.error('Error fetching filtered data:', error);
    res.status(500).send('Error fetching filtered data');
  }
});

// 공개 라우트 추가
router.use('/', publicRoutes);

// ------------ 인증 필요 라우트 ------------

// 6. 모든 태깅맵 목록 조회 (인증 필요)
router.get('/api/taggingmaps', async (req, res) => {
  try {
    const taggingMaps = await TaggingMap.find().sort({ timestamp: -1 });
    res.json(taggingMaps);
  } catch (error) {
    console.error('Error fetching tagging maps:', error);
    res.status(500).json({ message: 'Error fetching tagging maps', error: error.message });
  }
});

// 7. 특정 태깅맵 조회 (인증 필요)
router.get('/api/taggingmaps/:id', async (req, res) => {
  try {
    const taggingMap = await TaggingMap.findById(req.params.id);
    if (!taggingMap) {
      return res.status(404).json({ message: '태깅맵을 찾을 수 없습니다.' });
    }
    res.json(taggingMap);
  } catch (error) {
    console.error('Error fetching tagging map:', error);
    res.status(500).json({ message: 'Error fetching tagging map', error: error.message });
  }
});

// 8. 태깅맵 추가 (admin 권한 필요)
router.post('/api/taggingmaps', roleCheck('admin'), upload.single('image'), async (req, res) => {
  try {
    // 요청 데이터 검증
    if (!req.file || !req.body.eventParams) {
      return res.status(400).json({ message: '이미지와 이벤트 파라미터가 필요합니다.' });
    }

    // Cloudinary에 이미지 업로드
    const result = await cloudinary.uploader.upload(req.file.path);
    
    // 임시 파일 삭제
    fs.unlinkSync(req.file.path);
    
    // 이벤트 파라미터 파싱
    const eventParams = JSON.parse(req.body.eventParams);
    
    // 사용자 정보 추가
    const createdBy = {
      userId: req.userData.userId,
      email: req.userData.email,
      name: req.userData.name || '사용자'
    };
    
    // 태깅맵 생성
    const taggingMap = new TaggingMap({
      image: result.secure_url,
      imagePublicId: result.public_id,
      eventParams,
      timestamp: new Date(),
      createdBy,
      EVENTNAME: req.body.eventName,
      URL: req.body.url
    });
    
    await taggingMap.save();
    res.status(201).json({ message: '태깅맵이 성공적으로 생성되었습니다.', taggingMap });
  } catch (error) {
    console.error('Error creating tagging map:', error);
    res.status(500).json({ message: '태깅맵 생성 중 오류가 발생했습니다.', error: error.message });
  }
});

// 9. 태깅맵 수정 (admin 권한 필요)
router.put('/api/taggingmaps/:id', roleCheck('admin'), upload.single('image'), async (req, res) => {
  try {
    const taggingMapId = req.params.id;
    
    // 기존 태깅맵 조회
    const taggingMap = await TaggingMap.findById(taggingMapId);
    if (!taggingMap) {
      return res.status(404).json({ message: '태깅맵을 찾을 수 없습니다.' });
    }
    
    // 수정 기록 저장
    const modifiedBy = {
      userId: req.userData.userId,
      email: req.userData.email,
      name: req.userData.name || '사용자',
      date: new Date()
    };
    
    // 수정 이력이 없으면 배열 생성
    if (!taggingMap.modifiedBy) {
      taggingMap.modifiedBy = [];
    }
    
    taggingMap.modifiedBy.push(modifiedBy);
    
    // eventParams 업데이트
    if (req.body.eventParams) {
      taggingMap.eventParams = JSON.parse(req.body.eventParams);
    }
    
    // 이미지 업데이트 (있는 경우)
    if (req.file) {
      // 기존 이미지가 있으면 Cloudinary에서 삭제
      if (taggingMap.imagePublicId) {
        await cloudinary.uploader.destroy(taggingMap.imagePublicId);
      }
      
      // Cloudinary에 새 이미지 업로드
      const result = await cloudinary.uploader.upload(req.file.path);
      
      // 임시 파일 삭제
      fs.unlinkSync(req.file.path);
      
      // 이미지 정보 업데이트
      taggingMap.image = result.secure_url;
      taggingMap.imagePublicId = result.public_id;
    }
    
    // 태깅맵 저장
    await taggingMap.save();
    
    return res.status(200).json({ 
      message: '태깅맵이 성공적으로 업데이트되었습니다.', 
      taggingMap 
    });
  } catch (error) {
    console.error('태깅맵 업데이트 오류:', error);
    return res.status(500).json({ 
      message: '서버 오류가 발생했습니다.', 
      error: error.message 
    });
  }
});

// 10. 태깅맵 삭제 (admin 권한 필요)
router.delete('/api/taggingmaps/:id', roleCheck('admin'), async (req, res) => {
  try {
    const taggingMapId = req.params.id;
    
    // 태깅맵 조회
    const taggingMap = await TaggingMap.findById(taggingMapId);
    if (!taggingMap) {
      return res.status(404).json({ message: '태깅맵을 찾을 수 없습니다.' });
    }
    
    // Cloudinary 이미지 삭제
    if (taggingMap.imagePublicId) {
      await cloudinary.uploader.destroy(taggingMap.imagePublicId);
    }
    
    // 데이터베이스에서 태깅맵 삭제
    await TaggingMap.findByIdAndDelete(taggingMapId);
    
    res.status(200).json({ message: '태깅맵이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('Error deleting tagging map:', error);
    res.status(500).json({ message: '태깅맵 삭제 중 오류가 발생했습니다.', error: error.message });
  }
});

// 11. 사용자 권한 확인 (모든 로그인 사용자)
router.get('/api/auth/check', async (req, res) => {
  try {
    res.json({ 
      isAuthenticated: true, 
      user: {
        id: req.userData.userId,
        email: req.userData.email,
        role: req.userData.role
      } 
    });
  } catch (error) {
    console.error('Error checking auth:', error);
    res.status(500).json({ message: '인증 확인 중 오류가 발생했습니다.', error: error.message });
  }
});

module.exports = router;