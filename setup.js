#!/usr/bin/env node
// Environment Setup Script for DriveKenya
// Automatically creates .env file from .env.example

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔧 DriveKenya Environment Setup');
console.log('===============================\n');

const backendEnvExample = path.join(__dirname, 'backend-nodejs', '.env.example');
const backendEnv = path.join(__dirname, 'backend-nodejs', '.env');

function setupBackendEnv() {
  console.log('1️⃣ Setting up Backend Environment Variables...');
  
  if (fs.existsSync(backendEnv)) {
    console.log('   ✅ .env file already exists in backend-nodejs/');
    return true;
  }
  
  if (!fs.existsSync(backendEnvExample)) {
    console.log('   ❌ .env.example not found in backend-nodejs/');
    return false;
  }
  
  try {
    const envContent = fs.readFileSync(backendEnvExample, 'utf8');
    fs.writeFileSync(backendEnv, envContent);
    console.log('   ✅ Created .env file from .env.example');
    console.log('   📄 Location: backend-nodejs/.env');
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to create .env file: ${error.message}`);
    return false;
  }
}

function checkNodeVersion() {
  console.log('2️⃣ Checking Node.js Version...');
  
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    console.log(`   ✅ Node.js ${version} (compatible)`);
    return true;
  } else {
    console.log(`   ❌ Node.js ${version} (need 18+)`);
    console.log('   📋 Please update Node.js to version 18 or higher');
    return false;
  }
}

function printNextSteps() {
  console.log('\n📋 NEXT STEPS:');
  console.log('===============');
  console.log('1. Install dependencies:');
  console.log('   cd backend-nodejs && npm install');
  console.log('   cd ../frontend && npm install');
  console.log('');
  console.log('2. Start the backend server:');
  console.log('   cd backend-nodejs && npm start');
  console.log('');
  console.log('3. Start the frontend server:');
  console.log('   cd frontend && npm run dev');
  console.log('');
  console.log('4. Run diagnostics to verify:');
  console.log('   node diagnostic.js');
  console.log('');
  console.log('🎉 You should now be able to login without 500 errors!');
}

async function runSetup() {
  const nodeOk = checkNodeVersion();
  const envOk = setupBackendEnv();
  
  console.log('\n📊 SETUP SUMMARY:');
  console.log('==================');
  console.log(`Node.js Version: ${nodeOk ? '✅' : '❌'}`);
  console.log(`Environment:     ${envOk ? '✅' : '❌'}`);
  
  if (nodeOk && envOk) {
    console.log('\n🎉 Setup Complete!');
    printNextSteps();
  } else {
    console.log('\n⚠️ Setup issues detected. Please fix the above errors.');
  }
}

// Run setup
runSetup().catch(error => {
  console.error('❌ Setup failed:', error.message);
});