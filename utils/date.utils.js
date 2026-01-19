
// utils/date.utils.js
function clampMonthYear(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error('Invalid month');
  if (!Number.isInteger(y) || y < 1970 || y > 2100) throw new Error('Invalid year');
  return { month: m, year: y };
}

function getMonthRange(month, year) {
  const { month: m, year: y } = clampMonthYear(month, year);
  const startDate = new Date(y, m - 1, 1); // local TZ start
  const endDate = new Date(y, m, 0, 23, 59, 59, 999); // last day 23:59:59.999
  return { startDate, endDate };
}

function getDayRangeFromYMD(ymd) {
  // ymd format: 'YYYY-MM-DD'
  const [y, m, d] = String(ymd).split('-').map(Number);
  if (!y || !m || !d) throw new Error('Invalid date string (YYYY-MM-DD)');
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start, end };
}

// NEW: local 'YYYY-MM-DD' for a Date
function toDayKeyFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = { getMonthRange, getDayRangeFromYMD, toDayKeyFromDate };
