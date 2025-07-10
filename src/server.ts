import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { AidboxFHIRTools } from './tools/aidbox-fhir-tools.js';
import { AidboxClient } from './services/aidbox-client.js';

const isHttpMode = process.env.MCP_HTTP_MODE === 'true';
const isStdioMode = !isHttpMode;

const logger = {
  log: (...args: any[]) => {
    if (!isStdioMode) {
      console.log(...args);
    } else {
      console.error(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);
  }
};

export class AidboxMCPServer {
  private server: Server;
  private aidboxClient: AidboxClient;
  private fhirTools: AidboxFHIRTools;

  constructor() {
    // Initialize Aidbox client
    this.aidboxClient = new AidboxClient({
      baseUrl: process.env.AIDBOX_URL || 'http://localhost:8888',
      authType: process.env.AIDBOX_AUTH_TYPE as 'basic' | 'oauth2' || 'basic',
      username: process.env.AIDBOX_USERNAME,
      password: process.env.AIDBOX_PASSWORD,
      clientId: process.env.AIDBOX_CLIENT_ID,
      clientSecret: process.env.AIDBOX_CLIENT_SECRET,
    });

    // Initialize tools
    this.fhirTools = new AidboxFHIRTools(this.aidboxClient);

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'aidbox-mcp-server',
        version: '1.0.0',
        description: 'Aidbox MCP Server with FHIR tools for healthcare data management'
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const fhirToolsList = this.fhirTools.getAllTools();
      
      return {
        tools: fhirToolsList,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        logger.log(`🔧 TOOL CALLED: "${name}" with args:`, JSON.stringify(args, null, 2));
        
        // Route to appropriate tool handler
        const toolHandlers: Record<string, () => Promise<any>> = {
          // FHIR Patient tools
          'searchPatients': () => this.fhirTools.handleSearchPatients(args as any),
          'getPatientDetails': () => this.fhirTools.handleGetPatient(args as any),
          'createPatient': () => this.fhirTools.handleCreatePatient(args as any),
          'updatePatient': () => this.fhirTools.handleUpdatePatient(args as any),
          
          // FHIR Observation tools
          'getPatientObservations': () => this.fhirTools.handleGetObservations(args as any),
          'createObservation': () => this.fhirTools.handleCreateObservation(args as any),
          
          // FHIR Medication tools
          'getPatientMedications': () => this.fhirTools.handleGetMedications(args as any),
          'createMedicationRequest': () => this.fhirTools.handleCreateMedicationRequest(args as any),
          
          // FHIR Condition tools
          'getPatientConditions': () => this.fhirTools.handleGetConditions(args as any),
          'createCondition': () => this.fhirTools.handleCreateCondition(args as any),
          
          // FHIR Encounter tools
          'getPatientEncounters': () => this.fhirTools.handleGetEncounters(args as any),
          'createEncounter': () => this.fhirTools.handleCreateEncounter(args as any),
        };

        const handler = toolHandlers[name];
        if (!handler) {
          throw new Error(`Unknown tool: ${name}`);
        }

        return await handler();
      } catch (error) {
        logger.error(`Error handling tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                tool: name,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    });
  }

  async start(): Promise<void> {
    try {
      logger.log('🏥 Aidbox MCP Server v1.0.0');
      logger.log('================================');
      
      // Test Aidbox connection
      await this.aidboxClient.testConnection();
      logger.log('✅ Connected to Aidbox successfully');

      if (isHttpMode) {
        await this.startHttpServer();
      } else {
        await this.startStdioServer();
      }
      
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  private async startHttpServer(): Promise<void> {
    const express = await import('express');
    const cors = await import('cors');
    
    const app = express.default();
    app.use(cors.default());
    app.use(express.default.json({ limit: '50mb' }));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        server: 'aidbox-mcp-server',
        version: '1.0.0',
        aidbox: {
          url: process.env.AIDBOX_URL,
          connected: this.aidboxClient.isConnected()
        },
        timestamp: new Date().toISOString()
      });
    });

    // MCP endpoint
    app.post('/mcp', async (req, res) => {
      try {
        const request = req.body;
        
        res.setHeader('Content-Type', 'application/json');
        
        let sessionId = req.headers['mcp-session-id'] as string;
        if (!sessionId && request.method === 'initialize') {
          sessionId = `aidbox-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          res.setHeader('mcp-session-id', sessionId);
          logger.log('📋 New session initialized:', sessionId);
        }

        if (request.method === 'initialize') {
          res.json({
            jsonrpc: '2.0',
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'aidbox-mcp-server',
                version: '1.0.0'
              }
            },
            id: request.id
          });
        } else if (request.method === 'tools/list') {
          const tools = this.fhirTools.getAllTools();
          
          res.json({
            jsonrpc: '2.0',
            result: { tools },
            id: request.id
          });
        } else if (request.method === 'tools/call') {
            try {
              const result = await this.server.dispatchRequest(request); // <-- this is the actual method in MCP SDK
              res.json({
                jsonrpc: '2.0',
                result,
                id: request.id
              });
            } catch (error) {
              logger.error('Tool dispatch error:', error);
              res.status(500).json({
                jsonrpc: '2.0',
                error: {
                  code: -32603,
                  message: error instanceof Error ? error.message : 'Unknown internal error'
                },
                id: request.id
              });
            }
          }
           else {
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: 'Method not found'
            },
            id: request.id
          });
        }
      } catch (error) {
        logger.error('HTTP request error:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error'
          },
          id: req.body?.id || null
        });
      }
    });

    const port = process.env.MCP_HTTP_PORT || 3002;
    app.listen(port, () => {
      logger.log(`🚀 HTTP Server ready for Aidbox integration`);
      logger.log(`📊 Server Information:`);
      logger.log(`======================`);
      logger.log(`✓ HTTP Server listening on port ${port}`);
      logger.log(`🌐 Health check: http://localhost:${port}/health`);
      logger.log(`🔗 MCP endpoint: http://localhost:${port}/mcp`);
      logger.log(`🏥 Aidbox URL: ${process.env.AIDBOX_URL}`);
      
      this.logAvailableTools();
    });
  }

  private async startStdioServer(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    if (isStdioMode) {
      logger.error('Aidbox MCP Server running on stdio transport');
      logger.error('Ready to accept commands');
    } else {
      logger.log('✓ Aidbox MCP Server started successfully');
      this.logAvailableTools();
    }
  }

  private logAvailableTools(): void {
    logger.log('\n📝 Available tools:');
    logger.log('\n🏥 FHIR Patient Tools:');
    logger.log('   👥 searchPatients - Search patients in Aidbox');
    logger.log('   👤 getPatientDetails - Get patient information');
    logger.log('   ➕ createPatient - Create new patient');
    logger.log('   📝 updatePatient - Update patient data');
    
    logger.log('\n🧪 FHIR Clinical Tools:');
    logger.log('   🔬 getPatientObservations - Get lab results and vitals');
    logger.log('   💊 getPatientMedications - Get medications');
    logger.log('   🏥 getPatientConditions - Get conditions/diagnoses');
    logger.log('   📋 getPatientEncounters - Get encounters/visits');
    
    logger.log('\n💬 The server is now listening for MCP client connections...');
  }

  async stop(): Promise<void> {
    try {
      logger.log('Stopping Aidbox MCP Server...');
      await this.aidboxClient.disconnect();
      logger.log('✓ Server stopped gracefully');
    } catch (error) {
      logger.error('Error stopping server:', error);
    }
  }
}