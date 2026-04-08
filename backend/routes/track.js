const express = require("express");
const router = express.Router();
const store = require("../data/store");

router.post("/", (req, res) => {
  const { text, ai } = req.body;

  const log = {
    text,
    ai,
    timestamp: Date.now()
  };

  store.logs.push(log);
  store.copyCount++;

  res.json({ success: true });
});

module.exports = router;