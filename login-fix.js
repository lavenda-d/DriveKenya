// Specific fix for signup works but login fails issue
// This addresses the most common causes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 SIGNUP/LOGIN MISMATCH FIX');
console.log('============================\n');

// The issue is likely in auth.js - let's check and fix it

const authPath = path.join(__dirname, 'backend-nodejs', 'routes', 'auth.js');

function analyzeAuthFile() {
  console.log('🔍 Analyzing auth.js file...\n');
  
  if (!fs.existsSync(authPath)) {
    console.log('❌ auth.js not found');
    return false;
  }
  
  const content = fs.readFileSync(authPath, 'utf8');
  
  // Check for common issues
  const issues = [];
  
  // Issue 1: normalizeEmail inconsistency
  const signupEmailNorm = content.includes('.normalizeEmail()') && content.indexOf('.normalizeEmail()') < content.indexOf('register');
  const loginEmailNorm = content.includes('.normalizeEmail()') && content.indexOf('.normalizeEmail()') > content.indexOf('login');
  
  if (signupEmailNorm !== loginEmailNorm) {
    issues.push('Email normalization mismatch between signup and login');
  }
  
  // Issue 2: Different bcrypt methods
  const hasHashAsync = content.includes('bcrypt.hash(');
  const hasCompareAsync = content.includes('bcrypt.compare(');
  
  if (!hasHashAsync || !hasCompareAsync) {
    issues.push('bcrypt async methods not consistently used');
  }
  
  // Issue 3: Salt rounds consistency
  const saltMatches = content.match(/saltRounds\s*=\s*(\d+)/g);
  if (saltMatches && saltMatches.length > 1) {
    const values = saltMatches.map(m => m.match(/\d+/)[0]);
    if (new Set(values).size > 1) {
      issues.push('Inconsistent salt rounds values');
    }
  }
  
  console.log('📊 Analysis Results:');
  console.log(`✅ bcrypt.hash found: ${hasHashAsync}`);
  console.log(`✅ bcrypt.compare found: ${hasCompareAsync}`);
  console.log(`📧 Email normalization: Signup=${signupEmailNorm}, Login=${loginEmailNorm}`);
  
  if (saltMatches) {
    console.log(`🔒 Salt rounds: ${saltMatches.join(', ')}`);
  }
  
  if (issues.length > 0) {
    console.log('\n❌ Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  } else {
    console.log('\n✅ No obvious issues in auth.js');
    return true;
  }
}

async function suggestFixes() {
  console.log('\n🔧 SPECIFIC FIXES TO TRY:\n');
  
  console.log('1️⃣ Email Normalization Issue:');
  console.log('   The validateLogin uses normalizeEmail() but signup might not');
  console.log('   This could cause email mismatch between registration and login\n');
  
  console.log('2️⃣ bcrypt Version Issue:');
  console.log('   Try reinstalling bcryptjs:');
  console.log('   cd backend-nodejs');
  console.log('   npm uninstall bcryptjs');
  console.log('   npm install bcryptjs@2.4.3\n');
  
  console.log('3️⃣ Password Hashing Debug:');
  console.log('   Add console.log to see what\'s happening:');
  console.log('   In login route, log the stored hash vs input password\n');
  
  console.log('4️⃣ Database Check:');
  console.log('   Verify user was actually saved with correct password hash');
  console.log('   Check if password column is long enough (should be ~60 chars)\n');
  
  console.log('5️⃣ Test with Simple Password:');
  console.log('   Try registering with password: "password123"');
  console.log('   Avoid special characters that might cause encoding issues\n');
  
  console.log('6️⃣ Check for Async/Await Issues:');
  console.log('   Make sure both bcrypt.hash and bcrypt.compare use await\n');
}

async function createQuickTest() {
  console.log('🧪 QUICK TEST INSTRUCTIONS:\n');
  
  console.log('1. Register a new user with simple credentials:');
  console.log('   Email: test123@test.com');
  console.log('   Password: simplepass123');
  console.log('   Name: Test User\n');
  
  console.log('2. Check backend terminal for any error messages\n');
  
  console.log('3. Try to login with exact same credentials\n');
  
  console.log('4. If login fails, check these in backend console:');
  console.log('   - User found in database?');
  console.log('   - Password hash looks correct? (should be ~60 chars)');
  console.log('   - Any bcrypt comparison errors?\n');
  
  console.log('5. Run the auth flow test:');
  console.log('   node auth-flow-test.js\n');
}

// Run analysis
analyzeAuthFile();
await suggestFixes();
await createQuickTest();