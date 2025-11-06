import { useState, useEffect } from 'react';
import { carsAPI, authAPI, bookingsAPI, messagesAPI, checkAPIConnection, mockCarsData, authStorage } from './services/api.js';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCar, setSelectedCar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 15000]);
  
  // API state
  const [cars, setCars] = useState([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);

  // Booking state
  const [userBookings, setUserBookings] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Car listing form state
  const [carForm, setCarForm] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    price_per_day: '',
    location: '',
    description: '',
    features: []
  });
  const [isSubmittingCar, setIsSubmittingCar] = useState(false);
  const [carSubmitMessage, setCarSubmitMessage] = useState('');

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSubmitMessage, setContactSubmitMessage] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Initialize auth from localStorage
  useEffect(() => {
    const savedToken = authStorage.getToken();
    const savedUser = authStorage.getUser();
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }
  }, []);

  // Load cars from API on component mount
  useEffect(() => {
    const loadCars = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const connectionStatus = await checkAPIConnection();
        setApiConnected(connectionStatus.connected);
        
        if (connectionStatus.connected) {
          const response = await carsAPI.getAllCars();
          if (response.success && response.cars) {
            const transformedCars = response.cars.map((car) => ({
              id: car.id,
              name: `${car.make} ${car.model}`,
              category: car.price_per_day > 8000 ? 'luxury' : car.price_per_day > 5000 ? 'suv' : 'economy',
              price: car.price_per_day,
              image: car.images && car.images.length > 0 ? car.images[0] : 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop&crop=center',
              features: car.features || [],
              seats: 5,
              transmission: 'Automatic',
              fuel: 'Petrol',
              location: car.location,
              rating: 4.5 + Math.random() * 0.5,
              reviews: Math.floor(Math.random() * 200) + 50,
              year: car.year,
              color: car.color,
              description: car.description,
              available: car.available
            }));
            setCars(transformedCars);
            console.log('✅ Loaded cars from API:', transformedCars.length);
          }
        } else {
          console.log('🔄 Using mock data - backend not available');
          setCars(mockCarsData);
        }
      } catch (err) {
        console.error('❌ Error loading cars:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cars');
        setCars(mockCarsData);
      } finally {
        setLoading(false);
      }
    };
    
    loadCars();
  }, []);

  // Load user bookings when user logs in
  useEffect(() => {
    if (token && user) {
      loadUserBookings();
    }
  }, [token, user]);

  const loadUserBookings = async () => {
    try {
      const response = await bookingsAPI.getUserBookings(token);
      if (response.success) {
        setUserBookings(response.bookings);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  // Authentication functions
  const handleAuth = async (formData) => {
    setAuthLoading(true);
    try {
      let response;
      if (authMode === 'login') {
        response = await authAPI.login(formData);
      } else {
        // Transform the form data for registration to match backend expectations
        const registerData = {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          password: formData.password,
          phone: formData.phone || ''
        };
        response = await authAPI.register(registerData);
      }

      if (response.success) {
        const userData = response.data?.user || response.user;
        const tokenData = response.data?.token || response.token;
        
        setUser(userData);
        setToken(tokenData);
        authStorage.setUser(userData);
        authStorage.setToken(tokenData);
        setShowAuthModal(false);
        
        console.log('✅ Login successful!', { user: userData, token: tokenData });
        
        if (authMode === 'register') {
          alert('Registration successful! Welcome to DriveKenya!');
        }
      } else {
        alert(response.message || 'Authentication failed');
      }
    } catch (error) {
      alert(error.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setUserBookings([]);
    authStorage.clearAuth();
  };

  // Booking functions
  const handleBooking = async (bookingData) => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    console.log('🚀 Frontend booking data being sent:', bookingData);
    console.log('🚗 Selected car:', selectedCar);

    setBookingLoading(true);
    try {
      const response = await bookingsAPI.createBooking(bookingData, token);
      if (response.success) {
        alert('Booking created successfully!');
        setShowBookingModal(false);
        setSelectedCar(null);
        loadUserBookings();
      } else {
        alert(response.message || 'Booking failed');
      }
    } catch (error) {
      alert(error.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  // Car form handlers
  const handleCarFormChange = (e) => {
    const { name, value } = e.target;
    setCarForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitCar = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!carForm.make || !carForm.model || !carForm.year || !carForm.price_per_day) {
      setCarSubmitMessage('Please fill in all required fields');
      return;
    }

    setIsSubmittingCar(true);
    setCarSubmitMessage('');

    try {
      const dailyRate = parseFloat(carForm.price_per_day);
      const carData = {
        make: carForm.make,
        model: carForm.model,
        year: parseInt(carForm.year),
        location: carForm.location,
        hourlyRate: Math.round(dailyRate / 24 * 100) / 100, // Approximate hourly rate
        dailyRate: dailyRate,
        weeklyRate: dailyRate * 6.5, // Weekly discount
        category: 'economy', // Default category
        fuelType: 'petrol', // Default fuel type
        transmission: 'manual', // Default transmission
        seats: 5, // Default seats
        description: carForm.description || '',
        color: carForm.color || '',
        features: ['Air Conditioning', 'Bluetooth']
      };

      console.log('🚗 Sending car data:', carData);
      console.log('🔑 Token:', token ? 'Present' : 'Missing');
      
      await carsAPI.addCar(carData, token);
      setCarSubmitMessage('🎉 Car listed successfully! It will appear in our catalog shortly.');
      setCarForm({
        make: '',
        model: '',
        year: '',
        color: '',
        price_per_day: '',
        location: '',
        description: '',
        features: []
      });
    } catch (error) {
      setCarSubmitMessage(`❌ Error: ${error.message}`);
      console.error('Add car error:', error);
    } finally {
      setIsSubmittingCar(false);
    }
  };

  // Contact form handlers
  const handleContactFormChange = (e) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitContact = async (e) => {
    e.preventDefault();
    
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      setContactSubmitMessage('Please fill in all required fields');
      return;
    }

    setIsSubmittingContact(true);
    setContactSubmitMessage('');

    try {
      await messagesAPI.sendContactMessage(contactForm);
      setContactSubmitMessage('🎉 Thank you for your message! We will get back to you soon.');
      setContactForm({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      setContactSubmitMessage(`❌ Error: ${error.message}`);
      console.error('Contact form error:', error);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const filteredCars = cars.filter(car => {
    const matchesSearch = car.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         car.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || car.category === selectedCategory;
    const matchesPrice = car.price >= priceRange[0] && car.price <= priceRange[1];
    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Enhanced Navigation Component with Auth
  const Navigation = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div 
            className="text-2xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors"
            onClick={() => setCurrentPage('home')}
          >
            Drive<span className="text-blue-400">Kenya</span>
          </div>
          
          <div className="hidden md:flex space-x-8">
            {[
              { id: 'home', label: 'Home', icon: '🏠' },
              { id: 'cars', label: 'Cars', icon: '🚗' },
              { id: 'listcar', label: 'List Car', icon: '📝' },
              { id: 'bookings', label: 'My Bookings', icon: '📋' },
              { id: 'about', label: 'About', icon: 'ℹ️' },
              { id: 'contact', label: 'Contact', icon: '📞' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`px-4 py-2 rounded-full transition-all duration-200 ${
                  currentPage === item.id 
                    ? 'bg-blue-500/20 text-white border border-blue-400/30' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <span className="text-white/60 text-sm flex items-center">
                {apiConnected ? (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                    Database Connected
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    Demo Mode
                  </>
                )}
              </span>
            </div>
            
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-white text-sm">
                  👋 {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                </span>
                <button 
                  onClick={handleLogout}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-white px-4 py-2 rounded-full font-semibold transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-full font-semibold transition-all transform hover:scale-105 shadow-lg"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
  // Authentication Modal
  const AuthModal = () => {
    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: ''
    });

    if (!showAuthModal) return null;

    const handleSubmit = (e) => {
      e.preventDefault();
      handleAuth(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl max-w-md w-full relative">
          <button
            onClick={() => setShowAuthModal(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">
                {authMode === 'login' ? 'Welcome Back' : 'Join DriveKenya'}
              </h2>
              <p className="text-white/70">
                {authMode === 'login' 
                  ? 'Sign in to your account' 
                  : 'Create your account to start booking'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}
              
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-all"
              >
                {authLoading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {authMode === 'login' 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'}
              </button>
            </div>

            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl"
            >
              
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Booking Modal
  const BookingModal = () => {
    const [bookingData, setBookingData] = useState({
      startDate: '',
      endDate: '',
      pickupLocation: '',
      dropoffLocation: '',
      specialRequests: ''
    });

    if (!showBookingModal || !selectedCar) return null;

    const handleSubmit = (e) => {
      e.preventDefault();
      handleBooking({
        carId: selectedCar.id,
        ...bookingData
      });
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Book {selectedCar.name}</h2>
              <button
                type="button"
                onClick={() => {setShowBookingModal(false); setSelectedCar(null);}}
                className="text-white/70 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Start Date</label>
                  <input
                    type="date"
                    value={bookingData.startDate}
                    onChange={(e) => setBookingData({...bookingData, startDate: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white/70 text-sm mb-2">End Date</label>
                  <input
                    type="date"
                    value={bookingData.endDate}
                    onChange={(e) => setBookingData({...bookingData, endDate: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <input
                type="text"
                placeholder="Pickup Location (optional)"
                value={bookingData.pickupLocation}
                onChange={(e) => setBookingData({...bookingData, pickupLocation: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Dropoff Location (optional)"
                value={bookingData.dropoffLocation}
                onChange={(e) => setBookingData({...bookingData, dropoffLocation: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <textarea
                placeholder="Special Requests (optional)"
                value={bookingData.specialRequests}
                onChange={(e) => setBookingData({...bookingData, specialRequests: e.target.value})}
                rows="3"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>

              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <h3 className="text-white font-semibold mb-2">Booking Summary</h3>
                <div className="text-white/70 space-y-1">
                  <div>Car: {selectedCar.name}</div>
                  <div>Price: KSh {selectedCar.price?.toLocaleString()}/day</div>
                  <div>Location: {selectedCar.location}</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-all"
              >
                {bookingLoading ? 'Creating Booking...' : 'Confirm Booking'}
              </button>
            </form>

            <button
              onClick={() => {setShowBookingModal(false); setSelectedCar(null);}}
              className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl"
            >
              
            </button>
          </div>
        </div>
      </div>
    );
  };


  // Enhanced Home Page
  const renderHome = () => (
    <div className="min-h-screen">
      <section className="relative h-screen flex items-center justify-center text-center bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-6">
              <span className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
              <span className="text-white/80 text-sm">
                {apiConnected ? 'Live Database Connected' : 'Demo Mode'}  {cars.length} Cars Available
              </span>
            </div>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight">
            Drive<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Kenya</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-12 leading-relaxed">
            Premium car rentals across Kenya with real-time booking and authentic reviews.
          </p>
          
          {loading && (
            <div className="mb-8">
              <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="text-white">Loading cars...</span>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={() => setCurrentPage('cars')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-2xl"
            >
              Browse {cars.length} Cars
            </button>
            {user ? (
              <button 
                onClick={() => setCurrentPage('bookings')}
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 backdrop-blur-sm"
              >
                My Bookings ({userBookings.length})
              </button>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 backdrop-blur-sm"
              >
                Sign In to Book
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-slate-900 to-blue-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="text-4xl font-bold text-white mb-2">{cars.length}+</div>
              <div className="text-white/70">Cars Available</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="text-4xl font-bold text-white mb-2">{userBookings.length}</div>
              <div className="text-white/70">{user ? 'Your Bookings' : 'Active Bookings'}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-white/70">Support</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
              <div className="text-4xl font-bold text-white mb-2">4.9</div>
              <div className="text-white/70">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cars */}
      <section className="py-20 bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Featured Cars</h2>
            <p className="text-xl text-white/70">Discover our most popular vehicles</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredCars.slice(0, 3).map(car => (
              <div key={car.id} className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:scale-105 transition-all duration-300">
                <div className="relative overflow-hidden">
                  <img 
                    src={car.image} 
                    alt={car.name} 
                    className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-300" 
                  />
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                     {car.rating?.toFixed(1) || '4.8'}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{car.name}</h3>
                  <p className="text-white/60 mb-4"> {car.location}</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold text-white">KSh {car.price?.toLocaleString()}</div>
                      <div className="text-white/60 text-sm">per day</div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedCar(car);
                        if (user) {
                          setShowBookingModal(true);
                        } else {
                          setShowAuthModal(true);
                        }
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-full font-semibold transition-all"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  // Enhanced Cars Page with Search
  const renderCars = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">Available Cars</h1>
          <p className="text-xl text-white/70">
            {apiConnected ? 'Real-time data from our database' : 'Demo data'}  {filteredCars.length} of {cars.length} cars shown
          </p>
        </div>

        {/* Enhanced Search and Filter Section */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 mb-12 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2"> Search</label>
              <input
                type="text"
                placeholder="Car name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2"> Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="economy">Economy</option>
                <option value="suv">SUV</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
            
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2"> Price Range (KSh/day)</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                  className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 15000])}
                  className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {setSearchTerm(''); setSelectedCategory('all'); setPriceRange([0, 15000]);}}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105"
              >
                 Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Cars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCars.map(car => (
            <div key={car.id} className="group bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl">
              <div className="relative">
                <img src={car.image} alt={car.name} className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center">
                  <span className="text-yellow-400"></span>
                  <span className="text-white text-sm ml-1">{car.rating?.toFixed(1) || '4.8'}</span>
                </div>
                {car.available && (
                  <div className="absolute top-4 left-4 bg-green-500/80 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    Available
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{car.name}</h3>
                <div className="text-white/60 text-sm mb-4 space-x-4">
                  <span> {car.location}</span>
                  <span> {car.seats} seats</span>
                  <span> {car.fuel}</span>
                </div>
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {car.features?.slice(0, 3).map((feature, index) => (
                      <span key={index} className="bg-white/10 text-white/80 px-2 py-1 rounded text-xs">
                        {feature}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold text-white">KSh {car.price?.toLocaleString()}</div>
                      <div className="text-white/60 text-sm">per day</div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedCar(car);
                        if (user) {
                          setShowBookingModal(true);
                        } else {
                          setShowAuthModal(true);
                        }
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-full font-semibold transition-all transform hover:scale-105"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCars.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 max-w-lg mx-auto">
              <div className="text-6xl mb-4"></div>
              <h3 className="text-2xl font-bold text-white mb-4">No cars found</h3>
              <p className="text-white/70 mb-6">Try adjusting your filters or search terms</p>
              <button
                onClick={() => {setSearchTerm(''); setSelectedCategory('all'); setPriceRange([0, 15000]);}}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full font-semibold transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );


  // Enhanced Bookings Page
  const renderBookings = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">My Bookings</h1>
        
        {!user ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4"></div>
            <h3 className="text-2xl font-bold text-white mb-4">Sign In Required</h3>
            <p className="text-white/70 mb-6">Please sign in to view your bookings</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
            >
              Sign In
            </button>
          </div>
        ) : userBookings.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4"></div>
            <h3 className="text-2xl font-bold text-white mb-4">No bookings yet</h3>
            <p className="text-white/70 mb-6">Browse our cars to make your first reservation!</p>
            <button
              onClick={() => setCurrentPage('cars')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
            >
              Browse Cars
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {userBookings.map((booking) => (
              <div key={booking.id} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {booking.car?.name || 'Unknown Car'} ({booking.car?.year || 'N/A'})
                    </h3>
                    <div className="text-white/70 space-y-1">
                      <div> {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}</div>
                      <div> KSh {booking.totalPrice?.toLocaleString()}</div>
                      <div> {booking.pickupLocation || booking.car?.location}</div>
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'confirmed' ? 'bg-green-500/20 text-green-300' :
                        booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        booking.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {booking.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this booking?')) {
                            bookingsAPI.cancelBooking(booking.id, token);
                            loadUserBookings();
                          }
                        }}
                        className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 px-4 py-2 rounded-lg font-semibold transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // List Car Form - Enhanced with proper backend integration
  const renderListCar = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">List Your Car</h1>
        
        {!user ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h3 className="text-2xl font-bold text-white mb-4">Sign In Required</h3>
            <p className="text-white/70 mb-6">Please sign in to list your car for rental</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <p className="text-white/80 text-lg mb-6">Start earning by renting out your vehicle on DriveKenya!</p>
            
            {carSubmitMessage && (
              <div className={`mb-6 p-4 rounded-lg ${
                carSubmitMessage.includes('Error') ? 'bg-red-500/20 border border-red-400/30 text-red-300' : 
                'bg-green-500/20 border border-green-400/30 text-green-300'
              }`}>
                {carSubmitMessage}
              </div>
            )}

            <form onSubmit={handleSubmitCar}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  name="make"
                  value={carForm.make}
                  onChange={handleCarFormChange}
                  placeholder="Car Make *" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  required
                />
                <input 
                  name="model"
                  value={carForm.model}
                  onChange={handleCarFormChange}
                  placeholder="Car Model *" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  required
                />
                <input 
                  name="year"
                  value={carForm.year}
                  onChange={handleCarFormChange}
                  placeholder="Year *" 
                  type="number"
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  required
                />
                <input 
                  name="price_per_day"
                  value={carForm.price_per_day}
                  onChange={handleCarFormChange}
                  placeholder="Price per day (KSh) *" 
                  type="number"
                  min="1"
                  step="0.01"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  required
                />
                <input 
                  name="color"
                  value={carForm.color}
                  onChange={handleCarFormChange}
                  placeholder="Color" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
                <input 
                  name="location"
                  value={carForm.location}
                  onChange={handleCarFormChange}
                  placeholder="Location (e.g., Nairobi CBD)" 
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <textarea 
                name="description"
                value={carForm.description}
                onChange={handleCarFormChange}
                placeholder="Description (optional)"
                rows={3}
                className="w-full mt-6 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
              <button 
                type="submit"
                disabled={isSubmittingCar}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-semibold transition-all"
              >
                {isSubmittingCar ? 'Listing Car...' : 'List My Car'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">About DriveKenya</h1>
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <p className="text-white/80 text-lg mb-6">
            DriveKenya is Kenya's premier car rental platform, connecting travelers with quality vehicles across the country.
            From budget-friendly economy cars to luxury vehicles, we offer the perfect ride for every journey.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-white font-semibold mb-2">Wide Selection</h3>
              <p className="text-white/70">Economy to luxury vehicles</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-white font-semibold mb-2">Trusted & Safe</h3>
              <p className="text-white/70">All vehicles verified and insured</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-white font-semibold mb-2">Best Prices</h3>
              <p className="text-white/70">Competitive rates nationwide</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">Contact Us</h1>
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-white font-semibold text-xl mb-4">Get in Touch</h3>
              <div className="space-y-4 text-white/80">
                <div>📧 info@driveKenya.com</div>
                <div>📞 +254 700 123 456</div>
                <div>📍 Nairobi, Kenya</div>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-xl mb-4">Send Message</h3>
              
              {contactSubmitMessage && (
                <div className={`mb-4 p-3 rounded-lg ${
                  contactSubmitMessage.includes('Error') ? 'bg-red-500/20 border border-red-400/30 text-red-300' : 
                  'bg-green-500/20 border border-green-400/30 text-green-300'
                }`}>
                  {contactSubmitMessage}
                </div>
              )}

              <form onSubmit={handleSubmitContact}>
                <div className="space-y-4">
                  <input 
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactFormChange}
                    placeholder="Your Name *" 
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required
                  />
                  <input 
                    name="email"
                    value={contactForm.email}
                    onChange={handleContactFormChange}
                    placeholder="Your Email *" 
                    type="email"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required
                  />
                  <input 
                    name="subject"
                    value={contactForm.subject}
                    onChange={handleContactFormChange}
                    placeholder="Subject (optional)" 
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                  <textarea 
                    name="message"
                    value={contactForm.message}
                    onChange={handleContactFormChange}
                    placeholder="Your Message *" 
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  ></textarea>
                  <button 
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-semibold transition-all"
                  >
                    {isSubmittingContact ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Main render function
  return (
    <div className="min-h-screen font-['Poppins'] bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900">
      <Navigation />
      
      {currentPage === 'home' && renderHome()}
      {currentPage === 'cars' && renderCars()}
      {currentPage === 'listcar' && renderListCar()}
      {currentPage === 'bookings' && renderBookings()}
      {currentPage === 'about' && renderAbout()}
      {currentPage === 'contact' && renderContact()}
      
      <AuthModal />
      <BookingModal />
    </div>
  );
}

export default App;
