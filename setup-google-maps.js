#!/usr/bin/env node

/**
 * Google Maps Setup Script
 * Run this to quickly set up Google Maps integration
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🗺️  Google Maps Integration Setup\n');
console.log('This script will help you configure Google Maps for DriveKenya\n');

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  try {
    // Step 1: Check if API key exists
    const envPath = path.join(__dirname, '..', 'frontend', '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Step 2: Ask for API key
    console.log('\n📝 Step 1: Google Maps API Key');
    console.log('   Get your API key from: https://console.cloud.google.com/');
    console.log('   Required APIs: Maps JavaScript, Places, Directions, Geocoding, Distance Matrix\n');
    
    const apiKey = await question('Enter your Google Maps API Key: ');
    
    if (!apiKey || apiKey.trim() === '') {
      console.log('❌ API key is required!');
      process.exit(1);
    }

    // Step 3: Update .env file
    console.log('\n💾 Updating .env file...');
    
    const newEnvLine = `VITE_GOOGLE_MAPS_API_KEY=${apiKey.trim()}`;
    
    if (envContent.includes('VITE_GOOGLE_MAPS_API_KEY=')) {
      envContent = envContent.replace(
        /VITE_GOOGLE_MAPS_API_KEY=.*/g,
        newEnvLine
      );
    } else {
      envContent += `\n${newEnvLine}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated');

    // Step 4: Install dependencies
    console.log('\n📦 Step 2: Installing dependencies...');
    console.log('   Run these commands:\n');
    console.log('   cd frontend');
    console.log('   npm install @googlemaps/js-api-loader socket.io-client');
    console.log('   npm install @types/google.maps --save-dev\n');
    
    const installNow = await question('Install dependencies now? (y/n): ');
    
    if (installNow.toLowerCase() === 'y') {
      console.log('\n⏳ Installing...');
      const { execSync } = require('child_process');
      
      try {
        execSync('npm install @googlemaps/js-api-loader socket.io-client', {
          cwd: path.join(__dirname, '..', 'frontend'),
          stdio: 'inherit'
        });
        execSync('npm install @types/google.maps --save-dev', {
          cwd: path.join(__dirname, '..', 'frontend'),
          stdio: 'inherit'
        });
        console.log('✅ Dependencies installed');
      } catch (error) {
        console.log('❌ Installation failed. Please run the commands manually.');
      }
    }

    // Step 5: Testing checklist
    console.log('\n✅ Setup Complete!\n');
    console.log('🧪 Testing Checklist:');
    console.log('   1. Start backend: cd backend-nodejs && npm start');
    console.log('   2. Start frontend: cd frontend && npm run dev');
    console.log('   3. Open browser and check console for "🗺️ Google Maps loaded"');
    console.log('   4. Try searching locations in the app');
    console.log('   5. Test live tracking with GPS on mobile device\n');
    
    console.log('📚 Documentation:');
    console.log('   See GOOGLE_MAPS_LIVE_TRACKING_GUIDE.md for detailed instructions\n');
    
    console.log('🚀 Ready to go!\n');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  } finally {
    rl.close();
  }
}

setup();
