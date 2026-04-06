const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (for now)
let activityLog = [];

// 📡 TRACK USER DATA
app.post("/track", (req, res) => {
  const data = req.body;

  const entry = {
    ...data,
    timestamp: new Date()
  };

  activityLog.push(entry);

  console.log("📊 Activity:", entry);

  res.json({ status: "ok" });
});

// 📊 GET ALL DATA
app.get("/stats", (req, res) => {
  res.json(activityLog);
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));