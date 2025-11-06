# Nairobi Car Hire System - Real Backend with Database

This is a production-ready Node.js backend with PostgreSQL database for the Nairobi Car Hire System.

## 🚀 Features

- ✅ **Real Database**: PostgreSQL with proper schema and relationships
- ✅ **Authentication**: JWT-based authentication with bcrypt password hashing
- ✅ **Authorization**: Role-based access control (Admin/User)
- ✅ **CRUD Operations**: Full Create, Read, Update, Delete for all entities
- ✅ **Payment Integration**: Stripe payment processing
- ✅ **File Uploads**: Image upload support for car photos
- ✅ **Data Validation**: Comprehensive input validation
- ✅ **Error Handling**: Structured error responses
- ✅ **Security**: Rate limiting, CORS, Helmet security headers
- ✅ **Database Migrations**: Automated schema setup

## 📋 Prerequisites

Before running this backend, you need:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v13 or higher)
3. **Stripe Account** (for payments)

## 🛠️ Quick Setup

### 1. Install Dependencies
```bash
cd backend-nodejs
npm install
```

### 2. Setup PostgreSQL Database

#### Option A: Local PostgreSQL Installation
1. Install PostgreSQL from [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
2. Create a new database:
```sql
CREATE DATABASE nairobi_car_hire;
CREATE USER car_hire_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nairobi_car_hire TO car_hire_user;
```

#### Option B: Using Docker
```bash
docker run --name postgres-car-hire \\
  -e POSTGRES_DB=nairobi_car_hire \\
  -e POSTGRES_USER=car_hire_user \\
  -e POSTGRES_PASSWORD=your_password \\
  -p 5432:5432 \\
  -d postgres:15
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
notepad .env  # On Windows
# OR
nano .env     # On Linux/Mac
```

**Required Environment Variables:**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nairobi_car_hire
DB_USER=car_hire_user
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Database Setup
```bash
# Run database migrations (creates tables)
npm run migrate

# Seed with sample data (optional)
npm run seed
```

### 5. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:5000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Cars
- `GET /api/cars` - Get all available cars (with filters)
- `GET /api/cars/:id` - Get single car
- `POST /api/cars` - Create new car (authenticated)
- `PUT /api/cars/:id` - Update car (owner only)
- `DELETE /api/cars/:id` - Delete car (owner only)

### Rentals
- `GET /api/rentals` - Get user's rentals
- `POST /api/rentals` - Create new rental booking
- `GET /api/rentals/:id` - Get single rental
- `PATCH /api/rentals/:id/status` - Update rental status

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/car/:carId` - Get car reviews

### Payments
- `POST /api/payments/create-payment-intent` - Create Stripe payment
- `POST /api/payments/confirm-payment` - Confirm payment

## 🔧 Database Schema

### Tables Created:
- **users** - User accounts and profiles
- **cars** - Car listings with all details
- **rentals** - Booking records
- **reviews** - Car reviews and ratings
- **messages** - User-to-user messaging

### Sample Data Included:
- 5 cars (Toyota, Nissan, VW, BMW, Isuzu)
- 5+ users (car owners and renters)
- Sample reviews and ratings

## 🎯 Testing the API

### 1. Health Check
```bash
curl http://localhost:5000/health
```

### 2. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "phone": "+254712345678"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 4. Get Cars
```bash
curl http://localhost:5000/api/cars
```

## 🔄 Connecting Frontend

Update your frontend service to use the real API:

```typescript
// In frontend/src/services/backend.ts
const API_BASE_URL = 'http://localhost:5000/api';

class BackendService {
  private token: string | null = localStorage.getItem('token');

  async getCars(): Promise<Car[]> {
    const response = await fetch(\`\${API_BASE_URL}/cars\`);
    const data = await response.json();
    return data.data.cars;
  }

  async login(email: string, password: string) {
    const response = await fetch(\`\${API_BASE_URL}/auth/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    
    if (data.success) {
      this.token = data.data.token;
      localStorage.setItem('token', this.token);
    }
    
    return data;
  }
}
```

## 🔐 Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Secure authentication with expiration
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: express-validator for all inputs
- **SQL Injection Protection**: Parameterized queries
- **CORS**: Configurable cross-origin requests
- **Helmet**: Security headers

## 🚀 Production Deployment

For production deployment:

1. **Set Environment Variables**:
   ```env
   NODE_ENV=production
   DB_URL=your_production_database_url
   JWT_SECRET=your_production_jwt_secret
   STRIPE_SECRET_KEY=your_live_stripe_key
   ```

2. **Use Process Manager**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "car-hire-api"
   ```

3. **Setup Reverse Proxy** (Nginx/Apache)
4. **Enable HTTPS** with SSL certificate
5. **Database Backups** and monitoring

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test database connection
psql -h localhost -U car_hire_user -d nairobi_car_hire
```

### Port Already in Use
```bash
# Kill process on port 5000
npx kill-port 5000
```

### Check Logs
```bash
# View server logs
npm run dev 2>&1 | tee server.log
```

---

**🎉 You now have a fully functional backend with real database storage!**

The backend includes:
- ✅ Real user registration and authentication
- ✅ Actual car listings stored in PostgreSQL
- ✅ Working booking system with payment processing
- ✅ Review and rating system
- ✅ File upload capabilities
- ✅ Production-ready security and error handling