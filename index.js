import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWooClient } from './lib/woocommerce.js';
import { registerOrderTools } from './tools/orders.js';
import { registerProductTools } from './tools/products.js';
import { registerCustomerTools } from './tools/customers.js';
import { registerReportTools } from './tools/reports.js';
import { registerCouponTools } from './tools/coupons.js';

// Βρίσκουμε το path του τρέχοντος αρχείου
const __dirname = dirname(fileURLToPath(import.meta.url));

// Διαβάζουμε το σωστό .env ανάλογα με το SITE
const site = process.env.SITE || 'capitano';
dotenv.config({ path: resolve(__dirname, `sites/${site}.env`), quiet: true });

// Ελέγχουμε ότι υπάρχουν τα keys
if (!process.env.WC_URL || !process.env.WC_KEY || !process.env.WC_SECRET) {
    console.error(`❌ Λείπουν keys για το site: ${site}`);
    process.exit(1);
}

// Δημιουργούμε τον WooCommerce client
const wc = createWooClient(
    process.env.WC_URL,
    process.env.WC_KEY,
    process.env.WC_SECRET
);

// Δημιουργούμε τον MCP server
const server = new McpServer({
    name: `WooCommerce MCP - ${process.env.SITE_NAME || site}`,
    version: '1.0.0'
});

// Καταχωρούμε τα tools
registerOrderTools(server, wc);
registerProductTools(server, wc);
registerCustomerTools(server, wc);
registerReportTools(server, wc);
registerCouponTools(server, wc);

// Ξεκινάμε τον server
const transport = new StdioServerTransport();
await server.connect(transport);