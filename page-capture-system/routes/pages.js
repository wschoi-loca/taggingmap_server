const express = require('express');
const router = express.Router();
const Page = require('../models/Page');

// GET all pages
router.get('/', async (req, res) => {
  try {
    const pages = await Page.find();
    res.json(pages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new page
router.post('/', async (req, res) => {
  const page = new Page({
    title: req.body.title,
    url: req.body.url,
    image: req.body.image,
  });

  try {
    const newPage = await page.save();
    res.status(201).json(newPage);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET a single page by ID
router.get('/:id', async (req, res) => {
  try {
    const page = await Page.findById(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;