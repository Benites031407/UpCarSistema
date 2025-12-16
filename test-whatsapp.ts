/**
 * WhatsApp API Test Script
 * 
 * This script helps you test your WhatsApp Business API integration
 * before using it in the main application.
 * 
 * Usage:
 *   1. Update the credentials below with your actual values
 *   2. Run: npx tsx test-whatsapp.ts
 */

import axios from 'axios';

// ============================================
// CONFIGURATION - Update these values
// ============================================

const CONFIG = {
  // Get from: WhatsApp → API Setup in Meta Developer Console
  PHONE_NUMBER_ID: '901637906368897',
  
  // Get from: WhatsApp → API Setup → Temporary access token
  ACCESS_TOKEN: 'EAALZCWU1ZAGZAMBQCXvEfHyk4ndjPSu8BcjZAcNCmZCc905wAHmShk5MWZBohUO3Iui9ZCB1qzaMUz4ldjW2NT0Etw9SzRmZABvJuH1M40bBIJ9q8gtqqS1Y9eL1JyB17OD1gFOyfZB73oYEQZAyhR441cB2pNP1ARClKxm6QztcfgS47Xg60LZA5V5Y0DleJ1JNcR0pvpFlo2fHl0YE0Ak6IyZClqfrKIush8x2vD90Eea3JruVm7wHRRifSpRBH7z8z2UvTEIFwUwsnw4ZCKV1VCZAK1Q7CA',
  
  // Your test phone number (format: country code + number, no spaces or +)
  // Example for Brazil: 5511948580070 = +55 11 94858-0070
  TO_PHONE: '5511941330822',
  
  // API URL (usually doesn't need to change)
  API_URL: 'https://graph.facebook.com/v18.0'
};

// ============================================
// TEST FUNCTIONS
// ============================================

/**
 * Test 1: Send a simple text message
 */
async function testSimpleMessage() {
  console.log('\n📱 Test 1: Sending simple text message...');
  
  try {
    const response = await axios.post(
      `${CONFIG.API_URL}/${CONFIG.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: CONFIG.TO_PHONE,
        type: 'text',
        text: {
          body: '🧪 Mensagem de teste do UpCar-Aspiradores\n\nSe você recebeu isso, a API do WhatsApp está funcionando corretamente!'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Message sent successfully!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error: any) {
    console.error('❌ Error sending message:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    return false;
  }
}

/**
 * Test 2: Send a maintenance notification (like your app does)
 */
async function testMaintenanceNotification() {
  console.log('\n🔧 Test 2: Sending maintenance notification...');
  
  const message = `🔧 MAINTENANCE REQUIRED

Machine: TEST-001
Location: Test Location
Reason: Scheduled maintenance test

Please schedule maintenance as soon as possible.`;
  
  try {
    const response = await axios.post(
      `${CONFIG.API_URL}/${CONFIG.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: CONFIG.TO_PHONE,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Maintenance notification sent!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error: any) {
    console.error('❌ Error sending notification:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    return false;
  }
}

/**
 * Test 3: Send an offline machine alert
 */
async function testOfflineAlert() {
  console.log('\n📡 Test 3: Sending offline machine alert...');
  
  const message = `📡 MACHINE OFFLINE

Machine: TEST-002
Location: Test Location
Last seen: 15 minutes ago

Please check the machine connection.`;
  
  try {
    const response = await axios.post(
      `${CONFIG.API_URL}/${CONFIG.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: CONFIG.TO_PHONE,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Offline alert sent!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error: any) {
    console.error('❌ Error sending alert:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    return false;
  }
}

/**
 * Validate configuration
 */
function validateConfig(): boolean {
  console.log('🔍 Validating configuration...\n');
  
  let isValid = true;
  
  if (CONFIG.PHONE_NUMBER_ID === 'your-phone-number-id-here') {
    console.error('❌ PHONE_NUMBER_ID not configured');
    console.log('   Get it from: WhatsApp → API Setup → "From" dropdown');
    isValid = false;
  } else {
    console.log('✅ PHONE_NUMBER_ID:', CONFIG.PHONE_NUMBER_ID);
  }
  
  if (CONFIG.ACCESS_TOKEN === 'your-access-token-here') {
    console.error('❌ ACCESS_TOKEN not configured');
    console.log('   Get it from: WhatsApp → API Setup → "Temporary access token"');
    isValid = false;
  } else {
    console.log('✅ ACCESS_TOKEN: ' + CONFIG.ACCESS_TOKEN.substring(0, 20) + '...');
  }
  
  if (CONFIG.TO_PHONE === '5511948580070') {
    console.warn('⚠️  Using default TO_PHONE number');
    console.log('   Update with your test phone number');
  } else {
    console.log('✅ TO_PHONE:', CONFIG.TO_PHONE);
  }
  
  // Validate phone number format
  if (!/^\d{10,15}$/.test(CONFIG.TO_PHONE)) {
    console.error('❌ Invalid phone number format');
    console.log('   Format: country code + number (no spaces, no +)');
    console.log('   Example: 5511948580070 for +55 11 94858-0070');
    isValid = false;
  }
  
  return isValid;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   WhatsApp Business API Test Suite        ║');
  console.log('╚════════════════════════════════════════════╝');
  
  // Validate configuration
  if (!validateConfig()) {
    console.log('\n❌ Configuration validation failed!');
    console.log('📝 Please update the CONFIG object at the top of this file.\n');
    process.exit(1);
  }
  
  console.log('\n✅ Configuration valid! Starting tests...\n');
  console.log('⏳ Please wait for WhatsApp messages on your phone...\n');
  
  // Run tests
  const results = {
    test1: await testSimpleMessage(),
    test2: await testMaintenanceNotification(),
    test3: await testOfflineAlert()
  };
  
  // Summary
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║           Test Results Summary             ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  console.log('Test 1 (Simple Message):', results.test1 ? '✅ PASSED' : '❌ FAILED');
  console.log('Test 2 (Maintenance):', results.test2 ? '✅ PASSED' : '❌ FAILED');
  console.log('Test 3 (Offline Alert):', results.test3 ? '✅ PASSED' : '❌ FAILED');
  
  const passedTests = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed\n`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your WhatsApp integration is working correctly.');
    console.log('📱 Check your phone for the test messages.\n');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above for details.\n');
    console.log('Common issues:');
    console.log('  1. Invalid access token (expired or incorrect)');
    console.log('  2. Phone number not in test list');
    console.log('  3. Invalid phone number format');
    console.log('  4. Network/firewall issues\n');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
