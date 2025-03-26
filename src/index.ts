#!/usr/bin/env node

import { loadConfig } from "./utils.js";
import { APIMarketMCPServer } from "./APIMarketMCPServer.js";

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    const server = new APIMarketMCPServer(config);
    await server.start();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

export { APIMarketMCPServer, loadConfig };
