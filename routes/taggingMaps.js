// routes/taggingmap.js

const express = require('express');
const router = express.Router();
const TaggingMap = require('../models/taggingMap');

// 1. 모든 고유 PAGETITLE 목록 가져오기
router.get('/api/pagetitles', async (req, res) => {
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

// 2. 특정 PAGETITLE의 모든 고유 EVENTNAME 목록
router.get('/api/eventnames/:pagetitle', async (req, res) => {
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

// 3. 특정 PAGETITLE과 EVENTNAME의 모든 고유 URL 목록
router.get('/api/urls/:pagetitle/:eventname', async (req, res) => {
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

// 4. 특정 PAGETITLE, EVENTNAME, URL의 모든 고유 TIME 목록
router.get('/api/times/:pagetitle/:eventname/:url', async (req, res) => {
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

// 5. 필터링된 데이터 가져오기
router.get('/api/taggingmaps/filtered', async (req, res) => {
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

module.exports = router;