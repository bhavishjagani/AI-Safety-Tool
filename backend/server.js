const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");

const trackRoute = require("./routes/track");
const statsRoute = require("./routes/stats");
const insightsRoute = require("./routes/insights");
const store = require("./data/store");

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables (set on Render)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-change-this";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    req.userId = "anonymous";
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.email;
    req.userGoogleId = decoded.sub;
    next();
  } catch (err) {
    req.userId = "anonymous";
    next();
  }
}

// ─── Google Sign-In Route ─────────────────────────────────────────────────────
app.post("/auth/google", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "Missing token" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    let user = store.getUserByGoogleId(sub);
    if (!user) {
      user = store.createUserWithGoogle({ email, name, picture, googleId: sub });
    } else {
      user.name = name;
      user.picture = picture;
      store.updateUser(user.id, user);
    }

    const token = jwt.sign({ email, sub, name }, JWT_SECRET, { expiresIn: "30d" });
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "lax" });
    res.json({ success: true, user: { email, name, picture } });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

app.get("/auth/me", authenticate, (req, res) => {
  if (req.userId === "anonymous") return res.json({ user: null });
  const user = store.getUser(req.userId);
  res.json({ user: { email: user.email, name: user.name, picture: user.picture } });
});

// ─── API Routes (with authentication) ─────────────────────────────────────────
app.use("/track", authenticate);
app.use("/stats", authenticate);
app.use("/insights", authenticate);

app.use("/track", trackRoute);
app.use("/stats", statsRoute);
app.use("/insights", insightsRoute);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: Math.floor(process.uptime()), timestamp: Date.now() });
});

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n🛡️ AI Safety Tool Backend`);
  console.log(`✅ Running on http://localhost:${PORT}`);
});