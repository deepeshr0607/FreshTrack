const target = require('../prisma/development-target.json');

// This guard protects local fixture/migration tools, not runtime authorization.
function requireDevelopmentDatabase(env = process.env) {
  const reject = () => { throw new Error('DEVELOPMENT_DATABASE_REQUIRED'); };
  if (env.NODE_ENV !== 'development' || env.APP_ENV !== 'development' || env.VERCEL_ENV) reject();
  let pooled, direct, auth;
  try {
    pooled = new URL(env.DATABASE_URL);
    direct = new URL(env.DIRECT_URL);
    auth = new URL(env.NEON_AUTH_URL);
  } catch { reject(); }
  for (const url of [pooled, direct]) {
    const keys = [...url.searchParams.keys()];
    if (new Set(keys).size !== keys.length) reject();
    if (!['postgresql:', 'postgres:'].includes(url.protocol) || !url.username || !url.password ||
        url.pathname !== `/${target.database}` || (url.port && url.port !== '5432') ||
        !['require', 'verify-full'].includes(url.searchParams.get('sslmode'))) reject();
    // Reject options that could redirect schemas, connections or certificate handling.
    for (const [key, value] of url.searchParams) {
      if (!['sslmode', 'pgbouncer', 'connect_timeout', 'connection_limit', 'pool_timeout', 'schema', 'channel_binding'].includes(key)) reject();
      if (key === 'schema' && value !== 'public') reject();
      if (key === 'pgbouncer' && value !== 'true') reject();
      if (key === 'channel_binding' && value !== 'require') reject();
      if (['connect_timeout', 'connection_limit', 'pool_timeout'].includes(key) && !/^[1-9][0-9]*$/.test(value)) reject();
    }
  }
  if (direct.hostname !== target.hostname || pooled.hostname !== target.hostname.replace('.', '-pooler.') ||
      direct.username !== pooled.username || direct.password !== pooled.password ||
      auth.protocol !== 'https:' || auth.hostname !== target.hostname.replace('.', '.neonauth.') ||
      auth.pathname !== `/${target.database}/auth` || auth.port || auth.search || auth.hash || auth.username || auth.password) reject();
  return target;
}

module.exports = { requireDevelopmentDatabase };
