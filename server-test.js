#!/usr/bin/env node
// Backend Server Test - Check if server starts properly
// Run this in backend-nodejs/ folder: node ../server-test.js

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 BACKEND SERVER STARTUP TEST');
console.log('==============================\n');

async function testServerStartup() {
  const backendPath = path.join(__dirname, 'backend-nodejs');
  
  console.log('1️⃣ Checking backend directory...');
  if (!fs.existsSync(backendPath)) {
    console.log('   ❌ backend-nodejs directory not found');
    return false;
  }
  console.log('   ✅ backend-nodejs directory exists');
  
  console.log('\n2️⃣ Testing server startup...');
  console.log('   🚀 Starting server with detailed logging...');
  
  return new Promise((resolve) => {
    const serverProcess = spawn('node', ['server.js'], {
      cwd: backendPath,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    let output = '';
    let errorOutput = '';
    let serverStarted = false;
    let hasError = false;
    
    serverProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`   📤 STDOUT: ${text.trim()}`);
      
      // Check for successful startup
      if (text.includes('Car Hire API server running')) {
        serverStarted = true;
        console.log('   ✅ Server started successfully!');
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.log(`   ❌ STDERR: ${text.trim()}`);
      hasError = true;
    });
    
    serverProcess.on('error', (error) => {
      console.log(`   ❌ Process Error: ${error.message}`);
      hasError = true;
    });
    
    // Give server 10 seconds to start
    setTimeout(() => {
      if (serverStarted && !hasError) {
        console.log('\n   🎉 Server startup successful!');
        serverProcess.kill('SIGTERM');
        resolve(true);
      } else if (hasError) {
        console.log('\n   🚨 Server startup failed with errors');
        console.log('\n   📋 Error Details:');
        if (errorOutput) {
          console.log(`   ${errorOutput}`);
        }
        serverProcess.kill('SIGTERM');
        resolve(false);
      } else {
        console.log('\n   ⚠️ Server started but no success message detected');
        serverProcess.kill('SIGTERM');
        resolve(false);
      }
    }, 10000);
  });
}

async function checkCommonIssues() {
  console.log('\n3️⃣ Checking common startup issues...');
  
  const backendPath = path.join(__dirname, 'backend-nodejs');
  
  // Check .env file
  const envPath = path.join(backendPath, '.env');
  if (fs.existsSync(envPath)) {
    console.log('   ✅ .env file exists');
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('JWT_SECRET=')) {
      console.log('   ✅ JWT_SECRET found in .env');
    } else {
      console.log('   ❌ JWT_SECRET missing from .env');
    }
  } else {
    console.log('   ❌ .env file missing');
  }
  
  // Check node_modules
  const nodeModulesPath = path.join(backendPath, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('   ✅ node_modules exists');
  } else {
    console.log('   ❌ node_modules missing - run npm install');
  }
  
  // Check package.json
  const packagePath = path.join(backendPath, 'package.json');
  if (fs.existsSync(packagePath)) {
    console.log('   ✅ package.json exists');
  } else {
    console.log('   ❌ package.json missing');
  }
}

async function runServerTest() {
  await checkCommonIssues();
  
  const startupOk = await testServerStartup();
  
  console.log('\n📊 SERVER TEST SUMMARY:');
  console.log('=======================');
  console.log(`Server Startup: ${startupOk ? '✅' : '❌'}`);
  
  if (!startupOk) {
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Check the STDERR output above for specific errors');
    console.log('2. Try: cd backend-nodejs && npm install');
    console.log('3. Make sure .env file exists with JWT_SECRET');
    console.log('4. Check Node.js version: node --version (need 18+)');
    console.log('5. Try starting manually: cd backend-nodejs && npm start');
  }
}

// Run test
runServerTest().catch(error => {
  console.error('❌ Server test failed:', error.message);
});