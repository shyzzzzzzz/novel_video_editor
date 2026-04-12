#!/usr/bin/env node
/**
 * Setup script - installs Python dependencies.
 * Run once: npm run setup
 */
import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pythonDir = join(__dirname, '..', 'python');
const reqFile = join(pythonDir, 'requirements.txt');
const lockFile = join(pythonDir, '.deps-installed');
const python = process.platform === 'win32' ? 'python' : 'python3';

if (!existsSync(reqFile)) {
  console.error('requirements.txt not found at', reqFile);
  process.exit(1);
}

console.log('Installing Python dependencies...');
try {
  execSync(`${python} -m pip install -r "${reqFile}"`, {
    cwd: pythonDir,
    stdio: 'inherit',
  });
  writeFileSync(lockFile, Date.now().toString());
  console.log('Done. Run "npm run dev" to start.');
} catch (e) {
  console.error('Failed:', e.message);
  process.exit(1);
}
