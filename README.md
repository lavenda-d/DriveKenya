# DriveKenya - Car Rental System

A modern, full-stack car rental platform for Nairobi built with React, Node.js, and SQLite.

## 🚗 Features

✅ **User Authentication** - JWT-based login and registration  
✅ **Car Browsing** - Browse available cars with images and details  
✅ **Booking System** - Complete booking flow with date selection  
✅ **My Bookings** - View and manage your rental history  
✅ **Cancel Bookings** - Cancel pending bookings  
✅ **Contact System** - Contact form functionality  
✅ **Car Listing** - Users can list their own cars  
✅ **Responsive Design** - Works perfectly on all devices  
✅ **Real Database** - SQLite database with persistent data  

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- No additional setup required - SQLite database included!

### 1. Backend Setup

```bash
cd backend-nodejs
npm install
node server.js
```

Backend runs on: http://localhost:5000

### 2. Frontend Setup

```bash
cd frontend  
npm install
npm run dev
```

Frontend runs on: http://localhost:3000

### 3. Database Browser (Optional)

View your database in the browser:
```bash
cd backend-nodejs
node db-browser.js
```

Database browser runs on: http://localhost:3001

## 📁 Project Structure (Clean)

```
car-hiring-system-for-nairobi/
├── frontend/                    # React TypeScript frontend
│   ├── src/
│   │   ├── App.tsx             # Main application component
│   │   ├── main.tsx            # Application entry point
│   │   ├── index.css           # TailwindCSS styles
│   │   └── services/
│   │       └── api.js          # API service layer
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── backend-nodejs/              # Node.js Express backend
│   ├── server.js               # Main server file
│   ├── driveKenya.db          # SQLite database
│   ├── db-browser.js          # Database browser tool
│   ├── config/
│   │   └── database-sqlite.js  # Database configuration
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   └── errorHandler.js    # Error handling
│   ├── routes/                # API route handlers
│   │   ├── auth.js
│   │   ├── cars.js
│   │   ├── contact.js
│   │   └── ...
│   └── package.json
├── README.md                   # This file
└── REAL_DATABASE_GUIDE.md     # Database documentation
```

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for modern styling
- **Responsive Design** for all devices

### Backend  
- **Node.js** with Express
- **SQLite** database (no setup required)
- **JWT** authentication
- **bcrypt** for password hashing
- **CORS** enabled for frontend integration

## 🎯 Usage

1. **Register/Login** - Create account or sign in
2. **Browse Cars** - View 6 available cars with details
3. **Book a Car** - Select dates, location, and special requests
4. **My Bookings** - View and manage your reservations
5. **Contact** - Use contact form for inquiries
6. **List Car** - Add your own car to the platform

## 🗄️ Database

The system uses SQLite with these main tables:
- **users** - User accounts and profiles
- **cars** - Available vehicles
- **rentals** - Booking records
- **messages** - Contact form submissions
- **reviews** - User reviews

## 🔧 Development

### Hot Reload
Both frontend and backend support hot reload:
- Frontend: Vite dev server automatically reloads on file changes
- Backend: Restart `node server.js` when making changes

### Database Browser
View and edit your database:
```bash
node db-browser.js
```

## 🚀 Production Ready

This system is production-ready with:
- ✅ Real database with persistent data
- ✅ JWT authentication and authorization
- ✅ Error handling and validation
- ✅ Responsive UI design
- ✅ Complete booking lifecycle
- ✅ Database browser for management

## 📞 Support

For questions or issues, use the Contact form in the application or check the database guide for more technical details.

---
**DriveKenya** - Your trusted car rental platform for Nairobi! 🚗✨

For support, email support@nairobiride.com or join our community chat.