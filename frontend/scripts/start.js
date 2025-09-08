#!/usr/bin/env node
/**
 * Custom start script to allow dynamic port selection for Create React App.
 * Usage:
 *   npm start                 -> uses .env PORT or defaults to 3000
 *   PORT=4000 npm start       -> starts on port 4000
 *   npm start -- 4000         -> starts on port 4000
 *   npm start -- --port=4000  -> starts on port 4000
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Accept numeric CLI arg or --port= value
const cliArgs = process.argv.slice(2);
let explicitPort;
for (const arg of cliArgs) {
  if (/^--port=/.test(arg)) {
    explicitPort = arg.split('=')[1];
  } else if (/^\d+$/.test(arg)) {
    explicitPort = arg;
  }
}

if (explicitPort) {
  process.env.PORT = explicitPort;
}

// If no explicit port and not set in environment, try to read from .env
if (!process.env.PORT) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...rest] = trimmed.split('=');
        const key = k.trim();
        const value = rest.join('=').trim();
        if (key === 'PORT' && value) {
          process.env.PORT = value;
          break;
        }
      }
    }
  } catch (e) {
    console.warn('Could not read .env for PORT:', e.message);
  }
}

// Final fallback
if (!process.env.PORT) process.env.PORT = '3000';

console.log(`Starting CRA on port ${process.env.PORT} (${explicitPort ? 'CLI' : (process.env.PORT && 'ENV/.env')})...`);

const child = spawn('npx', ['react-scripts', 'start'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code);
});
