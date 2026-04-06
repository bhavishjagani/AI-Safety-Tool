const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let activityLog = [];

// Root route
app.get("/", (req, res) => {
    res.send("AI Safety Backend is live ✅");
});

// Track AI usage
app.post("/track", (req, res) => {
    const data = { ...req.body, timestamp: new Date() };
    activityLog.push(data);
    console.log("Activity:", data);
    res.json({ status: "ok" });
});

// View tracked stats
app.get("/stats", (req, res) => {
    res.json(activityLog);
});

// Listen on dynamic port for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));