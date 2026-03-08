#!/usr/bin/env node

const net = require('net');
const { spawn } = require('child_process');

const DEFAULT_START_PORT = Number(process.env.EXPO_START_PORT || 8888);
const MAX_PORT_SCAN = 200;

const removePortArgs = (args) => {
  const cleaned = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--port') {
      i += 1;
      continue;
    }

    if (typeof arg === 'string' && arg.startsWith('--port=')) {
      continue;
    }

    cleaned.push(arg);
  }

  return cleaned;
};

const isPortFree = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();

    server.on('error', () => resolve(false));
    server.listen({ port, host: '0.0.0.0' }, () => {
      server.close(() => resolve(true));
    });
  });

const findFreePort = async (startPort) => {
  let port = startPort;

  for (let i = 0; i < MAX_PORT_SCAN; i += 1) {
    if (await isPortFree(port)) {
      return port;
    }
    port += 1;
  }

  throw new Error(`No free port found between ${startPort} and ${startPort + MAX_PORT_SCAN - 1}`);
};

const run = async () => {
  const userArgs = removePortArgs(process.argv.slice(2));
  const port = await findFreePort(DEFAULT_START_PORT);
  const expoCli = require.resolve('expo/bin/cli');
  const args = [expoCli, 'start', '--port', String(port), ...userArgs];

  console.log(`[planitt-mobile] Expo starting on free port ${port}`);

  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => process.exit(code ?? 0));
  child.on('error', (error) => {
    console.error(`[planitt-mobile] Failed to start Expo: ${error.message}`);
    process.exit(1);
  });
};

run().catch((error) => {
  console.error(`[planitt-mobile] ${error.message}`);
  process.exit(1);
});
