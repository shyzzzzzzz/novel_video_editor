#!/usr/bin/env node
/**
 * Start Python backend — auto-installs deps on first run.
 */
import { spawn } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pythonDir = join(__dirname, '..', 'python');
const reqFile = join(pythonDir, 'requirements.txt');
const lockFile = join(pythonDir, '.deps-installed');
const python = process.platform === 'win32' ? 'python' : 'python3';

function installDeps() {
  return new Promise((resolve, reject) => {
    console.log('[BACKEND] Installing Python dependencies (first run)...');
    const pip = spawn(python, ['-m', 'pip', 'install', '-r', reqFile], {
      cwd: pythonDir,
      shell: true,
    });
    pip.on('close', (code) => {
      if (code === 0) {
        writeFileSync(lockFile, Date.now().toString());
        resolve();
      } else {
        reject(new Error(`pip install exited with code ${code}`));
      }
    });
    pip.on('error', reject);
  });
}

async function main() {
  if (!existsSync(lockFile)) {
    try {
      await installDeps();
    } catch (e) {
      console.error('[BACKEND] Failed to install deps:', e.message);
      console.error('[BACKEND] Please run: npm run setup');
    }
  }

  console.log('[BACKEND] Starting FastAPI on http://127.0.0.1:18080 ...');
  const spawnOpts = {
    cwd: pythonDir,
    shell: true,
    stdio: 'pipe',
  };
  // On Windows: suppress console window
  if (process.platform === 'win32') {
    spawnOpts.creationFlags = 0x08000000; // CREATE_NO_WINDOW
  }
  const server = spawn(python, ['-m', 'uvicorn', 'main:app', '--reload', '--port', '18080', '--host', '127.0.0.1'], spawnOpts);

  server.stdout.on('data', (d) => process.stdout.write('[BACKEND] ' + d));
  server.stderr.on('data', (d) => process.stderr.write('[BACKEND] ' + d));

  server.on('close', (code) => {
    if (code !== 0) console.error(`[BACKEND] exited ${code}`);
  });
}

main();
