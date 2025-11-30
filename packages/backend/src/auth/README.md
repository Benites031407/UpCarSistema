# Authentication System

This module provides a complete authentication and user management system for the Machine Rental System.

## Features

- **JWT Token Authentication**: Secure token-based authentication with access and refresh tokens
- **Password Security**: Bcrypt hashing with configurable salt rounds and password strength validation
- **Google OAuth 2.0**: Social login integration with Google accounts
- **Redis Session Management**: Distributed session storage with automatic expiration
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive request validation using Zod schemas
- **Middleware Protection**: Easy-to-use middleware for protecting routes

## Components

### JWT Service (`jwt.ts`)
- Generates and verifies JWT tokens
- Supports both access tokens (short-lived) and refresh tokens (long-lived)
- Configurable expiration times

### Password Service (`password.ts`)
- Secure password hashing using bcrypt
- Password strength validation
- Configurable salt rounds for security

### Redis Session Manager (`redis.ts`)
- Distributed session storage
- Automatic session expiration
- Refresh token management
- Connection pooling and error handling

### Google OAuth (`google.ts`)
- Google OAuth 2.0 integration
- Automatic account linking
- Profile information extraction

### Middleware (`middleware.ts`)
- `authenticateToken`: Validates JWT tokens and loads user data
- `optionalAuth`: Optional authentication for public endpoints
- `requireAuth`: Ensures user is authenticated
- `requireAdmin`: Admin-only access control

### Routes (`routes.ts`)
- `POST /auth/register`: User registration with email/password
- `POST /auth/login`: User login with email/password
- `POST /auth/refresh`: Refresh access token
- `POST /auth/logout`: User logout and session cleanup
- `GET /auth/me`: Get current user profile
- `PUT /auth/me`: Update user profile
- `PUT /auth/password`: Change password
- `GET /auth/google`: Initiate Google OAuth flow
- `GET /auth/google/callback`: Handle Google OAuth callback

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Password Hashing Configuration
BCRYPT_SALT_ROUNDS=12

# Admin Configuration
ADMIN_DOMAINS=yourdomain.com

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

## Usage Examples

### Protecting Routes

```typescript
import { authenticateToken, requireAdmin } from './auth/middleware.js';

// Require authentication
app.get('/api/profile', authenticateToken, (req, res) => {
  const user = (req as any).user as AppUser;
  res.json({ user });
});

// Admin only
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  // Admin functionality
});
```

### Client-Side Authentication

```typescript
// Register
const response = await fetch('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123',
    name: 'John Doe'
  })
});

// Login
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();

// Use token for authenticated requests
const profileResponse = await fetch('/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## Security Considerations

1. **JWT Secret**: Use a strong, randomly generated secret in production
2. **HTTPS**: Always use HTTPS in production to protect tokens in transit
3. **Token Storage**: Store tokens securely on the client side (httpOnly cookies recommended)
4. **Rate Limiting**: Configure appropriate rate limits for your use case
5. **Password Policy**: Enforce strong password requirements
6. **Session Management**: Implement proper logout and token revocation
7. **Admin Access**: Use proper role-based access control for admin features

## Testing

The authentication system includes comprehensive tests:

- Unit tests for JWT service
- Unit tests for password service
- Integration tests for authentication routes
- Input validation tests

Run tests with:
```bash
npm test
```

## Error Handling

The system provides detailed error responses:

- `400`: Validation errors with field-specific messages
- `401`: Authentication failures (invalid credentials, expired tokens)
- `403`: Authorization failures (insufficient permissions)
- `409`: Conflict errors (email already exists)
- `429`: Rate limit exceeded
- `500`: Internal server errors

All errors are logged with appropriate detail levels for debugging and monitoring.