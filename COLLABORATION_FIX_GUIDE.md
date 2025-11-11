# 🚨 COLLABORATION TROUBLESHOOTING GUIDE

If you're getting **"Internal Server Error"**, follow these steps:

## � QUICK SETUP (Recommended)

### 1. Auto-Setup Script
```bash
cd DriveKenya
node setup.js
```
This will automatically create the `.env` file and check your Node.js version!

### 2. Follow the Output Instructions
The setup script will tell you exactly what to do next.

---

## 🔧 Manual Fix Steps

### 1. Create Environment Variables
```bash
cd backend-nodejs
copy .env.example .env
```
**🔑 CRITICAL:** The `.env` file contains JWT secrets and is NOT in Git for security!

### 2. Run the Diagnostic Tool
```bash
cd car-hiring-system-for-nairobi
node diagnostic.js
```

**Requirements:** Node.js 18+ (uses built-in fetch)
**Check version:** `node --version`

This will tell you exactly what's wrong!

### 3. If Backend Server is NOT Running:
```bash
cd backend-nodejs
npm install
npm start
```

**Wait for this message:** `🚗 Nairobi Car Hire API server running on port 5000`

### 3. If Frontend Server is NOT Running:
```bash
cd frontend  
npm install
npm run dev
```

**Wait for this message:** `Local: http://localhost:3000`

### 4. Test the Connection
Visit these URLs:
- Backend Health: http://localhost:5000/health
- Frontend App: http://localhost:3000

## 🐛 Common Issues & Solutions

### ❌ "Internal Server Error" 
**Cause:** Backend server not running OR missing .env file
**Fix:** 
1. Create `.env` file: `copy backend-nodejs/.env.example backend-nodejs/.env`
2. Start backend: `npm start` in `backend-nodejs/` folder

### ❌ "JWT Error" / "500 Error on Login"
**Cause:** Missing `.env` file with JWT_SECRET
**Fix:** Copy `.env.example` to `.env` in `backend-nodejs/` folder

### ❌ "Network Error" / "CORS Error"
**Cause:** Backend running on wrong port or CORS issues  
**Fix:** Make sure backend is on port 5000, frontend on port 3000

### ❌ "Cannot resolve module" errors
**Cause:** Missing dependencies
**Fix:** Run `npm install` in both `backend-nodejs/` and `frontend/` folders

### ❌ "PWA Service Error" 
**Fix:** Already fixed! Pull latest code:
```bash
git pull origin main
```

### ❌ "formData is not defined"
**Fix:** Already fixed! Pull latest code:
```bash
git pull origin main
```

## 📱 Testing Steps

1. **Start both servers** (backend + frontend)
2. **Open browser console** (F12)
3. **Try signing up** with test account  
4. **Click Google Sign-Up** (should show placeholder message, not crash)
5. **Check console** - should see no errors

## 🆘 Still Having Issues?

Run the diagnostic tool and share the output:
```bash
node diagnostic.js
```

Share the console output from:
- Backend terminal (where you ran `npm start`)
- Browser DevTools console (F12)

---
**Last Updated:** November 2024
**Fixed Issues:** PWA service initialization, formData errors, missing icons, deprecated meta tags