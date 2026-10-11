const { requireDevelopmentDatabase } = require('./development-database.cjs');

/** This checkpoint targets a Vercel preview and the reviewed Neon development branch only. */
function requirePreviewEnvironment(env = process.env) {
  const reject = (field) => { throw new Error(`PREVIEW_CONFIGURATION_REQUIRED:${field}`); };
  if (env.NODE_ENV !== 'production') reject('NODE_ENV');
  if (env.VERCEL_ENV !== 'preview') reject('VERCEL_ENV');
  if (env.APP_ENV !== 'preview') reject('APP_ENV');
  // Reuse strict target/URL validation without permitting fixture tools to run on Vercel.
  let target;
  try { target = requireDevelopmentDatabase({ ...env, NODE_ENV: 'development', APP_ENV: 'development', VERCEL_ENV: undefined }); }
  catch { reject('NEON_TARGET'); }
  const pool = new URL(env.DATABASE_URL);
  if (pool.searchParams.get('connection_limit') !== '1' || pool.searchParams.get('pool_timeout') !== '10') reject('POOL_OPTIONS');
  const origins = env.ALLOWED_ORIGINS;
  // Native-only preview: 'none' rejects browser origins while allowing native no-Origin requests.
  if (origins !== 'none') {
    if (typeof origins !== 'string' || !origins) reject('ALLOWED_ORIGINS');
    for (const value of origins.split(',')) {
      let origin;
      try { origin = new URL(value); } catch { reject('ALLOWED_ORIGINS'); }
      if (value !== origin.origin || origin.protocol !== 'https:' || origin.username || origin.password ||
          origin.hostname === 'localhost' || origin.hostname.endsWith('.invalid')) reject('ALLOWED_ORIGINS');
    }
  }
  return target;
}

if (require.main === module) {
  try {
    requirePreviewEnvironment();
    process.stdout.write('Preview environment validated; no database writes performed.\n');
  } catch (error) {
    // Only fixed field labels are exposed; never print environment values or raw URL errors.
    const label = /^(PREVIEW_CONFIGURATION_REQUIRED):(NODE_ENV|VERCEL_ENV|APP_ENV|NEON_TARGET|POOL_OPTIONS|ALLOWED_ORIGINS)$/.test(error.message)
      ? error.message : 'PREVIEW_CONFIGURATION_REQUIRED';
    process.stderr.write(label + ': configure the reviewed preview environment.\n');
    process.exitCode = 1;
  }
}
module.exports = { requirePreviewEnvironment };
