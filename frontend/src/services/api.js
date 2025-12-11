// API Configuration and Service Functions
const API_BASE_URL = 'http://localhost:5000/api';

// API Helper function with error handling
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = options && options.body && typeof FormData !== 'undefined' && options.body instanceof FormData;
  const defaultHeaders = isFormData ? {} : { 'Content-Type': 'application/json' };
  const config = {
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      // Log detailed validation errors for debugging
      if (data.errors && Array.isArray(data.errors)) {
        console.error('❌ Validation Errors:', data.errors);
        data.errors.forEach((error, index) => {
          console.error(`  ${index + 1}. Field: ${error.path || error.field} - ${error.msg || error.message}`);
        });
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    console.log(`✅ API Success: ${endpoint}`, data);
    return data;
  } catch (error) {
    console.error(`❌ API Error: ${endpoint}`, error);
    throw error;
  }
};

// Cars API
export const carsAPI = {
  // Get all cars
  getAllCars: () => apiRequest('/cars'),
  
  // Get car by ID
  getCarById: (id) => apiRequest(`/cars/${id}`),
  
  // Search cars
  searchCars: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/cars?${query}`);
  },

  // Add new car (requires authentication)
  addCar: (carData, token) => apiRequest('/cars', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(carData),
  }),

  // Get user's cars (requires authentication)
  getMyCars: (token) => apiRequest('/cars/my/cars', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),

  // Update per-car scheduling settings (requires authentication)
  updateScheduling: (carId, { buffer_hours = 0, min_notice_hours = 0 }, token) => apiRequest(`/cars/${carId}/scheduling`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ buffer_hours, min_notice_hours }),
  }),

  // Create a blackout period for a car (requires authentication)
  createBlackout: (carId, { start, end, reason }, token) => apiRequest(`/cars/${carId}/blackouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ start, end, reason }),
  }),

  // Delete a blackout by id (requires authentication)
  deleteBlackout: (blackoutId, token) => apiRequest(`/blackouts/${blackoutId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),
};

// Auth API
export const authAPI = {
  // Login user
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  // Register user
  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  
  // Resend verification email
  resendVerification: (email) => apiRequest('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  
  // Get current user
  getCurrentUser: (token) => apiRequest('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),

  // Logout user
  logout: (token) => apiRequest('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),
};

// Bookings API
export const bookingsAPI = {
  // Create booking
  createBooking: (bookingData, token) => apiRequest('/bookings/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  }),
  
  // Get user bookings
  getUserBookings: (token) => apiRequest('/bookings/my-bookings', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),

  // Get booking by ID
  getBookingById: (id, token) => apiRequest(`/bookings/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),

  // Cancel booking
  cancelBooking: (id, token) => apiRequest(`/bookings/${id}/cancel`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),

  // Get all bookings (admin)
  getAllBookings: (token) => apiRequest('/bookings/admin/all', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),

  // Availability (public)
  getAvailability: (carId, start, end) => apiRequest(`/availability/${carId}?start=${start}&end=${end}`),

  // Recurring bookings
  recurringPreview: (payload) => apiRequest('/bookings/recurring/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }),

  createRecurring: (payload, token) => apiRequest('/bookings/recurring/create', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }),
};

// Users API
export const usersAPI = {
  // Get user profile
  getProfile: (token) => apiRequest('/users/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),
  
  // Update user profile
  updateProfile: (profileData, token) => apiRequest('/users/profile', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  }),
  
  // Upload profile avatar (FormData)
  uploadAvatar: (file, token) => {
    const form = new FormData();
    form.append('avatar', file);
    return apiRequest('/users/avatar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
  },

  // Upload verification document (FormData)
  uploadDocument: (file, type, token) => {
    const form = new FormData();
    form.append('document', file);
    form.append('type', type);
    return apiRequest('/users/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });
  },

  // List user's documents
  getDocuments: (token) => apiRequest('/users/documents', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),

  // Admin: update document status
  updateDocumentStatus: (id, status, notes, token) => apiRequest(`/users/documents/${id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, notes }),
  }),
};

// Reviews API
export const reviewsAPI = {
  // Create a review with optional photos (FormData)
  createReview: ({ carId, rentalId, rating, ratings = {}, comment, images = [] }, token) => {
    const form = new FormData();
    form.append('carId', String(carId));
    form.append('rentalId', String(rentalId));
    form.append('rating', String(rating));
    if (ratings.vehicle) form.append('rating_vehicle', String(ratings.vehicle));
    if (ratings.cleanliness) form.append('rating_cleanliness', String(ratings.cleanliness));
    if (ratings.communication) form.append('rating_communication', String(ratings.communication));
    if (ratings.value) form.append('rating_value', String(ratings.value));
    if (comment) form.append('comment', comment);
    images.forEach(file => form.append('images', file));
    return apiRequest('/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  },

  // Get paginated reviews for a car
  getCarReviews: (carId, { page = 1, limit = 10 } = {}) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
    return apiRequest(`/reviews/car/${carId}?${qs}`);
  },

  // Get ratings summary and category breakdown
  getCarReviewSummary: (carId) => apiRequest(`/reviews/car/${carId}/summary`),

  // Owner response: create or update
  upsertOwnerResponse: (reviewId, content, token) => apiRequest(`/reviews/${reviewId}/response`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  }),

  // Owner response: delete
  deleteOwnerResponse: (reviewId, token) => apiRequest(`/reviews/${reviewId}/response`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }),
};

// Messages API
export const messagesAPI = {
  // Send contact form message (no authentication required)
  sendContactMessage: (messageData) => apiRequest('/contact', {
    method: 'POST',
    body: JSON.stringify(messageData),
  }),

  // Send message to user (requires authentication)
  sendMessage: (messageData, token) => apiRequest('/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(messageData),
  }),

  // Get user messages (requires authentication)
  getMessages: (token) => apiRequest('/messages', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }),
};

// System API
export const systemAPI = {
  // Check backend health
  checkHealth: () => apiRequest('/health'),
  
  // Get system status
  getStatus: () => apiRequest('/status'),
};

// Mock data fallback for development
export const mockCarsData = [
  {
    id: 1,
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    color: 'Silver',
    price_per_day: 4500,
    location: 'Nairobi CBD',
    description: 'Comfortable sedan perfect for business trips and city driving.',
    features: ['Air Conditioning', 'GPS Navigation', 'Bluetooth', 'USB Charging'],
    images: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800'],
    available: true
  },
  {
    id: 2,
    make: 'Nissan',
    model: 'X-Trail',
    year: 2023,
    color: 'Blue',
    price_per_day: 6000,
    location: 'Westlands',
    description: 'Spacious SUV ideal for family trips and weekend getaways.',
    features: ['AWD', 'Sunroof', 'Leather Seats', 'Apple CarPlay', 'Backup Camera'],
    images: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'],
    available: true
  }
];

// API Status checker
export const checkAPIConnection = async () => {
  try {
    const health = await systemAPI.checkHealth();
    const status = await systemAPI.getStatus();
    return {
      connected: true,
      health: health,
      status: status
    };
  } catch (error) {
    console.warn('🔌 Backend not available, using mock data');
    return {
      connected: false,
      error: error.message
    };
  }
};

// Local storage helpers
export const authStorage = {
  setToken: (token) => localStorage.setItem('driveKenya_token', token),
  getToken: () => {
    const token = localStorage.getItem('driveKenya_token');
    return token && token !== 'undefined' ? token : null;
  },
  setUser: (user) => localStorage.setItem('driveKenya_user', JSON.stringify(user)),
  getUser: () => {
    try {
      const user = localStorage.getItem('driveKenya_user');
      return user && user !== 'undefined' ? JSON.parse(user) : null;
    } catch (error) {
      console.warn('Error parsing user data from localStorage:', error);
      return null;
    }
  },
  clearAuth: () => {
    localStorage.removeItem('driveKenya_token');
    localStorage.removeItem('driveKenya_user');
    // Clear any old token storage keys to prevent conflicts
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  // Function to clear all auth data and force fresh login
  clearAllAuthData: () => {
    authStorage.clearAuth();
    console.log('🗑️ Cleared all authentication data - please login again');
  }
};

export default {
  carsAPI,
  authAPI,
  bookingsAPI,
  usersAPI,
  reviewsAPI,
  messagesAPI,
  systemAPI,
  checkAPIConnection,
  mockCarsData,
  authStorage
};