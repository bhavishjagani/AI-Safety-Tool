/**
 * AI Safety Tool - Risk Engine
 * Calculates multi-dimensional risk scores based on user behavior patterns
 */

// ─── Risk Weights ─────────────────────────────────────────────────────────────
const WEIGHTS = {
  copyCount: 2.5,
  timePerSession: 0.8,
  rapidCopies: 15,       // copies within 60s of each other
  largeContent: 8,        // texts > 500 chars
  homeworkFlag: 12,
  overconfidentFlag: 10,
  certaintyFlag: 6,
  deepFakeFlag: 20,
  multipleAI: 5,          // using 3+ different AI tools
  lateNight: 4,           // usage 11pm–4am
  weekendBinge: 6,
  noBreaks: 10,           // > 90 min straight usage
  singleSiteObsession: 7  // > 80% of time on one AI
};

// ─── Flag Definitions ─────────────────────────────────────────────────────────
const FLAG_PATTERNS = [
  {
    id: "large_content",
    label: "Large AI content copied",
    description: "You copied a response longer than 500 characters. Consider reading and understanding before using.",
    check: (text) => text && text.length > 500,
    weight: 8,
    tip: "Break down large responses into smaller chunks and verify each claim independently."
  },
  {
    id: "overconfident",
    label: "Overconfident AI language",
    description: "This AI response contains certainty-language that may not be warranted.",
    check: (text) => text && (
      /definitely correct|absolutely certain|100% accurate|guaranteed|without a doubt/i.test(text)
    ),
    weight: 10,
    tip: "AI models can be confidently wrong. Cross-reference important claims with verified sources."
  },
  {
    id: "absolute_language",
    label: "Absolute statements detected",
    description: "Words like 'always' or 'never' signal potential oversimplification.",
    check: (text) => text && /\b(always|never|everyone|nobody|all people|no one ever)\b/i.test(text),
    weight: 6,
    tip: "Real-world situations are rarely absolute. Look for nuance and exceptions."
  },
  {
    id: "homework_detected",
    label: "Possible homework answer",
    description: "This looks like an academic answer. Using AI responses directly may violate academic integrity.",
    check: (text) => text && (
      /\b(answer|solution|calculate|solve|the answer is|therefore|thus|in conclusion)\b/i.test(text) &&
      text.length > 100
    ),
    weight: 12,
    tip: "Use AI as a tutor that explains concepts, not as a homework-completion service."
  },
  {
    id: "essay_content",
    label: "Essay or long-form writing",
    description: "Copying long-form writing from AI tools can harm your own writing development.",
    check: (text) => text && (
      /\b(introduction|conclusion|furthermore|moreover|in summary|firstly|secondly)\b/i.test(text) &&
      text.length > 300
    ),
    weight: 10,
    tip: "Use AI to improve your own draft, not to write from scratch for you."
  },
  {
    id: "heavy_reliance",
    label: "Heavy reliance on AI response",
    description: "This is a very long copied passage — over 150 words.",
    check: (text) => text && text.split(/\s+/).length > 150,
    weight: 8,
    tip: "Summarize key insights in your own words instead of copying full responses."
  },
  {
    id: "code_copied",
    label: "Code copied from AI",
    description: "You copied code. Make sure you understand what each line does before using it.",
    check: (text) => text && (
      /```[\s\S]*```|function\s+\w+\s*\(|def\s+\w+\s*\(|class\s+\w+\s*[:{]/i.test(text)
    ),
    weight: 7,
    tip: "Reading code is different from understanding it. Trace through the logic manually."
  },
  {
    id: "personal_data_risk",
    label: "Possible personal data in prompt",
    description: "This text may contain personal information. Be cautious about what you share with AI.",
    check: (text) => text && (
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i.test(text)
    ),
    weight: 15,
    tip: "Avoid sharing personal information (phone numbers, emails, SSNs) with AI tools."
  }
];

// ─── Text Classifier ──────────────────────────────────────────────────────────
function classifyText(text) {
  if (!text) return "general";

  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  // Code detection
  if (/```|function\s*\(|def\s+\w+|import\s+\w+|const\s+\w+\s*=|<\/?[a-z]+>/i.test(text)) {
    return "coding";
  }

  // Essay/writing detection
  if (wordCount > 100 && /introduction|conclusion|furthermore|moreover|thesis|paragraph/i.test(lower)) {
    return "writing";
  }

  // Homework detection
  if (/calculate|solve|find the|what is the value|equation|problem|exercise|homework/i.test(lower)) {
    return "homework";
  }

  // Research detection
  if (/according to|study shows|research indicates|data suggests|sources|citation|reference/i.test(lower)) {
    return "research";
  }

  // Creative writing
  if (/story|character|plot|poem|fiction|narrative|once upon/i.test(lower)) {
    return "creative";
  }

  return "general";
}

// ─── Flag Analyzer ────────────────────────────────────────────────────────────
function analyzeText(text) {
  if (!text || text.length < 5) return { flags: [], riskScore: 0, tips: [], category: "general" };

  const matchedFlags = [];
  let riskScore = 0;
  const tips = [];

  for (const pattern of FLAG_PATTERNS) {
    if (pattern.check(text)) {
      matchedFlags.push({
        id: pattern.id,
        label: pattern.label,
        description: pattern.description,
        weight: pattern.weight
      });
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

// ─── Session Risk Calculator ──────────────────────────────────────────────────
function calculateSessionRisk(user) {
  let score = 0;
  const triggers = [];

  // Copy frequency
  const copyRisk = user.copyCount * WEIGHTS.copyCount;
  score += Math.min(copyRisk, 30);

  if (user.copyCount > 3) triggers.push(`${user.copyCount} copies detected`);

  // Time usage
  const timeMinutes = Math.floor(user.totalTime / 60);
  const timeRisk = timeMinutes * 0.5;
  score += Math.min(timeRisk, 25);

  if (timeMinutes > 45) triggers.push(`${timeMinutes} minutes of AI usage`);

  // Rapid copies (within 60s of each other)
  if (user.copyEvents && user.copyEvents.length > 1) {
    let rapidCount = 0;
    const sorted = [...user.copyEvents].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].timestamp - sorted[i-1].timestamp;
      if (gap < 60000) rapidCount++;
    }
    if (rapidCount > 0) {
      score += rapidCount * 5;
      triggers.push(`${rapidCount} rapid consecutive copies`);
    }
  }

  // High-risk flags from copy events
  if (user.copyEvents) {
    const flagCounts = {};
    user.copyEvents.forEach(e => {
      if (e.flags) {
        e.flags.forEach(f => {
          const fId = typeof f === "string" ? f : f.id;
          flagCounts[fId] = (flagCounts[fId] || 0) + 1;
        });
      }
    });

    if (flagCounts.homework_detected > 2) {
      score += 15;
      triggers.push("Repeated homework-related copying");
    }
    if (flagCounts.heavy_reliance > 2) {
      score += 10;
      triggers.push("Heavy content reliance detected");
    }
  }

  // Multi-site usage
  const activeSites = Object.entries(user.aiUsage || {})
    .filter(([, count]) => count > 0).length;
  if (activeSites >= 3) {
    score += WEIGHTS.multipleAI;
    triggers.push(`Using ${activeSites} different AI tools`);
  }

  // Late-night usage
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 4) {
    score += WEIGHTS.lateNight;
    triggers.push("Late-night AI usage");
  }

  // No breaks (time > 90 min)
  if (user.totalTime > 5400) {
    score += WEIGHTS.noBreaks;
    triggers.push("90+ minutes without break");
  }

  score = Math.min(Math.round(score), 100);

  let level = "low";
  let color = "#22c55e";
  let emoji = "✅";
  let message = "Your AI usage looks healthy today.";

  if (score > 25 && score <= 50) {
    level = "moderate";
    color = "#f59e0b";
    emoji = "⚠️";
    message = "Some patterns suggest you may be over-relying on AI.";
  } else if (score > 50 && score <= 75) {
    level = "high";
    color = "#f97316";
    emoji = "🚨";
    message = "High AI dependency detected. Consider taking a break.";
  } else if (score > 75) {
    level = "critical";
    color = "#ef4444";
    emoji = "🔴";
    message = "Critical reliance level. Your learning may be at risk.";
  }

  return { score, level, color, emoji, message, triggers };
}

// ─── Generate Smart Insights ──────────────────────────────────────────────────
function generateInsights(user) {
  const insights = [];
  const timeMinutes = Math.floor(user.totalTime / 60);

  // Peak usage insight
  if (user.copyEvents && user.copyEvents.length > 0) {
    const hours = user.copyEvents.map(e => new Date(e.timestamp).getHours());
    const peakHour = mode(hours);
    const peakLabel = peakHour === 0 ? "midnight" : peakHour < 12 ? `${peakHour}am` : `${peakHour - 12}pm`;
    insights.push({
      type: "pattern",
      icon: "🕐",
      title: "Peak Usage Time",
      body: `You're most active on AI tools around ${peakLabel}. Try scheduling focused AI sessions to avoid drift.`,
      priority: 2
    });
  }

  // Most used AI
  const topAI = Object.entries(user.aiUsage || {})
    .filter(([, v]) => v > 0)
    .sort(([,a], [,b]) => b - a)[0];
  if (topAI) {
    insights.push({
      type: "info",
      icon: "🤖",
      title: `You Use ${topAI[0]} the Most`,
      body: `${topAI[0]} accounts for ${topAI[1]} of your copy events. Diversifying AI tools can reduce dependency on a single source.`,
      priority: 1
    });
  }

  // Copy frequency
  if (user.copyCount > 10) {
    insights.push({
      type: "warning",
      icon: "📋",
      title: "Frequent Copying Detected",
      body: `You've copied AI content ${user.copyCount} times. Try writing summaries in your own words instead.`,
      priority: 3
    });
  }

  // Time insight
  if (timeMinutes > 60) {
    insights.push({
      type: "warning",
      icon: "⏰",
      title: "Extended AI Session",
      body: `You've spent ${timeMinutes} minutes on AI tools today. The recommended limit for focused, healthy use is 30-45 minutes per session.`,
      priority: 4
    });
  }

  // Positive insight: streak
  if (user.streak > 2) {
    insights.push({
      type: "success",
      icon: "🔥",
      title: `${user.streak}-Day Streak!`,
      body: `You've been engaging with AI tools for ${user.streak} consecutive days. Stay consistent and mindful!`,
      priority: 1
    });
  }

  // Content category insight
  const topCategory = Object.entries(user.contentCategories || {})
    .filter(([, v]) => v > 0)
    .sort(([,a], [,b]) => b - a)[0];
  if (topCategory) {
    const categoryMessages = {
      homework: "Most of your AI usage involves homework. Make sure you're learning concepts, not just getting answers.",
      coding: "You're using AI heavily for coding. Review and understand every snippet before adding it to your project.",
      writing: "AI is helping with your writing. Try drafting first, then using AI to refine — not replace — your work.",
      research: "Research-heavy AI use detected. Always verify AI-provided facts with primary sources.",
      creative: "Creative AI use is great! Just ensure your own creative voice leads the work."
    };
    const msg = categoryMessages[topCategory[0]];
    if (msg) {
      insights.push({
        type: "tip",
        icon: "💡",
        title: `${topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1)} Focus`,
        body: msg,
        priority: 2
      });
    }
  }

  // Sort by priority
  return insights.sort((a, b) => b.priority - a.priority);
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function mode(arr) {
  const counts = {};
  arr.forEach(v => counts[v] = (counts[v] || 0) + 1);
  return parseInt(Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0] || 0);
}

// ─── Achievement Checker ──────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: "first_copy", title: "First Copy", description: "Tracked your first AI copy", points: 5, icon: "📋" },
  { id: "streak_3", title: "3-Day Streak", description: "Used AI mindfully for 3 days", points: 15, icon: "🔥" },
  { id: "streak_7", title: "Weekly Warrior", description: "7-day AI usage streak", points: 50, icon: "⚡" },
  { id: "low_risk", title: "Safe User", description: "Maintained low risk for a day", points: 20, icon: "🛡️" },
  { id: "copy_10", title: "Copy Watcher", description: "Tracked 10 copy events", points: 10, icon: "👀" },
  { id: "copy_50", title: "Data Collector", description: "Tracked 50 copy events", points: 25, icon: "📊" },
  { id: "multi_ai", title: "AI Explorer", description: "Used 3+ different AI tools", points: 15, icon: "🌐" },
  { id: "goal_met", title: "On Target", description: "Stayed under your daily time goal", points: 20, icon: "🎯" }
];

function checkAchievements(user, store) {
  const earned = [];

  if (user.copyCount >= 1) {
    const a = store.awardAchievement(user.id, ACHIEVEMENTS.find(a => a.id === "first_copy"));
    if (a) earned.push(a);
  }
  if (user.copyCount >= 10) {
    const a = store.awardAchievement(user.id, ACHIEVEMENTS.find(a => a.id === "copy_10"));
    if (a) earned.push(a);
  }
  if (user.copyCount >= 50) {
    const a = store.awardAchievement(user.id, ACHIEVEMENTS.find(a => a.id === "copy_50"));
    if (a) earned.push(a);
  }
  if (user.streak >= 3) {
    const a = store.awardAchievement(user.id, ACHIEVEMENTS.find(a => a.id === "streak_3"));
    if (a) earned.push(a);
  }
  if (user.streak >= 7) {
    const a = store.awardAchievement(user.id, ACHIEVEMENTS.find(a => a.id === "streak_7"));
    if (a) earned.push(a);
  }

  const activeSites = Object.values(user.aiUsage || {}).filter(v => v > 0).length;
  if (activeSites >= 3) {
    const a = store.awardAchievement(user.id, ACHIEVEMENTS.find(a => a.id === "multi_ai"));
    if (a) earned.push(a);
  }

  return earned;
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