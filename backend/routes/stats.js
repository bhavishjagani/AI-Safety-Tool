const express = require("express");
const router = express.Router();
const store = require("../data/store");

router.get("/", (req, res) => {
  res.json(store);
});

module.exports = router;