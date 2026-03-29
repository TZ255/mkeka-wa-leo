function oddToWinPercent(odd) {
  return Math.round(100 / odd);
}

/**
 * Remove bookie margin from an array of decimal odds.
 * Returns array of fair probabilities (0-100) summing to ~100.
 * Skips null/undefined/invalid odds.
 */
function removeMargin(oddsArray) {
  const raw = oddsArray.map(o => (o && o >= 1) ? 1 / o : null);
  const valid = raw.filter(p => p !== null);
  if (valid.length < 2) return raw.map(p => p !== null ? Math.round(p * 100 * 10) / 10 : null);
  const overround = valid.reduce((s, p) => s + p, 0);
  return raw.map(p => p !== null ? Math.round((p / overround) * 100 * 10) / 10 : null);
}

module.exports = { oddToWinPercent, removeMargin }
