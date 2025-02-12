const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Google Cloud Storage 설정
const storage = new Storage({
  keyFilename: path.join(__dirname, 'serviceAccountKey.json'),
  projectId: 'your-project-id',
});

const bucketName = 'your-bucket-name';
const bucket = storage.bucket(bucketName);

// 파일 업로드 설정
const upload = multer({
  storage: multer.memoryStorage(),
});

// JSON 파일 업로드 엔드포인트
app.post('/upload-json', upload.single('jsonFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const blob = bucket.file(Date.now() + path.extname(req.file.originalname));
  const blobStream = blob.createWriteStream();

  blobStream.on('error', (err) => {
    res.status(500).send({ message: 'Unable to upload the JSON file.', error: err });
  });

  blobStream.on('finish', () => {
    res.send({ message: 'JSON file uploaded successfully', file: req.file });
  });

  blobStream.end(req.file.buffer);
});

// 이미지 파일 업로드 엔드포인트
app.post('/upload-image', upload.single('imageFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const blob = bucket.file(Date.now() + path.extname(req.file.originalname));
  const blobStream = blob.createWriteStream();

  blobStream.on('error', (err) => {
    res.status(500).send({ message: 'Unable to upload the image file.', error: err });
  });

  blobStream.on('finish', () => {
    res.send({ message: 'Image file uploaded successfully', file: req.file });
  });

  blobStream.end(req.file.buffer);
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});