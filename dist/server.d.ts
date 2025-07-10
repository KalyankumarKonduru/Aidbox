export declare class AidboxMCPServer {
    private server;
    private aidboxClient;
    private fhirTools;
    constructor();
    private setupHandlers;
    start(): Promise<void>;
    private startHttpServer;
    private startStdioServer;
    private logAvailableTools;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map