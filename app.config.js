const { applyReleaseConfig } = require('./scripts/release-config.cjs');

// Keep app.json as the source of existing SDK, plugins, assets and Expo Go configuration.
module.exports = ({ config }) => applyReleaseConfig(config, process.env);
