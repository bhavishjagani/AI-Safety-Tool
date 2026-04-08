function calculateRisk(stats) {
  let score = 0;

  score += stats.copyCount * 2;
  score += Math.floor(stats.totalTime / 60);
  score += Object.keys(stats.aiUsage).length * 5;

  if (stats.copyCount > 5) score += 10;
  if (stats.totalTime > 1800) score += 15;

  let level = "low";
  if (score > 30) level = "medium";
  if (score > 60) level = "high";

  return { score, level };
}

module.exports = { calculateRisk };