#!/usr/bin/env node
/**
 * MCP Server for Pluggy — Open Finance Brasil aggregator (ITP/TPP).
 *
 * Pluggy holds the ICP-Brasil certificate and runs Dynamic Client
 * Registration with each Brazilian bank, exposing a single API for
 * account discovery, transactions, balances, identities, and payments
 * initiation (PISP).
 *
 * Auth: Pluggy uses OAuth2 client-credentials to mint a short-lived
 * API key via POST /auth, which is then sent as `X-API-KEY` on every
 * subsequent request. The API key is cached in-process and refreshed
 * when it expires (or on a 401 from upstream).
 *
 * Env:
 *   PLUGGY_CLIENT_ID     — required, issued at https://dashboard.pluggy.ai
 *   PLUGGY_CLIENT_SECRET — required
 *   PLUGGY_API_BASE      — optional override (default https://api.pluggy.ai)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: "pluggy-mcp",
  version: "0.1.0",
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
