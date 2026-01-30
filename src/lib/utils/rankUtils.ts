export const ranks = [
  { name: "Rookie", min: 0, max: 99, color: "#9ca3af" },
  { name: "Bronze", min: 100, max: 249, color: "#cd7f32" },
  { name: "Silver", min: 250, max: 399, color: "#c0c0c0" },
  { name: "Gold", min: 400, max: 599, color: "#ffd700" },
  { name: "Platinum", min: 600, max: 899, color: "#4fdae6" },
  { name: "Diamond", min: 900, max: 1299, color: "#9fd5ff" },
  { name: "Master", min: 1300, max: 1799, color: "#de4bff" },
  { name: "Grandmaster", min: 1800, max: 2399, color: "#ff3366" },
  { name: "Legend", min: 2400, max: 2999, color: "#ff8f1f" },
  { name: "Mythic", min: 3000, max: 99999, color: "#e11d48" },
];

export function getRank(xp: number) {
  return ranks.find(r => xp >= r.min && xp <= r.max) || ranks[0];
}

export function getNextRank(xp: number) {
  const idx = ranks.findIndex(r => xp >= r.min && xp <= r.max);
  return ranks[idx + 1] || null;
}
