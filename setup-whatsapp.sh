#!/bin/bash

# WhatsApp API Setup Script
# This script helps you configure WhatsApp Business API for your application

echo "╔════════════════════════════════════════════╗"
echo "║   WhatsApp Business API Setup Wizard       ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f "packages/backend/.env" ]; then
    echo -e "${RED}❌ Error: packages/backend/.env file not found${NC}"
    echo "Please create it first by copying .env.example"
    exit 1
fi

echo -e "${BLUE}📋 This wizard will help you configure WhatsApp Business API${NC}"
echo ""
echo "Before starting, make sure you have:"
echo "  1. ✅ A Meta Developer account"
echo "  2. ✅ Created a Meta App with WhatsApp product"
echo "  3. ✅ Your Phone Number ID"
echo "  4. ✅ Your Access Token"
echo ""
read -p "Press Enter to continue..."
echo ""

# Get Phone Number ID
echo -e "${YELLOW}Step 1: Phone Number ID${NC}"
echo "Get this from: Meta Developer Console → WhatsApp → API Setup → 'From' dropdown"
echo "Example: 123456789012345"
echo ""
read -p "Enter your Phone Number ID: " PHONE_NUMBER_ID

if [ -z "$PHONE_NUMBER_ID" ]; then
    echo -e "${RED}❌ Phone Number ID cannot be empty${NC}"
    exit 1
fi

# Get Access Token
echo ""
echo -e "${YELLOW}Step 2: Access Token${NC}"
echo "For testing: Use temporary token from Meta Developer Console"
echo "For production: Use permanent System User token"
echo ""
read -p "Enter your Access Token: " ACCESS_TOKEN

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Access Token cannot be empty${NC}"
    exit 1
fi

# Get Admin Phone
echo ""
echo -e "${YELLOW}Step 3: Admin Phone Number${NC}"
echo "This is the phone number that will receive notifications"
echo "Format: Country code + number (no spaces, no + symbol)"
echo "Example for Brazil: 5511948580070 = +55 11 94858-0070"
echo ""
read -p "Enter admin phone number: " ADMIN_PHONE

if [ -z "$ADMIN_PHONE" ]; then
    echo -e "${RED}❌ Admin phone cannot be empty${NC}"
    exit 1
fi

# Validate phone number format
if ! [[ "$ADMIN_PHONE" =~ ^[0-9]{10,15}$ ]]; then
    echo -e "${RED}❌ Invalid phone number format${NC}"
    echo "Phone number should contain only digits (10-15 characters)"
    exit 1
fi

# Update .env file
echo ""
echo -e "${BLUE}📝 Updating .env file...${NC}"

ENV_FILE="packages/backend/.env"

# Check if WhatsApp config already exists
if grep -q "WHATSAPP_PHONE_NUMBER_ID" "$ENV_FILE"; then
    # Update existing values
    sed -i.bak "s|WHATSAPP_PHONE_NUMBER_ID=.*|WHATSAPP_PHONE_NUMBER_ID=$PHONE_NUMBER_ID|g" "$ENV_FILE"
    sed -i.bak "s|WHATSAPP_ACCESS_TOKEN=.*|WHATSAPP_ACCESS_TOKEN=$ACCESS_TOKEN|g" "$ENV_FILE"
    sed -i.bak "s|ADMIN_PHONE=.*|ADMIN_PHONE=$ADMIN_PHONE|g" "$ENV_FILE"
    rm "${ENV_FILE}.bak" 2>/dev/null
    echo -e "${GREEN}✅ Updated existing WhatsApp configuration${NC}"
else
    # Add new values
    echo "" >> "$ENV_FILE"
    echo "# WhatsApp Business API Configuration" >> "$ENV_FILE"
    echo "WHATSAPP_API_URL=https://graph.facebook.com/v18.0" >> "$ENV_FILE"
    echo "WHATSAPP_PHONE_NUMBER_ID=$PHONE_NUMBER_ID" >> "$ENV_FILE"
    echo "WHATSAPP_ACCESS_TOKEN=$ACCESS_TOKEN" >> "$ENV_FILE"
    echo "ADMIN_PHONE=$ADMIN_PHONE" >> "$ENV_FILE"
    echo -e "${GREEN}✅ Added WhatsApp configuration${NC}"
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║         Configuration Summary              ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Phone Number ID:${NC} $PHONE_NUMBER_ID"
echo -e "${GREEN}✅ Access Token:${NC} ${ACCESS_TOKEN:0:20}..."
echo -e "${GREEN}✅ Admin Phone:${NC} $ADMIN_PHONE"
echo ""

# Test configuration
echo -e "${BLUE}🧪 Would you like to test the configuration now?${NC}"
read -p "Run test? (y/n): " RUN_TEST

if [ "$RUN_TEST" = "y" ] || [ "$RUN_TEST" = "Y" ]; then
    echo ""
    echo -e "${BLUE}📱 Running WhatsApp API test...${NC}"
    echo ""
    
    # Update test script with credentials
    cat > test-whatsapp-quick.ts << EOF
import axios from 'axios';

const CONFIG = {
  PHONE_NUMBER_ID: '$PHONE_NUMBER_ID',
  ACCESS_TOKEN: '$ACCESS_TOKEN',
  TO_PHONE: '$ADMIN_PHONE',
  API_URL: 'https://graph.facebook.com/v18.0'
};

async function quickTest() {
  try {
    const response = await axios.post(
      \`\${CONFIG.API_URL}/\${CONFIG.PHONE_NUMBER_ID}/messages\`,
      {
        messaging_product: 'whatsapp',
        to: CONFIG.TO_PHONE,
        type: 'text',
        text: {
          body: '🎉 API do WhatsApp configurada com sucesso!\\n\\nSeu sistema UpCar-Aspiradores está pronto para enviar notificações.'
        }
      },
      {
        headers: {
          'Authorization': \`Bearer \${CONFIG.ACCESS_TOKEN}\`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Test message sent successfully!');
    console.log('📱 Check your phone for the message.');
    console.log('');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
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
EOF
    
    npx tsx test-whatsapp-quick.ts
    rm test-whatsapp-quick.ts
fi

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║              Next Steps                    ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "1. ✅ Configuration complete!"
echo "2. 📱 Add your phone number to test list in Meta Console"
echo "3. 🧪 Run full test suite: npx tsx test-whatsapp.ts"
echo "4. 🚀 Restart your backend server to apply changes"
echo "5. 📚 Read WHATSAPP-API-SETUP.md for detailed documentation"
echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"
echo ""
