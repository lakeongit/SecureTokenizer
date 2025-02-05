# Clone the repository
   git clone [repository-url]
   cd tokenization-platform

   # Install dependencies
   npm install

   # Set up environment variables
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Database Setup**
   ```bash
   npm run db:push
   ```

4. **Start the Application**
   ```bash
   npm run dev
   ```

## Architecture Overview

The platform implements a vaultless tokenization approach, meaning sensitive data is never stored in its original form. Instead, it uses advanced encryption algorithms to create tokens that can be safely stored and processed while maintaining data utility.

### Key Components

- **Frontend**: React + TypeScript application with comprehensive UI for token management
- **Backend**: Express.js server handling tokenization logic and API endpoints
- **Database**: Neon PostgreSQL for secure token storage and user management
- **Security**: Multiple layers including authentication, rate limiting, and audit logging
- **Cloud Scanner**: Automated detection and tokenization of sensitive data in cloud storage

## Cloud Scanner

The Cloud Scanner feature automatically identifies and tokenizes sensitive data stored in Google Cloud Storage buckets.

### Configuration

1. **Project Setup**
   - Configure your Google Cloud project ID in the scanner settings
   - Define bucket patterns to include/exclude specific storage buckets
   - Set scan intervals using cron syntax (e.g., "0 */6 * * *" for every 6 hours)

2. **Data Patterns**
   - Built-in patterns for common sensitive data (PII, credit cards, SSNs)
   - Support for custom pattern definitions using regular expressions
   - Configurable encryption options and key rotation intervals

3. **Monitoring**
   - Real-time scanner status monitoring
   - Detailed scan statistics and findings
   - Comprehensive audit logging of all scanner operations

### Usage

1. Navigate to the Cloud Scanner page in the application
2. Configure the scanner settings:
   - Enter your Google Cloud Project ID
   - Define bucket patterns to scan
   - Set the desired scan interval
3. Start the scanner using the "Start Scanner" button
4. Monitor scan progress and findings in the dashboard
5. Review detailed scan results in the audit logs

## API Integration

The platform provides RESTful APIs for tokenization operations. See the [API Documentation](./docs/api-guide.md) for detailed integration instructions.

Basic example:
```typescript
// Tokenize data
const response = await fetch('/api/tokenize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    data: 'sensitive-data',
    type: 'string'
  })
});