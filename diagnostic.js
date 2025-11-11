#!/usr/bin/env node
// Collaboration Diagnostic Script
// Run this to debug server connection issues

// Use Node.js built-in fetch (available in Node.js 18+)
// No external dependencies required!

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 DriveKenya COMPREHENSIVE Collaboration Diagnostic Tool');
console.log('=======================================================\n');

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

async function checkFileSystem() {
  console.log('1️⃣ Checking File System & Dependencies...');
  
  const checks = [
    { name: 'backend-nodejs folder', path: path.join(__dirname, 'backend-nodejs') },
    { name: 'frontend folder', path: path.join(__dirname, 'frontend') },
    { name: 'backend package.json', path: path.join(__dirname, 'backend-nodejs', 'package.json') },
    { name: 'backend .env file', path: path.join(__dirname, 'backend-nodejs', '.env') },
    { name: 'backend server.js', path: path.join(__dirname, 'backend-nodejs', 'server.js') },
    { name: 'backend node_modules', path: path.join(__dirname, 'backend-nodejs', 'node_modules') },
    { name: 'frontend package.json', path: path.join(__dirname, 'frontend', 'package.json') },
    { name: 'frontend node_modules', path: path.join(__dirname, 'frontend', 'node_modules') }
  ];
  
  let allGood = true;
  for (const check of checks) {
    if (fs.existsSync(check.path)) {
      console.log(`   ✅ ${check.name}`);
    } else {
      console.log(`   ❌ ${check.name} - MISSING`);
      allGood = false;
    }
  }
  
  // Check .env content
  try {
    const envPath = path.join(__dirname, 'backend-nodejs', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const hasJwtSecret = envContent.includes('JWT_SECRET=');
      const hasPort = envContent.includes('PORT=');
      
      console.log(`   ${hasJwtSecret ? '✅' : '❌'} .env has JWT_SECRET`);
      console.log(`   ${hasPort ? '✅' : '❌'} .env has PORT`);
      
      if (hasJwtSecret) {
        const jwtLine = envContent.split('\n').find(line => line.startsWith('JWT_SECRET='));
        const jwtValue = jwtLine?.split('=')[1]?.trim();
        console.log(`   🔑 JWT_SECRET: ${jwtValue?.slice(0, 20)}...`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error reading .env: ${error.message}`);
    allGood = false;
  }
  
  console.log('');
  return allGood;
}

async function checkDatabaseFile() {
  console.log('2️⃣ Checking Database File...');
  
  const dbPath = path.join(__dirname, 'backend-nodejs', 'driveKenya.db');
  if (fs.existsSync(dbPath)) {
    try {
      const stats = fs.statSync(dbPath);
      console.log(`   ✅ Database file exists (${stats.size} bytes)`);
      console.log(`   📅 Created: ${stats.birthtime}`);
      console.log(`   📝 Modified: ${stats.mtime}`);
    } catch (error) {
      console.log(`   ❌ Database file error: ${error.message}`);
    }
  } else {
    console.log(`   ⚠️ Database file doesn't exist (will be created on first run)`);
  }
  console.log('');
}

async function checkBackendHealth() {
  console.log('3️⃣ Testing Backend Server Health...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Backend Server: RUNNING');
      console.log(`   📍 Status: ${data.status}`);
      console.log(`   💬 Message: ${data.message}`);
      console.log(`   🕒 Timestamp: ${data.timestamp}\n`);
      return true;
    } else {
      console.log(`   ❌ Backend Server: UNHEALTHY (${response.status})`);
      const text = await response.text();
      console.log(`   📝 Response: ${text}\n`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Backend Server: NOT RUNNING or NOT ACCESSIBLE');
    console.log(`   🔧 Error: ${error.message}`);
    console.log(`   💡 Possible causes:`);
    console.log(`      - Backend server not started`);
    console.log(`      - Wrong port (should be 5000)`);
    console.log(`      - Firewall blocking connection`);
    console.log(`      - Node.js/npm errors preventing startup\n`);
    return false;
  }
}

async function checkSpecificEndpoints() {
  console.log('4️⃣ Testing Specific API Endpoints...');
  
  const endpoints = [
    { path: '/api/health', method: 'GET', description: 'API Health Check' },
    { path: '/api/status', method: 'GET', description: 'API Status' },
    { path: '/api/test-cors', method: 'GET', description: 'CORS Test' },
    { path: '/api/cars', method: 'GET', description: 'Cars Endpoint (may need auth)' }
  ];
  
  let workingEndpoints = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint.path}`, {
        method: endpoint.method,
        timeout: 5000
      });
      
      const status = response.status;
      const statusText = response.statusText;
      
      if (status === 200) {
        console.log(`   ✅ ${endpoint.description}: OK (${status})`);
        workingEndpoints++;
      } else if (status === 401 || status === 403) {
        console.log(`   ⚠️ ${endpoint.description}: Auth Required (${status})`);
        workingEndpoints++;
      } else {
        console.log(`   ❌ ${endpoint.description}: Error (${status} ${statusText})`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.description}: Failed - ${error.message}`);
    }
  }
  
  console.log(`   📊 Working endpoints: ${workingEndpoints}/${endpoints.length}\n`);
  return workingEndpoints > 0;
}

async function testLoginEndpointDeep() {
  console.log('5️⃣ Deep Testing Login Endpoint...');
  
  // Test 1: Basic endpoint availability
  try {
    console.log('   🧪 Test 1: POST to login endpoint...');
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nonexistent@test.com',
        password: 'testpass123'
      }),
      timeout: 10000
    });
    
    console.log(`   📊 Response Status: ${response.status}`);
    console.log(`   📊 Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
    
    let responseText = '';
    try {
      responseText = await response.text();
      console.log(`   📊 Response Body: ${responseText}`);
    } catch (textError) {
      console.log(`   ❌ Could not read response body: ${textError.message}`);
    }
    
    if (response.status === 500) {
      console.log('   🚨 DETECTED: 500 Internal Server Error!');
      console.log('   🔍 This confirms the login endpoint is crashing');
      
      // Try to parse error details
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          console.log(`   🛠️ Error Details: ${JSON.stringify(errorData, null, 2)}`);
        } catch (parseError) {
          console.log(`   🛠️ Raw Error: ${responseText}`);
        }
      }
      
      return false;
    } else if (response.status === 401 || response.status === 400) {
      console.log('   ✅ Login endpoint working (returned expected auth error)');
      return true;
    } else {
      console.log(`   ⚠️ Unexpected status: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Login endpoint test failed: ${error.message}`);
    return false;
  }
}

async function testDatabaseOperations() {
  console.log('6️⃣ Testing Database Operations...');
  
  // Test simple endpoint that might trigger DB
  try {
    console.log('   🧪 Testing cars endpoint (triggers DB)...');
    const response = await fetch(`${BACKEND_URL}/api/cars-simple`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Database operations working');
      console.log(`   📊 Cars count: ${data.count || 0}`);
      return true;
    } else {
      console.log(`   ❌ Database operation failed: ${response.status}`);
      const text = await response.text();
      console.log(`   📝 Error: ${text}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Database test failed: ${error.message}`);
    return false;
  }
}
async function checkGoogleSignUpEndpoint() {
  console.log('7️⃣ Testing Google Sign-Up Endpoint...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/google-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        googleToken: 'test-token',
        role: 'customer',
        accountType: 'customer'
      }),
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Google Sign-Up: WORKING');
      console.log(`   💬 Response: ${data.message}\n`);
      return true;
    } else {
      console.log(`   ❌ Google Sign-Up: ERROR (${response.status})`);
      const text = await response.text();
      console.log(`   📝 Response: ${text}\n`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Google Sign-Up: FAILED');
    console.log(`   🔧 Error: ${error.message}\n`);
    return false;
  }
}

async function checkCORS() {
  console.log('8️⃣ Testing CORS Configuration...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/test-cors`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_URL
      },
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ CORS: CONFIGURED CORRECTLY');
      console.log(`   🌍 Origin: ${data.origin || 'localhost:3000'}\n`);
      return true;
    } else {
      console.log(`   ❌ CORS: CONFIGURATION ERROR (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ CORS: FAILED');
    console.log(`   🔧 Error: ${error.message}\n`);
    return false;
  }
}

async function checkDatabase() {
  console.log('4️⃣ Testing Database Connection...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/cars`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok || response.status === 401) {
      console.log('   ✅ Database: ACCESSIBLE');
      console.log('   📊 Cars endpoint responding (auth required)\n');
      return true;
    } else {
      console.log(`   ❌ Database: ERROR (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Database: CONNECTION FAILED');
    console.log(`   🔧 Error: ${error.message}\n`);
    return false;
  }
}

async function checkEnvironmentVariables() {
  console.log('5️⃣ Testing Environment Variables...');
  
  try {
    // Test login endpoint which requires JWT_SECRET
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpass'
      }),
      timeout: 5000
    });
    
    if (response.status === 500) {
      console.log('   ❌ Environment Variables: MISSING');
      console.log('   🔧 Error: .env file not found or JWT_SECRET missing');
      console.log('   📋 Solution: Create backend-nodejs/.env file\n');
      return false;
    } else {
      console.log('   ✅ Environment Variables: CONFIGURED');
      console.log('   🔑 JWT_SECRET and other vars are loaded\n');
      return true;
    }
  } catch (error) {
    console.log('   ❌ Environment Variables: TEST FAILED');
    console.log(`   🔧 Error: ${error.message}\n`);
    return false;
  }
}

function printTroubleshootingSteps() {
  console.log('🛠️ TROUBLESHOOTING STEPS:');
  console.log('========================\n');
  
  console.log('📋 Step 1: Create Environment Variables');
  console.log('   cd backend-nodejs');
  console.log('   copy .env.example .env');
  console.log('   # Edit .env file if needed\n');
  
  console.log('📋 Step 2: Install Dependencies');
  console.log('   npm install');
  console.log('   cd ../frontend');
  console.log('   npm install\n');
  
  console.log('📋 Step 3: Start Backend Server');
  console.log('   cd backend-nodejs');
  console.log('   npm start\n');
  
  console.log('📋 Step 4: Start Frontend Server');
  console.log('   cd frontend');
  console.log('   npm run dev\n');
  
  console.log('📋 Step 5: Check Ports');
  console.log('   Backend should run on: http://localhost:5000');
  console.log('   Frontend should run on: http://localhost:3000\n');
  
  console.log('📋 Step 6: Check Console Logs');
  console.log('   Backend: Look for "🚗 Nairobi Car Hire API server running"');
  console.log('   Frontend: Open browser DevTools console\n');
  
  console.log('📋 Step 7: Test Health Check');
  console.log('   Visit: http://localhost:5000/health');
  console.log('   Should show: {"status":"OK","message":"Nairobi Car Hire API is running"}\n');
}

async function runDiagnostics() {
  // Step 1: File System Check
  const filesOk = await checkFileSystem();
  
  // Step 2: Database Check  
  await checkDatabaseFile();
  
  if (!filesOk) {
    console.log('⚠️ CRITICAL: Missing files or dependencies!\n');
    console.log('🔧 IMMEDIATE ACTIONS NEEDED:');
    console.log('1. Ensure you\'re in the correct directory');
    console.log('2. Run: npm install in both backend-nodejs/ and frontend/');
    console.log('3. Make sure .env file exists in backend-nodejs/\n');
    return;
  }
  
  // Step 3: Backend Health
  const backendHealth = await checkBackendHealth();
  
  if (!backendHealth) {
    console.log('⚠️ CRITICAL: Backend server is not running!\n');
    printTroubleshootingSteps();
    return;
  }
  
  // Step 4-8: Detailed Tests
  const endpointsOk = await checkSpecificEndpoints();
  const loginOk = await testLoginEndpointDeep();
  const databaseOk = await testDatabaseOperations();
  const googleSignUpOk = await checkGoogleSignUpEndpoint();
  const corsOk = await checkCORS();
  
  // Final Summary
  console.log('📊 COMPREHENSIVE DIAGNOSTIC SUMMARY:');
  console.log('====================================');
  console.log(`File System:      ${filesOk ? '✅' : '❌'}`);
  console.log(`Backend Server:   ${backendHealth ? '✅' : '❌'}`);
  console.log(`API Endpoints:    ${endpointsOk ? '✅' : '❌'}`);
  console.log(`Login Endpoint:   ${loginOk ? '✅' : '❌'} ${!loginOk ? '← ISSUE HERE!' : ''}`);
  console.log(`Database Ops:     ${databaseOk ? '✅' : '❌'}`);
  console.log(`Google Sign-Up:   ${googleSignUpOk ? '✅' : '❌'}`);
  console.log(`CORS Config:      ${corsOk ? '✅' : '❌'}\n`);
  
  if (filesOk && backendHealth && endpointsOk && loginOk && databaseOk && googleSignUpOk && corsOk) {
    console.log('🎉 ALL SYSTEMS WORKING PERFECTLY!');
    console.log('Your collaborator should be able to use login without any issues.');
  } else {
    console.log('⚠️ ISSUES DETECTED!');
    
    if (!loginOk) {
      console.log('\n🚨 PRIMARY ISSUE: Login endpoint returning 500 error');
      console.log('📋 NEXT STEPS:');
      console.log('1. Check backend terminal for error messages');
      console.log('2. Look for database connection errors');
      console.log('3. Verify all npm dependencies are installed');
      console.log('4. Check if bcryptjs package is properly installed');
      console.log('5. Try: cd backend-nodejs && npm install bcryptjs');
    }
    
    if (!databaseOk) {
      console.log('\n🚨 DATABASE ISSUE DETECTED');
      console.log('📋 ACTIONS:');
      console.log('1. Check if SQLite database can be created');
      console.log('2. Verify file permissions in backend-nodejs folder');
    }
  }
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('❌ Diagnostic failed:', error.message);
  console.log('\n🔧 Make sure you have Node.js 18+ installed for built-in fetch support');
  console.log('   Check your Node.js version: node --version');
});