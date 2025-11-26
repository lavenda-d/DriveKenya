import { useState, useEffect, FormEvent, ChangeEvent } from 'react';

import { carsAPI, authAPI, bookingsAPI, messagesAPI, usersAPI, checkAPIConnection, mockCarsData, authStorage } from './services/api';

import ChatModal from './components/ChatModal';
import NotificationBadge from './components/NotificationBadge';
import NotificationCenter from './components/NotificationCenter';
import ToastNotification from './components/ToastNotification';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PWAStatus from './components/PWAStatus';
import BookingFlow from './components/BookingFlow';
import CustomerChatSelector from './components/CustomerChatSelector';
import GoogleMapEnhanced from './components/GoogleMapEnhanced';
import { chatService } from './services/chatService';
import { notificationService } from './services/notificationService';
import { pwaService } from './services/pwaService';
import './animations.css';
import ImageGallery from './components/ImageGallery';
import Viewer360 from './components/Viewer360';
import CarSpecs from './components/CarSpecs';
import enhancedCarsAPI from './services/enhancedCarsAPI';
import ReviewSummary from './components/reviews/ReviewSummary';
import ReviewsList from './components/reviews/ReviewsList';
import ReviewForm from './components/reviews/ReviewForm';
import AvailabilityCalendar from './components/AvailabilityCalendar';
import OwnerSchedulingAndBlackouts from './components/OwnerSchedulingAndBlackouts';

// Type definitions
interface Car {
  id: string;
  name: string;
  make: string;
  model: string;
  category: string;
  price_per_day: number;
  location: string;
  rating?: number;
  specs?: {
    transmission?: string;
    fuelType?: string;
  };
  features?: string[];
  amenities?: string[];
  [key: string]: any;
}

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  [key: string]: any;
}

interface AuthToken {
  token: string;
  expiresIn: number;
}

interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface Booking {
  id: string;
  car: Car;
  user: User;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 15000]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  // Advanced filters state
  const [transmission, setTransmission] = useState('all');
  const [fuelType, setFuelType] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [features, setFeatures] = useState<Record<string, boolean>>({
    ac: false,
    bluetooth: false,
    gps: false,
    usb: false,
    sunroof: false,
    parkingSensors: false,
    camera: false,
    leatherSeats: false
  });
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // API state
  const [cars, setCars] = useState<Car[]>([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Handle user logout
  const handleLogout = async () => {
    try {
      // Clear user data from state
      setUser(null);
      setToken(null);
      
      // Clear auth data from storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Reset any other relevant state
      setShowAuthModal(false);
      setShowNotificationPanel(false);
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [needsVerificationEmail, setNeedsVerificationEmail] = useState<string | null>(null);

  // Booking state
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // My Cars state
  const [myCars, setMyCars] = useState<Car[]>([]);

  // Messages panel state
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docType, setDocType] = useState('id_card');
  const [docFile, setDocFile] = useState(null);
  const [docUploading, setDocUploading] = useState(false);

  // Car listing form state
  const [carForm, setCarForm] = useState<{
    make: string;
    model: string;
    year: string;
    color: string;
    price_per_day: string;
    location: string;
    description: string;
    features: string[];
  }>({
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

  // Enhanced car details state
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showImageManager, setShowImageManager] = useState(false);
  const [showSpecsEditor, setShowSpecsEditor] = useState(false);
  const [uploadingCarId, setUploadingCarId] = useState<string | null>(null);
  const [reviewsKey, setReviewsKey] = useState(0);

  // Chat state
  const [showChatModal, setShowChatModal] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSubmitMessage, setContactSubmitMessage] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Notification state
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // Initialize auth from localStorage
  useEffect(() => {
    const savedToken = authStorage.getToken();
    const savedUser = authStorage.getUser();
    if (savedToken && savedUser) {
      // Test if the token is valid by making a quick API call
      authAPI.getCurrentUser(savedToken)
        .then(() => {
          setToken(savedToken);
          setUser(savedUser);
          // Initialize notification service after successful auth
          notificationService.initialize();
        })
        .catch((error: any) => {
          console.warn('🔐 Saved token is invalid, clearing storage...', error);
          authStorage.clearAllAuthData();
          setShowAuthModal(true);
        });
    }
  }, []);

  // Initialize notification service when user logs in
  useEffect(() => {
    if (user && token) {
      notificationService.initialize();
    }
  }, [user, token]);

  // Function to handle JWT signature errors and clear storage
  const handleJWTError = (error: any) => {
    if (error.message && (error.message.includes('signature') || error.message.includes('Invalid or expired token'))) {
      console.warn('🔐 JWT authentication error detected, clearing storage...', error);
      authStorage.clearAllAuthData();
      setToken(null);
      setUser(null);
      setShowAuthModal(true);
      // Force page reload to clear any lingering state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return true;
    }
    return false;
  };

  // Add global error handler for JWT issues and expose storage clearing function
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      return originalFetch(...args)
        .catch((error: any) => {
          if (handleJWTError(error)) {
            throw new Error('Authentication expired, please login again');
          }
          throw error;
        });
    };

    // Expose storage clearing function globally for troubleshooting
    window.clearDriveKenyaAuth = () => {
      authStorage.clearAllAuthData();
      setToken(null);
      setUser(null);
      console.log('✅ DriveKenya authentication data cleared. Please refresh and login again.');
    };

    return () => {
      window.fetch = originalFetch;
      delete window.clearDriveKenyaAuth;
    };
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
              available: car.available,
              host_id: car.host_id, // Add host_id for chat functionality
              owner_name: car.owner_name, // Add owner name
              owner_phone: car.owner_phone // Add owner phone
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
      // Initialize chat service when user is logged in
      initializeChatService();
    } else {
      // Disconnect chat when user logs out
      chatService.disconnect();
    }
  }, [token, user]);

  // Load user's cars when user or cars change
  useEffect(() => {
    const loadMyCars = () => {
      if (!user) {
        setMyCars([]);
        return;
      }
      try {
        // Filter cars where host_id matches current user
        const userOwnedCars = cars.filter(car => car.host_id === user.id);
        setMyCars(userOwnedCars);
      } catch (error) {
        console.error('Failed to fetch user cars:', error);
      }
    };
    loadMyCars();
  }, [user, cars]);

  // Initialize chat service and notifications
  const initializeChatService = () => {
    chatService.connect();
    // Set up notification handler
    const unsubscribeNotifications = chatService.onNotification((notification) => {
      setNotifications(prev => [...prev, { ...notification, id: Date.now(), timestamp: new Date() }]);
      setUnreadCount(prev => prev + 1);
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification('DriveKenya', {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    });
    return unsubscribeNotifications;
  };

  // Request notification permission on app load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Listen for notification chat opening events
  useEffect(() => {
    const handleOpenChatFromNotification = (event) => {
      const { carId, otherParticipantId, chatRoom } = event.detail;
      console.log('🔔 Opening chat from notification event:', { carId, otherParticipantId, chatRoom });
      // Find the car by ID
      const car = cars.find(c => c.id.toString() === carId.toString());
      if (car) {
        // Set up the car with customer info for chat
        const carWithCustomer = {
          ...car,
          customerId: otherParticipantId,
          customerName: `User ${otherParticipantId}` // We'll use a generic name for now
        };
        setSelectedCar(carWithCustomer);
        setShowChatModal(true);
      } else {
        console.error('❌ Car not found for notification chat:', carId);
      }
    };
    window.addEventListener('openChatFromNotification', handleOpenChatFromNotification);
    return () => {
      window.removeEventListener('openChatFromNotification', handleOpenChatFromNotification);
    };
  }, [cars]); // Depend on cars array

  const loadUserBookings = async () => {
    try {
      const response = await bookingsAPI.getUserBookings(token);
      if (response.success) {
        setUserBookings(response.bookings);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
      if (!handleJWTError(error)) {
        // Only show error if it's not a JWT issue (JWT errors trigger reload)
        console.error('Booking load error:', error);
      }
    }
  };

  // New function to handle booking completion from BookingFlow
  const handleBookingComplete = async (bookingData) => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    try {
      // Transform the new booking data format to match the API
      const apiBookingData = {
        carId: bookingData.carId,
        startDate: bookingData.pickupDate,
        endDate: bookingData.returnDate,
        pickupLocation: bookingData.pickupLocation?.address || bookingData.pickupLocation?.name || 'Not specified',
        dropoffLocation: bookingData.dropoffLocation?.address || bookingData.dropoffLocation?.name || 'Not specified',
        specialRequests: `${bookingData.additionalRequests ? 'Additional Requests: ' + bookingData.additionalRequests + '. ' : ''}${bookingData.driverRequired ? 'Professional driver required. ' : ''}Customer: ${bookingData.customerInfo.name}, Phone: ${bookingData.customerInfo.phone}, Email: ${bookingData.customerInfo.email}${bookingData.customerInfo.idNumber ? ', ID: ' + bookingData.customerInfo.idNumber : ''}`
      };

      console.log('🚀 Submitting booking data:', {
        frontend: bookingData,
        api: apiBookingData
      });

      // If recurrence requested, use recurring endpoint
      if (bookingData.recurrence?.enabled) {
        const recurrence = {
          frequency: 'weekly',
          interval: 1,
          count: Math.max(1, Number(bookingData.recurrence.count) || 1),
          byWeekday: [new Date(bookingData.pickupDate).getDay()],
        };
        const payload = {
          carId: apiBookingData.carId,
          startDate: apiBookingData.startDate,
          endDate: apiBookingData.endDate,
          pickupLocation: apiBookingData.pickupLocation,
          dropoffLocation: apiBookingData.dropoffLocation,
          specialRequests: apiBookingData.specialRequests,
          recurrence,
          skipConflicts: false,
        };
        const resp = await bookingsAPI.createRecurring(payload, token);
        if (resp.success) {
          alert(`🎉 Recurring bookings created! Series #${resp.seriesId}\nCreated: ${resp.created.length} out of ${resp.preview.length}`);
          setShowBookingModal(false);
          setSelectedCar(null);
          loadUserBookings();
          return;
        } else {
          alert(resp.message || 'Recurring booking failed');
          return;
        }
      }

      // Single booking
      const response = await bookingsAPI.createBooking(apiBookingData, token);
      if (response.success) {
        alert(`🎉 Booking confirmed successfully!
Booking Number: ${bookingData.bookingNumber}
Total Cost: KSH ${bookingData.totalCost.toLocaleString()}
You will receive a confirmation email shortly.`);
        setShowBookingModal(false);
        setSelectedCar(null);
        loadUserBookings();
      } else {
        alert(response.message || 'Booking failed');
      }
    } catch (error) {
      console.error('❌ Booking error:', error);
      alert(error.message || 'Booking failed. Please try again.');
    }
  };

  // Car form handlers
  const handleCarFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCarForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitCar = async (e: FormEvent) => {
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
        price_per_day: dailyRate, // Backend expects 'price_per_day' not 'dailyRate'
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
      const newCarId = response.data.car.id; // Get the new car ID from response
      setUploadingCarId(newCarId);
      setShowImageUploader(true);
      setCarSubmitMessage('🎉 Car listed successfully! Now add some images.');
    } catch (error: any) {
      setCarSubmitMessage(`❌ Error: ${error.message}`);
      console.error('Add car error:', error);
    } finally {
      setIsSubmittingCar(false);
    }
  };

  // Contact form handlers
  const handleContactFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitContact = async (e: FormEvent) => {
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
    } catch (error: any) {
      setContactSubmitMessage(`❌ Error: ${error.message}`);
      console.error('Contact form error:', error);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Chat handling functions
  const handleOpenChat = (car: Car) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    console.log('🎯 Opening chat for car:', car.name, 'Current user role:', user.role);
    // If user is car owner (host), show customer selector
    if (user.role === 'host' && car.host_id === user.id) {
      setSelectedCar(car);
      setShowCustomerSelector(true);
    } else {
      // Customer or other user - direct chat with car owner
      setSelectedCar(car);
      setShowChatModal(true);
    }
  };

  const handleCustomerSelect = (customer: User) => {
    console.log('👤 Selected customer for chat:', customer);
    if (!selectedCar) return;
    // Add customer info to selected car
    const carWithCustomer = {
      ...selectedCar,
      customerId: customer.id,
      customerName: customer.name
    };
    setSelectedCar(carWithCustomer as Car);
    setShowCustomerSelector(false);
    setShowChatModal(true);
  };

  const closeChatModal = () => {
    setShowChatModal(false);
    setSelectedCar(null);
  };

  const closeCustomerSelector = () => {
    setShowCustomerSelector(false);
    setSelectedCar(null);
  };

  // Generate search suggestions based on input
  useEffect(() => {
    if (searchTerm.length > 1) {
      const suggestions = [
        ...new Set([
          ...cars
            .filter(car =>
              car.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              car.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              car.model?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(car => car.name),
          ...cars
            .filter(car => car.location?.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(car => `${car.location} (${car.city || 'Nairobi'})`),
          ...Object.keys(features)
            .filter(feature =>
              feature.toLowerCase().includes(searchTerm.toLowerCase()) &&
              features[feature] === false
            )
            .map(feature => `With ${feature.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
        ])
      ].slice(0, 5);
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, cars, features]);

  const filteredCars = cars.filter(car => {
    // Basic search
    const matchesSearch =
      car.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.location?.toLowerCase().includes(searchTerm.toLowerCase());

    // Category filter
    const matchesCategory = selectedCategory === 'all' || car.category === selectedCategory;

    // Price range filter
    const matchesPrice = car.price_per_day >= priceRange[0] && car.price_per_day <= priceRange[1];

    // Transmission filter
    const matchesTransmission = transmission === 'all' ||
      (car.specs?.transmission?.toLowerCase() === transmission.toLowerCase());

    // Fuel type filter
    const matchesFuelType = fuelType === 'all' ||
      (car.specs?.fuelType?.toLowerCase() === fuelType.toLowerCase());

    // Rating filter
    const matchesRating = car.rating >= minRating;

    // Features filter (all selected features must match)
    const matchesFeatures = Object.entries(features).every(([feature, isSelected]) => {
      if (!isSelected) return true; // Skip unselected features
      return car.features?.includes(feature) || car.amenities?.includes(feature);
    });

    return matchesSearch && matchesCategory && matchesPrice &&
      matchesTransmission && matchesFuelType && matchesRating && matchesFeatures;
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
          <div className="hidden md:flex space-x-4">
            {[
              { id: 'home', label: 'Home', icon: '🏠' },
              { id: 'cars', label: 'Cars', icon: '🚗' },
              { id: 'listcar', label: 'List Car', icon: '📝' },
              { id: 'bookings', label: 'Rentals', icon: '📋' },
              { id: 'mycars', label: 'My Cars', icon: '🚘' },
              { id: 'profile', label: 'Profile', icon: '👤' },
              { id: 'about', label: 'About', icon: 'ℹ️' },
              { id: 'contact', label: 'Contact', icon: '📞' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`px-3 py-2 rounded-full transition-all duration-200 text-sm ${currentPage === item.id
                    ? 'bg-blue-500/20 text-white border border-blue-400/30'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                <span className="mr-1">{item.icon}</span>
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
                <NotificationBadge className="mr-2">
                  <button
                    onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                    className="text-white text-lg hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
                    title="Notifications"
                  >
                    🔔
                  </button>
                </NotificationBadge>
                <NotificationBadge className="mr-2">
                  <button
                    onClick={() => setShowMessagesPanel(!showMessagesPanel)}
                    className="text-white text-lg hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
                    title="Messages"
                  >
                    💬
                  </button>
                </NotificationBadge>
                <div className="text-white text-sm">
                  <div className="font-semibold">
                    👋 {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                  </div>
                  <div className="text-white/60 text-xs">
                    {(() => {
                      console.log('🔍 User object in navigation:', user);
                      console.log('🔍 User role:', user.role);
                      return user.role === 'host' ? '🔑 Car Owner Account' :
                        user.role === 'admin' ? '👑 Admin Account' :
                          '🚗 Customer Account';
                    })()} • Role: {user.role || 'undefined'}
                  </div>
                </div>
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
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-600 text-white px-6 py-2 rounded-full font-semibold transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  // Google Sign-Up handler
  const handleGoogleSignUp = async () => {
    try {
      setAuthLoading(true);
      // For now, call the placeholder endpoint with basic data
      const response = await fetch('http://localhost:5000/api/auth/google-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleToken: 'placeholder-token',
          role: 'customer', // Default role for Google sign-up
          accountType: 'customer'
        })
      });
      const data = await response.json();
      if (data.success) {
        // Handle successful Google sign-up
        alert('Google Sign-Up successful!');
      } else {
        // Show the placeholder message
        alert(`🚀 ${data.message}
Google Sign-Up is coming soon!
${data.data?.instructions || 'Please use regular registration for now.'}`);
      }
    } catch (error) {
      console.error('Google Sign-Up error:', error);
      alert('Google Sign-Up is temporarily unavailable. Please use regular registration.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Authentication Modal
  const AuthModal = () => {
    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      role: 'customer' // Default role
    });

    if (!showAuthModal) return null;

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      handleAuth(formData);
    };

    const handleAuth = async (form: { firstName: string; lastName: string; email: string; password: string; phone: string; role: string }) => {
      try {
        setAuthLoading(true);
        if (authMode === 'register') {
          const payload = {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            password: form.password,
            phone: form.phone,
            role: form.role
          };
          const response = await authAPI.register(payload);
          if (response.success) {
            setAuthMode('login');
            setAuthMessage('Verification email sent. Please check your inbox to verify your account, then sign in.');
          }
        } else {
          // Handle login logic here
          const response = await authAPI.login({
            email: form.email,
            password: form.password
          });
          if (response.success && response.token) {
            // Handle successful login
            setToken(response.token);
            setUser(response.user);
            setShowAuthModal(false);
          }
        }
      } catch (error: any) {
        const message = error?.message || 'Authentication failed';
        setAuthMessage(message);
        if (authMode === 'login' && message.toLowerCase().includes('verify')) {
          setNeedsVerificationEmail(form.email);
        }
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => setShowAuthModal(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold z-10"
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
                  ? 'Sign in to access your account'
                  : 'Create your account and start your journey'}
              </p>
            </div>
            {authMessage && (
              <div className={`mb-4 p-3 rounded-lg ${authMessage.toLowerCase().includes('error') ? 'bg-red-500/20 border border-red-400/30 text-red-300' : 'bg-blue-500/20 border border-blue-400/30 text-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <span>{authMessage}</span>
                  {authMode === 'login' && needsVerificationEmail && (
                    <button
                      type="button"
                      className="ml-3 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-sm"
                      onClick={async () => {
                        try {
                          setAuthLoading(true);
                          await authAPI.resendVerification(needsVerificationEmail);
                          setAuthMessage('Verification email resent. Please check your inbox.');
                        } catch (e: any) {
                          setAuthMessage(e?.message || 'Failed to resend verification email');
                        } finally {
                          setAuthLoading(false);
                        }
                      }}
                    >
                      Resend
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Role Selection */}
            <div className="mb-6">
              <p className="text-white/80 text-sm mb-3">
                {authMode === 'login' ? 'Sign in as:' : 'I want to:'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'customer' })}
                  className={`p-3 rounded-lg border transition-all ${formData.role === 'customer'
                      ? 'bg-blue-600/30 border-blue-400 text-white'
                      : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                    }`}
                >
                  <div className="text-2xl mb-1">🚗</div>
                  <div className="font-semibold text-sm">
                    {authMode === 'login' ? 'Customer' : 'Rent Cars'}
                  </div>
                  <div className="text-xs opacity-75">
                    {authMode === 'login' ? 'Browse & rent' : 'Find & book vehicles'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'owner' })}
                  className={`p-3 rounded-lg border transition-all ${formData.role === 'owner'
                      ? 'bg-green-600/30 border-green-400 text-white'
                      : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                    }`}
                >
                  <div className="text-2xl mb-1">🔑</div>
                  <div className="font-semibold text-sm">
                    {authMode === 'login' ? 'Car Owner' : 'List Cars'}
                  </div>
                  <div className="text-xs opacity-75">
                    {authMode === 'login' ? 'Manage listings' : 'Earn from your car'}
                  </div>
                </button>
              </div>
            </div>
            {/* Google Sign-Up (only for register mode) */}
            {authMode === 'register' && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => handleGoogleSignUp()}
                  className="w-full bg-white hover:bg-gray-100 text-gray-800 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-3 border border-gray-300"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
                <div className="flex items-center my-4">
                  <div className="flex-1 border-t border-white/20"></div>
                  <span className="px-3 text-white/50 text-sm">or</span>
                  <div className="flex-1 border-t border-white/20"></div>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-all"
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

  // Enhanced Booking Flow
  const renderBookingFlow = () => {
    if (!showBookingModal || !selectedCar) return null;
    return (
      <BookingFlow
        selectedCar={{
          ...selectedCar,
          pricePerDay: selectedCar.price // Map price to pricePerDay for consistency
        }}
        onBookingComplete={handleBookingComplete}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedCar(null);
        }}
      />
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
          <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed">
            Premium car rentals across Kenya with real-time booking and authentic reviews.
          </p>
          {/* Role-based Welcome Message */}
          {user && (
            <div className="mb-8">
              <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-400/30 rounded-full px-6 py-3">
                <span className="text-2xl">
                  {(() => {
                    console.log('🔍 User object in welcome:', user);
                    console.log('🔍 User role in welcome:', user.role);
                    return user.role === 'host' ? '🔑' : user.role === 'admin' ? '👑' : '🚗';
                  })()}
                </span>
                <span className="text-white font-medium">
                  {user.role === 'host' ?
                    `Welcome back, Car Owner! Manage your ${myCars.length} listed vehicles` :
                    user.role === 'admin' ?
                      'Welcome back, Admin! Full system access' :
                      `Welcome back, ${user.name?.split(' ')[0] || 'Driver'}! Ready to explore?`
                  }
                </span>
              </div>
            </div>
          )}
          {loading && (
            <div className="mb-8">
              <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="text-white">Loading cars...</span>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setCurrentPage('cars')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-2xl"
            >
              🚗 Browse {cars.length} Cars
            </button>
            {user ? (
              <>
                {user.role === 'host' ? (
                  <>
                    <button
                      onClick={() => setCurrentPage('mycars')}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-2xl"
                    >
                      🔑 My Cars ({myCars.length})
                    </button>
                    <button
                      onClick={() => setCurrentPage('listcar')}
                      className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 backdrop-blur-sm"
                    >
                      ➕ List New Car
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setCurrentPage('bookings')}
                    className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 backdrop-blur-sm"
                  >
                    📋 My Bookings ({userBookings.length})
                  </button>
                )}
              </>
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
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center">
                    <span className="text-yellow-400">⭐</span>
                    <span className="text-white">{car.rating?.toFixed(1) || '4.8'}</span>
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
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-600 text-white px-6 py-2 rounded-full font-semibold transition-all"
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

  // Enhanced Cars Page with Search and Map View
  const renderCars = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">Available Cars</h1>
          <p className="text-xl text-white/70">
            {apiConnected ? 'Real-time data from our database' : 'Demo data'}  {filteredCars.length} of {cars.length} cars shown
          </p>
        </div>
        {/* View Toggle */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-full p-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${viewMode === 'grid'
                    ? 'bg-white text-slate-900'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                📋 Grid View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${viewMode === 'map'
                    ? 'bg-white text-slate-900'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                🗺️ Map View
              </button>
            </div>
          </div>
        </div>
        {/* Enhanced Search and Filter Section */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 mb-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {/* Search with suggestions */}
            <div className="relative">
              <label className="block text-white/70 text-sm font-medium mb-2">🔍 Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Car name, model, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm.length > 1 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    ✕
                  </button>
                )}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
                    {searchSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-white"
                        onMouseDown={() => {
                          if (suggestion.startsWith('With ')) {
                            const feature = suggestion.substring(5).replace(/\s+/g, '').toLowerCase();
                            setFeatures(prev => ({ ...prev, [feature]: true }));
                            setSearchTerm('');
                          } else {
                            setSearchTerm(suggestion.split(' (')[0]);
                          }
                          setShowSuggestions(false);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">🏷️ Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="economy">Economy</option>
                <option value="suv">SUV</option>
                <option value="luxury">Luxury</option>
                <option value="convertible">Convertible</option>
                <option value="van">Van</option>
              </select>
            </div>
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">💰 Price (KSh/day)</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0]}
                  min="0"
                  onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                  className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1]}
                  min={priceRange[0] + 100}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 15000])}
                  className="w-full px-3 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">⭐ Min. Rating</label>
                <div className="flex items-center space-x-2">
                  {[0, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(rating === minRating ? 0 : rating)}
                      className={`px-3 py-1 rounded-full text-sm ${minRating === rating
                          ? 'bg-yellow-500 text-black'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      {rating === 0 ? 'Any' : `${rating}+`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Advanced Filters */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">⚙️ Transmission</label>
                <div className="flex space-x-2">
                  {['All', 'Automatic', 'Manual'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTransmission(type === 'All' ? 'all' : type.toLowerCase())}
                      className={`px-3 py-1 rounded-full text-sm ${transmission === type.toLowerCase() || (type === 'All' && transmission === 'all')
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">⛽ Fuel Type</label>
                <div className="flex space-x-2">
                  {['All', 'Petrol', 'Diesel', 'Hybrid', 'Electric'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFuelType(type === 'All' ? 'all' : type.toLowerCase())}
                      className={`px-3 py-1 rounded-full text-sm ${fuelType === type.toLowerCase() || (type === 'All' && fuelType === 'all')
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-white/70 text-sm font-medium mb-2">🔧 Features</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(features).map((feature) => (
                    <button
                      key={feature}
                      onClick={() => setFeatures(prev => ({ ...prev, [feature]: !prev[feature] }))}
                      className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${features[feature]
                          ? 'bg-green-600 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      <span>{features[feature] ? '✓' : '+'}</span>
                      <span>{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setPriceRange([0, 15000]);
                    setTransmission('all');
                    setFuelType('all');
                    setMinRating(0);
                    setFeatures({
                      ac: false,
                      bluetooth: false,
                      gps: false,
                      usb: false,
                      sunroof: false,
                      parkingSensors: false,
                      camera: false,
                      leatherSeats: false
                    });
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-medium transition-all"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* View Mode Toggle */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 flex justify-between items-center">
            <div className="text-white font-medium">
              {viewMode === 'grid' ? '📋 Grid View' : '🗺️ Map View'} - {filteredCars.length} cars
            </div>
            <div className="flex bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                📋 Grid
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${viewMode === 'map'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                🗺️ Map
              </button>
            </div>
          </div>
        </div>
        {/* Conditional Content Based on View Mode and Car Count */}
        {filteredCars.length === 0 && !loading ? ( // Render the "No cars found" message if no cars match filters
          <div className="text-center py-20">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 max-w-lg mx-auto">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-white mb-4">No cars found</h3>
              <p className="text-white/70 mb-6">Try adjusting your filters or search terms</p>
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setPriceRange([0, 15000]); }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-600 text-white px-6 py-3 rounded-full font-semibold transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : viewMode === 'map' ? ( // If cars exist and view mode is map
          /* Map View */
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden shadow-2xl mb-8">
            <div className="p-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/20">
              <h3 className="text-xl font-bold text-white mb-2">🗺️ Interactive Nairobi Car Map</h3>
              <p className="text-white/70">Explore cars across Nairobi's key areas: CBD, Westlands, Karen, Kilimani & more. Click markers to view details and book instantly.</p>
            </div>
            <div className="h-[600px]">
              <GoogleMapEnhanced
                cars={filteredCars}
                onCarSelect={(car) => {
                  setSelectedCar(car);
                  if (user) {
                    setShowBookingModal(true);
                  } else {
                    setShowAuthModal(true);
                  }
                }}
                showLocationSelector={false}
                initialCenter={{
                  lat: -1.2864,  // Nairobi CBD coordinates
                  lng: 36.8172
                }}
                initialZoom={13}
                mapHeight="600px"
                onChatClick={(car) => handleOpenChat(car)}
                user={user}
                className="rounded-xl overflow-hidden"
              />
            </div>
          </div>
        ) : ( // If cars exist and view mode is grid
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCars.map(car => (
              <div
                key={car.id}
                onClick={() => {
                  setSelectedCar(car);
                  setCurrentPage('car-detail');
                }}
                className="group bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
              >
                <div className="relative">
                  <img src={car.image} alt={car.name} className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center">
                    <span className="text-yellow-400">⭐</span>
                    <span className="text-white">{car.rating?.toFixed(1) || '4.8'}</span>
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
                    <span>📍 {car.location}</span>
                    <span>👥 {car.seats} seats</span>
                    <span>⛽ {car.fuel}</span>
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
                      <div className="text-2xl font-bold text-white">KSh {car.price?.toLocaleString()}</div>
                      <div className="text-white/60 text-sm">per day</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => {
                        setSelectedCar(car);
                        if (user) {
                          setShowBookingModal(true);
                        } else {
                          setShowAuthModal(true);
                        }
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-600 text-white px-6 py-2 rounded-full font-semibold transition-all"
                    >
                      Book Now
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCar(car);
                        setCurrentPage('car-detail');
                      }}
                      className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2 rounded-full font-semibold transition-all"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Car Detail View
  const renderCarDetail = () => {
    if (!selectedCar) return null;
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 pt-20 px-4">
        <div className="max-w-7xl mx-auto py-8">
          {/* Back Button */}
          <button
            onClick={() => { setSelectedCar(null); setCurrentPage('cars'); }}
            className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            ← Back to Cars
          </button>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-2xl p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedCar.make} {selectedCar.model}</h1>
            <p className="text-gray-600">{selectedCar.year} • {selectedCar.location}</p>
            <p className="text-2xl font-bold text-blue-600 mt-4">KSH {selectedCar.price_per_day?.toLocaleString?.() || selectedCar.price?.toLocaleString?.()}</p>
          </div>

          {/* Gallery */}
          <div className="bg-white rounded-lg shadow-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📸 Photos</h2>
            <ImageGallery carId={selectedCar.id} />
          </div>

          {/* 360 Viewer */}
          {selectedCar.car_images?.filter((img: any) => img.image_type === '360').length > 0 && (
            <div className="mb-6">
              <Viewer360 images360={selectedCar.car_images.filter((img: any) => img.image_type === '360')} />
            </div>
          )}

          {/* Specs */}
          <div className="bg-white rounded-lg shadow-2xl p-6 mb-6">
            <CarSpecs carId={selectedCar.id} />
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-lg shadow-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">⭐ Reviews</h2>
            <div className="space-y-6">
              <ReviewSummary key={`sum-${reviewsKey}`} carId={selectedCar.id} />
              <ReviewForm carId={selectedCar.id} onSubmitted={() => setReviewsKey(k => k + 1)} />
              <ReviewsList key={`list-${reviewsKey}`} carId={selectedCar.id} isHost={!!user && (selectedCar as any).host_id === (user as any)?.id} />
            </div>
          </div>

          {/* Availability Calendar */}
          <div className="bg-white rounded-lg shadow-2xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📅 Availability</h2>
            <AvailabilityCalendar carId={selectedCar.id} />
          </div>

          {/* Owner Scheduling & Blackouts (Owners only) */}
          {user && (selectedCar as any).host_id === (user as any)?.id && (
            <div className="bg-white rounded-lg shadow-2xl p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🔧 Owner Scheduling & Blackouts</h2>
              <OwnerSchedulingAndBlackouts carId={selectedCar.id} token={token} />
            </div>
          )}

          {/* Book */}
          <div className="bg-white rounded-lg shadow-2xl p-6">
            <button onClick={() => setShowBookingModal(true)} className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-600 transition-all transform hover:scale-105">
              Book This Car
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main render function
  return (
    <div className="min-h-screen font-['Poppins'] bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900">
      <Navigation />
      {selectedCar && currentPage === 'car-detail' && renderCarDetail()}
      {currentPage === 'home' && renderHome()}
      {currentPage === 'cars' && renderCars()}
      {currentPage === 'listcar' && renderListCar()}
      {currentPage === 'bookings' && renderBookings()}
      {currentPage === 'mycars' && renderMyCars()}
      {currentPage === 'profile' && renderProfile()}
      {currentPage === 'about' && renderAbout()}
      {currentPage === 'contact' && renderContact()}
      <AuthModal />
      {renderBookingFlow()}
      <ChatModal
        isOpen={showChatModal}
        onClose={closeChatModal}
        car={selectedCar}
        currentUser={user}
      />
      {/* Customer Chat Selector for Car Owners */}
      {showCustomerSelector && selectedCar && (
        <CustomerChatSelector
          car={selectedCar}
          currentUser={user}
          onCustomerSelect={handleCustomerSelect}
          onClose={closeCustomerSelector}
        />
      )}
      {/* Messages Panel */}
      {showMessagesPanel && (
        <div className="fixed top-20 right-4 w-80 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl z-40 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <div>
              <h3 className="text-white font-semibold">Messages</h3>
              <p className="text-white/50 text-xs">
                {user?.role === 'host' ? '🔑 Car Owner Inbox' : '🚗 Customer Messages'}
              </p>
            </div>
            <button
              onClick={() => setShowMessagesPanel(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center text-white/60 py-8">
                <div className="text-4xl mb-2">
                  {user?.role === 'host' ? '🔑' : '🚗'}
                </div>
                <p>No messages yet</p>
                <p className="text-sm">
                  {user?.role === 'host'
                    ? 'Customer inquiries will appear here!'
                    : 'Start a conversation with a car owner!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 10).map((notification) => (
                  <div key={notification.id} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">
                        {notification.senderRole === 'host' ? '🔑' :
                          notification.senderRole === 'customer' ? '🚗' : '💬'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-white text-sm font-medium">
                            {notification.senderName || 'Unknown'}
                          </p>
                          {notification.chatContext && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                              {notification.chatContext === 'owner-managing-inquiries' ? 'Inquiry' :
                                notification.chatContext === 'customer-inquiring' ? 'Rental' : 'Chat'}
                            </span>
                          )}
                        </div>
                        <p className="text-white/80 text-sm">{notification.message}</p>
                        <p className="text-white/50 text-xs mt-1">
                          {notification.timestamp ? new Date(notification.timestamp).toLocaleTimeString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Notification Center */}
      <NotificationCenter
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        user={user}
      />
      {/* Toast Notifications */}
      <ToastNotification />
      {/* PWA Components */}
      <PWAInstallPrompt />
      <PWAStatus />
    </div>
  );
}

export default App;