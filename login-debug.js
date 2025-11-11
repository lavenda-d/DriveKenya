#!/usr/bin/env node
// Deep Login Diagnostics - Specific for 500 Internal Server Error
// Run this if diagnostic.js shows login endpoint issues

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 LOGIN ENDPOINT DEEP DIAGNOSTICS');
console.log('==================================\n');

async function checkBackendLogs() {
  console.log('1️⃣ Checking Backend Dependencies...');
  
  const backendPath = path.join(__dirname, 'backend-nodejs');
  const packagePath = path.join(backendPath, 'package.json');
  const nodeModulesPath = path.join(backendPath, 'node_modules');
  
  if (!fs.existsSync(packagePath)) {
    console.log('   ❌ package.json not found in backend-nodejs/');
    return false;
  }
  
  const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const dependencies = packageContent.dependencies || {};
  
  console.log('   📦 Checking critical dependencies:');
  
  const criticalDeps = [
    'bcryptjs',
    'jsonwebtoken', 
    'better-sqlite3',
    'express',
    'cors',
    'dotenv'
  ];
  
  let allInstalled = true;
  
  for (const dep of criticalDeps) {
    const hasInPackage = dependencies[dep] !== undefined;
    const moduleExists = fs.existsSync(path.join(nodeModulesPath, dep));
    
    if (hasInPackage && moduleExists) {
      console.log(`   ✅ ${dep}: ${dependencies[dep]}`);
    } else if (hasInPackage && !moduleExists) {
      console.log(`   ❌ ${dep}: Listed but not installed`);
      allInstalled = false;
    } else {
      console.log(`   ⚠️ ${dep}: Not in package.json`);
    }
  }
  
  console.log('');
  return allInstalled;
}

async function testAuthRoute() {
  console.log('2️⃣ Testing Auth Route File...');
  
  const authRoutePath = path.join(__dirname, 'backend-nodejs', 'routes', 'auth.js');
  
  if (!fs.existsSync(authRoutePath)) {
    console.log('   ❌ auth.js route file missing');
    return false;
  }
  
  try {
    const authContent = fs.readFileSync(authRoutePath, 'utf8');
    
    const checks = [
      { name: 'bcrypt import', pattern: /import.*bcrypt/i },
      { name: 'jwt import', pattern: /import.*jwt/i },
      { name: 'login route', pattern: /router\.post.*\/login/i },
      { name: 'query function', pattern: /query\s*\(/i },
      { name: 'bcrypt.compare', pattern: /bcrypt\.compare/i },
      { name: 'jwt.sign', pattern: /jwt\.sign/i }
    ];
    
    for (const check of checks) {
      const found = check.pattern.test(authContent);
      console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.log(`   ❌ Error reading auth.js: ${error.message}`);
    return false;
  }
}

async function testDatabaseConfig() {
  console.log('3️⃣ Testing Database Configuration...');
  
  const dbConfigPath = path.join(__dirname, 'backend-nodejs', 'config', 'database-sqlite.js');
  
  if (!fs.existsSync(dbConfigPath)) {
    console.log('   ❌ database-sqlite.js config missing');
    return false;
  }
  
  try {
    const dbContent = fs.readFileSync(dbConfigPath, 'utf8');
    
    const checks = [
      { name: 'better-sqlite3 import', pattern: /import.*Database.*better-sqlite3/i },
      { name: 'query export', pattern: /export.*query/i },
      { name: 'database path', pattern: /driveKenya\.db/i },
      { name: 'users table creation', pattern: /CREATE TABLE.*users/i }
    ];
    
    for (const check of checks) {
      const found = check.pattern.test(dbContent);
      console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.log(`   ❌ Error reading database config: ${error.message}`);
    return false;
  }
}

async function simulateLogin() {
  console.log('4️⃣ Simulating Actual Login Request...');
  
  const testData = {
    email: 'test@example.com',
    password: 'testpassword123'
  };
  
  try {
    console.log(`   🧪 Sending POST to http://localhost:5000/api/auth/login`);
    console.log(`   📦 Data: ${JSON.stringify(testData)}`);
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`   📊 Status: ${response.status} ${response.statusText}`);
    console.log(`   📊 Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
    
    const responseText = await response.text();
    console.log(`   📊 Body: ${responseText}`);
    
    if (response.status === 500) {
      console.log('   🚨 CONFIRMED: 500 Internal Server Error');
      
      // Try to parse server error
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.stack) {
          console.log('   🔍 Server Stack Trace:');
          console.log(`   ${errorData.stack.split('\n').slice(0, 5).join('\n   ')}`);
        }
      } catch (parseError) {
        console.log('   📝 Raw error response (not JSON)');
      }
      
      return false;
    } else {
      console.log('   ✅ Login endpoint responding (expected auth failure)');
      return true;
    }
    
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return false;
  }
}

async function provideFixes() {
  console.log('🔧 POTENTIAL FIXES TO TRY:');
  console.log('===========================\n');
  
  console.log('1️⃣ Reinstall Dependencies:');
  console.log('   cd backend-nodejs');
  console.log('   rm -rf node_modules package-lock.json');
  console.log('   npm install\n');
  
  console.log('2️⃣ Check Backend Console Output:');
  console.log('   Look for error messages when starting server');
  console.log('   npm start should show "🚗 Nairobi Car Hire API server running"\n');
  
  console.log('3️⃣ Test Specific Packages:');
  console.log('   npm install bcryptjs@latest');
  console.log('   npm install jsonwebtoken@latest');
  console.log('   npm install better-sqlite3@latest\n');
  
  console.log('4️⃣ Database Permissions:');
  console.log('   Make sure backend-nodejs/ folder is writable');
  console.log('   Database file should be creatable\n');
  
  console.log('5️⃣ Environment Check:');
  console.log('   Make sure .env file has correct line endings');
  console.log('   Try recreating .env file from scratch\n');
  
  console.log('6️⃣ Node Version:');
  console.log(`   Current: ${process.version}`);
  console.log('   Recommended: Node.js 18+ LTS\n');
}

async function runDeepDiagnostics() {
  const depsOk = await checkBackendLogs();
  const authOk = await testAuthRoute();
  const dbOk = await testDatabaseConfig();
  const loginOk = await simulateLogin();
  
  console.log('\n📊 DEEP DIAGNOSTIC SUMMARY:');
  console.log('===========================');
  console.log(`Dependencies: ${depsOk ? '✅' : '❌'}`);
  console.log(`Auth Route:   ${authOk ? '✅' : '❌'}`);
  console.log(`DB Config:    ${dbOk ? '✅' : '❌'}`);
  console.log(`Login Test:   ${loginOk ? '✅' : '❌'}`);
  
  if (!depsOk) {
    console.log('\n🚨 DEPENDENCY ISSUE: Run npm install in backend-nodejs/');
  }
  
  if (!loginOk) {
    console.log('\n🚨 LOGIN ENDPOINT FAILING: Check backend console for errors');
  }
  
  await provideFixes();
}

// Run deep diagnostics
runDeepDiagnostics().catch(error => {
  console.error('❌ Deep diagnostics failed:', error.message);
});