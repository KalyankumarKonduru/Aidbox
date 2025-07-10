import axios, { AxiosInstance, AxiosError } from 'axios';

interface AidboxConfig {
  baseUrl: string;
  authType: 'basic' | 'oauth2';
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
}

export class AidboxClient {
  private client: AxiosInstance;
  private config: AidboxConfig;
  private connected: boolean = false;

  constructor(config: AidboxConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json'
      }
    });

    this.setupAuth();
  }

  private setupAuth(): void {
    // Add basic auth if configured
    if (this.config.authType === 'basic' && this.config.username && this.config.password) {
      const basicAuth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      this.client.defaults.headers.common['Authorization'] = `Basic ${basicAuth}`;
    }
  }

  async testConnection(): Promise<void> {
    try {
      console.log(`🔍 Attempting to connect to Aidbox at: ${this.config.baseUrl}`);
      const response = await this.client.get('/metadata');
      if (response.status === 200) {
        this.connected = true;
        console.log('✅ Successfully connected to Aidbox');
      }
    } catch (error: any) {
      this.connected = false;
      console.error('❌ Aidbox connection failed:', error.message);
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Aidbox at ${this.config.baseUrl}. Please ensure Aidbox is running.`);
      }
      throw new Error(`Failed to connect to Aidbox: ${error.message}`);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // FHIR operations
  async search(resourceType: string, params?: any): Promise<any> {
    try {
      const response = await this.client.get(`/${resourceType}`, { params });
      return response.data;
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  async get(resourceType: string, id: string): Promise<any> {
    try {
      const response = await this.client.get(`/${resourceType}/${id}`);
      return response.data;
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  async create(resourceType: string, resource: any): Promise<any> {
    try {
      const response = await this.client.post(`/${resourceType}`, resource);
      return response.data;
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  async update(resourceType: string, id: string, resource: any): Promise<any> {
    try {
      const response = await this.client.put(`/${resourceType}/${id}`, {
        ...resource,
        id
      });
      return response.data;
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  async delete(resourceType: string, id: string): Promise<any> {
    try {
      await this.client.delete(`/${resourceType}/${id}`);
      return { success: true };
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  private formatError(error: AxiosError): Error {
    if (error.response) {
      const data = error.response.data as any;
      const message = data?.issue?.[0]?.diagnostics || 
                     data?.error?.message || 
                     `HTTP ${error.response.status}: ${error.response.statusText}`;
      return new Error(message);
    }
    return new Error(error.message || 'Network error');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }
}