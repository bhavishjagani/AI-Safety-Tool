/**
 * AI Safety Tool - In-Memory Data Store
 * Manages all session data, user profiles, and analytics
 */

const { v4: uuidv4 } = require("uuid");

// ─── Default User Profile ────────────────────────────────────────────────────
function createDefaultUser() {
  return {
    id: uuidv4(),
    createdAt: Date.now(),
    lastSeen: Date.now(),

    // Session tracking
    sessions: [],           // Each session: { id, start, end, site, events[] }
    currentSession: null,

    // Copy/paste tracking
    copyEvents: [],         // { id, text, ai, timestamp, flags, riskScore, category }
    copyCount: 0,

    // Time tracking
    totalTime: 0,           // total seconds across all AI sites
    dailyTime: {},          // { "2024-01-01": seconds }
    siteTime: {},           // { "chatgpt.com": seconds }

    // Risk & behavior
    riskHistory: [],        // { timestamp, score, level, triggers[] }
    warningsSeen: 0,
    warningsDismissed: 0,
    warningsActedOn: 0,

    // Streaks & goals
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    dailyGoalMinutes: 30,
    weeklyGoalCopies: 20,

    // Site usage
    aiUsage: {
      "ChatGPT": 0,
      "Claude": 0,
      "Gemini": 0,
      "Perplexity": 0,
      "Copilot": 0,
      "Other": 0
    },

    // Content analysis
    contentCategories: {
      homework: 0,
      writing: 0,
      coding: 0,
      research: 0,
      creative: 0,
      general: 0
    },

    // Achievements
    achievements: [],       // { id, title, unlockedAt }
    points: 0,

    // Settings
    settings: {
      warningsEnabled: true,
      warningThreshold: 3,   // copies before warning
      dailyGoal: 30,         // minutes
      trackingEnabled: true,
      sensitivityLevel: "medium", // low | medium | high
      notifyOnRisk: true,
      theme: "dark"
    },

    // Weekly reports
    weeklyReports: []
  };
}

// ─── Store Class ─────────────────────────────────────────────────────────────
class Store {
  constructor() {
    this.users = {};
    this.globalStats = {
      totalUsers: 0,
      totalCopies: 0,
      totalTime: 0,
      startedAt: Date.now()
    };
  }

  // Get or create user
  getUser(userId = "default") {
    if (!this.users[userId]) {
      this.users[userId] = createDefaultUser();
      this.users[userId].id = userId;
      this.globalStats.totalUsers++;
    }
    this.users[userId].lastSeen = Date.now();
    return this.users[userId];
  }

  // Update user data partially
  updateUser(userId, updates) {
    const user = this.getUser(userId);
    Object.assign(user, updates);
    return user;
  }

  // Add a copy event
  addCopyEvent(userId, event) {
    const user = this.getUser(userId);
    const copyEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...event
    };
    user.copyEvents.push(copyEvent);
    user.copyCount++;
    this.globalStats.totalCopies++;

    // Track by AI site
    if (event.ai && user.aiUsage.hasOwnProperty(event.ai)) {
      user.aiUsage[event.ai]++;
    } else if (event.ai) {
      user.aiUsage["Other"]++;
    }

    // Track content category
    if (event.category && user.contentCategories.hasOwnProperty(event.category)) {
      user.contentCategories[event.category]++;
    }

    // Keep only last 500 events for memory
    if (user.copyEvents.length > 500) {
      user.copyEvents = user.copyEvents.slice(-500);
    }

    return copyEvent;
  }

  // Add time tracking
  addTime(userId, seconds, site) {
    const user = this.getUser(userId);
    user.totalTime += seconds;
    this.globalStats.totalTime += seconds;

    const today = new Date().toLocaleDateString("en-US");
    user.dailyTime[today] = (user.dailyTime[today] || 0) + seconds;

    if (site) {
      user.siteTime[site] = (user.siteTime[site] || 0) + seconds;
    }

    // Check streak
    this._updateStreak(user);

    return user;
  }

  // Add risk entry
  addRiskEntry(userId, riskData) {
    const user = this.getUser(userId);
    const entry = {
      timestamp: Date.now(),
      ...riskData
    };
    user.riskHistory.push(entry);

    // Keep last 100 risk entries
    if (user.riskHistory.length > 100) {
      user.riskHistory = user.riskHistory.slice(-100);
    }

    return entry;
  }

  // Update streak
  _updateStreak(user) {
    const today = new Date().toDateString();
    if (user.lastActiveDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (user.lastActiveDate === yesterdayStr) {
      user.streak++;
    } else {
      user.streak = 1;
    }

    if (user.streak > user.longestStreak) {
      user.longestStreak = user.streak;
    }

    user.lastActiveDate = today;
  }

  // Award achievement
  awardAchievement(userId, achievement) {
    const user = this.getUser(userId);
    const already = user.achievements.find(a => a.id === achievement.id);
    if (already) return null;

    const earned = { ...achievement, unlockedAt: Date.now() };
    user.achievements.push(earned);
    user.points += achievement.points || 10;
    return earned;
  }

  // Get daily breakdown for last N days
  getDailyBreakdown(userId, days = 7) {
    const user = this.getUser(userId);
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US");
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

      result.push({
        date: key,
        label,
        copies: user.copyEvents.filter(e => {
          const evDate = new Date(e.timestamp).toLocaleDateString("en-US");
          return evDate === key;
        }).length,
        timeMinutes: Math.floor((user.dailyTime[key] || 0) / 60)
      });
    }

    return result;
  }

  // Get recent events (last N)
  getRecentEvents(userId, limit = 20) {
    const user = this.getUser(userId);
    return user.copyEvents.slice(-limit).reverse();
  }
}

const store = new Store();
module.exports = store;