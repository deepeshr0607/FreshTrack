const { readdirSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

// Database suites require their explicit development guard/opt-in commands.
// Never let default test discovery create fixtures on a configured database.
const root = resolve(__dirname, '..');
const files = readdirSync(resolve(root, 'tests'))
  .filter(file => /\.test\.(cjs|mjs)$/.test(file) && !file.includes('.integration.'))
  .sort().map(file => `tests/${file}`);
const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files], {
  cwd: root, stdio: 'inherit',
});
if (result.error) {
  process.stderr.write('Backend test runner could not start.\n');
  process.exitCode = 1;
} else if (result.signal) {
  process.kill(process.pid, result.signal);
} else {
  process.exitCode = result.status ?? 1;
}
