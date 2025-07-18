"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AidboxMCPServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const aidbox_fhir_tools_js_1 = require("./tools/aidbox-fhir-tools.js");
const aidbox_client_js_1 = require("./services/aidbox-client.js");
const isHttpMode = process.env.MCP_HTTP_MODE === 'true';
const isStdioMode = !isHttpMode;
const logger = {
    log: (...args) => {
        if (!isStdioMode) {
            console.log(...args);
        }
        else {
            console.error(...args);
        }
    },
    error: (...args) => {
        console.error(...args);
    }
};
class AidboxMCPServer {
    server;
    aidboxClient;
    fhirTools;
    constructor() {
        // Initialize Aidbox client
        this.aidboxClient = new aidbox_client_js_1.AidboxClient({
            baseUrl: process.env.AIDBOX_URL || 'http://localhost:8888',
            authType: process.env.AIDBOX_AUTH_TYPE || 'basic',
            username: process.env.AIDBOX_USERNAME,
            password: process.env.AIDBOX_PASSWORD,
            clientId: process.env.AIDBOX_CLIENT_ID,
            clientSecret: process.env.AIDBOX_CLIENT_SECRET,
        });
        // Initialize tools
        this.fhirTools = new aidbox_fhir_tools_js_1.AidboxFHIRTools(this.aidboxClient);
        // Initialize MCP server
        this.server = new index_js_1.Server({
            name: 'aidbox-mcp-server',
            version: '1.0.0',
            description: 'Aidbox MCP Server with FHIR tools for healthcare data management'
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            const fhirToolsList = this.fhirTools.getAllTools();
            return {
                tools: fhirToolsList,
            };
        });
        // Handle tool calls
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                logger.log(`🔧 TOOL CALLED: "${name}" with args:`, JSON.stringify(args, null, 2));
                // Route to appropriate tool handler
                const toolHandlers = {
                    // FHIR Patient tools
                    'aidboxSearchPatients': () => this.fhirTools.handleAidboxSearchPatients(args),
                    'aidboxGetPatientDetails': () => this.fhirTools.handleAidboxGetPatient(args),
                    'aidboxCreatePatient': () => this.fhirTools.handleAidboxCreatePatient(args),
                    'aidboxUpdatePatient': () => this.fhirTools.handleAidboxUpdatePatient(args),
                    // FHIR Observation tools
                    'aidboxGetPatientObservations': () => this.fhirTools.handleAidboxGetObservations(args),
                    'aidboxCreateObservation': () => this.fhirTools.handleAidboxCreateObservation(args),
                    // FHIR Medication tools
                    'aidboxGetPatientMedications': () => this.fhirTools.handleAidboxGetMedications(args),
                    'aidboxCreateMedicationRequest': () => this.fhirTools.handleAidboxCreateMedicationRequest(args),
                    // FHIR Condition tools
                    'aidboxGetPatientConditions': () => this.fhirTools.handleAidboxGetConditions(args),
                    'aidboxCreateCondition': () => this.fhirTools.handleAidboxCreateCondition(args),
                    // FHIR Encounter tools
                    'aidboxGetPatientEncounters': () => this.fhirTools.handleAidboxGetEncounters(args),
                    'aidboxCreateEncounter': () => this.fhirTools.handleAidboxCreateEncounter(args),
                };
                const handler = toolHandlers[name];
                if (!handler) {
                    throw new Error(`Unknown tool: ${name}`);
                }
                return await handler();
            }
            catch (error) {
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
    async start() {
        try {
            logger.log('🏥 Aidbox MCP Server v1.0.0');
            logger.log('================================');
            // Test Aidbox connection (skip if in standalone mode)
            if (process.env.SKIP_AIDBOX_CONNECTION !== 'true') {
                try {
                    await this.aidboxClient.testConnection();
                    logger.log('✅ Connected to Aidbox successfully');
                }
                catch (error) {
                    logger.error('⚠️  Warning: Could not connect to Aidbox:', error);
                    logger.log('🔧 Starting in degraded mode - FHIR operations will fail');
                    logger.log('💡 To fix: Ensure Aidbox is running at', process.env.AIDBOX_URL);
                }
            }
            else {
                logger.log('⚠️  Running in standalone mode (no Aidbox connection)');
            }
            if (isHttpMode) {
                await this.startHttpServer();
            }
            else {
                await this.startStdioServer();
            }
        }
        catch (error) {
            logger.error('Failed to start server:', error);
            throw error;
        }
    }
    async startHttpServer() {
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
        // Shared MCP request handler
        const handleMCPRequest = async (req, res) => {
            try {
                const request = req.body;
                res.setHeader('Content-Type', 'application/json');
                let sessionId = req.headers['mcp-session-id'];
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
                }
                else if (request.method === 'tools/list') {
                    const tools = this.fhirTools.getAllTools();
                    res.json({
                        jsonrpc: '2.0',
                        result: { tools },
                        id: request.id
                    });
                }
                else if (request.method === 'tools/call') {
                    // Handle tool call directly
                    const { name, arguments: args } = request.params;
                    try {
                        const toolHandlers = {
                            // FHIR Patient tools
                            'aidboxSearchPatients': () => this.fhirTools.handleAidboxSearchPatients(args),
                            'aidboxGetPatientDetails': () => this.fhirTools.handleAidboxGetPatient(args),
                            'aidboxCreatePatient': () => this.fhirTools.handleAidboxCreatePatient(args),
                            'aidboxUpdatePatient': () => this.fhirTools.handleAidboxUpdatePatient(args),
                            // FHIR Observation tools
                            'aidboxGetPatientObservations': () => this.fhirTools.handleAidboxGetObservations(args),
                            'aidboxCreateObservation': () => this.fhirTools.handleAidboxCreateObservation(args),
                            // FHIR Medication tools
                            'aidboxGetPatientMedications': () => this.fhirTools.handleAidboxGetMedications(args),
                            'aidboxCreateMedicationRequest': () => this.fhirTools.handleAidboxCreateMedicationRequest(args),
                            // FHIR Condition tools
                            'aidboxGetPatientConditions': () => this.fhirTools.handleAidboxGetConditions(args),
                            'aidboxCreateCondition': () => this.fhirTools.handleAidboxCreateCondition(args),
                            // FHIR Encounter tools
                            'aidboxGetPatientEncounters': () => this.fhirTools.handleAidboxGetEncounters(args),
                            'aidboxCreateEncounter': () => this.fhirTools.handleAidboxCreateEncounter(args),
                        };
                        const handler = toolHandlers[name];
                        if (!handler) {
                            throw new Error(`Unknown tool: ${name}`);
                        }
                        const result = await handler();
                        res.json({
                            jsonrpc: '2.0',
                            result,
                            id: request.id
                        });
                    }
                    catch (error) {
                        logger.error(`Tool execution error:`, error);
                        res.json({
                            jsonrpc: '2.0',
                            error: {
                                code: -32603,
                                message: error instanceof Error ? error.message : 'Tool execution failed'
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
            }
            catch (error) {
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
        };
        // MCP endpoints - both /mcp and root /
        app.post('/mcp', handleMCPRequest);
        app.post('/', handleMCPRequest);
        // Add GET handler for root to provide info
        app.get('/', (req, res) => {
            res.json({
                name: 'aidbox-mcp-server',
                version: '1.0.0',
                description: 'Aidbox MCP Server with FHIR tools',
                endpoints: {
                    health: '/health',
                    mcp: '/mcp or /',
                },
                tools: this.fhirTools.getAllTools().length
            });
        });
        const port = process.env.MCP_HTTP_PORT || 3002;
        app.listen(port, () => {
            logger.log(`🚀 HTTP Server ready for Aidbox integration`);
            logger.log(`📊 Server Information:`);
            logger.log(`======================`);
            logger.log(`✓ HTTP Server listening on port ${port}`);
            logger.log(`🌐 Health check: http://localhost:${port}/health`);
            logger.log(`🔗 MCP endpoint: http://localhost:${port}/mcp`);
            logger.log(`🔗 MCP root endpoint: http://localhost:${port}/`);
            logger.log(`🏥 Aidbox URL: ${process.env.AIDBOX_URL}`);
            this.logAvailableTools();
        });
    }
    async startStdioServer() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        if (isStdioMode) {
            logger.error('Aidbox MCP Server running on stdio transport');
            logger.error('Ready to accept commands');
        }
        else {
            logger.log('✓ Aidbox MCP Server started successfully');
            this.logAvailableTools();
        }
    }
    logAvailableTools() {
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
    async stop() {
        try {
            logger.log('Stopping Aidbox MCP Server...');
            await this.aidboxClient.disconnect();
            logger.log('✓ Server stopped gracefully');
        }
        catch (error) {
            logger.error('Error stopping server:', error);
        }
    }
}
exports.AidboxMCPServer = AidboxMCPServer;
//# sourceMappingURL=server.js.map