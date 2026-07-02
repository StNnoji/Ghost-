const buckets = new Map();

function now() {
  return Date.now();
}

function isOnCooldown(key, milliseconds) {
  const expiresAt = buckets.get(key) || 0;
  if (expiresAt > now()) return true;
  buckets.set(key, now() + milliseconds);
  return false;
}

function countInWindow(key, limit, windowMs) {
  const current = now();
  const bucket = buckets.get(key) || [];
  const fresh = bucket.filter((timestamp) => current - timestamp < windowMs);
  if (fresh.length >= limit) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(current);
  buckets.set(key, fresh);
  return true;
}

module.exports = { isOnCooldown, countInWindow };
