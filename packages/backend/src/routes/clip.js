const express = require('express');
const router = express.Router();

const clip = require('../services/clip.js');

router.get('/', async (req, res, next) => {
  try {
    const url = (req.query.url || '').trim();
    if (!url) {
      return res.status(400).send('Must provide a URL');
    }

    const results = await clip(url);

    res.status(200).json(results);
  } catch(e) {
    next(e);
  }
});

module.exports = router;

