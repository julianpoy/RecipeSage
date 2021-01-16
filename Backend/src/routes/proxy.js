const express = require('express');
const router = express.Router();
const cors = require('cors');
const request = require('request-promise-native');

router.post('/ingredient-instruction-classifier', cors(), async (req, res, next) => {
  console.log(req.headers.host);

  try {
    const response = await request({
      url: process.env.INGREDIENT_INSTRUCTION_CLASSIFIER_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    res.status(200).json(JSON.parse(response));
  } catch(e) {
    res.status(e.status).send(e.message);
  }
});

module.exports = router;
