# Database Migrations Quick Guide

## Available Migrations

### 1. Profile & Verification Features
**File:** `migrations/add_profile_verification_features.sql`

**Creates:**
- `user_verification_documents` table
- `car_blackout_dates` table
- `profile_photo` column in users table

**Run:**
```bash
cd backend-nodejs
sqlite3 database.db < migrations/add_profile_verification_features.sql
```

---

### 2. Notifications Table
**File:** `migrations/add_notifications_table.sql`

**Creates:**
- `notifications` table
- Indexes for performance

**Run:**
```bash
cd backend-nodejs
sqlite3 database.db < migrations/add_notifications_table.sql
```

---

## Run All Migrations

```bash
cd backend-nodejs

# Migration 1: Profile & Verification
sqlite3 database.db < migrations/add_profile_verification_features.sql

# Migration 2: Notifications
sqlite3 database.db < migrations/add_notifications_table.sql
```

---

## Verify Migrations

```bash
# Check tables exist
sqlite3 database.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# Check specific table structure
sqlite3 database.db ".schema notifications"
sqlite3 database.db ".schema user_verification_documents"
sqlite3 database.db ".schema car_blackout_dates"
```

---

## Troubleshooting

**"Table already exists" error:**
- Safe to ignore - migration uses `IF NOT EXISTS`
- Table won't be recreated

**"No such file" error:**
- Make sure you're in `backend-nodejs` directory
- Check `database.db` file exists

**Permission errors:**
- Close any programs using the database
- Restart backend server after migration

---

## After Running Migrations

1. **Restart backend server**
   ```bash
   npm run dev
   ```

2. **Verify no errors**
   - Check console for database errors
   - Test notification endpoints
   - Test profile photo upload
   - Test document verification

3. **Test features**
   - Upload profile photo
   - Submit verification documents
   - Add blackout dates
   - Check notifications (if implemented)
