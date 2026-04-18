export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function avg(arr = []) {
  if (!arr.length) return 0;
  return arr.reduce((sum, n) => sum + Number(n || 0), 0) / arr.length;
}
