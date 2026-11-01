// ═══════════════════════════════════════════════════════════════════════════════
// 📌 SERVICE: Production Dashboard Data Layer
// ═══════════════════════════════════════════════════════════════════════════════
// Extracts database query logic out of the Express routes.
// ═══════════════════════════════════════════════════════════════════════════════

const { getPool, sql } = require('../db');

/**
 * Helper to get a configured DB request with common dates
 */
async function getConfiguredRequest(selectedYear) {
  const pool = await getPool();
  const activeYear = selectedYear || new Date().getFullYear();
  let refDate = new Date();
  if (selectedYear && selectedYear < new Date().getFullYear()) {
    refDate = new Date(selectedYear, 11, 31);
  }

  return pool.request()
    .input('year', sql.Int, selectedYear)
    .input('activeYear', sql.Int, activeYear)
    .input('refDate', sql.Date, refDate);
}

// ... Additional extraction goes here

module.exports = {
  getConfiguredRequest
};
