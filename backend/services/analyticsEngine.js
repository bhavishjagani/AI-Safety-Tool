/**
 * AI Safety Tool - Analytics Engine
 * Processes usage data into charts, trends, and behavioral reports
 */

// ─── Daily / Weekly Aggregation ───────────────────────────────────────────────
function getDailyStats(user, days = 7) {
  const result = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    const dateKey = d.toLocaleDateString("en-US");
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" :
      d.toLocaleDateString("en-US", { weekday: "short" });

    // Copies for that day
    const dayCopies = (user.copyEvents || []).filter(e => {
      return new Date(e.timestamp).toLocaleDateString("en-US") === dateKey;
    });

    // Time for that day
    const daySeconds = user.dailyTime?.[dateKey] || 0;

    // Risk for that day
    const dayRiskEntries = (user.riskHistory || []).filter(r => {
      return new Date(r.timestamp).toLocaleDateString("en-US") === dateKey;
    });
    const avgRisk = dayRiskEntries.length > 0
      ? Math.round(dayRiskEntries.reduce((s, r) => s + r.score, 0) / dayRiskEntries.length)
      : 0;

    // Category breakdown for that day
    const categories = {};
    dayCopies.forEach(e => {
      const cat = e.category || "general";
      categories[cat] = (categories[cat] || 0) + 1;
    });

    result.push({
      date: dateKey,
      label,
      copies: dayCopies.length,
      timeMinutes: Math.round(daySeconds / 60),
      avgRisk,
      categories,
      flaggedCopies: dayCopies.filter(e => e.flags && e.flags.length > 0).length
    });
  }

  return result;
}

// ─── Hourly Pattern Analysis ──────────────────────────────────────────────────
function getHourlyPattern(user) {
  const hours = Array(24).fill(0);
  const hourLabels = Array.from({ length: 24 }, (_, i) => {
    if (i === 0) return "12am";
    if (i < 12) return `${i}am`;
    if (i === 12) return "12pm";
    return `${i - 12}pm`;
  });

  (user.copyEvents || []).forEach(e => {
    const hour = new Date(e.timestamp).getHours();
    hours[hour]++;
  });

  return { hours, hourLabels };
}

// ─── AI Platform Breakdown ────────────────────────────────────────────────────
function getAIBreakdown(user) {
  const usage = user.aiUsage || {};
  const total = Object.values(usage).reduce((s, v) => s + v, 0);

  return Object.entries(usage)
    .filter(([, count]) => count > 0)
    .map(([platform, count]) => ({
      platform,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Weekly Report Generator ──────────────────────────────────────────────────
function generateWeeklyReport(user) {
  const daily = getDailyStats(user, 7);
  const totalCopies = daily.reduce((s, d) => s + d.copies, 0);
  const totalMinutes = daily.reduce((s, d) => s + d.timeMinutes, 0);
  const avgRisk = daily.filter(d => d.avgRisk > 0).length > 0
    ? Math.round(daily.reduce((s, d) => s + d.avgRisk, 0) / daily.filter(d => d.avgRisk > 0).length)
    : 0;

  const busiest = [...daily].sort((a, b) => b.copies - a.copies)[0];
  const quietest = [...daily].filter(d => d.copies > 0).sort((a, b) => a.copies - b.copies)[0];

  // Trend: compare this week vs last week
  const thisWeek = daily.reduce((s, d) => s + d.copies, 0);
  const trend = thisWeek > 20 ? "increasing" : thisWeek < 5 ? "low" : "steady";

  return {
    period: "Last 7 Days",
    totalCopies,
    totalMinutes,
    avgRisk,
    busiestDay: busiest?.label || "N/A",
    quietestDay: quietest?.label || "N/A",
    trend,
    flaggedCopies: daily.reduce((s, d) => s + d.flaggedCopies, 0),
    dailyBreakdown: daily
  };
}

// ─── Risk Timeline ────────────────────────────────────────────────────────────
function getRiskTimeline(user, limit = 20) {
  return (user.riskHistory || [])
    .slice(-limit)
    .map(entry => ({
      time: new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      score: entry.score,
      level: entry.level,
      triggers: entry.triggers || []
    }));
}

// ─── Behavior Score (0-100 positive score, inverse of risk) ───────────────────
function getBehaviorScore(user) {
  const recentRisk = (user.riskHistory || []).slice(-5);
  const avgRisk = recentRisk.length > 0
    ? recentRisk.reduce((s, r) => s + r.score, 0) / recentRisk.length
    : 0;

  // Bonus for low copy rate
  const copyBonus = Math.max(0, 20 - user.copyCount * 2);

  // Bonus for being under time goal
  const timeMinutes = Math.floor(user.totalTime / 60);
  const timeBonus = timeMinutes < (user.settings?.dailyGoal || 30) ? 15 : 0;

  // Streak bonus
  const streakBonus = Math.min(user.streak * 5, 20);

  const base = Math.max(0, 100 - avgRisk);
  const total = Math.min(100, Math.round(base * 0.6 + copyBonus + timeBonus + streakBonus));

  return {
    score: total,
    grade: total >= 90 ? "A+" : total >= 80 ? "A" : total >= 70 ? "B" : total >= 60 ? "C" : "D",
    label: total >= 80 ? "Excellent" : total >= 60 ? "Good" : total >= 40 ? "Fair" : "Needs Improvement"
  };
}

// ─── Smart Recommendations ────────────────────────────────────────────────────
function getRecommendations(user) {
  const recs = [];
  const timeMinutes = Math.floor(user.totalTime / 60);
  const aiBreakdown = getAIBreakdown(user);

  if (user.copyCount > 10) {
    recs.push({
      id: "reduce_copies",
      icon: "✍️",
      title: "Switch to Note-Taking",
      body: "Instead of copying AI responses, try writing 3-bullet summaries in your own words.",
      priority: "high"
    });
  }

  if (timeMinutes > 60) {
    recs.push({
      id: "pomodoro",
      icon: "🍅",
      title: "Try Pomodoro with AI",
      body: "Use AI for 25 minutes, then take a 5-minute break and attempt the task yourself.",
      priority: "medium"
    });
  }

  if (aiBreakdown.length === 1) {
    recs.push({
      id: "diversify",
      icon: "🔀",
      title: "Diversify Your AI Sources",
      body: "Relying on a single AI model creates blind spots. Try cross-referencing with another tool.",
      priority: "low"
    });
  }

  const homeworkCopies = (user.copyEvents || []).filter(e => e.category === "homework").length;
  if (homeworkCopies > 3) {
    recs.push({
      id: "homework_help",
      icon: "📚",
      title: "Academic Integrity Alert",
      body: "Detected repeated homework-related copying. Try using AI to explain concepts rather than give answers.",
      priority: "high"
    });
  }

  recs.push({
    id: "verify_sources",
    icon: "🔍",
    title: "Verify Before You Trust",
    body: "AI tools make mistakes. For any important fact, verify with an authoritative source like a textbook or official site.",
    priority: "medium"
  });

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

module.exports = {
  getDailyStats,
  getHourlyPattern,
  getAIBreakdown,
  generateWeeklyReport,
  getRiskTimeline,
  getBehaviorScore,
  getRecommendations
};