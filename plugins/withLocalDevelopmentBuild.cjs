const { withBaseMod, withXcodeProject } = require('expo/config-plugins');

function quoteBundleScript(script) {
  // The SDK template executes an unquoted command substitution; a space in the
  // repository path splits the resolved script filename into separate arguments.
  return script.replace(/^`("\$NODE_BINARY" --print .*react-native-xcode\.sh.*)`$/m, '"$($1)"');
}

// Personal Team builds support local reminders but cannot provision APNs.
// Run after expo-notifications; release/default configurations do not use this plugin.
module.exports = function withLocalDevelopmentBuild(config) {
  config = withXcodeProject(config, (mod) => {
    const phases = mod.modResults.hash.project.objects.PBXShellScriptBuildPhase || {};
    for (const phase of Object.values(phases)) {
      if (phase && typeof phase === 'object' && phase.name?.includes('Bundle React Native code and images')) {
        phase.shellScript = JSON.stringify(quoteBundleScript(JSON.parse(phase.shellScript)));
      }
    }
    return mod;
  });
  return withBaseMod(config, {
    platform: 'ios', mod: 'entitlements', isIntrospective: true,
    async action(mod) {
      const result = await mod.modRequest.nextMod(mod);
      delete result.modResults['aps-environment'];
      return result;
    },
  });
};
module.exports.quoteBundleScript = quoteBundleScript;
