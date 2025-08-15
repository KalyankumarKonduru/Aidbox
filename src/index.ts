import { AidboxMCPServer } from './server.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const isStdioMode = process.argv.includes('--stdio') || 
                   process.stdin.isTTY === false ||
                   process.env.MCP_STDIO_MODE === 'true';

const isHttpMode = process.env.MCP_HTTP_MODE === 'true';

async function main() {
  try {
    const server = new AidboxMCPServer();

    let isShuttingDown = false;
    
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
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
      } catch (error) {
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
    
  } catch (error) {
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

export { AidboxMCPServer };