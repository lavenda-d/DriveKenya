# 🚨 URGENT SECURITY FIX REQUIRED

## Issue
GitGuardian detected **SMTP credentials exposed** in your GitHub repository on December 17, 2025.

**Exposed credentials:**
- Email: drivekenyaorg@gmail.com
- Password: `meojjbbemxbfyedb` (App-specific password)

## Immediate Actions (DO THIS NOW)

### Step 1: Revoke the Exposed Password ⚠️
1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with drivekenyaorg@gmail.com
3. Find and **REVOKE** the exposed app password
4. Generate a **NEW** app-specific password
5. Copy and save the new password securely

### Step 2: Update Your Local .env File
1. Open `backend-nodejs/.env`
2. Find this line:
   ```
   EMAIL_PASSWORD=YOUR_NEW_APP_PASSWORD_HERE
   ```
3. Replace `YOUR_NEW_APP_PASSWORD_HERE` with your NEW password from Step 1

### Step 3: Commit the Security Fix
```bash
# Navigate to your project
cd C:\Users\Lavenda\Downloads\car-hiring-system-for-nairobi

# Stage the fixed files (credentials now use environment variables)
git add backend-nodejs/routes/passwordReset.js
git add backend-nodejs/routes/contact.js

# Commit the fix
git commit -m "Security: Remove hardcoded SMTP credentials, use environment variables"

# Push to GitHub
git push origin main
```

### Step 4: Verify .env is NOT Tracked
```bash
# Check git status - .env should NOT appear
git status

# If .env appears, remove it from tracking:
git rm --cached backend-nodejs/.env
git commit -m "Security: Remove .env from git tracking"
git push origin main
```

## What Was Fixed

### Files Modified:
1. **backend-nodejs/routes/passwordReset.js**
   - Removed hardcoded credentials
   - Now uses: `process.env.EMAIL_PASSWORD`

2. **backend-nodejs/routes/contact.js**
   - Removed hardcoded credentials
   - Now uses: `process.env.EMAIL_PASSWORD`

3. **backend-nodejs/.env**
   - Updated to use `EMAIL_PASSWORD` variable
   - Added placeholder for your new password

## Important Notes

✅ **.env file is already in .gitignore** - it won't be pushed to GitHub
✅ **Credentials are now environment variables** - secure and configurable
✅ **Old password will stop working** after you revoke it

## Testing After Fix

1. Update your .env with the new password
2. Restart your backend server:
   ```bash
   cd backend-nodejs
   npm start
   ```
3. Test password reset feature
4. Test contact form
5. Check email delivery works

## Production Deployment Note

For production servers, set environment variables directly on your hosting platform:
- **Railway/Render**: Add `EMAIL_PASSWORD` in dashboard
- **VPS/EC2**: Add to system environment or use `.env` file (not in git)
- **Vercel/Netlify**: Add in environment variables settings

## GitGuardian Alert

Once you've:
1. ✅ Revoked the old password
2. ✅ Pushed the fix to GitHub
3. ✅ Verified .env is not tracked

You can click **"Fix This Secret Leak"** on the GitGuardian email to acknowledge the fix.

## Prevention

- ✅ Never commit `.env` files
- ✅ Always use `process.env.VARIABLE_NAME` for secrets
- ✅ Review code before pushing sensitive changes
- ✅ Use tools like GitGuardian to scan for leaks

## Support

If you need help:
- Check that .env is in .gitignore: `cat .gitignore | grep .env`
- Verify environment variables load: `console.log(process.env.EMAIL_PASSWORD)`
- Test email sending after updating password

---

**Status:** 🔴 CRITICAL - Fix immediately
**Priority:** 🚨 URGENT
**Time to fix:** ~5 minutes
