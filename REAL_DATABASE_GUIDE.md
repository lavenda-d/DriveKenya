# 🗄️ DriveKenya Database Guide

**Version:** 1.0.0 | **Last Updated:** December 2024

## Overview

DriveKenya uses **SQLite** (via Better-SQLite3) as its database - a lightweight, file-based database that requires no installation or setup. The database file (`driveKenya.db`) is located in the `backend-nodejs` directory and is automatically created when you first run the server.

### **Current Database Status:**
- 📊 **18 Tables** with comprehensive relationships
- 🚗 **45+ Vehicles** covering all transportation types
- 👥 **Multi-role System** (Customer, Host, Admin)
- 🔐 **Password Recovery** columns added
- 💬 **Real-time Chat** with message persistence
- 🔔 **Notifications System** fully functional
- 📧 **Contact Forms** with email integration

## 📊 Database Schema

### **1. Users Table**
Stores user account information with authentication and profile data.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,                    -- Bcrypt hashed with 12 rounds
  phone TEXT,
  role TEXT DEFAULT 'customer',              -- 'customer', 'host', or 'admin'
  profile_photo TEXT,                        -- Profile picture URL (persists across sessions)
  profile_photo_url TEXT,                    -- Legacy field
  email_verified INTEGER DEFAULT 0,          -- 0 = not verified, 1 = verified
  password_reset_token TEXT,                 -- ⭐ UUID token for password reset
  password_reset_expires TEXT,               -- ⭐ Expiration timestamp (1-hour validity)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- ✅ Secure password storage with Bcrypt (12 rounds)
- ✅ Profile photo persistence fixed
- ✅ Password reset token system
- ✅ Multi-role support
- ✅ Email verification ready

### **2. Cars Table**
Stores vehicle listings with comprehensive details and media.

```sql
CREATE TABLE cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  make TEXT NOT NULL,                        -- e.g., Toyota, BMW, Honda
  model TEXT NOT NULL,                       -- e.g., Camry, X5, CBR500R
  year INTEGER NOT NULL,
  color TEXT,
  vehicle_type TEXT,                         -- car, suv, truck, van, motorcycle, bicycle, electric
  category TEXT NOT NULL,                    -- economy, luxury, suv, sedan, sports, etc.
  transmission TEXT,                         -- automatic, manual
  fuel_type TEXT,                            -- petrol, diesel, electric, hybrid
  seats INTEGER,
  price_per_day REAL NOT NULL,               -- Daily rental rate (0-50,000 KSh)
  main_image_url TEXT,                       -- Primary vehicle image
  images TEXT,                               -- JSON array of additional images
  video_url TEXT,                            -- Optional video showcase
  description TEXT,
  features TEXT,                             -- JSON array: ["GPS", "AC", "Bluetooth", etc.]
  location TEXT DEFAULT 'Nairobi',
  latitude REAL,
  longitude REAL,
  available INTEGER DEFAULT 1,               -- 0 = unavailable, 1 = available
  availability_status TEXT DEFAULT 'available', -- available, booked, maintenance
  host_id INTEGER NOT NULL,
  rating REAL,                               -- Average rating from reviews
  total_bookings INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id)
);
```

**Current Fleet:**
- 🚗 **45+ Vehicles** including:
  - Economy cars (Toyota, Nissan, VW)
  - Luxury vehicles (Mercedes, BMW, Audi)
  - SUVs (Land Cruiser, Prado, X-Trail)
  - Trucks (Isuzu, Mitsubishi)
  - Vans (Toyota Hiace, Nissan Urvan)
  - Motorcycles (Honda, Yamaha, Suzuki)
  - Bicycles (Mountain, Road, City)
  - Electric vehicles (Tesla Model 3, Nissan Leaf)

**Pagination:**
- API limit increased from 12 to 100 to display all vehicles

### **3. Bookings Table**
Stores rental booking information with payment and location details.

```sql
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,                  -- The renter
  host_id INTEGER NOT NULL,                  -- The car owner
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat REAL,
  pickup_lng REAL,
  dropoff_location TEXT NOT NULL,
  dropoff_lat REAL,
  dropoff_lng REAL,
  total_price REAL NOT NULL,
  payment_method TEXT,                       -- cash, mpesa, card, bank_transfer
  payment_status TEXT DEFAULT 'unpaid',      -- unpaid, paid, refunded
  status TEXT DEFAULT 'pending',             -- pending, confirmed, active, completed, cancelled
  special_requests TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (host_id) REFERENCES users(id)
);
```

**Booking Flow:**
1. User selects car and dates
2. Chooses pickup/dropoff locations (Google Maps)
3. Selects payment method
4. Booking created with "pending" status
5. Host receives notification
6. Host confirms → status changes to "confirmed"
7. During rental → status "active"
8. After return → status "completed"

### **4. Chat Messages Table**
Stores real-time chat messages between users with persistence.

```sql
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  booking_id INTEGER,                        -- Optional: link to specific booking
  chat_room TEXT NOT NULL,                   -- Room identifier for WebSocket
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,                 -- 0 = unread, 1 = read
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
```

**Chat Features:**
- ✅ Real-time messaging via Socket.io
- ✅ Message persistence in database
- ✅ Unread message tracking
- ✅ Room-based conversations
- ✅ Booking-specific chats

### **5. Contact Messages Table**
Stores contact form submissions with email forwarding.

```sql
CREATE TABLE contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',                 -- new, read, replied
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Contact Form Features:**
- ✅ Saves to database
- ✅ Forwards to **drivekenyaorg@gmail.com**
- ✅ Reply-To header set to customer email
- ✅ Professional HTML email templates

### **6. Reviews Table**
Stores car ratings and reviews from renters.

```sql
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  booking_id INTEGER,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT,                               -- JSON array of review photos
  host_response TEXT,                        -- Optional response from car owner
  helpful_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
```

### **7. Notifications Table**
Stores user notifications with real-time delivery.

```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,                        -- booking, message, payment, review, system
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id INTEGER,                      -- ID of related entity (booking, message, etc.)
  reference_type TEXT,                       -- 'booking', 'message', 'payment', etc.
  is_read INTEGER DEFAULT 0,
  action_url TEXT,                           -- Deep link for click-to-action
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Notification Features:**
- ✅ Real-time push notifications
- ✅ In-app notification center
- ✅ Unread count badge
- ✅ Welcome notifications for new users (2 messages)
- ✅ Booking status updates
- ✅ New message alerts
- ✅ Payment confirmations

### **8. Car Availability Table**
Manages blackout dates and maintenance periods.

```sql
CREATE TABLE car_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,                               -- maintenance, booked, personal, etc.
  is_blocked INTEGER DEFAULT 1,              -- 1 = unavailable, 0 = available
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id)
);
```

### **Additional Tables (18 Total)**

**9. payments** - Payment transaction records
**10. support_tickets** - Customer support system
**11. emergency_contacts** - Emergency contact information
**12. biometric_data** - Biometric authentication data
**13. fraud_alerts** - Security monitoring and fraud detection
**14. pricing_rules** - Dynamic pricing engine
**15. tracking_data** - GPS location tracking
**16. two_factor_auth** - 2FA settings
**17. user_verification** - Document verification (ID, license)
**18. car_specs** - Extended vehicle specifications

## 🔍 Database Browser

DriveKenya includes a comprehensive web-based database browser for easy data management.

### **Starting the Database Browser**
```bash
cd backend-nodejs
node db-browser.js
```

Then open: **http://localhost:5001**

### **Features:**
- 📊 View all 18 tables
- 🔍 Run custom SQL queries
- ✏️ Edit records inline
- 📈 View table statistics
- 🔗 Navigate relationships
- 📤 Export data
- 🔐 Admin access only (recommended)

### **Useful Queries:**

**View all vehicles:**
```sql
SELECT id, make, model, year, vehicle_type, price_per_day, available 
FROM cars 
ORDER BY created_at DESC;
```

**Check users with password reset tokens:**
```sql
SELECT id, email, first_name, last_name, 
       password_reset_token, 
       password_reset_expires 
FROM users 
WHERE password_reset_token IS NOT NULL;
```

**View booking statistics:**
```sql
SELECT status, COUNT(*) as count, SUM(total_price) as total_revenue
FROM bookings
GROUP BY status;
```

**Check unread notifications:**
```sql
SELECT u.email, COUNT(*) as unread_count
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.is_read = 0
GROUP BY u.email;
```

**View chat activity:**
```sql
SELECT 
  s.first_name || ' ' || s.last_name as sender,
  r.first_name || ' ' || r.last_name as receiver,
  COUNT(*) as message_count
FROM chat_messages cm
JOIN users s ON cm.sender_id = s.id
JOIN users r ON cm.receiver_id = r.id
GROUP BY sender, receiver;
```

## 🚀 Getting Started

### **Step 1: Initial Setup**
The database is automatically created when you first run the server.

```bash
cd backend-nodejs
npm install
```

### **Step 2: Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your settings
```

**Key environment variables:**
```env
PORT=5000
DB_PATH=./driveKenya.db
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000

# Email (for password reset & contact forms)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=drivekenyaorg@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

### **Step 3: Run Migrations (if needed)**
```bash
node run-migrations.js
```

This creates all necessary tables and adds password reset columns.

### **Step 4: Seed Sample Data (optional)**
```bash
node seed-database.js
```

This adds the 45 vehicles and sample users to the database.

### **Step 5: Start the Server**
```bash
npm start
# Server runs on http://localhost:5000
```

### **Step 6: Verify Setup**
Open http://localhost:5000/health to check server status.

## 🎯 **What You Get**

### **Production-Ready Database:**
- ✅ **18 Tables** with proper relationships
- ✅ **45+ Vehicles** - Cars, SUVs, trucks, vans, motorcycles, bicycles, electric vehicles
- ✅ **User Authentication** - Registration, login, password reset via email
- ✅ **Profile Management** - Photos persist across sessions
- ✅ **Booking System** - Complete rental workflow with status tracking
- ✅ **Real-time Chat** - WebSocket messages with database persistence
- ✅ **Notifications** - Welcome messages, booking alerts, chat notifications
- ✅ **Reviews & Ratings** - 5-star system with comments and photos
- ✅ **Contact Forms** - Database storage + email forwarding
- ✅ **Security** - Bcrypt password hashing (12 rounds), JWT tokens

### **Complete API Endpoints (23 Routes):**

**Authentication:**
- `POST /api/auth/register` - User registration with welcome notifications
- `POST /api/auth/login` - User login (returns profile_photo)
- `POST /api/auth/forgot-password` - Request password reset email
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/verify-email/:token` - Email verification
- `GET /api/auth/me` - Get current user

**Cars:**
- `GET /api/cars` - Get all cars (limit: 100, filters: price, category, type, features)
- `GET /api/cars/:id` - Get car details
- `POST /api/cars` - Add new car (host only)
- `PUT /api/cars/:id` - Update car
- `DELETE /api/cars/:id` - Remove car

**Bookings:**
- `GET /api/bookings/my-bookings` - User's bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id/status` - Update status
- `GET /api/bookings/:id` - Booking details

**Chat/Messages:**
- `GET /api/messages` - Message threads
- `GET /api/messages/:bookingId` - Booking messages
- `POST /api/messages` - Send message
- WebSocket events for real-time chat

**Notifications:**
- `GET /api/notifications` - User notifications
- `GET /api/notifications/count` - Unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all

**Reviews:**
- `GET /api/reviews/car/:carId` - Car reviews
- `POST /api/reviews` - Submit review

**Contact:**
- `POST /api/contact` - Submit contact form (saves + emails admin)

**Users:**
- `GET /api/users/profile` - User profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/upload-avatar` - Upload profile photo

**Admin:**
- `GET /api/admin/*` - Various admin endpoints
- Database browser on separate port (5001)

## 🔧 **Running the Application**

### **Terminal 1 - Backend Server:**
```bash
cd backend-nodejs
npm start
# Server runs on http://localhost:5000
# API health check: http://localhost:5000/health
```

### **Terminal 2 - Frontend App:**
```bash
cd frontend  
npm run dev
# App runs on http://localhost:3000
```

### **Terminal 3 - Database Browser (Optional):**
```bash
cd backend-nodejs
node db-browser.js
# Browser UI on http://localhost:5001
```

## 📊 **Database Relationships**

```
users (1) ────────> (Many) cars [host_id]
users (1) ────────> (Many) bookings [user_id, host_id]
users (1) ────────> (Many) notifications [user_id]
users (1) ────────> (Many) reviews [user_id]
users (1) ────────> (Many) chat_messages [sender_id, receiver_id]

cars (1) ─────────> (Many) bookings [car_id]
cars (1) ─────────> (Many) reviews [car_id]
cars (1) ─────────> (Many) car_availability [car_id]

bookings (1) ─────> (Many) chat_messages [booking_id]
bookings (1) ─────> (Many) reviews [booking_id]
```

## 📈 **Database Indexes**

For optimal performance, indexes are created on frequently queried columns:

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_reset_token ON users(password_reset_token);

-- Cars
CREATE INDEX idx_cars_host ON cars(host_id);
CREATE INDEX idx_cars_available ON cars(available);
CREATE INDEX idx_cars_category ON cars(category);
CREATE INDEX idx_cars_location ON cars(location);
CREATE INDEX idx_cars_price ON cars(price_per_day);

-- Bookings
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_car ON bookings(car_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);

-- Chat Messages
CREATE INDEX idx_chat_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_receiver ON chat_messages(receiver_id);
CREATE INDEX idx_chat_room ON chat_messages(chat_room);
CREATE INDEX idx_chat_read ON chat_messages(is_read);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
```

## 🔒 **Database Security**

### **Password Security:**
- ✅ Bcrypt hashing with 12 salt rounds
- ✅ Password reset tokens are UUID-based
- ✅ Reset tokens expire after 1 hour
- ✅ Tokens are deleted after successful reset
- ✅ No plain text passwords ever stored

### **SQL Injection Prevention:**
All queries use parameterized statements via Better-SQLite3:
```javascript
// Safe - parameterized query
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

// Never do this - vulnerable to SQL injection
// const user = db.prepare(`SELECT * FROM users WHERE email = '${email}'`).get();
```

### **Data Validation:**
- Input sanitization on all endpoints
- Express-validator middleware
- Type checking and constraints
- Foreign key relationships enforced

## 💾 **Database Backup & Maintenance**

### **Manual Backup:**
```bash
# Simple file copy
cp driveKenya.db driveKenya-backup-$(date +%Y%m%d).db

# With compression
tar -czf driveKenya-backup-$(date +%Y%m%d).tar.gz driveKenya.db
```

### **Automated Backup (Cron Job):**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cp /path/to/driveKenya.db /backups/driveKenya-$(date +\%Y\%m\%d).db
```

### **Database Maintenance:**
```sql
-- Vacuum to optimize database file
VACUUM;

-- Analyze to update query planner statistics
ANALYZE;

-- Check integrity
PRAGMA integrity_check;

-- View database size
SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();
```

## 🎉 **What This Means**

✅ **Production Ready** - Version 1.0 with all features complete
✅ **Real Database** - SQLite with 18 tables and comprehensive relationships
✅ **45+ Vehicles** - Diverse fleet covering all transportation needs
✅ **Secure Authentication** - JWT, password reset, email verification
✅ **Real-time Features** - WebSocket chat, live notifications
✅ **Email Integration** - Password reset and contact form emails
✅ **Profile Persistence** - User data maintained across sessions
✅ **Scalable** - Ready for cloud deployment
✅ **Well-documented** - Complete API and database documentation

## 🚀 **Next Steps**

### **For Development:**
1. ✅ **Backend is running** - Port 5000
2. ✅ **Database created** - driveKenya.db with all tables
3. ✅ **Sample data loaded** - 45 vehicles ready
4. 🔜 **Test features** - Registration, login, booking, chat
5. 🔜 **Customize data** - Add your own vehicles and users

### **For Production Deployment:**
1. 📝 Update environment variables (.env)
2. 🔐 Set strong JWT_SECRET
3. 📧 Configure email credentials (currently hardcoded)
4. 🌐 Set CORS_ORIGIN to production domain
5. 🔒 Enable HTTPS/SSL
6. 💾 Set up automated backups
7. 📊 Configure monitoring (Sentry, LogRocket)
8. 🚀 Deploy to VPS, Railway, or cloud provider

### **Database Migration to PostgreSQL (Optional):**
For high-traffic production, consider migrating from SQLite to PostgreSQL:
```bash
# Export SQLite to SQL dump
sqlite3 driveKenya.db .dump > driveKenya.sql

# Import to PostgreSQL
psql -U username -d drivekenya < driveKenya.sql
```



## 📞 **Support**

- 📧 **Email:** drivekenyaorg@gmail.com
- 📱 **Phone:** +254 717 052 939
- 🌐 **Database Issues:** Use `node db-browser.js` to inspect data
- 📖 **Documentation:** See [README.md](README.md) for complete guide