const { v4: uuidv4 } = require("uuid");

function createDefaultUser() {
  return {
    id: null,
    email: null,
    name: null,
    picture: null,
    googleId: null,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    copyEvents: [],
    copyCount: 0,
    totalTime: 0,
    dailyTime: {},
    siteTime: {},
    riskHistory: [],
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    aiUsage: { ChatGPT: 0, Claude: 0, Gemini: 0, Perplexity: 0, Copilot: 0, Other: 0 },
    contentCategories: { homework: 0, writing: 0, coding: 0, research: 0, creative: 0, general: 0 },
    achievements: [],
    points: 0,
    settings: { warningsEnabled: true, trackingEnabled: true, sensitivityLevel: "medium", dailyGoal: 30 },
    sessions: [],
    currentSession: null
  };
}

class Store {
  constructor() {
    this.users = {};            // key: email
    this.usersByGoogleId = {};
    this.globalStats = { totalUsers: 0, totalCopies: 0, totalTime: 0, startedAt: Date.now() };
  }

  createUserWithGoogle({ email, name, picture, googleId }) {
    const user = createDefaultUser();
    user.id = email;
    user.email = email;
    user.name = name;
    user.picture = picture;
    user.googleId = googleId;
    this.users[email] = user;
    this.usersByGoogleId[googleId] = user;
    this.globalStats.totalUsers++;
    return user;
  }

  getUser(userId) {
    if (!userId || userId === "anonymous") return null;
    let user = this.users[userId];
    if (!user && this.usersByGoogleId[userId]) user = this.usersByGoogleId[userId];
    if (user) user.lastSeen = Date.now();
    return user;
  }

  getUserByGoogleId(googleId) {
    return this.usersByGoogleId[googleId];
  }

  updateUser(userId, updates) {
    const user = this.getUser(userId);
    if (user) Object.assign(user, updates);
    return user;
  }

  addCopyEvent(userId, event) {
    const user = this.getUser(userId);
    if (!user) return null;
    const copyEvent = { id: uuidv4(), timestamp: Date.now(), ...event };
    user.copyEvents.unshift(copyEvent);
    if (user.copyEvents.length > 500) user.copyEvents = user.copyEvents.slice(0, 500);
    user.copyCount++;
    this.globalStats.totalCopies++;

    if (event.ai && user.aiUsage[event.ai] !== undefined) user.aiUsage[event.ai]++;
    else if (event.ai) user.aiUsage["Other"]++;

    if (event.category && user.contentCategories[event.category] !== undefined)
      user.contentCategories[event.category]++;

    this._updateStreak(user);
    return copyEvent;
  }

  addTime(userId, seconds, site) {
    const user = this.getUser(userId);
    if (!user) return null;
    user.totalTime += seconds;
    this.globalStats.totalTime += seconds;
    const today = new Date().toLocaleDateString("en-US");
    user.dailyTime[today] = (user.dailyTime[today] || 0) + seconds;
    if (site) user.siteTime[site] = (user.siteTime[site] || 0) + seconds;
    this._updateStreak(user);
    return user;
  }

  addRiskEntry(userId, riskData) {
    const user = this.getUser(userId);
    if (!user) return null;
    const entry = { timestamp: Date.now(), ...riskData };
    user.riskHistory.push(entry);
    if (user.riskHistory.length > 100) user.riskHistory = user.riskHistory.slice(-100);
    return entry;
  }

  _updateStreak(user) {
    const today = new Date().toDateString();
    if (user.lastActiveDate === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (user.lastActiveDate === yesterday.toDateString()) user.streak++;
    else user.streak = 1;
    if (user.streak > user.longestStreak) user.longestStreak = user.streak;
    user.lastActiveDate = today;
  }

  awardAchievement(userId, achievement) {
    const user = this.getUser(userId);
    if (!user) return null;
    if (user.achievements.some(a => a.id === achievement.id)) return null;
    const earned = { ...achievement, unlockedAt: Date.now() };
    user.achievements.push(earned);
    user.points += achievement.points || 10;
    return earned;
  }

  getDailyBreakdown(userId, days = 7) {
    const user = this.getUser(userId);
    if (!user) return [];
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US");
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      result.push({
        date: key,
        label,
        copies: user.copyEvents.filter(e => new Date(e.timestamp).toLocaleDateString("en-US") === key).length,
        timeMinutes: Math.floor((user.dailyTime[key] || 0) / 60)
      });
    }
    return result;
  }

  getRecentEvents(userId, limit = 20) {
    const user = this.getUser(userId);
    if (!user) return [];
    return user.copyEvents.slice(0, limit);
  }
}

const store = new Store();
module.exports = store;