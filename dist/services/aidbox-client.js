"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AidboxClient = void 0;
const axios_1 = __importDefault(require("axios"));
class AidboxClient {
    client;
    config;
    connected = false;
    constructor(config) {
        this.config = config;
        this.client = axios_1.default.create({
            baseURL: config.baseUrl,
            headers: {
                'Content-Type': 'application/fhir+json',
                'Accept': 'application/fhir+json'
            }
        });
        this.setupAuth();
    }
    setupAuth() {
        // Add basic auth if configured
        if (this.config.authType === 'basic' && this.config.username && this.config.password) {
            const basicAuth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
            this.client.defaults.headers.common['Authorization'] = `Basic ${basicAuth}`;
        }
    }
    async testConnection() {
        try {
            console.log(`🔍 Attempting to connect to Aidbox at: ${this.config.baseUrl}`);
            const response = await this.client.get('/metadata');
            if (response.status === 200) {
                this.connected = true;
                console.log('✅ Successfully connected to Aidbox');
            }
        }
        catch (error) {
            this.connected = false;
            console.error('❌ Aidbox connection failed:', error.message);
            if (error.code === 'ECONNREFUSED') {
                throw new Error(`Cannot connect to Aidbox at ${this.config.baseUrl}. Please ensure Aidbox is running.`);
            }
            throw new Error(`Failed to connect to Aidbox: ${error.message}`);
        }
    }
    isConnected() {
        return this.connected;
    }
    // FHIR operations
    async search(resourceType, params) {
        try {
            const response = await this.client.get(`/${resourceType}`, { params });
            return response.data;
        }
        catch (error) {
            throw this.formatError(error);
        }
    }
    async get(resourceType, id) {
        try {
            const response = await this.client.get(`/${resourceType}/${id}`);
            return response.data;
        }
        catch (error) {
            throw this.formatError(error);
        }
    }
    async create(resourceType, resource) {
        try {
            const response = await this.client.post(`/${resourceType}`, resource);
            return response.data;
        }
        catch (error) {
            throw this.formatError(error);
        }
    }
    async update(resourceType, id, resource) {
        try {
            const response = await this.client.put(`/${resourceType}/${id}`, {
                ...resource,
                id
            });
            return response.data;
        }
        catch (error) {
            throw this.formatError(error);
        }
    }
    async delete(resourceType, id) {
        try {
            await this.client.delete(`/${resourceType}/${id}`);
            return { success: true };
        }
        catch (error) {
            throw this.formatError(error);
        }
    }
    formatError(error) {
        if (error.response) {
            const data = error.response.data;
            const message = data?.issue?.[0]?.diagnostics ||
                data?.error?.message ||
                `HTTP ${error.response.status}: ${error.response.statusText}`;
            return new Error(message);
        }
        return new Error(error.message || 'Network error');
    }
    async disconnect() {
        this.connected = false;
    }
}
exports.AidboxClient = AidboxClient;
//# sourceMappingURL=aidbox-client.js.map