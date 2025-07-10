#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AidboxMCPServer = void 0;
const server_js_1 = require("./server.js");
Object.defineProperty(exports, "AidboxMCPServer", { enumerable: true, get: function () { return server_js_1.AidboxMCPServer; } });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const isStdioMode = process.argv.includes('--stdio') ||
    process.stdin.isTTY === false ||
    process.env.MCP_STDIO_MODE === 'true';
const isHttpMode = process.env.MCP_HTTP_MODE === 'true';
async function main() {
    try {
        const server = new server_js_1.AidboxMCPServer();
        // Setup graceful shutdown
        let isShuttingDown = false;
        const gracefulShutdown = async (signal) => {
            if (isShuttingDown)
                return;
            isShuttingDown = true;
            if (!isStdioMode) {
                console.log(`\n📡 Received ${signal}, initiating graceful shutdown...`);
            }
            try {
                await server.stop();
                if (!isStdioMode) {
                    console.log('✅ Server shutdown completed');
                }
                process.exit(0);
            }
            catch (error) {
                console.error('❌ Error during shutdown:', error);
                process.exit(1);
            }
        };
        // Register shutdown handlers
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        // Start the server
        await server.start();
        if (!isStdioMode && !isHttpMode) {
            // Keep the process alive
            process.stdin.resume();
        }
    }
    catch (error) {
        console.error('❌ Fatal error starting server:', error);
        process.exit(1);
    }
}
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Promise Rejection at:', promise);
    console.error('Reason:', reason);
    process.exit(1);
});
// Start the server if this file is run directly
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Failed to start server:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map