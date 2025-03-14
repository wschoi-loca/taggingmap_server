const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Page = require('./models/Page');

const app = express();

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/pageCaptureSystem');

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
app.post('/api/pages', upload.single('image'), async (req, res) => {
    try {
        const jsonData = JSON.parse(req.body.jsonData); // Ensure jsonData is parsed
        const image = req.file ? req.file.filename : null;

        const newPage = new Page({
            jsonData: jsonData,
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

app.get('/api/pages', async (req, res) => {
    try {
        const pages = await Page.find();
        res.json(pages);
    } catch (error) {
        console.error('Error fetching pages:', error);
        res.status(500).send('Error fetching pages');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});