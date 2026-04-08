const express = require("express");
const router = express.Router();
const store = require("../data/store");

router.get("/", (req, res) => {
  let insights = [];

  if (store.copyCount > 5) {
    insights.push("Frequent copying detected");
  }

  if (store.totalTime > 1800) {
    insights.push("High AI usage time");
  }

  store.logs.forEach(log => {
    if (log.flags) {
      insights.push(...log.flags);
    }
  });

  res.json({ insights });
});

module.exports = router;