function format(level, message, meta) {
  const stamp = new Date().toISOString();
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${stamp}] [${level}] ${message}${suffix}`;
}

module.exports = {
  info(message, meta) {
    console.log(format("info", message, meta));
  },
  warn(message, meta) {
    console.warn(format("warn", message, meta));
  },
  error(message, error) {
    const meta = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(format("error", message, meta));
  }
};
