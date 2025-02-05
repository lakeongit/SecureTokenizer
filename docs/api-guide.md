# API Integration Guide

## Authentication

All API requests must include an API key in the Authorization header:

```bash
Authorization: Bearer YOUR_API_KEY
```

## API Endpoints

### Tokenization

#### Create Token
```http
POST /api/tokenize
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "data": "sensitive-data",
  "type": "string",
  "metadata": {
    "description": "Optional metadata"
  }
}
```

Response:
```json
{
  "token": "tk_abc123def456",
  "metadata": {
    "created": "2025-02-05T12:00:00Z",
    "type": "string"
  }
}
```

#### Detokenize
```http
POST /api/detokenize
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "token": "tk_abc123def456"
}
```

Response:
```json
{
  "data": "sensitive-data",
  "metadata": {
    "created": "2025-02-05T12:00:00Z",
    "type": "string"
  }
}
```

### Batch Operations

#### Bulk Tokenization
```http
POST /api/bulk/tokenize
Content-Type: multipart/form-data
Authorization: Bearer YOUR_API_KEY

file: [CSV File]
```

Response:
```json
{
  "job_id": "job_xyz789",
  "status": "processing",
  "total_records": 1000
}
```

#### Check Batch Status
```http
GET /api/bulk/status/:job_id
Authorization: Bearer YOUR_API_KEY
```

Response:
```json
{
  "job_id": "job_xyz789",
  "status": "completed",
  "processed": 1000,
  "failed": 0,
  "download_url": "/api/bulk/download/job_xyz789"
}
```

### Token Management

#### List Tokens
```http
GET /api/tokens?page=1&limit=20
Authorization: Bearer YOUR_API_KEY
```

Response:
```json
{
  "tokens": [
    {
      "id": "tk_abc123def456",
      "created": "2025-02-05T12:00:00Z",
      "type": "string",
      "metadata": {}
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 100
  }
}
```

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages:

```json
{
  "error": {
    "code": "invalid_token",
    "message": "The provided token is invalid or expired",
    "details": {
      "token": "tk_abc123def456"
    }
  }
}
```

Common Status Codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Rate Limiting

The API implements rate limiting based on the following rules:
- Basic tier: 100 requests per minute
- Enterprise tier: 1000 requests per minute

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1580900000
```

## SDK Examples

### Node.js
```typescript
import { TokenizationClient } from '@your-org/tokenization-sdk';

const client = new TokenizationClient('YOUR_API_KEY');

// Tokenize
const token = await client.tokenize('sensitive-data');

// Detokenize
const data = await client.detokenize(token);
```

### Python
```python
from tokenization_sdk import TokenizationClient

client = TokenizationClient('YOUR_API_KEY')

# Tokenize
token = client.tokenize('sensitive-data')

# Detokenize
data = client.detokenize(token)
```

## Best Practices

1. **Error Handling**
   - Implement proper error handling for all API calls
   - Use exponential backoff for retries
   - Monitor rate limits

2. **Security**
   - Store API keys securely
   - Use HTTPS for all requests
   - Implement proper key rotation

3. **Performance**
   - Use batch operations for large datasets
   - Implement caching where appropriate
   - Monitor API response times
