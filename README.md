# Aidbox MCP Server

A standalone Model Context Protocol (MCP) server for Aidbox FHIR integration with comprehensive healthcare data management capabilities. This server provides secure access to Aidbox Cloud and self-hosted Aidbox instances through FHIR R4 APIs with both read and write operations.

## 🏥 Features

- **Aidbox FHIR Integration**: Complete FHIR R4 API support for Aidbox Cloud and self-hosted instances
- **Dual Authentication**: Support for both Basic authentication and OAuth2 client credentials
- **Full CRUD Operations**: Create, read, update, and delete FHIR resources
- **Multiple Transport Modes**: HTTP and STDIO transport support
- **Comprehensive FHIR Tools**: Patient management, clinical data operations, and more
- **Health Monitoring**: Built-in health check endpoints
- **Error Handling**: Robust error handling with detailed logging
- **Token Management**: Automatic OAuth2 token refresh and management

## 📋 Available Tools

### Patient Management
- **`aidboxSearchPatients`** - Search patients by name, identifier, birthdate, gender, or other criteria
- **`aidboxGetPatientDetails`** - Get comprehensive patient information by ID
- **`aidboxCreatePatient`** - Create new patients with complete demographic information
- **`aidboxUpdatePatient`** - Update existing patient records

### Clinical Data - Observations
- **`aidboxGetPatientObservations`** - Retrieve lab results, vitals, and diagnostic observations
- **`aidboxCreateObservation`** - Record new observations and measurements

### Clinical Data - Medications
- **`aidboxGetPatientMedications`** - Get current and historical medication requests
- **`aidboxCreateMedicationRequest`** - Create new medication prescriptions

### Clinical Data - Conditions
- **`aidboxGetPatientConditions`** - Access patient conditions, diagnoses, and problems
- **`aidboxCreateCondition`** - Document new patient conditions

### Clinical Data - Encounters
- **`aidboxGetPatientEncounters`** - Retrieve healthcare encounters and visits
- **`aidboxCreateEncounter`** - Create new healthcare encounter records

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- TypeScript 5.0.0 or higher
- Aidbox Cloud account or self-hosted Aidbox instance
- Valid Aidbox credentials

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/aidbox-mcp-server.git
cd aidbox-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Environment Configuration

Create a `.env` file in the root directory:

#### For Aidbox Cloud (OAuth2)
```env
# Aidbox Cloud Configuration
AIDBOX_URL=https://your-instance.aidbox.app
AIDBOX_AUTH_TYPE=oauth2
AIDBOX_CLIENT_ID=your-client-id
AIDBOX_CLIENT_SECRET=your-client-secret

# Server Configuration
MCP_HTTP_PORT=3002
MCP_HTTP_MODE=true
```

#### For Self-Hosted Aidbox (Basic Auth)
```env
# Self-Hosted Aidbox Configuration
AIDBOX_URL=http://localhost:8888
AIDBOX_AUTH_TYPE=basic
AIDBOX_USERNAME=your-username
AIDBOX_PASSWORD=your-password

# Server Configuration
MCP_HTTP_PORT=3002
MCP_HTTP_MODE=true
```

### Running the Server

#### HTTP Mode (Recommended)
```bash
npm run start:http
```

#### STDIO Mode
```bash
npm run start:stdio
```

#### Development Mode
```bash
npm run dev:http
```

## 🔐 Authentication Setup

### Aidbox Cloud (OAuth2)

1. **Log into your Aidbox Cloud instance**
2. **Navigate to Auth → Clients**
3. **Create a new client** with:
   - Grant type: `client_credentials`
   - Scopes: Required FHIR resource access (e.g., `Patient/read`, `Patient/write`)
4. **Copy the client ID and secret** to your environment variables

### Self-Hosted Aidbox (Basic Auth)

1. **Access your Aidbox instance admin panel**
2. **Create or use existing user credentials**
3. **Ensure proper FHIR resource permissions**
4. **Configure username and password** in environment variables

## 📊 Health Monitoring

Check server health:
```bash
curl http://localhost:3002/health
```

Response:
```json
{
  "status": "healthy",
  "server": "aidbox-mcp-server",
  "version": "1.0.0",
  "aidbox": {
    "url": "https://your-instance.aidbox.app",
    "connected": true,
    "authType": "oauth2"
  },
  "timestamp": "2025-01-23T10:30:00.000Z"
}
```

## 🔧 Tool Usage Examples

### Search Patients
```json
{
  "tool": "aidboxSearchPatients",
  "arguments": {
    "name": "John Smith",
    "gender": "male",
    "_count": 10
  }
}
```

### Create Patient
```json
{
  "tool": "aidboxCreatePatient",
  "arguments": {
    "given": "Jane",
    "family": "Doe",
    "birthDate": "1990-05-15",
    "gender": "female",
    "phone": "+1-555-123-4567",
    "email": "jane.doe@example.com",
    "address": {
      "line": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "postalCode": "12345",
      "country": "US"
    }
  }
}
```

### Get Patient Observations
```json
{
  "tool": "aidboxGetPatientObservations",
  "arguments": {
    "patientId": "patient-123",
    "category": "vital-signs",
    "_count": 20
  }
}
```

### Create Observation
```json
{
  "tool": "aidboxCreateObservation",
  "arguments": {
    "patientId": "patient-123",
    "code": "8480-6",
    "display": "Systolic blood pressure",
    "value": 120,
    "unit": "mmHg",
    "effectiveDateTime": "2025-01-23T10:30:00Z"
  }
}
```

## 📚 API Reference

### MCP Endpoint
- **URL**: `http://localhost:3002/mcp`
- **Method**: POST
- **Content-Type**: application/json
- **Format**: JSON-RPC 2.0

### Health Check
- **URL**: `http://localhost:3002/health`
- **Method**: GET

## 🛠 Development

### Scripts

```bash
# Build TypeScript
npm run build

# Start in HTTP mode
npm run start:http

# Start in STDIO mode
npm run start:stdio

# Development with hot reload
npm run dev:http

# Clean build artifacts
npm run clean

# Test Aidbox connection
npm run test-connection
```

### Project Structure

```
aidbox-mcp-server/
├── src/
│   ├── server.ts              # Main server implementation
│   ├── services/
│   │   └── aidbox-client.ts   # Aidbox API client
│   └── tools/
│       └── aidbox-fhir-tools.ts # FHIR tool implementations
├── dist/                      # Compiled JavaScript
├── package.json
├── tsconfig.json
└── .env                       # Environment configuration
```

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Failures**
   - **OAuth2**: Verify client ID and secret are correct
   - **Basic Auth**: Check username and password
   - Ensure proper scopes/permissions are granted

2. **Connection Issues**
   - Verify Aidbox URL is accessible
   - Check firewall settings for outbound HTTPS connections
   - Ensure Aidbox instance is running and healthy

3. **FHIR Operation Errors**
   - Check that required FHIR resources exist
   - Verify resource permissions in Aidbox
   - Validate FHIR resource structure and required fields

4. **Token Issues (OAuth2)**
   - Check token endpoint accessibility
   - Verify client credentials and scopes
   - Monitor token expiration and refresh

### Debugging

Enable detailed logging:
```bash
# View detailed Aidbox requests/responses
npm run dev:http
```

Check Aidbox logs:
- **Aidbox Cloud**: Check logs in your Aidbox Cloud dashboard
- **Self-hosted**: Monitor Aidbox container/service logs

## 🏗 Aidbox Setup

### Aidbox Cloud

1. **Sign up** at [Aidbox Cloud](https://aidbox.app)
2. **Create a new instance**
3. **Configure OAuth2 client** with appropriate scopes
4. **Test connection** using the health endpoint

### Self-Hosted Aidbox

```yaml
# docker-compose.yml example
version: '3.8'
services:
  aidboxdb:
    image: postgres:13
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: aidbox
    volumes:
      - aidbox-data:/var/lib/postgresql/data

  aidbox:
    image: healthsamurai/aidboxone:latest
    depends_on:
      - aidboxdb
    environment:
      PGHOST: aidboxdb
      PGPORT: 5432
      PGUSER: postgres
      PGPASSWORD: postgres
      PGDATABASE: aidbox
      AIDBOX_LICENSE: your-license-key
    ports:
      - "8888:8888"

volumes:
  aidbox-data:
```



## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Aidbox Documentation**: [Aidbox Docs](https://docs.aidbox.app/)
- **FHIR Specification**: [FHIR R4](https://hl7.org/fhir/R4/)
- **Model Context Protocol**: [MCP Documentation](https://modelcontextprotocol.io/)
- **Issues**: [GitHub Issues](https://github.com/your-username/aidbox-mcp-server/issues)

## 🔗 Related Projects

- [Epic MCP Server](../epic-mcp-server) - Epic EHR integration
- [Medical MCP Server](../medical-mcp-server) - Document processing and NER
- [MCP Client Manager](../mcp-client-manager) - Multi-server orchestration

---

**Note**: This server requires a valid Aidbox instance (Cloud or self-hosted) and appropriate credentials. Ensure you have proper access rights and follow Aidbox security guidelines for production deployments.
