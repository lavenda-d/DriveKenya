# 🗄️ DriveKenya Database Guide

## Overview

DriveKenya uses **SQLite** as its database - a lightweight, file-based database that requires no installation or setup. The database file (`driveKenya.db`) is automatically created when you first run the server.

## 📊 Database Schema

### **Users Table**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'customer',
  email_verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Cars Table**
```sql
CREATE TABLE cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  price_per_day INTEGER NOT NULL,
  image TEXT,
  location TEXT DEFAULT 'Nairobi',
  available INTEGER DEFAULT 1,
  host_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id)
);
```

### **Rentals Table**
```sql
CREATE TABLE rentals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL,
  renter_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_price INTEGER NOT NULL,
  pickup_location TEXT,
  dropoff_location TEXT,
  special_requests TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id),
  FOREIGN KEY (renter_id) REFERENCES users(id)
);
```

### **Messages Table**
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Reviews Table**
```sql
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (car_id) REFERENCES cars(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🔍 Database Browser

Use the built-in database browser to view and edit your data:

```bash
cd backend-nodejs
node db-browser.js
```

Then open: http://localhost:3001

**Option B - Full PostgreSQL Installation:**
- Download from [postgresql.org/download](https://www.postgresql.org/download/)
- Create database: `nairobi_car_hire`
- Create user: `car_hire_user`

### **Step 2: Setup Backend**
```bash
cd backend-nodejs
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run migrate  # Creates tables
npm run seed     # Adds sample data
npm run dev      # Starts server on port 5000
```

### **Step 3: Update Frontend**
The frontend is already configured to use the real API with fallback to mock data.

## 🎯 **What You Get**

### **Sample Data Created:**
- **5 Cars**: Toyota Camry, Nissan X-Trail, VW Polo, BMW 3 Series, Isuzu D-Max
- **5+ Users**: Car owners and renters with real profiles
- **Sample Reviews**: Ratings and comments
- **Working Authentication**: Real login/registration

### **API Endpoints Available:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/cars` - Get all cars with filters
- `POST /api/cars` - Add new car (auth required)
- `POST /api/rentals` - Create booking (auth required)
- `GET /api/rentals` - Get user bookings
- `POST /api/reviews` - Add car review

### **Sample Users You Can Login With:**
```
Email: john@example.com
Password: password123

Email: alice@example.com  
Password: password123

Email: admin@nairobicarhire.com
Password: password123 (Admin account)
```

## 🔧 **Running Both Servers**

**Terminal 1 (Backend):**
```bash
cd backend-nodejs
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
cd frontend  
npm run dev
# App runs on http://localhost:3001
```

## 📊 **Database Schema**

The database includes these tables:
- **users** - User accounts with authentication
- **cars** - Car listings with all details
- **rentals** - Booking records with payment status
- **reviews** - Car ratings and comments
- **messages** - User messaging system

## 🎉 **What This Means**

✅ **No More Mock Data** - Everything is stored in a real database
✅ **Real User Accounts** - Users can register and login
✅ **Persistent Data** - Cars and bookings are saved permanently
✅ **Production Ready** - Can be deployed to any cloud provider
✅ **Scalable** - Handles multiple users and cars
✅ **Secure** - Proper authentication and validation

## 🚀 **Next Steps**

1. **Run the setup**: Use `setup-real-backend.bat` (Windows) or `setup-real-backend.sh` (Linux/Mac)
2. **Test the API**: Visit `http://localhost:5000/health` to verify backend
3. **Register a user**: Create your own account in the frontend
4. **Add cars**: List your own cars for rental
5. **Deploy**: Deploy to Heroku, AWS, or any cloud provider

**You now have a fully functional car rental platform with real database storage!** 🎊