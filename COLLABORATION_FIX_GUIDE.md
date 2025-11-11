# 🚨 COLLABORATION TROUBLESHOOTING GUIDE

If you're getting **"Internal Server Error"**, follow these steps:

## 🔧 Quick Fix Steps

### 1. Run the Diagnostic Tool
```bash
cd car-hiring-system-for-nairobi
node diagnostic.js
```

This will tell you exactly what's wrong!

### 2. If Backend Server is NOT Running:
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
**Cause:** Backend server not running
**Fix:** Start backend with `npm start` in `backend-nodejs/` folder

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