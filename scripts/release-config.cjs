function required(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Release configuration: set ${key}. See docs/Phase_2_Release_Configuration.md.`);
  return value;
}

function httpsUrl(env, key, originOnly = false) {
  let url;
  try { url = new URL(required(env, key)); }
  catch { throw new Error(`Release configuration: ${key} must be a valid HTTPS URL.`); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
    || !/^[a-z0-9.-]+$/.test(host) || /your-|placeholder/.test(host)
    || host === 'localhost' || host.endsWith('.local') || host.endsWith('.example') || host.endsWith('.invalid')
    || host === 'example.com' || host.endsWith('.example.com') || /^[\d.]+$/.test(host) || host.includes(':')
    || (originOnly && url.pathname !== '/')) {
    throw new Error(`Release configuration: ${key} must use a public HTTPS ${originOnly ? 'origin' : 'URL'} without credentials or placeholders.`);
  }
  return url;
}

function applyReleaseConfig(config, env) {
  const variant = env.APP_VARIANT || 'development';
  if (!['development', 'preview', 'production'].includes(variant)) throw new Error('Release configuration: unknown APP_VARIANT.');
  const projectId = env.APP_EAS_PROJECT_ID?.trim();
  if (projectId && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(projectId)) {
    throw new Error('Release configuration: APP_EAS_PROJECT_ID must be the EAS project UUID.');
  }
  const extra = projectId ? { ...config.extra, eas: { ...config.extra?.eas, projectId } } : config.extra;
  if (variant === 'development') {
    const localIdentifier = env.APP_LOCAL_NATIVE_IDENTIFIER?.trim();
    if (localIdentifier) {
      if (!/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*){2,}$/.test(localIdentifier)
        || /yourcompany|example|placeholder/i.test(localIdentifier)) {
        throw new Error('Local build configuration: APP_LOCAL_NATIVE_IDENTIFIER must be a valid reverse-domain identifier.');
      }
      return { ...config, extra, name: `${config.name} Dev`, scheme: 'freshtrack-dev',
        ios: { ...config.ios, bundleIdentifier: localIdentifier },
        android: { ...config.android, package: localIdentifier } };
    }
    return projectId ? { ...config, extra } : config;
  }

  const identifier = required(env, 'APP_NATIVE_IDENTIFIER');
  if (!/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*){2,}$/.test(identifier)
    || /yourcompany|example|placeholder/i.test(identifier)) {
    throw new Error('Release configuration: APP_NATIVE_IDENTIFIER must be your chosen reverse-domain identifier.');
  }
  if (!projectId) throw new Error('Release configuration: set APP_EAS_PROJECT_ID after linking your Expo project.');
  const auth = httpsUrl(env, 'EXPO_PUBLIC_NEON_AUTH_URL');
  if (!/\.neon\.(tech|com)$/.test(auth.hostname)) throw new Error('Release configuration: use the matching Neon Auth branch endpoint.');
  httpsUrl(env, 'EXPO_PUBLIC_NEON_AUTH_ORIGIN', true);
  httpsUrl(env, 'EXPO_PUBLIC_API_URL', true);

  const nativeId = variant === 'preview' ? `${identifier}.preview` : identifier;
  return {
    ...config, extra,
    name: variant === 'preview' ? `${config.name} Preview` : config.name,
    scheme: variant === 'preview' ? 'freshtrack-preview' : config.scheme,
    ios: { ...config.ios, bundleIdentifier: nativeId, buildNumber: config.ios?.buildNumber || '1' },
    android: { ...config.android, package: nativeId, versionCode: config.android?.versionCode || 1 },
  };
}

module.exports = { applyReleaseConfig };
