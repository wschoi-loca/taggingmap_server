const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Schema and Model
const pageSchema = new mongoose.Schema({
  SHOT_NUMBER: Number,
  EVENTNAME: String,
  PAGEPATH: String,
  PAGETITLE: String,
  TIME: String,
  LABEL_TEXT: String,
  CONTENT_NM: String,
  PAGE_MKT_CONTS_ID: String,
  SUB_CONTENT_ID: String,
  CATEGORY_DEPTH1: String,
  CATEGORY_DEPTH2: String,
  CARD_NAME: String,
  HORIZONTAL_INDEX: String
});

const Page = mongoose.model('Page', pageSchema);

// Routes
app.post('/api/pages', async (req, res) => {
  try {
    const pageData = req.body;
    await Page.create(pageData);
    res.status(201).send({ message: 'Page data saved successfully' });
  } catch (error) {
    res.status(500).send({ message: 'Error saving page data', error });
  }
});

app.get('/api/pages', async (req, res) => {
  try {
    const pages = await Page.find();
    res.status(200).json(pages);
  } catch (error) {
    res.status(500).send({ message: 'Error fetching pages', error });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});