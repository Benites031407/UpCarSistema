# 🔐 Login Guide - Machine Rental System

## ✨ Automatic Role-Based Redirect

When you log in, you'll be automatically redirected based on your role:
- **Admin users** → `/admin` (Admin Dashboard)
- **Regular users** → `/` (Home Page)

No manual navigation needed - just login and you're in the right place!

### Using the Frontend (Easiest):
1. Open http://localhost:3000
2. Look for a "Register" or "Sign Up" button
3. Fill in:
   - **Email**: your-email@example.com
   - **Password**: your-password
   - **Name**: Your Name
4. Click Register
5. You'll be automatically logged in

### Using API (Alternative):
```powershell
# Register a new user
curl -X POST http://localhost:3001/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'
```

## Option 2: Create Admin Account via API

To create an admin account:

```powershell
# 1. Register as normal user
curl -X POST http://localhost:3001/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!@#",
    "name": "Admin User"
  }'

# 2. Manually update role in database (see below)
```

## Option 3: Seed Database with Test Users

Run this SQL to create test users with passwords:

```sql
-- Connect to PostgreSQL
docker exec -it teste1-postgres-test-1 psql -U postgres -d machine_rental

-- Create test user (password: Test123!@#)
INSERT INTO users (email, name, password_hash, account_balance, subscription_status, role) 
VALUES (
  'test@example.com', 
  'Test User',
  '$2a$10$YourHashedPasswordHere',  -- You'll need to generate this
  100.00,
  'none',
  'customer'
);

-- Create admin user (password: Admin123!@#)
INSERT INTO users (email, name, password_hash, account_balance, subscription_status, role) 
VALUES (
  'admin@test.com',
  'Admin User', 
  '$2a$10$YourHashedPasswordHere',  -- You'll need to generate this
  100.00,
  'none',
  'admin'
);
```

## Quick Test Account Creation

Let me create a test account for you via the API:

### Step 1: Register
```powershell
# Windows PowerShell
$body = @{
    email = "test@example.com"
    password = "Test123!@#"
    name = "Test User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Step 2: Login
```powershell
$loginBody = @{
    email = "test@example.com"
    password = "Test123!@#"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $loginBody

# Save the token
$token = $response.accessToken
Write-Host "Access Token: $token"
```

### Step 3: Use the Token
```powershell
# Get your profile
Invoke-RestMethod -Uri "http://localhost:3001/auth/me" `
  -Headers @{ Authorization = "Bearer $token" }
```

## Login Credentials Format

### Email Requirements:
- Valid email format
- Example: `user@example.com`

### Password Requirements:
- Minimum 8 characters
- Should include:
  - Uppercase letters
  - Lowercase letters
  - Numbers
  - Special characters (recommended)
- Example: `Test123!@#`

## Troubleshooting

### "User already exists"
If you get this error, the email is already registered. Try:
1. Use a different email
2. Or login with the existing credentials

### "Invalid credentials"
- Check your email and password
- Passwords are case-sensitive
- Make sure there are no extra spaces

### "Email validation failed"
- Make sure email is in valid format: `name@domain.com`

### Can't access admin features?
Regular users can't access admin routes. To make a user admin:

```sql
-- Connect to database
docker exec -it teste1-postgres-test-1 psql -U postgres -d machine_rental

-- Update user role
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Default Test Accounts

### Customer Account:
- **Email**: user@demo.com
- **Password**: User123!
- **Role**: customer
- **Auto-redirects to**: Home Page (/)

### Admin Account:
- **Email**: admin@test.com  
- **Password**: Admin123!
- **Role**: admin
- **Auto-redirects to**: Admin Dashboard (/admin)

## Next Steps

1. Register a new account at http://localhost:3000
2. Or use the PowerShell commands above to create via API
3. Login with your credentials
4. Start testing the application!

---

**Note**: In development mode, you can create as many test accounts as you need. The database will persist them until you reset it.
