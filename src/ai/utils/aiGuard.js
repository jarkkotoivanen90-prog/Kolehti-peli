function isInvalidNumber(value) {
  return typeof value !== "number" || Number.isNaN(value);
}

export function sanitizeNumbers(obj = {}) {
  const cleaned = {};

  for (const key in obj) {
    const value = obj[key];
    cleaned[key] = isInvalidNumber(value) ? 0 : value;
  }

  return cleaned;
}

export function safeRun(label, fn, fallback) {
  try {
    const result = fn();

    if (!result) {
      console.warn(`⚠️ ${label} returned empty, using fallback`);
      return fallback;
    }

    return result;
  } catch (err) {
    console.error(`❌ ${label} crashed:`, err.message);
    return fallback;
  }
}
