#!/usr/bin/env node
// Collaboration Diagnostic Script
// Run this to debug server connection issues

import fetch from 'node-fetch';

console.log('🔍 DriveKenya Collaboration Diagnostic Tool');
console.log('===========================================\n');

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

async function checkBackendHealth() {
  console.log('1️⃣ Testing Backend Server...');
  
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
      return false;
    }
  } catch (error) {
    console.log('   ❌ Backend Server: NOT RUNNING or NOT ACCESSIBLE');
    console.log(`   🔧 Error: ${error.message}\n`);
    return false;
  }
}

async function checkGoogleSignUpEndpoint() {
  console.log('2️⃣ Testing Google Sign-Up Endpoint...');
  
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
  console.log('3️⃣ Testing CORS Configuration...');
  
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

function printTroubleshootingSteps() {
  console.log('🛠️ TROUBLESHOOTING STEPS:');
  console.log('========================\n');
  
  console.log('📋 Step 1: Start Backend Server');
  console.log('   cd backend-nodejs');
  console.log('   npm install');
  console.log('   npm start\n');
  
  console.log('📋 Step 2: Start Frontend Server');
  console.log('   cd frontend');
  console.log('   npm install');
  console.log('   npm run dev\n');
  
  console.log('📋 Step 3: Check Ports');
  console.log('   Backend should run on: http://localhost:5000');
  console.log('   Frontend should run on: http://localhost:3000\n');
  
  console.log('📋 Step 4: Check Console Logs');
  console.log('   Backend: Look for "🚗 Nairobi Car Hire API server running"');
  console.log('   Frontend: Open browser DevTools console\n');
  
  console.log('📋 Step 5: Test Health Check');
  console.log('   Visit: http://localhost:5000/health');
  console.log('   Should show: {"status":"OK","message":"Nairobi Car Hire API is running"}\n');
}

async function runDiagnostics() {
  const backendHealth = await checkBackendHealth();
  
  if (!backendHealth) {
    console.log('⚠️ CRITICAL: Backend server is not running!\n');
    printTroubleshootingSteps();
    return;
  }
  
  const googleSignUp = await checkGoogleSignUpEndpoint();
  const cors = await checkCORS();
  const database = await checkDatabase();
  
  console.log('📊 DIAGNOSTIC SUMMARY:');
  console.log('======================');
  console.log(`Backend Server: ${backendHealth ? '✅' : '❌'}`);
  console.log(`Google Sign-Up: ${googleSignUp ? '✅' : '❌'}`);
  console.log(`CORS Config:    ${cors ? '✅' : '❌'}`);
  console.log(`Database:       ${database ? '✅' : '❌'}\n`);
  
  if (backendHealth && googleSignUp && cors && database) {
    console.log('🎉 ALL SYSTEMS WORKING! Your collaborator should be able to use the app now.');
  } else {
    console.log('⚠️ Some issues detected. Check the steps above.');
  }
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('❌ Diagnostic failed:', error.message);
  console.log('\n🔧 Make sure you have node-fetch installed:');
  console.log('   npm install node-fetch');
});