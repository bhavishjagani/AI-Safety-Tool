const express = require("express");
const cors = require("cors");

const trackRoute = require("./routes/track");
const statsRoute = require("./routes/stats");
const insightsRoute = require("./routes/insights");

const app = express();

app.use(cors());
app.use(express.json());

// ROUTES
app.use("/track", trackRoute);
app.use("/stats", statsRoute);
app.use("/insights", insightsRoute);

// START
app.listen(3000, () => {
  console.log("✅ Backend running on http://localhost:3000");
});