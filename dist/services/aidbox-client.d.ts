interface AidboxConfig {
    baseUrl: string;
    authType: 'basic' | 'oauth2';
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
}
export declare class AidboxClient {
    private client;
    private config;
    private connected;
    constructor(config: AidboxConfig);
    private setupAuth;
    testConnection(): Promise<void>;
    isConnected(): boolean;
    search(resourceType: string, params?: any): Promise<any>;
    get(resourceType: string, id: string): Promise<any>;
    create(resourceType: string, resource: any): Promise<any>;
    update(resourceType: string, id: string, resource: any): Promise<any>;
    delete(resourceType: string, id: string): Promise<any>;
    private formatError;
    disconnect(): Promise<void>;
}
export {};
//# sourceMappingURL=aidbox-client.d.ts.map