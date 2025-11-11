# DriveKenya - Premium Car Rental Platform

> 🚗 **A modern, full-stack car rental platform for Nairobi with real-time chat, progressive web app capabilities, and comprehensive booking system.**

Built with **React 18 + TypeScript**, **Node.js + Express**, **SQLite**, **Socket.io**, and **Google Maps API**.

---

## 🌟 **Phase 1 - Core Features (100% COMPLETE)**

### ✅ **1. Real-Time Chat System**
- **WebSocket-based messaging** between renters and car owners
- **Instant communication** with typing indicators and message status
- **Multi-user support** with room-based chat architecture
- **EAT timezone support** for accurate message timestamps
- **Message persistence** with SQLite database

### ✅ **2. Google Maps Integration**
- **Interactive location picker** with Nairobi landmarks
- **Car location display** on interactive maps
- **Route planning** with pickup/drop-off pins
- **Distance calculation** for delivery fees
- **Enhanced map components** with clustering support

### ✅ **3. Enhanced Payment UI**
- **Cash payment option** with pickup details
- **M-Pesa integration UI** ready for mobile money
- **"Coming Soon" states** for credit cards and bank transfers
- **Payment flow integration** in booking process
- **Payment notifications** and status updates

### ✅ **4. Real-Time Notifications System**
- **Push notifications** for booking updates and messages
- **In-app notifications** with real-time count updates
- **Browser notifications** with permission management
- **Notification center** with click-to-chat functionality
- **Background sync** for offline notification delivery

### ✅ **5. Progressive Web App (PWA)**
- **Service workers** with intelligent caching strategies
- **Offline support** for browsing cached content
- **Installable experience** on mobile and desktop
- **App-like interface** with fullscreen mode
- **Background sync** and push notification support

---

## 🚀 **Key Improvements & Features**

### 🔐 **Authentication & Security**
- **JWT-based authentication** with multi-browser support
- **Role-based access control** (Customer/Host/Admin)
- **Email verification system** (development bypass available)
- **Secure password hashing** with bcrypt
- **CORS protection** with comprehensive middleware

### 📱 **User Experience**
- **Responsive design** optimized for all devices
- **Real-time updates** across all features
- **Intuitive booking flow** with 3-step process
- **Advanced search & filtering** by location, price, category
- **Toast notifications** for user feedback

### 🗄️ **Database & Backend**
- **SQLite database** with optimized schema
- **Real-time WebSocket server** with Socket.io
- **RESTful API architecture** with comprehensive endpoints
- **Database migrations** automatically handled
- **Rate limiting** and security middleware

### 🌍 **Location Services**
- **Google Maps integration** with place autocomplete
- **Nairobi-specific landmarks** and popular locations
- **Route optimization** for pickup/delivery
- **Distance-based pricing** calculations
- **Location validation** and geocoding

---

## � **Quick Start Guide**

### **Prerequisites**
- Node.js 18+ and npm
- Google Maps API key (optional for enhanced features)

### **1. Backend Setup**
```bash
# Navigate to backend directory
cd backend-nodejs

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start the server
npm start
```

### **2. Frontend Setup**
```bash
# Navigate to frontend directory  
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev
```

### **3. Access Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database Browser**: `npm run db:browse` (backend)

---

## 🔧 **Environment Configuration**

### **Backend (.env)**
```env
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
CORS_ORIGIN=http://localhost:3000
DB_PATH=./driveKenya.db
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### **Frontend (.env)**
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_APP_NAME=DriveKenya
VITE_SOCKET_URL=http://localhost:5000
```

## 🏗️ **Project Structure**

```
car-hiring-system-for-nairobi/
├── 📱 frontend/                        # React + TypeScript PWA
│   ├── src/
│   │   ├── App.tsx                    # Main application component
│   │   ├── main.tsx                   # PWA-enabled entry point
│   │   ├── components/
│   │   │   ├── BookingFlow.jsx        # 3-step booking process
│   │   │   ├── ChatModal.jsx          # Real-time chat interface  
│   │   │   ├── GoogleMapEnhanced.jsx  # Advanced Maps integration
│   │   │   ├── NotificationCenter.jsx # Notification management
│   │   │   ├── PaymentSelector.jsx    # Payment method selection
│   │   │   ├── PWAInstallPrompt.jsx   # PWA installation prompt
│   │   │   └── ... (25+ components)
│   │   └── services/
│   │       ├── api.js                 # API service layer
│   │       ├── chatService.js         # WebSocket client
│   │       ├── notificationService.js # Push notifications
│   │       ├── pwaService.js          # PWA functionality
│   │       └── routePlanningService.js# Route optimization
│   ├── public/
│   │   ├── manifest.json              # PWA manifest
│   │   ├── sw.js                      # Service worker
│   │   └── offline.html               # Offline fallback
│   └── package.json
├── ⚙️ backend-nodejs/                   # Node.js + Express API
│   ├── server.js                      # Main server + WebSocket
│   ├── driveKenya.db                  # SQLite database
│   ├── config/
│   │   └── database-sqlite.js         # Database configuration
│   ├── middleware/
│   │   ├── auth.js                    # JWT + role-based auth
│   │   └── errorHandler.js            # Error handling
│   ├── routes/                        # API endpoints
│   │   ├── auth.js                    # Authentication
│   │   ├── cars.js                    # Car management
│   │   ├── bookings.js                # Booking system
│   │   ├── messages.js                # Chat system
│   │   ├── notifications.js           # Push notifications
│   │   └── ... (10+ route files)
│   ├── services/
│   │   └── socketService.js           # WebSocket management
│   └── package.json
├── 📚 README.md                        # This documentation
└── 📋 REAL_DATABASE_GUIDE.md          # Database schema guide
```

---

## 🛠️ **Technology Stack**

### **Frontend**
- **React 18** + **TypeScript** for robust UI development
- **Vite** for lightning-fast development and builds
- **TailwindCSS** for modern, responsive styling
- **PWA** with service workers and offline support
- **Socket.io Client** for real-time communication
- **Google Maps API** for location services

### **Backend**
- **Node.js** + **Express** for scalable API
- **Socket.io** for WebSocket real-time features
- **SQLite** with Better-SQLite3 for database
- **JWT** authentication with role-based access
- **Bcrypt** for secure password hashing
- **Helmet** + **CORS** for security

### **Real-time Infrastructure**
- **WebSocket communication** with room-based chat
- **Push notifications** with service worker integration
- **Live booking updates** and status changes
- **Real-time notification counts** and alerts

---

## 🎯 **Usage Guide**

### **For Customers**
1. **📱 Install as PWA** - Add DriveKenya to your home screen
2. **🔍 Browse Cars** - Search by location, price, and features  
3. **📍 Smart Booking** - 3-step flow with Google Maps integration
4. **💬 Live Chat** - Message car owners instantly
5. **📊 My Bookings** - Track all reservations in real-time
6. **🔔 Get Notifications** - Receive booking updates and messages

### **For Car Owners (Hosts)**
1. **🚗 List Your Car** - Add vehicles with photos and details
2. **💰 Set Pricing** - Configure daily rates and availability
3. **📨 Manage Bookings** - Accept/decline requests with notifications
4. **👥 Customer Chat** - Communicate with multiple renters
5. **📈 Track Earnings** - Monitor rental income and performance

### **For Administrators**
1. **👨‍💼 User Management** - Oversee all customer and host accounts
2. **🎛️ System Monitor** - Track bookings, payments, and activities
3. **🛠️ Database Tools** - Use built-in database browser
4. **📞 Support Center** - Handle customer service inquiries

---

## 🔧 **Development Tools**

### **Available Scripts**

**Backend:**
```bash
npm start           # Start production server
npm run dev         # Development with auto-reload
npm run test:db     # Check database status  
npm run db:browse   # Open database browser
```

**Frontend:**
```bash
npm run dev         # Development server with HMR
npm run build       # Production build with PWA
npm run preview     # Preview production build
```

### **Database Management**
- **Visual Browser**: Access via `npm run db:browse`
- **Schema Inspector**: Built-in table structure viewer
- **Query Runner**: Execute custom SQL queries
- **Data Export**: Backup and restore functionality

### **Development Features**
- 🔥 **Hot Module Replacement** for instant updates
- 🐛 **Debug Logging** for troubleshooting  
- 📊 **Performance Monitoring** with built-in metrics
- 🔍 **API Testing** with comprehensive endpoints
- 🌐 **CORS** configured for local development

---

## 🚀 **Production Deployment**

### **Pre-deployment Checklist**
- ✅ Environment variables configured
- ✅ Google Maps API keys active
- ✅ JWT secrets updated for production
- ✅ Database permissions verified
- ✅ CORS origins set for production domains
- ✅ Rate limiting configured appropriately

### **Performance Optimizations**
- **PWA Caching**: Intelligent service worker caching
- **API Rate Limiting**: Prevents abuse and ensures stability
- **Database Indexing**: Optimized queries for fast responses
- **Asset Compression**: Minified and compressed static files
- **WebSocket Scaling**: Room-based architecture for efficiency

### **Security Features**
- **JWT Token Validation** with expiration handling
- **Password Hashing** with bcrypt salt rounds
- **CORS Protection** with origin validation
- **Input Sanitization** on all API endpoints
- **Role-based Access Control** throughout the system

---

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

**🔐 Authentication Problems:**
- Clear browser storage and re-login
- Verify JWT secret configuration
- Check token expiration times

**💬 Chat Not Working:**
- Ensure WebSocket connections are established
- Verify user roles are correctly assigned
- Check network connectivity and firewall settings

**🗺️ Maps Not Loading:**
- Verify Google Maps API key is valid
- Check API key permissions and quotas
- Ensure billing is enabled for Google Cloud

**📱 PWA Installation Issues:**
- Verify manifest.json is accessible
- Check service worker registration
- Ensure HTTPS in production (required for PWA)

**🗄️ Database Errors:**
- Check file permissions on SQLite database
- Verify disk space availability
- Use database browser to inspect schema

---

## 📊 **Feature Status**

| Feature Category | Status | Components |
|------------------|---------|------------|
| **Authentication** | ✅ Complete | JWT, Roles, Multi-browser |
| **Real-time Chat** | ✅ Complete | WebSocket, Rooms, Notifications |
| **Google Maps** | ✅ Complete | Location picker, Route planning |
| **Payment UI** | ✅ Complete | Cash, M-Pesa, Coming soon states |
| **Notifications** | ✅ Complete | Push, In-app, Real-time counts |
| **Progressive Web App** | ✅ Complete | Service worker, Offline, Installable |
| **Booking System** | ✅ Complete | 3-step flow, Validation, Pricing |
| **Car Management** | ✅ Complete | Listing, Search, Filtering |
| **User Dashboard** | ✅ Complete | Bookings, History, Profile |
| **Admin Panel** | ✅ Complete | User management, System overview |

---

## 🎉 **What's New in Phase 1**

### **🔄 Recent Improvements**
- **Universal CORS Middleware**: Fixed multi-browser authentication
- **Rate Limiting**: Optimized for development and production
- **Email Verification**: Development-friendly bypass
- **EAT Timezone**: Accurate East Africa Time throughout
- **Notification Optimization**: Reduced API calls with smart caching
- **PWA Complete**: Full Progressive Web App implementation
- **Database Cleanup**: Removed redundant setup scripts
- **Enhanced Logging**: Comprehensive debug information

### **🛡️ Security Enhancements**
- **Helmet Integration**: Security headers with CORS compatibility  
- **Token Validation**: Enhanced JWT verification with user checks
- **Input Validation**: Strengthened form validation
- **Error Handling**: Improved error messages without data exposure

---

## 📞 **Support & Contributing**

### **Getting Help**
- **📖 Documentation**: Check REAL_DATABASE_GUIDE.md for database details
- **🐛 Issues**: Use built-in contact form or repository issues
- **💬 Community**: Join discussions for feature requests
- **🔧 Troubleshooting**: Follow the detailed guide above

### **Contributing**
1. **Fork** the repository
2. **Create** feature branch: `git checkout -b amazing-feature`  
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin amazing-feature`
5. **Submit** pull request with detailed description

---

## 🏆 **Achievements**

**Phase 1 Completed (100%):**
- ✅ Real-time chat system with WebSocket
- ✅ Google Maps integration with route planning
- ✅ Enhanced payment UI with multiple options
- ✅ Real-time notifications system
- ✅ Progressive Web App with offline support

**Technical Excellence:**
- 🎯 **Zero Breaking Changes** during cleanup
- 🚀 **Production Ready** with comprehensive features
- 📱 **Mobile Optimized** with PWA capabilities
- 🔒 **Security Focused** with best practices
- ⚡ **Performance Optimized** for real-world usage

---

**🚗 DriveKenya - Where Premium Car Rental Meets Technology! ✨**

*Built with ❤️ for the Nairobi community - Real-time, Reliable, Ready to Drive!*