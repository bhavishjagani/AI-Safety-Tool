/**
 * AI Safety Tool - Risk Engine
 * Calculates multi-dimensional risk scores based on user behavior patterns
 */

const WEIGHTS = {
  copyCount: 2.5,
  timePerSession: 0.8,
  rapidCopies: 15,
  largeContent: 8,
  homeworkFlag: 12,
  overconfidentFlag: 10,
  certaintyFlag: 6,
  deepFakeFlag: 20,
  multipleAI: 5,
  lateNight: 4,
  weekendBinge: 6,
  noBreaks: 10,
  singleSiteObsession: 7
};

const FLAG_PATTERNS = [
  {
    id: "large_content",
    label: "Large AI content copied",
    description: "You copied a response longer than 500 characters.",
    check: (text) => text && text.length > 500,
    weight: 8,
    tip: "Break down large responses into smaller chunks."
  },
  {
    id: "overconfident",
    label: "Overconfident AI language",
    description: "Contains certainty-language that may not be warranted.",
    check: (text) => text && /definitely correct|absolutely certain|100% accurate|guaranteed/i.test(text),
    weight: 10,
    tip: "Cross-reference important claims with verified sources."
  },
  {
    id: "absolute_language",
    label: "Absolute statements detected",
    description: "Words like 'always' or 'never' signal oversimplification.",
    check: (text) => text && /\b(always|never|everyone|nobody)\b/i.test(text),
    weight: 6,
    tip: "Real-world situations are rarely absolute."
  },
  {
    id: "homework_detected",
    label: "Possible homework answer",
    description: "This looks like an academic answer.",
    check: (text) => text && /\b(answer|solution|calculate|solve|the answer is)\b/i.test(text) && text.length > 100,
    weight: 12,
    tip: "Use AI as a tutor, not a homework-completion service."
  },
  {
    id: "essay_content",
    label: "Essay or long-form writing",
    description: "Copying long-form writing can harm your own writing development.",
    check: (text) => text && /\b(introduction|conclusion|furthermore|moreover)\b/i.test(text) && text.length > 300,
    weight: 10,
    tip: "Use AI to improve your own draft, not write from scratch."
  },
  {
    id: "heavy_reliance",
    label: "Heavy reliance on AI response",
    description: "Very long copied passage — over 150 words.",
    check: (text) => text && text.split(/\s+/).length > 150,
    weight: 8,
    tip: "Summarize key insights in your own words."
  },
  {
    id: "code_copied",
    label: "Code copied from AI",
    description: "You copied code. Understand each line before using.",
    check: (text) => text && /```|function\s*\(|def\s+\w+|class\s+\w+/.test(text),
    weight: 7,
    tip: "Trace through the logic manually."
  },
  {
    id: "personal_data_risk",
    label: "Possible personal data in prompt",
    description: "May contain personal information.",
    check: (text) => text && /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(text),
    weight: 15,
    tip: "Avoid sharing personal info with AI tools."
  }
];

function classifyText(text) {
  if (!text) return "general";
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;
  if (/```|function\s*\(|def\s+\w+|import\s+\w+/.test(text)) return "coding";
  if (wordCount > 100 && /introduction|conclusion|furthermore|moreover|thesis/.test(lower)) return "writing";
  if (/calculate|solve|find the|equation|homework/.test(lower)) return "homework";
  if (/according to|study shows|research indicates|data suggests/.test(lower)) return "research";
  if (/story|character|plot|poem|fiction/.test(lower)) return "creative";
  return "general";
}

function analyzeText(text) {
  if (!text || text.length < 5) return { flags: [], riskScore: 0, tips: [], category: "general", wordCount: 0, charCount: 0 };
  const matchedFlags = [];
  let riskScore = 0;
  const tips = [];
  for (const pattern of FLAG_PATTERNS) {
    if (pattern.check(text)) {
      matchedFlags.push({ id: pattern.id, label: pattern.label, weight: pattern.weight });
      riskScore += pattern.weight;
      tips.push(pattern.tip);
    }
  }
  const category = classifyText(text);
  return {
    flags: matchedFlags,
    riskScore: Math.min(riskScore, 100),
    tips: [...new Set(tips)],
    category,
    wordCount: text.split(/\s+/).length,
    charCount: text.length
  };
}

function calculateSessionRisk(user) {
  let score = 0;
  const triggers = [];
  const copyRisk = (user.copyCount || 0) * WEIGHTS.copyCount;
  score += Math.min(copyRisk, 30);
  if (user.copyCount > 3) triggers.push(`${user.copyCount} copies detected`);
  const timeMinutes = Math.floor((user.totalTime || 0) / 60);
  const timeRisk = timeMinutes * 0.5;
  score += Math.min(timeRisk, 25);
  if (timeMinutes > 45) triggers.push(`${timeMinutes} minutes of AI usage`);
  if (user.copyEvents && user.copyEvents.length > 1) {
    let rapidCount = 0;
    const sorted = [...user.copyEvents].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].timestamp - sorted[i-1].timestamp < 60000) rapidCount++;
    }
    if (rapidCount > 0) {
      score += rapidCount * 5;
      triggers.push(`${rapidCount} rapid consecutive copies`);
    }
  }
  const activeSites = Object.entries(user.aiUsage || {}).filter(([,c]) => c > 0).length;
  if (activeSites >= 3) {
    score += WEIGHTS.multipleAI;
    triggers.push(`Using ${activeSites} different AI tools`);
  }
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 4) {
    score += WEIGHTS.lateNight;
    triggers.push("Late-night AI usage");
  }
  if ((user.totalTime || 0) > 5400) {
    score += WEIGHTS.noBreaks;
    triggers.push("90+ minutes without break");
  }
  score = Math.min(Math.round(score), 100);
  let level = "low";
  let emoji = "✅";
  let message = "Your AI usage looks healthy today.";
  if (score > 25 && score <= 50) { level = "moderate"; emoji = "⚠️"; message = "Some patterns suggest you may be over-relying on AI."; }
  else if (score > 50 && score <= 75) { level = "high"; emoji = "🚨"; message = "High AI dependency detected. Consider taking a break."; }
  else if (score > 75) { level = "critical"; emoji = "🔴"; message = "Critical reliance level. Your learning may be at risk."; }
  return { score, level, emoji, message, triggers };
}

function generateInsights(user) {
  const insights = [];
  const timeMinutes = Math.floor((user.totalTime || 0) / 60);
  if ((user.copyCount || 0) === 0 && timeMinutes === 0) {
    insights.push({ type: "info", icon: "🚀", title: "Welcome to AI Guardian!", body: "Visit any AI site and start copying text. We'll analyze your usage.", priority: 10 });
    insights.push({ type: "tip", icon: "💡", title: "How It Works", body: "We track copies and time, flag risky content, and provide personalized insights.", priority: 9 });
    return insights;
  }
  if (user.copyEvents && user.copyEvents.length > 0) {
    const hours = user.copyEvents.map(e => new Date(e.timestamp).getHours());
    const peakHour = mode(hours);
    const peakLabel = peakHour === 0 ? "midnight" : peakHour < 12 ? `${peakHour}am` : `${peakHour-12}pm`;
    insights.push({ type: "pattern", icon: "🕐", title: "Peak Usage Time", body: `You're most active around ${peakLabel}.`, priority: 2 });
  }
  const topAI = Object.entries(user.aiUsage || {}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a)[0];
  if (topAI) {
    insights.push({ type: "info", icon: "🤖", title: `You Use ${topAI[0]} the Most`, body: `${topAI[0]} accounts for ${topAI[1]} copies. Diversifying reduces dependency.`, priority: 1 });
  }
  if ((user.copyCount || 0) > 5) {
    insights.push({ type: "warning", icon: "📋", title: "Frequent Copying Detected", body: `You've copied AI content ${user.copyCount} times. Try writing summaries.`, priority: 3 });
  } else if ((user.copyCount || 0) > 0) {
    insights.push({ type: "success", icon: "✅", title: "Moderate Copying", body: `${user.copyCount} copies so far. Stay mindful.`, priority: 2 });
  }
  if (timeMinutes > 60) {
    insights.push({ type: "warning", icon: "⏰", title: "Extended AI Session", body: `${timeMinutes} minutes on AI today. Recommended limit is 30-45 minutes.`, priority: 4 });
  } else if (timeMinutes > 0) {
    insights.push({ type: "success", icon: "⏱️", title: "Healthy Usage Time", body: `${timeMinutes} minutes on AI. Keep taking breaks.`, priority: 1 });
  }
  if ((user.streak || 0) > 2) {
    insights.push({ type: "success", icon: "🔥", title: `${user.streak}-Day Streak!`, body: `Consistent for ${user.streak} days.`, priority: 1 });
  }
  const topCategory = Object.entries(user.contentCategories || {}).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a)[0];
  if (topCategory) {
    const msgs = { homework: "Make sure you're learning concepts, not just answers.", coding: "Review every snippet before using.", writing: "Draft first, then refine with AI.", research: "Verify AI facts with primary sources.", creative: "Let your own voice lead." };
    insights.push({ type: "tip", icon: "💡", title: `${topCategory[0].charAt(0).toUpperCase()+topCategory[0].slice(1)} Focus`, body: msgs[topCategory[0]] || "Keep balanced usage.", priority: 2 });
  }
  if (insights.length === 0) {
    insights.push({ type: "info", icon: "📊", title: "Data Gathering", body: "More insights will appear as we collect data.", priority: 1 });
  }
  return insights.sort((a,b)=>b.priority - a.priority);
}

function mode(arr) {
  if (!arr.length) return 12;
  const counts = {};
  arr.forEach(v => counts[v] = (counts[v]||0)+1);
  return parseInt(Object.entries(counts).sort(([,a],[,b])=>b-a)[0]?.[0] || 12);
}

const ACHIEVEMENTS = [
  { id: "first_copy", title: "First Copy", description: "Tracked your first AI copy", points: 5, icon: "📋" },
  { id: "streak_3", title: "3-Day Streak", description: "Used AI mindfully for 3 days", points: 15, icon: "🔥" },
  { id: "streak_7", title: "Weekly Warrior", description: "7-day AI usage streak", points: 50, icon: "⚡" },
  { id: "copy_10", title: "Copy Watcher", description: "Tracked 10 copy events", points: 10, icon: "👀" },
  { id: "copy_50", title: "Data Collector", description: "Tracked 50 copy events", points: 25, icon: "📊" },
  { id: "multi_ai", title: "AI Explorer", description: "Used 3+ different AI tools", points: 15, icon: "🌐" }
];

function checkAchievements(user, store) {
  const earned = [];
  if (user.copyCount >= 1) earned.push(store.awardAchievement(user.id, ACHIEVEMENTS.find(a=>a.id==="first_copy")));
  if (user.copyCount >= 10) earned.push(store.awardAchievement(user.id, ACHIEVEMENTS.find(a=>a.id==="copy_10")));
  if (user.copyCount >= 50) earned.push(store.awardAchievement(user.id, ACHIEVEMENTS.find(a=>a.id==="copy_50")));
  if (user.streak >= 3) earned.push(store.awardAchievement(user.id, ACHIEVEMENTS.find(a=>a.id==="streak_3")));
  if (user.streak >= 7) earned.push(store.awardAchievement(user.id, ACHIEVEMENTS.find(a=>a.id==="streak_7")));
  const activeSites = Object.values(user.aiUsage || {}).filter(v=>v>0).length;
  if (activeSites >= 3) earned.push(store.awardAchievement(user.id, ACHIEVEMENTS.find(a=>a.id==="multi_ai")));
  return earned.filter(Boolean);
}

module.exports = {
  analyzeText,
  classifyText,
  calculateSessionRisk,
  generateInsights,
  checkAchievements,
  FLAG_PATTERNS,
  ACHIEVEMENTS
};