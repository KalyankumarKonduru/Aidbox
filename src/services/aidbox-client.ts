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
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: AidboxConfig) {
    this.config = config;
    
    // Ensure URL doesn't have trailing slash
    const baseURL = config.baseUrl.replace(/\/$/, '');
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json'
      },
      timeout: 10000 // 10 second timeout
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        if (this.config.authType === 'basic' && this.config.username && this.config.password) {
          const basicAuth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
          config.headers.Authorization = `Basic ${basicAuth}`;
        } else if (this.config.authType === 'oauth2') {
          const token = await this.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && this.config.authType === 'oauth2') {
          // Try to refresh token
          this.accessToken = undefined;
          this.tokenExpiry = undefined;
          
          const originalRequest = error.config;
          if (originalRequest && !originalRequest.headers['X-Retry']) {
            originalRequest.headers['X-Retry'] = 'true';
            const token = await this.getAccessToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async getAccessToken(): Promise<string | undefined> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Getting new access token...');
      
      const tokenEndpoint = `${this.config.baseUrl}/auth/token`;
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.config.clientId || '');
      params.append('client_secret', this.config.clientSecret || '');

      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000); // Refresh 1 minute early
      
      console.log('✅ Access token obtained successfully');
      return this.accessToken;
    } catch (error: any) {
      console.error('❌ Failed to get access token:', error.response?.data || error.message);
      throw new Error('OAuth2 authentication failed');
    }
  }

  async testConnection(): Promise<void> {
    try {
      console.log(`🔍 Attempting to connect to Aidbox at: ${this.config.baseUrl}`);
      console.log(`🔐 Auth type: ${this.config.authType}`);
      
      // For Aidbox Cloud, use /$version endpoint which is more reliable
      const response = await this.client.get('/$version');
      
      if (response.status === 200) {
        this.connected = true;
        console.log('✅ Successfully connected to Aidbox Cloud');
        console.log(`📦 Aidbox version: ${response.data.version || 'Unknown'}`);
      }
    } catch (error: any) {
      this.connected = false;
      console.error('❌ Aidbox connection failed:', error.message);
      
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
        
        if (error.response.status === 401) {
          throw new Error('Authentication failed. Please check your Aidbox credentials.');
        } else if (error.response.status === 403) {
          throw new Error('Access forbidden. Please check your Aidbox permissions.');
        }
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Aidbox at ${this.config.baseUrl}. Please check the URL.`);
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
      const response = await this.client.get(`/fhir/${resourceType}`, { params });
      return response.data;
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  async get(resourceType: string, id: string): Promise<any> {
    try {
      const response = await this.client.get(`/fhir/${resourceType}/${id}`);
      return response.data;
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  async create(resourceType: string, resource: any): Promise<any> {
    try {
      const response = await this.client.post(`/fhir/${resourceType}`, resource);
      return response.data;
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  async update(resourceType: string, id: string, resource: any): Promise<any> {
    try {
      const response = await this.client.put(`/fhir/${resourceType}/${id}`, {
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
      await this.client.delete(`/fhir/${resourceType}/${id}`);
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
                     data?.message ||
                     `HTTP ${error.response.status}: ${error.response.statusText}`;
      return new Error(message);
    }
    return new Error(error.message || 'Network error');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.accessToken = undefined;
    this.tokenExpiry = undefined;
  }
}