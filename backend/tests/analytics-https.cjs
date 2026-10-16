// Optional diagnostic transport for synthetic analytics SQL tests only; never loaded by the API.
const { requireDevelopmentDatabase } = require('../scripts/development-database.cjs');
function createAnalyticsHttpsQuery(transport = fetch) {
  requireDevelopmentDatabase();
  if (process.env.ALLOW_DEVELOPMENT_DATABASE_TESTS !== 'true') throw Error('DEVELOPMENT_TEST_OPT_IN_REQUIRED');
  const connection = process.env.DATABASE_URL;
  const endpoint = `https://${new URL(connection).hostname}/sql`;
  return async sql => {
    // The integration suite must shadow BOTH tables with synthetic CTEs, never read real records.
    if (!/^WITH "HouseholdMember" AS/.test(sql.text.trim()) || !sql.text.includes('"PantryItemEvent" (id,')) {
      throw Error('SYNTHETIC_ANALYTICS_QUERY_REQUIRED');
    }
    if (sql.text.includes('JOIN "PantryItem"') && !sql.text.includes('"PantryItem" (id,')) throw Error('SYNTHETIC_ANALYTICS_QUERY_REQUIRED');
    try {
      const response = await transport(endpoint, { method: 'POST', redirect: 'error', credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': connection },
        body: JSON.stringify({ query: sql.text, params: sql.values }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Error();
      const body = await response.json();
      if (!Array.isArray(body.rows) || body.rows.length > 1008 || !Array.isArray(body.fields)) throw Error();
      return body.rows.map(row => Array.isArray(row) ? Object.fromEntries(body.fields.map((field, index) => [field.name, row[index]])) : row);
    } catch { throw Error('ANALYTICS_HTTPS_SQL_UNAVAILABLE'); } // Never echo connection strings/provider bodies.
  };
}
module.exports = { createAnalyticsHttpsQuery };
