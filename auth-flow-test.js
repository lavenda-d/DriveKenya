#!/usr/bin/env node
// Signup/Login Flow Diagnostics - Test the entire authentication flow

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 SIGNUP/LOGIN FLOW DIAGNOSTICS');
console.log('=================================\n');

const BACKEND_URL = 'http://localhost:5000';

// Generate random test user
const testUser = {
  name: 'Test User ' + Math.floor(Math.random() * 1000),
  email: `test${Math.floor(Math.random() * 10000)}@example.com`,
  password: 'TestPassword123!',
  phone: '+1234567890',
  role: 'customer'
};

async function testBackendHealth() {
  console.log('1️⃣ Checking Backend Server...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (response.ok) {
      console.log('   ✅ Backend server is running\n');
      return true;
    } else {
      console.log('   ❌ Backend server unhealthy\n');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Backend server not accessible\n');
    return false;
  }
}

async function testSignup() {
  console.log('2️⃣ Testing User Signup...');
  console.log(`   👤 Test User: ${testUser.email}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });
    
    console.log(`   📊 Response Status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`   📄 Response: ${responseText}`);
    
    if (response.status === 201) {
      const data = JSON.parse(responseText);
      console.log('   ✅ Signup successful!');
      console.log(`   🎫 Token received: ${data.data?.token ? 'Yes' : 'No'}`);
      console.log(`   👤 User ID: ${data.data?.user?.id}`);
      return { success: true, data: data.data };
    } else {
      console.log('   ❌ Signup failed');
      return { success: false, error: responseText };
    }
  } catch (error) {
    console.log(`   ❌ Signup error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testLogin() {
  console.log('\n3️⃣ Testing User Login...');
  console.log(`   👤 Login attempt: ${testUser.email}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    console.log(`   📊 Response Status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`   📄 Response: ${responseText}`);
    
    if (response.status === 200) {
      const data = JSON.parse(responseText);
      console.log('   ✅ Login successful!');
      console.log(`   🎫 Token received: ${data.data?.token ? 'Yes' : 'No'}`);
      console.log(`   👤 User name: ${data.data?.user?.name}`);
      return { success: true, data: data.data };
    } else if (response.status === 401) {
      console.log('   ❌ Login failed: Invalid credentials');
      console.log('   🔍 This suggests password hashing mismatch!');
      return { success: false, error: 'Invalid credentials' };
    } else if (response.status === 500) {
      console.log('   ❌ Login failed: Internal server error');
      console.log('   🔍 This suggests code/database error!');
      return { success: false, error: 'Internal server error' };
    } else {
      console.log('   ❌ Login failed: Unexpected status');
      return { success: false, error: responseText };
    }
  } catch (error) {
    console.log(`   ❌ Login error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkDatabaseDirectly() {
  console.log('\n4️⃣ Checking Database State...');
  
  const dbPath = path.join(__dirname, 'backend-nodejs', 'driveKenya.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log('   ❌ Database file not found');
    return false;
  }
  
  try {
    // Try to check if our test user was created
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nonexistent@test.com',
        password: 'wrongpass'
      })
    });
    
    if (response.status === 401) {
      const data = await response.json();
      console.log('   ✅ Database queries working (got expected 401)');
      return true;
    } else if (response.status === 500) {
      console.log('   ❌ Database queries failing (500 error)');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Database check failed: ${error.message}`);
    return false;
  }
}

async function testPasswordHashing() {
  console.log('\n5️⃣ Testing Password Hashing Consistency...');
  
  // This would require checking the actual auth.js file
  const authPath = path.join(__dirname, 'backend-nodejs', 'routes', 'auth.js');
  
  if (fs.existsSync(authPath)) {
    const authContent = fs.readFileSync(authPath, 'utf8');
    
    // Check for bcrypt usage
    const hasBcryptImport = /import.*bcrypt/.test(authContent);
    const hasBcryptHash = /bcrypt\.hash/.test(authContent);
    const hasBcryptCompare = /bcrypt\.compare/.test(authContent);
    
    console.log(`   ${hasBcryptImport ? '✅' : '❌'} bcrypt imported`);
    console.log(`   ${hasBcryptHash ? '✅' : '❌'} bcrypt.hash used in signup`);
    console.log(`   ${hasBcryptCompare ? '✅' : '❌'} bcrypt.compare used in login`);
    
    // Check salt rounds consistency
    const saltRoundsMatches = authContent.match(/saltRounds\s*=\s*(\d+)/g);
    if (saltRoundsMatches) {
      console.log(`   🔒 Salt rounds found: ${saltRoundsMatches.join(', ')}`);
    } else {
      console.log('   ⚠️ No explicit saltRounds found');
    }
    
    return hasBcryptImport && hasBcryptHash && hasBcryptCompare;
  } else {
    console.log('   ❌ auth.js file not found');
    return false;
  }
}

async function runSignupLoginTest() {
  console.log(`🧪 Testing with user: ${testUser.email}\n`);
  
  // Step 1: Check backend
  const backendOk = await testBackendHealth();
  if (!backendOk) {
    console.log('❌ Cannot proceed: Backend server not running');
    return;
  }
  
  // Step 2: Test signup
  const signupResult = await testSignup();
  if (!signupResult.success) {
    console.log('❌ Cannot proceed: Signup failed');
    return;
  }
  
  // Step 3: Test login
  const loginResult = await testLogin();
  
  // Step 4: Check database state
  const dbOk = await checkDatabaseDirectly();
  
  // Step 5: Check password hashing
  const hashOk = await testPasswordHashing();
  
  // Summary
  console.log('\n📊 SIGNUP/LOGIN TEST SUMMARY:');
  console.log('============================');
  console.log(`Backend Server:    ✅`);
  console.log(`User Signup:       ✅`);
  console.log(`User Login:        ${loginResult.success ? '✅' : '❌'}`);
  console.log(`Database State:    ${dbOk ? '✅' : '❌'}`);
  console.log(`Password Hashing:  ${hashOk ? '✅' : '❌'}`);
  
  if (!loginResult.success) {
    console.log('\n🚨 LOGIN ISSUE DETECTED!');
    console.log('Possible causes:');
    console.log('1. Password hashing mismatch between signup and login');
    console.log('2. Database column type issues');
    console.log('3. bcrypt version compatibility problems');
    console.log('4. Salt rounds inconsistency');
    console.log('5. Character encoding issues in password');
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('1. Check backend console for error logs during login');
    console.log('2. Verify bcrypt version: npm list bcrypt bcryptjs');
    console.log('3. Try recreating user with simpler password');
    console.log('4. Check database password column length/type');
  } else {
    console.log('\n🎉 Authentication flow working perfectly!');
  }
}

// Run the test
runSignupLoginTest().catch(error => {
  console.error('❌ Test failed:', error.message);
});