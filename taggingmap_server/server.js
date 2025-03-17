const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Page = require('./models/taggingMap');

const app = express();

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/pageCaptureSystem', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Ensure the 'uploads' directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(uploadsDir));

// Routes
app.post('/api/taggingMaps', upload.single('image'), async (req, res) => {
  try {
    const eventParams = JSON.parse(req.body.eventParams); // Ensure eventParams is parsed
    const image = req.file ? req.file.filename : null;

    const newPage = new Page({
      eventParams: eventParams,
      image: image ? `uploads/${image}` : null,
      timestamp: new Date().toISOString(),
    });

    await newPage.save();
    res.status(200).send('Page data saved successfully');
  } catch (error) {
    console.error('Error saving page data:', error);
    res.status(500).send('Error saving page data');
  }
});

app.get('/api/taggingMaps', async (req, res) => {
  try {
    const taggingMaps = await Page.find();
    res.json(taggingMaps);
  } catch (error) {
    console.error('Error fetching taggingMaps:', error);
    res.status(500).send('Error fetching taggingMaps');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});