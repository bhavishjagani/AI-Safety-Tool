function generateAnalytics(store) {
  const daily = {};
  const weekly = {};

  store.logs.forEach(log => {
    const date = new Date(log.timestamp).toLocaleDateString();
    daily[date] = (daily[date] || 0) + 1;

    const week = Math.floor(new Date(log.timestamp).getDate() / 7);
    weekly[week] = (weekly[week] || 0) + 1;
  });

  return { daily, weekly };
}

module.exports = { generateAnalytics };

function calculateStreak(logs) {
  let streak = 0;
  let today = new Date().toDateString();

  const days = new Set(
    logs.map(l => new Date(l.timestamp).toDateString())
  );

  while (days.has(today)) {
    streak++;
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    today = d.toDateString();
  }

  return streak;
}

module.exports = { calculateStreak };

function classifyText(text) {
  if (!text) return "none";

  if (text.includes("answer")) return "homework";
  if (text.includes("essay")) return "writing";
  if (text.length > 500) return "generated";

  return "general";
}

module.exports = { classifyText };