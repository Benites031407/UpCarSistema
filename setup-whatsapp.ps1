# WhatsApp API Setup Script for Windows
# This script helps you configure WhatsApp Business API for your application

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   WhatsApp Business API Setup Wizard       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
$envFile = "packages\backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: $envFile file not found" -ForegroundColor Red
    Write-Host "Please create it first by copying .env.example"
    exit 1
}

Write-Host "📋 This wizard will help you configure WhatsApp Business API" -ForegroundColor Blue
Write-Host ""
Write-Host "Before starting, make sure you have:"
Write-Host "  1. ✅ A Meta Developer account"
Write-Host "  2. ✅ Created a Meta App with WhatsApp product"
Write-Host "  3. ✅ Your Phone Number ID"
Write-Host "  4. ✅ Your Access Token"
Write-Host ""
Read-Host "Press Enter to continue"
Write-Host ""

# Get Phone Number ID
Write-Host "Step 1: Phone Number ID" -ForegroundColor Yellow
Write-Host "Get this from: Meta Developer Console → WhatsApp → API Setup → 'From' dropdown"
Write-Host "Example: 123456789012345"
Write-Host ""
$phoneNumberId = Read-Host "Enter your Phone Number ID"

if ([string]::IsNullOrWhiteSpace($phoneNumberId)) {
    Write-Host "❌ Phone Number ID cannot be empty" -ForegroundColor Red
    exit 1
}

# Get Access Token
Write-Host ""
Write-Host "Step 2: Access Token" -ForegroundColor Yellow
Write-Host "For testing: Use temporary token from Meta Developer Console"
Write-Host "For production: Use permanent System User token"
Write-Host ""
$accessToken = Read-Host "Enter your Access Token"

if ([string]::IsNullOrWhiteSpace($accessToken)) {
    Write-Host "❌ Access Token cannot be empty" -ForegroundColor Red
    exit 1
}

# Get Admin Phone
Write-Host ""
Write-Host "Step 3: Admin Phone Number" -ForegroundColor Yellow
Write-Host "This is the phone number that will receive notifications"
Write-Host "Format: Country code + number (no spaces, no + symbol)"
Write-Host "Example for Brazil: 5511948580070 = +55 11 94858-0070"
Write-Host ""
$adminPhone = Read-Host "Enter admin phone number"

if ([string]::IsNullOrWhiteSpace($adminPhone)) {
    Write-Host "❌ Admin phone cannot be empty" -ForegroundColor Red
    exit 1
}

# Validate phone number format
if ($adminPhone -notmatch '^\d{10,15}$') {
    Write-Host "❌ Invalid phone number format" -ForegroundColor Red
    Write-Host "Phone number should contain only digits (10-15 characters)"
    exit 1
}

# Update .env file
Write-Host ""
Write-Host "📝 Updating .env file..." -ForegroundColor Blue

$envContent = Get-Content $envFile -Raw

# Check if WhatsApp config already exists
if ($envContent -match 'WHATSAPP_PHONE_NUMBER_ID') {
    # Update existing values
    $envContent = $envContent -replace 'WHATSAPP_PHONE_NUMBER_ID=.*', "WHATSAPP_PHONE_NUMBER_ID=$phoneNumberId"
    $envContent = $envContent -replace 'WHATSAPP_ACCESS_TOKEN=.*', "WHATSAPP_ACCESS_TOKEN=$accessToken"
    $envContent = $envContent -replace 'ADMIN_PHONE=.*', "ADMIN_PHONE=$adminPhone"
    Set-Content -Path $envFile -Value $envContent -NoNewline
    Write-Host "✅ Updated existing WhatsApp configuration" -ForegroundColor Green
} else {
    # Add new values
    $newConfig = @"

# WhatsApp Business API Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=$phoneNumberId
WHATSAPP_ACCESS_TOKEN=$accessToken
ADMIN_PHONE=$adminPhone
"@
    Add-Content -Path $envFile -Value $newConfig
    Write-Host "✅ Added WhatsApp configuration" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         Configuration Summary              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Phone Number ID: " -ForegroundColor Green -NoNewline
Write-Host $phoneNumberId
Write-Host "✅ Access Token: " -ForegroundColor Green -NoNewline
Write-Host "$($accessToken.Substring(0, [Math]::Min(20, $accessToken.Length)))..."
Write-Host "✅ Admin Phone: " -ForegroundColor Green -NoNewline
Write-Host $adminPhone
Write-Host ""

# Test configuration
Write-Host "🧪 Would you like to test the configuration now?" -ForegroundColor Blue
$runTest = Read-Host "Run test? (y/n)"

if ($runTest -eq 'y' -or $runTest -eq 'Y') {
    Write-Host ""
    Write-Host "📱 Running WhatsApp API test..." -ForegroundColor Blue
    Write-Host ""
    
    # Create quick test script
    $testScript = @"
import axios from 'axios';

const CONFIG = {
  PHONE_NUMBER_ID: '$phoneNumberId',
  ACCESS_TOKEN: '$accessToken',
  TO_PHONE: '$adminPhone',
  API_URL: 'https://graph.facebook.com/v18.0'
};

async function quickTest() {
  try {
    const response = await axios.post(
      ``${CONFIG.API_URL}/${CONFIG.PHONE_NUMBER_ID}/messages``,
      {
        messaging_product: 'whatsapp',
        to: CONFIG.TO_PHONE,
        type: 'text',
        text: {
          body: '🎉 API do WhatsApp configurada com sucesso!\n\nSeu sistema UpCar-Aspiradores está pronto para enviar notificações.'
        }
      },
      {
        headers: {
          'Authorization': ``Bearer ${CONFIG.ACCESS_TOKEN}``,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Test message sent successfully!');
    console.log('📱 Check your phone for the message.');
    console.log('');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

quickTest();
"@
    
    Set-Content -Path "test-whatsapp-quick.ts" -Value $testScript
    npx tsx test-whatsapp-quick.ts
    Remove-Item "test-whatsapp-quick.ts" -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              Next Steps                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ✅ Configuration complete!"
Write-Host "2. 📱 Add your phone number to test list in Meta Console"
Write-Host "3. 🧪 Run full test suite: npx tsx test-whatsapp.ts"
Write-Host "4. 🚀 Restart your backend server to apply changes"
Write-Host "5. 📚 Read WHATSAPP-API-SETUP.md for detailed documentation"
Write-Host ""
Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
