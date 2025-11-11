#!/usr/bin/env node
// Environment Files Check - Specific for .env file detection issues

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 ENVIRONMENT FILES VERIFICATION');
console.log('=================================\n');

function checkFile(filePath, description) {
  console.log(`📁 Checking ${description}:`);
  console.log(`   Path: ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      
      console.log(`   ✅ File exists (${stats.size} bytes)`);
      console.log(`   📅 Last modified: ${stats.mtime}`);
      console.log(`   📝 Content preview:`);
      
      const lines = content.split('\n').slice(0, 5);
      for (const line of lines) {
        if (line.trim()) {
          console.log(`       ${line}`);
        }
      }
      
      console.log('');
      return true;
    } catch (error) {
      console.log(`   ❌ Error reading file: ${error.message}\n`);
      return false;
    }
  } else {
    console.log(`   ❌ File does not exist`);
    
    // Check parent directory
    const parentDir = path.dirname(filePath);
    if (fs.existsSync(parentDir)) {
      console.log(`   📂 Parent directory exists: ${parentDir}`);
      try {
        const dirContents = fs.readdirSync(parentDir);
        const envFiles = dirContents.filter(file => file.startsWith('.env'));
        if (envFiles.length > 0) {
          console.log(`   📋 .env files found: ${envFiles.join(', ')}`);
        } else {
          console.log(`   📋 No .env files in directory`);
        }
      } catch (error) {
        console.log(`   ❌ Cannot read directory: ${error.message}`);
      }
    } else {
      console.log(`   ❌ Parent directory does not exist: ${parentDir}`);
    }
    
    console.log('');
    return false;
  }
}

function checkCurrentWorkingDirectory() {
  console.log('📂 Current Working Directory Analysis:');
  console.log(`   CWD: ${process.cwd()}`);
  console.log(`   Script location: ${__dirname}`);
  
  if (process.cwd() !== __dirname) {
    console.log(`   ⚠️ Working directory differs from script location`);
    console.log(`   💡 This might cause path resolution issues`);
  } else {
    console.log(`   ✅ Working directory matches script location`);
  }
  console.log('');
}

function listAllEnvFiles() {
  console.log('🔍 Scanning for all .env files in project:');
  
  const searchDirs = [
    __dirname,
    path.join(__dirname, 'backend-nodejs'),
    path.join(__dirname, 'frontend')
  ];
  
  for (const dir of searchDirs) {
    console.log(`\n   📂 Scanning: ${dir}`);
    
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        const envFiles = files.filter(file => 
          file.startsWith('.env') || 
          file === '.env.example' || 
          file === '.env.local'
        );
        
        if (envFiles.length > 0) {
          for (const file of envFiles) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            console.log(`       ✅ ${file} (${stats.size} bytes)`);
          }
        } else {
          console.log(`       ❌ No .env files found`);
        }
      } catch (error) {
        console.log(`       ❌ Cannot read directory: ${error.message}`);
      }
    } else {
      console.log(`       ❌ Directory does not exist`);
    }
  }
  console.log('');
}

function provideFixes() {
  console.log('🔧 FIXES FOR .ENV FILE ISSUES:');
  console.log('==============================\n');
  
  console.log('1️⃣ If files exist but not detected:');
  console.log('   - Make sure you\'re running from project root directory');
  console.log('   - cd to DriveKenya folder first');
  console.log('   - Check file permissions\n');
  
  console.log('2️⃣ If backend .env missing:');
  console.log('   cd backend-nodejs');
  console.log('   copy .env.example .env');
  console.log('   # Then edit .env with your values\n');
  
  console.log('3️⃣ If frontend .env missing:');
  console.log('   cd frontend');
  console.log('   echo "VITE_API_URL=http://localhost:5000" > .env');
  console.log('   echo "VITE_WEBSOCKET_URL=http://localhost:5000" >> .env\n');
  
  console.log('4️⃣ If files have wrong line endings:');
  console.log('   - Delete and recreate the .env files');
  console.log('   - Make sure no extra characters or BOM\n');
  
  console.log('5️⃣ Verify after fix:');
  console.log('   node diagnostic.js');
  console.log('   node env-check.js\n');
}

async function runEnvCheck() {
  checkCurrentWorkingDirectory();
  listAllEnvFiles();
  
  const backendEnvPath = path.join(__dirname, 'backend-nodejs', '.env');
  const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
  const backendExamplePath = path.join(__dirname, 'backend-nodejs', '.env.example');
  
  console.log('📋 DETAILED FILE VERIFICATION:');
  console.log('==============================\n');
  
  const backendEnvOk = checkFile(backendEnvPath, 'Backend .env file');
  const frontendEnvOk = checkFile(frontendEnvPath, 'Frontend .env file');
  const backendExampleOk = checkFile(backendExamplePath, 'Backend .env.example');
  
  console.log('📊 ENVIRONMENT CHECK SUMMARY:');
  console.log('=============================');
  console.log(`Backend .env:         ${backendEnvOk ? '✅' : '❌'}`);
  console.log(`Frontend .env:        ${frontendEnvOk ? '✅' : '❌'}`);
  console.log(`Backend .env.example: ${backendExampleOk ? '✅' : '❌'}\n`);
  
  if (!backendEnvOk || !frontendEnvOk) {
    provideFixes();
  } else {
    console.log('🎉 All environment files detected successfully!');
    console.log('If you\'re still having issues, the problem is elsewhere.');
  }
}

// Run environment check
runEnvCheck().catch(error => {
  console.error('❌ Environment check failed:', error.message);
});