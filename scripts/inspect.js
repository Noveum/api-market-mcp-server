#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = resolve(__dirname, '../bin/mcp-server.js');

const args = [
  'npx',
  '@modelcontextprotocol/inspector',
  'node',
  serverPath
];

// Add environment variables as CLI arguments if they exist
if (process.env.OPENAPI_SPEC_PATH) {
  args.push(`--openapi-spec=${process.env.OPENAPI_SPEC_PATH}`);
}
if (process.env.API_BASE_URL) {
  args.push(`--api-base-url=${process.env.API_BASE_URL}`);
}
if (process.env.SERVER_NAME) {
  args.push(`--name=${process.env.SERVER_NAME}`);
}
if (process.env.API_HEADERS) {
  args.push(`--headers=${process.env.API_HEADERS}`);
}

// Forward command line arguments
// Skip the first two elements which are 'node' and the script path
const cliArgs = process.argv.slice(2);
args.push(...cliArgs);


// Execute the command
import { spawn } from 'child_process';
const inspect = spawn(args[0], args.slice(1), { stdio: 'inherit' });

inspect.on('error', (err) => {
  console.error('Failed to start inspector:', err);
  process.exit(1);
});

inspect.on('exit', (code) => {
  process.exit(code || 0);
});
