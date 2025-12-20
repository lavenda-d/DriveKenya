import { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { carsAPI, authAPI, bookingsAPI, messagesAPI, checkAPIConnection, mockCarsData, authStorage } from './services/api';
import ChatModal from './components/ChatModal';
import { NotificationBadge } from './components/NotificationBadge';
import NotificationCenter from './components/NotificationCenter';
import { showToast, AnimatedSection, StaggerContainer, StaggerItem, ScaleInteraction } from './components/UIUtils';
import ToastNotification from './components/ToastNotification';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PWAStatus from './components/PWAStatus';
import BookingFlow from './components/BookingFlow';
import CustomerChatSelector from './components/CustomerChatSelector';
import GoogleMapEnhanced from './components/GoogleMapEnhanced';
import OwnerDashboard from './components/OwnerDashboardEnhanced';
import PricingCalculator from './components/PricingCalculator';

import Phase4Dashboard from './components/Phase4Dashboard';
// EmergencyButton removed - now in Profile & Settings
import LiveChatSupport from './components/LiveChatSupport';
import PerformanceMonitor from './components/PerformanceMonitor';
import { chatService } from './services/chatService';
import { notificationService } from './services/notificationService';
import { pwaService } from './services/pwaService';
import CarDetailView from './components/CarDetailView';

import PasswordStrength from './components/PasswordStrength';
import ProfileSettings from './pages/ProfileSettings';
import ManageCar from './pages/ManageCar';
import { FaCar, FaStar, FaMapMarkerAlt, FaUserCircle } from 'react-icons/fa';
import { Car } from '../types/car';

// Helper function to get vehicle type labels
const getVehicleTypeLabel = (category: string, plural = false, titleCase = false): string => {
  const labels: Record<string, { singular: string; plural: string; title: string; titlePlural: string }> = {
    all: { singular: 'vehicle', plural: 'vehicles', title: 'Vehicle', titlePlural: 'Vehicles' },
    car: { singular: 'car', plural: 'cars', title: 'Car', titlePlural: 'Cars' },
    motorcycle: { singular: 'motorcycle', plural: 'motorcycles', title: 'Motorcycle', titlePlural: 'Motorcycles' },
    bicycle: { singular: 'bicycle', plural: 'bicycles', title: 'Bicycle', titlePlural: 'Bicycles' },
    van: { singular: 'van', plural: 'vans', title: 'Van', titlePlural: 'Vans' },
    truck: { singular: 'truck', plural: 'trucks', title: 'Truck', titlePlural: 'Trucks' },
    suv: { singular: 'SUV', plural: 'SUVs', title: 'SUV', titlePlural: 'SUVs' },
    bus: { singular: 'bus', plural: 'buses', title: 'Bus', titlePlural: 'Buses' }
  };

  const label = labels[category] || labels.all;

  if (titleCase) {
    return plural ? label.titlePlural : label.title;
  }
  return plural ? label.plural : label.singular;
};

// keep the TypeScript App signature; useTranslation will be used inside the component
const App: React.FC = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [viewingCar, setViewingCar] = useState<Car | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 50000]);
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Booking state
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // My Cars state
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [myCarsLoading, setMyCarsLoading] = useState(true);
  const [managingCarId, setManagingCarId] = useState<string | null>(null);
  const [viewingInquiriesCarId, setViewingInquiriesCarId] = useState<string | null>(null);
  const [carInquiries, setCarInquiries] = useState<any[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  // Profile settings modal
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  // Messages panel state
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);

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
    main_image_url: string;
    video_url: string;
    fuel_type: string;
    transmission: string;
    category: string;
    availability_status: string;
    license_plate: string;
    vehicle_type: string;
  }>({
    make: '',
    model: '',
    year: '',
    color: '',
    price_per_day: '',
    location: '',
    description: '',
    features: [],
    main_image_url: '',
    video_url: '',
    fuel_type: '',
    transmission: '',
    category: '',
    availability_status: 'available',
    license_plate: '',
    vehicle_type: ''
  });
  const [isSubmittingCar, setIsSubmittingCar] = useState(false);
  const [carSubmitMessage, setCarSubmitMessage] = useState('');
  const [uploadedCarImages, setUploadedCarImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [selectedCarImages, setSelectedCarImages] = useState<File[]>([]);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  // Chat state
  const [showChatModal, setShowChatModal] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showCarInquiries, setShowCarInquiries] = useState(false);
  const [selectedInquiryCar, setSelectedInquiryCar] = useState(null);
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
        .catch((error) => {
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
  const handleJWTError = (error) => {
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
      return originalFetch.apply(this, arguments)
        .catch(error => {
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

    // Check for password reset token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('resetToken');
    if (token) {
      setResetToken(token);
      setShowResetPassword(true);
      // Clean URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      window.fetch = originalFetch;
      delete window.clearDriveKenyaAuth;
    };
  }, []);

  // Load cars from API with filters
  useEffect(() => {
    const loadCars = async () => {
      try {
        setLoading(true);
        setError(null);
        const connectionStatus = await checkAPIConnection();
        setApiConnected(connectionStatus.connected);
        if (connectionStatus.connected) {
          // Build filter params
          const params = {};
          if (transmission !== 'all') params.transmission = transmission;
          if (fuelType !== 'all') params.fuelType = fuelType;
          if (selectedCategory !== 'all') params.vehicleType = selectedCategory;
          if (priceRange[0] > 0) params.minPrice = priceRange[0];
          if (priceRange[1] < 15000) params.maxPrice = priceRange[1];

          const response = Object.keys(params).length > 0
            ? await carsAPI.searchCars(params)
            : await carsAPI.getAllCars();
          const carsData = response.data?.cars || response.cars || [];
          if (response.success && carsData.length > 0) {
            const transformedCars = carsData.map((car) => {
              // Parse images from JSON string if needed
              let carImages = [];
              if (car.images) {
                try {
                  carImages = typeof car.images === 'string' ? JSON.parse(car.images) : car.images;
                } catch (e) {
                  carImages = [];
                }
              }

              // Get the first image or use main_image_url
              const getCarImage = () => {
                if (car.main_image_url && car.main_image_url.trim() !== '') {
                  return car.main_image_url;
                }
                if (Array.isArray(carImages) && carImages.length > 0 && carImages[0]) {
                  return carImages[0];
                }
                // Fallback - use a generic car image
                return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop';
              };

              return {
                id: car.id,
                name: `${car.make} ${car.model}`,
                category: car.category || (car.price_per_day > 8000 ? 'luxury' : car.price_per_day > 5000 ? 'suv' : 'economy'),
                vehicle_type: car.vehicle_type || 'car',
                price: car.price_per_day,
                image: getCarImage(),
                features: car.features || [],
                seats: 5,
                transmission: car.transmission || 'Automatic',
                fuel: car.fuel_type || 'Petrol',
                location: car.location,
                rating: 4.5 + Math.random() * 0.5,
                reviews: Math.floor(Math.random() * 200) + 50,
                year: car.year,
                color: car.color,
                description: car.description,
                available: car.available,
                availability_status: car.availability_status || 'available',
                host_id: car.host_id,
                owner_name: car.owner_name,
                owner_phone: car.owner_phone
              };
            });
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
  }, [transmission, fuelType, selectedCategory, priceRange]);

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
      setMyCarsLoading(true);
      if (!user) {
        setMyCars([]);
        setMyCarsLoading(false);
        return;
      }
      try {
        // Filter cars where host_id matches current user
        const userOwnedCars = cars.filter(car => car.host_id === user.id);
        setMyCars(userOwnedCars);
      } catch (error) {
        console.error('Failed to fetch user cars:', error);
      } finally {
        setMyCarsLoading(false);
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

  // Authentication functions
  const handleAuth = async (formData) => {
    setAuthLoading(true);
    try {
      let response;
      if (authMode === 'login') {
        // For login, include role preference
        response = await authAPI.login({
          email: formData.email,
          password: formData.password,
          role: formData.role
        });
      } else {
        // Transform the form data for registration to match backend expectations
        const registerData = {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          password: formData.password,
          phone: formData.phone || '',
          role: formData.role,
          accountType: formData.role // Also send as accountType for clarity
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
        console.log('✅ Authentication successful!', { user: userData, token: tokenData, actualRole: userData.role });
        if (authMode === 'register') {
          const roleText = userData.role === 'customer' ? 'car renter' : userData.role === 'host' ? 'car owner' : userData.role;
          showToast(`🎉 Registration successful! Welcome to DriveKenya as a ${roleText}!`, 'success');
        } else {
          const roleText = userData.role === 'customer' ? 'Customer' : userData.role === 'host' ? 'Car Owner' : userData.role;
          console.log(`Welcome back! Logged in as: ${roleText} (Role from DB: ${userData.role})`);
        }
      } else {
        showToast(response.message || 'Authentication failed', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Authentication failed', 'error');
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
        showToast('Booking created successfully!', 'success');
        setShowBookingModal(false);
        setSelectedCar(null);
        loadUserBookings();
      } else {
        showToast(response.message || 'Booking failed', 'error');
      }
    } catch (error) {
      showToast(error.message || 'Booking failed', 'error');
    } finally {
      setBookingLoading(false);
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

      const response = await bookingsAPI.createBooking(apiBookingData, token);
      if (response.success) {
        showToast(`🎉 Booking confirmed successfully! Number: ${bookingData.bookingNumber}`, 'success');
        setShowBookingModal(false);
        setSelectedCar(null);
        loadUserBookings();
      } else {
        showToast(response.message || 'Booking failed', 'error');
      }
    } catch (error) {
      console.error('❌ Booking error:', error);
      showToast(error.message || 'Booking failed. Please try again.', 'error');
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

  // Handle car image file selection
  const handleCarImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedCarImages(Array.from(files));
    }
  };

  // Upload car images to server
  const handleUploadCarImages = async () => {
    if (selectedCarImages.length === 0) {
      showToast('Please select images to upload', 'error');
      return;
    }

    setIsUploadingImages(true);
    try {
      const formData = new FormData();
      selectedCarImages.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('http://localhost:5000/api/cars/upload-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        const newImageUrls = data.data.imageUrls.map(url => `http://localhost:5000${url}`);
        setUploadedCarImages(prev => [...prev, ...newImageUrls]);
        setSelectedCarImages([]);
        showToast(`${newImageUrls.length} image(s) uploaded successfully!`, 'success');
      } else {
        showToast(data.message || 'Failed to upload images', 'error');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      showToast('Failed to upload images', 'error');
    } finally {
      setIsUploadingImages(false);
    }
  };

  // Remove uploaded image
  const handleRemoveCarImage = (index: number) => {
    setUploadedCarImages(prev => prev.filter((_, i) => i !== index));
  };

  // Fetch car inquiries from customers
  const fetchCarInquiries = async (carId: string) => {
    setLoadingInquiries(true);
    try {
      const response = await fetch(`http://localhost:5000/api/messages/car-inquiries/${carId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCarInquiries(data.data.inquiries || []);
      } else {
        console.error('Failed to fetch inquiries:', data.message);
        setCarInquiries([]);
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      setCarInquiries([]);
    } finally {
      setLoadingInquiries(false);
    }
  };

  // Open car inquiries modal
  const handleViewCarInquiries = (carId: string) => {
    setViewingInquiriesCarId(carId);
    fetchCarInquiries(carId);
  };

  const handleSubmitCar = async (e) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // Check if at least one image is provided (uploaded or URL)
    if (!carForm.main_image_url && uploadedCarImages.length === 0) {
      setCarSubmitMessage('Please provide at least one image (upload or URL)');
      return;
    }
    // Validate required fields
    if (!carForm.make || !carForm.model || !carForm.year || !carForm.price_per_day || !carForm.fuel_type || !carForm.transmission || !carForm.category) {
      setCarSubmitMessage('Please fill in all required fields (fuel type, transmission, and category)');
      return;
    }
    setIsSubmittingCar(true);
    setCarSubmitMessage('');
    try {
      const dailyRate = parseFloat(carForm.price_per_day);

      // Combine uploaded images with URL if provided
      let allImages = [...uploadedCarImages];
      if (carForm.main_image_url && !allImages.includes(carForm.main_image_url)) {
        allImages.push(carForm.main_image_url);
      }

      const carData = {
        make: carForm.make,
        model: carForm.model,
        year: parseInt(carForm.year),
        location: carForm.location,
        price_per_day: dailyRate,
        category: carForm.category,
        fuelType: carForm.fuel_type,
        transmission: carForm.transmission,
        main_image_url: allImages[0], // Use first image as main
        gallery_json: JSON.stringify(allImages),
        images: allImages,
        video_url: carForm.video_url || '',
        availability_status: carForm.availability_status || 'available',
        seats: 5,
        description: carForm.description || '',
        color: carForm.color || '',
        features: carForm.features || ['Air Conditioning', 'Bluetooth']
      };

      console.log('🚗 Sending car data:', carData);
      console.log('🔑 Token:', token ? 'Present' : 'Missing');

      await carsAPI.addCar(carData, token);
      setCarSubmitMessage('🎉 Car listed successfully! It will appear in our catalog shortly.');
      // Reset form to initial state with all new fields
      setCarForm({
        make: '',
        model: '',
        year: '',
        color: '',
        price_per_day: '',
        location: '',
        description: '',
        features: [],
        main_image_url: '',
        video_url: '',
        fuel_type: '',
        transmission: '',
        category: '',
        availability_status: 'available'
      });
      setUploadedCarImages([]);
    } catch (error) {
      setCarSubmitMessage(`❌ Error: ${error.message}`);
      console.error('Add car error:', error);
    } finally {
      setIsSubmittingCar(false);
    }
  };

  // Contact form handlers
  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitContact = async (e: React.FormEvent) => {
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
  const handleOpenChat = (car: any) => {
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

  const handleCustomerSelect = (customer) => {
    console.log('👤 Selected customer for chat:', customer);
    // Add customer info to selected car
    const carWithCustomer = {
      ...selectedCar,
      customerId: customer.id,
      customerName: customer.name
    };
    setSelectedCar(carWithCustomer);
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

    // Vehicle type filter - check vehicle_type field for vehicle type filtering
    const vehicleTypes = ['car', 'motorcycle', 'bicycle', 'van', 'truck', 'suv', 'bus'];
    const isVehicleTypeFilter = vehicleTypes.includes(selectedCategory);

    const matchesCategory = selectedCategory === 'all' ||
      (isVehicleTypeFilter
        ? (car.vehicle_type?.toLowerCase() === selectedCategory.toLowerCase() ||
          (!car.vehicle_type && selectedCategory === 'car')) // Default to car if vehicle_type not set
        : car.category === selectedCategory);

    // Price range filter - handle both price and price_per_day properties
    const carPrice = car.price || car.price_per_day || 0;
    const matchesPrice = carPrice >= priceRange[0] && carPrice <= priceRange[1];

    // Transmission filter - check both specs object and direct property
    const carTransmission = car.specs?.transmission || car.transmission || 'Automatic';
    const matchesTransmission = transmission === 'all' ||
      (carTransmission.toLowerCase() === transmission.toLowerCase());

    // Fuel type filter - check both specs object and direct property
    const carFuelType = car.specs?.fuelType || car.fuel || 'Petrol';
    const matchesFuelType = fuelType === 'all' ||
      (carFuelType.toLowerCase() === fuelType.toLowerCase());

    // Rating filter - handle undefined ratings
    const carRating = car.rating || 0;
    const matchesRating = carRating >= minRating;

    // Features filter (all selected features must match)
    const matchesFeatures = Object.entries(features).every(([feature, isSelected]) => {
      if (!isSelected) return true; // Skip unselected features
      const carFeatures = Array.isArray(car.features) ? car.features :
        (typeof car.features === 'string' ? JSON.parse(car.features || '[]') : []);
      return carFeatures.includes(feature) || car.amenities?.includes(feature);
    });

    return matchesSearch && matchesCategory && matchesPrice &&
      matchesTransmission && matchesFuelType && matchesRating && matchesFeatures;
  });

  // Enhanced Navigation Component with Auth
  const Navigation = () => {
    const [showServicesMenu, setShowServicesMenu] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showVehiclesMenu, setShowVehiclesMenu] = useState(false);

    const vehicleTypes = [
      { value: 'all', label: 'All Vehicles', icon: '🚗' },
      { value: 'car', label: 'Cars', icon: '🚗' },
      { value: 'motorcycle', label: 'Motorcycles', icon: '🏍️' },
      { value: 'bicycle', label: 'Bicycles', icon: '🚴' },
      { value: 'van', label: 'Vans', icon: '🚐' },
      { value: 'truck', label: 'Trucks', icon: '🚛' },
      { value: 'suv', label: 'SUVs', icon: '🚙' },
      { value: 'bus', label: 'Buses', icon: '🚌' }
    ];

    const handleVehicleTypeClick = (type: string) => {
      setSelectedCategory(type);
      setCurrentPage('cars');
      setShowVehiclesMenu(false);
    };

    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div
              className="flex items-center space-x-3 text-2xl font-black text-white cursor-pointer group"
              onClick={() => setCurrentPage('home')}
            >
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-500">
                <FaCar className="text-white text-xl" />
              </div>
              <span>Drive<span className="text-blue-400">Kenya</span></span>
            </div>

            {user && (
              <div className="hidden md:flex items-center space-x-2">
                <ScaleInteraction>
                  <button
                    onClick={() => setCurrentPage('home')}
                    className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentPage === 'home'
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    Home
                  </button>
                </ScaleInteraction>

                <div className="relative">
                  <ScaleInteraction>
                    <button
                      onClick={() => setShowVehiclesMenu(!showVehiclesMenu)}
                      className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center transition-all ${currentPage === 'cars'
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      Vehicles
                      <span className="ml-2 text-[8px]">▼</span>
                    </button>
                  </ScaleInteraction>

                  {showVehiclesMenu && (
                    <div className="absolute top-full mt-4 right-0 bg-gray-900/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl py-4 min-w-[220px] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="px-6 py-2 border-b border-white/5 mb-2">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Select Type</span>
                      </div>
                      {vehicleTypes.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => handleVehicleTypeClick(type.value)}
                          className="w-full px-6 py-3 text-left text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center group"
                        >
                          <span className="mr-4 text-xl group-hover:scale-125 transition-transform">{type.icon}</span>
                          <span className="text-xs font-black uppercase tracking-widest">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <ScaleInteraction>
                    <button
                      onClick={() => setShowServicesMenu(!showServicesMenu)}
                      className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center transition-all ${['listcar', 'bookings', 'mycars'].includes(currentPage)
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      {t('nav.services', 'Services')}
                      <span className="ml-2 text-[8px]">▼</span>
                    </button>
                  </ScaleInteraction>

                  {showServicesMenu && (
                    <div className="absolute top-full mt-4 right-0 bg-gray-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl py-6 min-w-[240px] z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                      <button
                        onClick={() => { setCurrentPage('listcar'); setShowServicesMenu(false); }}
                        className="w-full px-8 py-4 text-left text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center group"
                      >
                        <span className="mr-4 text-blue-400 group-hover:scale-125 transition-transform">➕</span>
                        <span className="text-xs font-black uppercase tracking-widest">List Vehicle</span>
                      </button>
                      <button
                        onClick={() => { setCurrentPage('bookings'); setShowServicesMenu(false); }}
                        className="w-full px-8 py-4 text-left text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center group"
                      >
                        <span className="mr-4 text-purple-400 group-hover:scale-125 transition-transform">📋</span>
                        <span className="text-xs font-black uppercase tracking-widest">Bookings</span>
                      </button>
                      <button
                        onClick={() => { setCurrentPage('mycars'); setShowServicesMenu(false); }}
                        className="w-full px-8 py-4 text-left text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center group"
                      >
                        <span className="mr-4 text-emerald-400 group-hover:scale-125 transition-transform">🚙</span>
                        <span className="text-xs font-black uppercase tracking-widest">My Vehicles</span>
                      </button>
                      <button
                        onClick={() => { setCurrentPage('pricing'); setShowServicesMenu(false); }}
                        className="w-full px-8 py-4 text-left text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center group border-t border-white/5 mt-2"
                      >
                        <span className="mr-4 text-amber-400 group-hover:scale-125 transition-transform">📊</span>
                        <span className="text-xs font-black uppercase tracking-widest">Pricing Calculator</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <ScaleInteraction>
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center transition-all ${['about', 'contact'].includes(currentPage)
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      {t('nav.more', 'More')}
                      <span className="ml-2 text-[8px]">▼</span>
                    </button>
                  </ScaleInteraction>

                  {showMoreMenu && (
                    <div className="absolute top-full mt-4 right-0 bg-gray-900/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl py-4 min-w-[180px] z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                      <button
                        onClick={() => { setCurrentPage('about'); setShowMoreMenu(false); }}
                        className="w-full px-8 py-4 text-left text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center group"
                      >
                        <span className="mr-4 text-xl group-hover:scale-125 transition-transform">ℹ️</span>
                        <span className="text-xs font-black uppercase tracking-widest">About</span>
                      </button>
                      <button
                        onClick={() => { setCurrentPage('contact'); setShowMoreMenu(false); }}
                        className="w-full px-8 py-4 text-left text-white/70 hover:text-white hover:bg-white/5 transition-all flex items-center group"
                      >
                        <span className="mr-4 text-xl group-hover:scale-125 transition-transform">📞</span>
                        <span className="text-xs font-black uppercase tracking-widest">Contact</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <ScaleInteraction>
                    <button
                      onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                      className="relative text-white/70 hover:text-white p-3 bg-white/5 rounded-2xl border border-white/5 group"
                      title="Notifications"
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform block">🔔</span>
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                    </button>
                  </ScaleInteraction>

                  <ScaleInteraction>
                    <button
                      onClick={() => setShowProfileSettings(true)}
                      className="flex items-center space-x-4 bg-white/5 hover:bg-white/10 p-2 pr-6 rounded-[1.5rem] border border-white/5 group transition-all"
                    >
                      <div className="relative">
                        {user.profile_photo ? (
                          <img
                            src={user.profile_photo}
                            alt="Profile"
                            className="w-10 h-10 rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black">
                            {user.name?.charAt(0) || user.first_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                      </div>
                      <div className="text-left hidden lg:block">
                        <div className="text-white text-[10px] font-black uppercase tracking-widest mb-0.5">
                          {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                        </div>
                        <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                          {user.role?.toUpperCase()}
                        </div>
                      </div>
                    </button>
                  </ScaleInteraction>

                  <button
                    onClick={handleLogout}
                    className="text-white/40 hover:text-red-400 font-black text-[10px] uppercase tracking-widest transition-colors px-4 py-2 border border-white/5 rounded-xl hover:bg-red-500/5"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <ScaleInteraction>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-blue-500 hover:text-white shadow-2xl shadow-blue-500/10"
                  >
                    Sign In
                  </button>
                </ScaleInteraction>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  };

  // Google Login hook for both sign-up and sign-in
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setAuthLoading(true);
        console.log('Google Login Success:', tokenResponse);

        // Extract the access token
        const accessToken = tokenResponse.access_token;

        // Send to backend
        console.log('📡 Sending Google token to backend at http://localhost:5000/api/auth/google-signup');
        const response = await fetch('http://localhost:5000/api/auth/google-signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleToken: accessToken,
            role: 'customer', // Default role - can be adjusted if needed
            accountType: 'customer'
          })
        });

        console.log('📬 Backend response status:', response.status);

        const data = await response.json();
        console.log('📦 [DEBUG] Backend response data:', JSON.stringify(data));

        if (data.success) {
          console.log('✅ [DEBUG] Auth successful, setting state...');
          showToast('Successfully authenticated with Google!', 'success');
          if (data.user && data.token) {
            console.log('👤 [DEBUG] Setting user:', data.user.email);
            setUser(data.user);
            console.log('🔑 [DEBUG] Setting token');
            setToken(data.token);

            // Persist to localStorage
            authStorage.setUser(data.user);
            authStorage.setToken(data.token);
            console.log('💾 [DEBUG] Persisted to localStorage');
          }
          setShowAuthModal(false);
        } else {
          console.warn('⚠️ [DEBUG] Auth failed:', data.message);
          showToast(data.message || 'Google Auth failed', 'error');
        }
      } catch (error) {
        console.error('Google Backend integration error:', error);
        showToast('Integration error. Please try regular login.', 'error');
      } finally {
        setAuthLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Error:', error);
      showToast('Google login failed. Please try again.', 'error');
    }
  });

  // Google Sign-Up handler
  const handleGoogleSignUp = () => {
    loginWithGoogle();
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
    // Registration password state for the PasswordStrength component
    const [regPassword, setRegPassword] = useState('');

    if (!showAuthModal) return null;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleAuth(formData);
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500"
          onClick={() => setShowAuthModal(false)}
        ></div>

        <div className="relative bg-gray-900/90 backdrop-blur-2xl border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 fade-in slide-in-from-bottom-10 duration-700">
          {/* Decorative Gradient Blob */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

          <div className="p-10 md:p-14 relative z-10">
            <div className="flex justify-between items-start mb-12">
              <div className="animate-in slide-in-from-left-4 duration-500">
                <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">
                  {authMode === 'login' ? 'Welcome Back' : 'Join the Elite'}
                </h2>
                <p className="text-white/40 text-sm font-medium">
                  {authMode === 'login' ? 'Continue your premium journey' : 'Start earning or exploring today'}
                </p>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-white/20 hover:text-white transition-colors text-4xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Path Selection */}
            <div className="mb-10 animate-in slide-in-from-up-4 duration-500">
              <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Select Your Path</p>
              <div className="grid grid-cols-2 gap-4">
                <ScaleInteraction>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'customer' })}
                    className={`relative p-5 rounded-[1.5rem] border transition-all overflow-hidden group w-full text-center ${formData.role === 'customer'
                      ? 'bg-blue-600 border-blue-400 text-white shadow-2xl shadow-blue-600/20'
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                  >
                    <div className="text-2xl mb-2 group-hover:scale-125 transition-transform">🚗</div>
                    <div className="font-black text-xs uppercase tracking-widest">
                      {authMode === 'login' ? 'Customer' : 'Rent Cars'}
                    </div>
                  </button>
                </ScaleInteraction>
                <ScaleInteraction>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'owner' })}
                    className={`relative p-5 rounded-[1.5rem] border transition-all overflow-hidden group w-full text-center ${formData.role === 'owner'
                      ? 'bg-purple-600 border-purple-400 text-white shadow-2xl shadow-purple-600/20'
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                  >
                    <div className="text-2xl mb-2 group-hover:scale-125 transition-transform">🔑</div>
                    <div className="font-black text-xs uppercase tracking-widest">
                      {authMode === 'login' ? 'Owner' : 'List Cars'}
                    </div>
                  </button>
                </ScaleInteraction>
              </div>
            </div>

            {/* Google Social */}
            {authMode === 'register' && (
              <div className="mb-10 animate-in fade-in duration-700 delay-300">
                <ScaleInteraction>
                  <button
                    type="button"
                    onClick={() => handleGoogleSignUp()}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-4 border border-white/10 shadow-xl"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Connect with Google</span>
                  </button>
                </ScaleInteraction>
                <div className="flex items-center my-8">
                  <div className="flex-1 border-t border-white/5"></div>
                  <span className="px-4 text-white/20 text-[10px] font-black uppercase tracking-widest">or email</span>
                  <div className="flex-1 border-t border-white/5"></div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-left-4 duration-500">
                  <input
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                    required
                  />
                  <input
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                    required
                  />
                </div>
              )}

              <div className="animate-in slide-in-from-left-4 duration-500 delay-100">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                  required
                />
              </div>

              {authMode === 'register' ? (
                <div className="animate-in slide-in-from-left-4 duration-500 delay-200">
                  <input
                    type="password"
                    placeholder="Premium Password"
                    value={regPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setRegPassword(e.target.value);
                      setFormData(prev => ({ ...prev, password: e.target.value }));
                    }}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                    required
                  />
                  <div className="mt-4 px-2">
                    <PasswordStrength password={regPassword} />
                  </div>
                </div>
              ) : (
                <div className="animate-in slide-in-from-left-4 duration-500 delay-200">
                  <input
                    type="password"
                    placeholder="Secure Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
                    required
                  />
                </div>
              )}

              <div className="pt-6">
                <ScaleInteraction>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-white text-slate-900 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-blue-400 hover:text-white shadow-[0_20px_40px_rgba(0,0,0,0.3)] disabled:opacity-50"
                  >
                    {authLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                        <span>Authenticating...</span>
                      </div>
                    ) : authMode === 'login' ? 'Sign In Now' : 'Create My Identity'}
                  </button>
                </ScaleInteraction>
              </div>
            </form>

            <div className="mt-12 flex flex-col items-center space-y-6">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
              >
                {authMode === 'login' ? "New to the platform? Join now" : "Member already? Sign in"}
              </button>

              {authMode === 'login' && (
                <button
                  onClick={() => { setShowAuthModal(false); setShowForgotPassword(true); }}
                  className="text-blue-400/40 hover:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                >
                  Forgot Password?
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Forgot Password Modal
  const ForgotPasswordModal = () => {
    if (!showForgotPassword) return null;

    const handleResetRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthLoading(true);
      setResetMessage('');
      try {
        const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetEmail })
        });
        const data = await response.json();
        if (data.success) {
          setResetMessage('✅ Password reset link sent to your email! Check your inbox.');
        } else {
          setResetMessage('❌ ' + (data.message || 'Failed to send reset link'));
        }
      } catch (error: any) {
        setResetMessage('❌ Error: ' + error.message);
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl max-w-md w-full p-8 relative">
          <button
            onClick={() => {
              setShowForgotPassword(false);
              setResetEmail('');
              setResetMessage('');
            }}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
          <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
          <p className="text-white/70 mb-6">Enter your email and we'll send you a reset link</p>

          {resetMessage && (
            <div className={`mb-4 p-3 rounded-lg ${resetMessage.includes('✅') ? 'bg-green-500/20 border border-green-400/30 text-green-300' : 'bg-red-500/20 border border-red-400/30 text-red-300'}`}>
              {resetMessage}
            </div>
          )}

          <form onSubmit={handleResetRequest} className="space-y-4">
            <input
              type="email"
              placeholder="Your Email Address"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-all"
            >
              {authLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setShowAuthModal(true);
              }}
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Reset Password Modal
  const ResetPasswordModal = () => {
    if (!showResetPassword) return null;

    const handlePasswordReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
        setResetMessage('❌ Passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        setResetMessage('❌ Password must be at least 6 characters long');
        return;
      }

      setAuthLoading(true);
      setResetMessage('');
      try {
        const response = await fetch('http://localhost:5000/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, newPassword })
        });
        const data = await response.json();
        if (data.success) {
          setResetMessage('✅ ' + data.message);
          setTimeout(() => {
            setShowResetPassword(false);
            setShowAuthModal(true);
            setNewPassword('');
            setConfirmPassword('');
            setResetToken('');
          }, 2000);
        } else {
          setResetMessage('❌ ' + (data.message || 'Failed to reset password'));
        }
      } catch (error: any) {
        setResetMessage('❌ Error: ' + error.message);
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl max-w-md w-full p-8 relative">
          <button
            onClick={() => {
              setShowResetPassword(false);
              setNewPassword('');
              setConfirmPassword('');
              setResetMessage('');
            }}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
          <h2 className="text-3xl font-bold text-white mb-2">Set New Password</h2>
          <p className="text-white/70 mb-6">Enter your new password below</p>

          {resetMessage && (
            <div className={`mb-4 p-3 rounded-lg ${resetMessage.includes('✅') ? 'bg-green-500/20 border border-green-400/30 text-green-300' : 'bg-red-500/20 border border-red-400/30 text-red-300'}`}>
              {resetMessage}
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <div className="mt-2">
                <PasswordStrength password={newPassword} />
              </div>
            </div>
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-all"
            >
              {authLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
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
          pricePerDay: selectedCar.price_per_day || selectedCar.price || selectedCar.pricePerDay || 3000 // Map price to pricePerDay for consistency
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
      <section className="relative h-screen flex items-center justify-center text-center bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-black/30"></div>

        {/* Animated Background Blobs */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <AnimatedSection delay={0.2}>
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-6">
                <span className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
                <span className="text-white/80 text-sm">
                  {apiConnected ? 'Live Database Connected' : 'Demo Mode'}  {cars.length} Vehicles Available
                </span>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.4}>
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight">
              Drive<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Kenya</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.6}>
            <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed max-w-3xl mx-auto">
              Premium vehicle rentals across Kenya - Cars, Motorcycles, Bicycles, Vans, Trucks & more with real-time booking.
            </p>
          </AnimatedSection>

          {/* Role-based Welcome Message */}
          {user && (
            <AnimatedSection delay={0.7}>
              <div className="mb-8">
                <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-blue-400/30 rounded-full px-6 py-3">
                  <span className="text-2xl">
                    {user.role === 'host' ? '🔑' : user.role === 'admin' ? '👑' : '🚗'}
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
            </AnimatedSection>
          )}

          {loading && (
            <div className="mb-8">
              <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="text-white">Loading cars...</span>
              </div>
            </div>
          )}

          <AnimatedSection delay={0.8}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <ScaleInteraction>
                <button
                  onClick={() => setCurrentPage('cars')}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-5 rounded-full font-bold text-lg transition-all shadow-2xl hover:shadow-blue-500/25"
                >
                  🚗 Browse {cars.length} Vehicles
                </button>
              </ScaleInteraction>
              {user ? (
                <div className="flex flex-wrap gap-4 justify-center">
                  {user.role === 'host' && (
                    <ScaleInteraction>
                      <button
                        onClick={() => setCurrentPage('owner-dashboard')}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-4 rounded-full font-bold transition-all backdrop-blur-sm"
                      >
                        📊 Dashboard
                      </button>
                    </ScaleInteraction>
                  )}
                  <ScaleInteraction>
                    <button
                      onClick={() => setCurrentPage('pricing')}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-full font-bold transition-all shadow-lg"
                    >
                      💰 Pricing Calculator
                    </button>
                  </ScaleInteraction>
                </div>
              ) : (
                <ScaleInteraction>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/30 text-white px-10 py-5 rounded-full font-bold text-lg transition-all backdrop-blur-sm"
                  >
                    Sign In to Book
                  </button>
                </ScaleInteraction>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>
      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-r from-slate-950 to-blue-950 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Cars Available', value: `${cars.length}+` },
              { label: user ? 'Your Bookings' : 'Active Bookings', value: userBookings.length },
              { label: 'Support', value: '24/7' },
              { label: 'Average Rating', value: '4.9' }
            ].map((stat, idx) => (
              <StaggerItem key={idx}>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-10 hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 group">
                  <div className="text-5xl font-black text-white mb-3 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent group-hover:scale-110 transition-transform">{stat.value}</div>
                  <div className="text-white/40 font-bold uppercase tracking-widest text-[10px]">{stat.label}</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
      {/* Featured Cars */}
      <section className="py-24 bg-gradient-to-br from-blue-900 via-purple-900 to-slate-950">
        <div className="max-w-6xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">Featured Fleet</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
            <p className="text-xl text-white/50 mt-6 font-medium">Discover our most premium vehicles curated for you</p>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {filteredCars.slice(0, 3).map(car => (
              <StaggerItem key={car.id}>
                <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden hover:bg-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10">
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={car.image}
                      alt={car.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center space-x-2">
                      <span className="text-yellow-400 text-xs">★</span>
                      <span className="text-white font-black text-sm">{car.rating?.toFixed(1) || '4.8'}</span>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-black text-white mb-2 group-hover:text-blue-400 transition-colors">{car.name}</h3>
                    <p className="text-white/40 mb-6 font-medium flex items-center">
                      <FaMapMarkerAlt className="mr-2 text-blue-500/50" /> {car.location}
                    </p>
                    <div className="flex justify-between items-center pt-6 border-t border-white/5">
                      <div>
                        <div className="text-3xl font-black text-white">KSh {car.price?.toLocaleString()}</div>
                        <div className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-1">per day</div>
                      </div>
                      <ScaleInteraction>
                        <button
                          onClick={() => {
                            setSelectedCar(car);
                            if (user) setShowBookingModal(true);
                            else setShowAuthModal(true);
                          }}
                          className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black text-sm transition-all hover:bg-blue-400 hover:text-white"
                        >
                          Details
                        </button>
                      </ScaleInteraction>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </div>
  );

  // Enhanced Cars Page with Search and Map View
  const renderCars = () => {
    // Show loading state while data is being fetched
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-xl">Loading cars...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Available {getVehicleTypeLabel(selectedCategory, true, true)}
            </h1>
            <p className="text-xl text-white/70">
              {apiConnected ? 'Real-time data from our database' : 'Demo data'}  {filteredCars?.length || 0} of {cars?.length || 0} {getVehicleTypeLabel(selectedCategory, true)} shown
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
                    : 'text-white hover:bg-white/10'
                    }`}
                >
                  🏷️ Grid View
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${viewMode === 'map'
                    ? 'bg-white text-slate-900'
                    : 'text-white hover:bg-white/10'
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
                {/* Show Transmission only for motorized vehicles */}
                {selectedCategory !== 'bicycle' && (
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
                )}
                {/* Show Fuel Type only for motorized vehicles */}
                {selectedCategory !== 'bicycle' && (
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
                )}
                <div className="flex-1">
                  <label className="block text-white/70 text-sm font-medium mb-2">🔧 Features</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(features)
                      .filter((feature) => {
                        // Filter features based on vehicle type
                        if (selectedCategory === 'bicycle') {
                          // Bicycles only have basic features
                          return ['gps'].includes(feature);
                        }
                        if (selectedCategory === 'motorcycle') {
                          // Motorcycles don't have sunroof, leather seats, parking sensors
                          return !['sunroof', 'leatherSeats', 'parkingSensors'].includes(feature);
                        }
                        if (selectedCategory === 'truck' || selectedCategory === 'bus') {
                          // Trucks/buses don't have sunroof typically
                          return !['sunroof'].includes(feature);
                        }
                        // Cars, SUVs, Vans show all features
                        return true;
                      })
                      .map((feature) => (
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
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={() => setCurrentPage('home')}
              className="flex items-center text-white/80 hover:text-white transition-colors mb-6"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Home
            </button>
          </div>
          {/* View Mode Toggle */}
          <div className="mb-8">
            <AnimatedSection delay={0.2} className="mb-8">
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
            </AnimatedSection>
          </div>
          {/* Conditional Content Based on View Mode and Car Count */}
          {filteredCars.length === 0 && !loading ? ( // Render the "No vehicles found" message if no vehicles match filters
            <div className="text-center py-20">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 max-w-lg mx-auto">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  No {getVehicleTypeLabel(selectedCategory, true)} found
                </h3>
                <p className="text-white/70 mb-6">Try adjusting your filters or search terms</p>
                <button
                  onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setPriceRange([0, 15000]); }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-full font-semibold transition-all"
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
                    setViewingCar(car);
                    window.scrollTo(0, 0);
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
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
              {filteredCars.map(car => (
                <StaggerItem key={car.id}>
                  <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10">
                    <div className="relative">
                      <img src={car.image} alt={car.name} className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-2xl flex items-center border border-white/5">
                        <span className="text-yellow-400">★</span>
                        <span className="text-white text-xs font-black ml-1">{car.rating?.toFixed(1) || '4.8'}</span>
                      </div>
                      {car.available && (
                        <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                          InstaBook
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-black text-white mb-2 group-hover:text-blue-400 transition-colors">{car.name}</h3>
                      <div className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-6 flex flex-wrap gap-x-4 gap-y-2">
                        <span>📍 {car.location}</span>
                        <span>👥 {car.seats} SEATS</span>
                        <span>⛽ {car.fuel?.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center py-4 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-white/30 text-[9px] font-black uppercase">Start From</span>
                          <span className="text-2xl font-black text-white">KSh {car.price?.toLocaleString()}</span>
                        </div>
                        <div className="flex space-x-2">
                          {user && (
                            <ScaleInteraction>
                              <button
                                onClick={() => handleOpenChat(car)}
                                className="bg-white/5 hover:bg-white/10 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all border border-white/10"
                              >
                                💬
                              </button>
                            </ScaleInteraction>
                          )}
                          <ScaleInteraction>
                            <button
                              onClick={() => {
                                setSelectedCar(car);
                                setViewingCar(car);
                                if (user) setShowBookingModal(true);
                                else setShowAuthModal(true);
                              }}
                              className="bg-white text-slate-900 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-tighter transition-all hover:bg-blue-400 hover:text-white"
                            >
                              Reserve
                            </button>
                          </ScaleInteraction>
                        </div>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </div>
    );
  };

  // Enhanced Bookings Page
  const renderBookings = () => {
    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">My Bookings</h1>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h3 className="text-2xl font-bold text-white mb-4">Sign In Required</h3>
              <p className="text-white/70 mb-6">Please sign in to view your bookings</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (userBookings.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">My Bookings</h1>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">📆</div>
              <h3 className="text-2xl font-bold text-white mb-4">No Bookings Yet</h3>
              <p className="text-white/70 mb-6">You haven't made any bookings yet. Start by browsing our available vehicles!</p>
              <button
                onClick={() => setCurrentPage('cars')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
              >
                Browse Cars
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">My Bookings</h1>
          <div className="space-y-6">
            {userBookings.map((booking) => (
              <div key={booking.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{booking.car?.name || 'Car Rental'}</h3>
                    <p className="text-white/70">
                      {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-white/60 text-sm mt-1">
                      Status: <span className={`font-medium ${booking.status === 'confirmed' ? 'text-green-400' : booking.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {booking.status}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">KSh {booking.totalPrice?.toLocaleString()}</div>
                    <p className="text-white/60 text-sm">Total</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <div className="text-white/70 text-sm">
                      Booking ID: {booking.id}
                    </div>
                    <div className="flex space-x-2">
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel this booking?')) {
                              bookingsAPI.cancelBooking(booking.id, token);
                              loadUserBookings();
                              showToast('Booking cancellation initiated.', 'info');
                            } else {
                              showToast('Booking cancellation aborted.', 'info');
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
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // My Vehicles Page - Show vehicles owned by current user
  const renderMyCars = () => {
    // Handle case when user is not logged in
    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">My Vehicles</h1>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h3 className="text-2xl font-bold text-white mb-4">Sign In Required</h3>
              <p className="text-white/70 mb-6">Please sign in to view your vehicles</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Handle loading state
    if (myCarsLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">My Vehicles</h1>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-2xl font-bold text-white mb-4">Loading Your Vehicles...</h3>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">My Vehicles</h1>
          {myCars.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🚗</div>
              <h3 className="text-2xl font-bold text-white mb-4">No vehicles listed yet</h3>
              <p className="text-white/70 mb-6">Start earning by listing your first vehicle!</p>
              <button
                onClick={() => setCurrentPage('listcar')}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
              >
                List Your Vehicle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {myCars.map((car) => (
                <div key={car.id} className="bg-black/40 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                  <div className="relative">
                    <img
                      src={car.image || '/default-car.jpg'}
                      alt={car.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${car.availability_status === 'available' ? 'bg-green-500 text-white' :
                        car.availability_status === 'booked' ? 'bg-blue-500 text-white' :
                          'bg-orange-500 text-white'
                        }`}>
                        {car.availability_status || 'Available'}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-white">{car.name}</h3>
                    <p className="text-white/60 mb-2">{car.year} • {car.location}</p>
                    <p className="text-white/70 mb-4 text-sm line-clamp-2">{car.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-white">KSh {car.price?.toLocaleString()}</div>
                        <div className="text-white/60 text-sm">per day</div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-white">{car.rating || 4.8}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => setManagingCarId(car.id)}
                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <span className="mr-2">📝</span>
                        Manage Car
                      </button>
                      <button
                        onClick={() => handleViewCarInquiries(car.id)}
                        className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2 rounded-lg font-semibold transition-all"
                      >
                        💬 View Messages
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
  };

  // List Car Form - Enhanced with proper backend integration
  const renderListCar = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 text-center">List Your Vehicle</h1>
        {!user ? (
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h3 className="text-2xl font-bold text-white mb-4">Sign In Required</h3>
            <p className="text-white/70 mb-6">Please sign in to list your vehicle for rental</p>
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
              <div className={`mb-6 p-4 rounded-lg ${carSubmitMessage.includes('Error') ? 'bg-red-500/20 border border-red-400/30 text-red-300' :
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
                  placeholder="Vehicle Make (e.g., Toyota, Yamaha) *"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  name="model"
                  value={carForm.model}
                  onChange={handleCarFormChange}
                  placeholder="Vehicle Model *"
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
                  name="license_plate"
                  value={carForm.license_plate}
                  onChange={handleCarFormChange}
                  placeholder="License Plate (e.g., KAA 123X) *"
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
                <select
                  name="vehicle_type"
                  value={carForm.vehicle_type}
                  onChange={handleCarFormChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" className="bg-gray-900">Vehicle Type *</option>
                  <option value="car" className="bg-gray-900">🚗 Car</option>
                  <option value="suv" className="bg-gray-900">🚙 SUV</option>
                  <option value="van" className="bg-gray-900">🚐 Van</option>
                  <option value="truck" className="bg-gray-900">🚚 Truck/Lorry</option>
                  <option value="motorcycle" className="bg-gray-900">🏍️ Motorcycle/Bike</option>
                  <option value="bicycle" className="bg-gray-900">🚲 Bicycle</option>
                  <option value="bus" className="bg-gray-900">🚌 Bus</option>
                  <option value="trailer" className="bg-gray-900">🚛 Trailer</option>
                </select>
                <select
                  name="fuel_type"
                  value={carForm.fuel_type}
                  onChange={handleCarFormChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" className="bg-gray-900">Fuel Type *</option>
                  <option value="petrol" className="bg-gray-900">Petrol</option>
                  <option value="diesel" className="bg-gray-900">Diesel</option>
                  <option value="hybrid" className="bg-gray-900">Hybrid</option>
                  <option value="electric" className="bg-gray-900">Electric</option>
                  <option value="none" className="bg-gray-900">None (Bicycle/Manual)</option>
                </select>
                <select
                  name="transmission"
                  value={carForm.transmission}
                  onChange={handleCarFormChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" className="bg-gray-900">Transmission *</option>
                  <option value="automatic" className="bg-gray-900">Automatic</option>
                  <option value="manual" className="bg-gray-900">Manual</option>
                </select>
                <select
                  name="category"
                  value={carForm.category}
                  onChange={handleCarFormChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" className="bg-gray-900">Category *</option>
                  <option value="economy" className="bg-gray-900">Economy</option>
                  <option value="sedan" className="bg-gray-900">Sedan</option>
                  <option value="suv" className="bg-gray-900">SUV</option>
                  <option value="hatchback" className="bg-gray-900">Hatchback</option>
                  <option value="luxury" className="bg-gray-900">Luxury</option>
                  <option value="van" className="bg-gray-900">Van</option>
                  <option value="convertible" className="bg-gray-900">Convertible</option>
                </select>
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
                  placeholder="Location (e.g., Nairobi CBD) *"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">📸 Car Images (Required - at least 1)</label>

                  {/* File Upload Section */}
                  <div className="mb-4">
                    <label className="block mb-2">
                      <div className="flex items-center justify-center w-full px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border-2 border-blue-500/50 border-dashed rounded-lg cursor-pointer transition-colors">
                        <div className="text-center">
                          <div className="text-2xl mb-1">📷</div>
                          <p className="text-white/80 text-sm font-medium">Click to upload images</p>
                          <p className="text-white/50 text-xs">Upload multiple photos (up to 20)</p>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;

                          setIsUploadingImages(true);
                          try {
                            const formData = new FormData();
                            Array.from(files).forEach(file => {
                              formData.append('images', file);
                            });

                            const response = await fetch('http://localhost:5000/api/cars/upload-images', {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`
                              },
                              body: formData
                            });

                            if (response.ok) {
                              const data = await response.json();
                              const newImages = data.data.imageUrls.map(url => `http://localhost:5000${url}`);
                              setUploadedCarImages(prev => [...prev, ...newImages]);
                              setCarSubmitMessage(`✅ ${files.length} image(s) uploaded successfully!`);
                              setTimeout(() => setCarSubmitMessage(''), 3000);
                            } else {
                              setCarSubmitMessage('❌ Failed to upload images');
                            }
                          } catch (error: any) {
                            setCarSubmitMessage('❌ Error uploading images');
                          } finally {
                            setIsUploadingImages(false);
                          }
                        }}
                      />
                    </label>
                    {isUploadingImages && (
                      <div className="text-center text-white/70 py-2">
                        <div className="animate-spin inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div>
                        <span className="ml-2">Uploading...</span>
                      </div>
                    )}
                  </div>

                  {/* Display Uploaded Images */}
                  {uploadedCarImages.length > 0 && (
                    <div className="mb-4">
                      <p className="text-white/70 text-sm mb-2">Uploaded Images ({uploadedCarImages.length}):</p>
                      <div className="grid grid-cols-3 gap-2">
                        {uploadedCarImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <img src={url} alt={`Upload ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                            <button
                              type="button"
                              onClick={() => setUploadedCarImages(prev => prev.filter((_, i) => i !== index))}
                              className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* OR Divider */}
                  <div className="flex items-center my-4">
                    <div className="flex-1 border-t border-white/20"></div>
                    <span className="px-3 text-white/50 text-sm">OR</span>
                    <div className="flex-1 border-t border-white/20"></div>
                  </div>

                  {/* URL Input Section */}
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Paste Image URL</label>
                    <input
                      name="main_image_url"
                      value={carForm.main_image_url}
                      onChange={handleCarFormChange}
                      placeholder="https://example.com/car-image.jpg"
                      type="url"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {carForm.main_image_url && (
                      <div className="mt-2">
                        <img
                          src={carForm.main_image_url}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">🎥 Video URL (optional)</label>
                  <input
                    name="video_url"
                    value={carForm.video_url}
                    onChange={handleCarFormChange}
                    placeholder="https://youtube.com/watch?v=... or direct video URL"
                    type="url"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-white/50 text-xs mt-1">Optional: Add a YouTube or direct video link to showcase your car</p>
                </div>
              </div>

              <textarea
                name="description"
                value={carForm.description}
                onChange={handleCarFormChange}
                placeholder="Description (optional)"
                rows={3}
                className="w-full mt-6 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>

              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                <p className="text-white/80 text-sm">
                  <strong>Note:</strong> After listing, you can manage availability status and set calendar blocks from "My Vehicles" → "Manage Vehicle"
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmittingCar}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-semibold transition-all"
              >
                {isSubmittingCar ? 'Listing Vehicle...' : 'List My Vehicle'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900 pt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 text-center">About DriveKenya</h1>
        <p className="text-white/70 text-center text-xl mb-12">Revolutionizing car rental in Kenya</p>

        {/* What is Drive Kenya */}
        <AnimatedSection>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 mb-10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl group-hover:bg-blue-600/20 transition-all duration-700"></div>
            <h2 className="text-3xl font-black text-white mb-6 flex items-center">
              <span className="mr-4 p-3 bg-blue-500 rounded-2xl">🚗</span> What is DriveKenya?
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-6 font-medium">
              DriveKenya is Kenya's premier peer-to-peer vehicle rental platform that connects vehicle owners with people who need reliable, affordable transportation. We're transforming how Kenyans access vehicles by creating a trusted marketplace where anyone can list their car, motorcycle, bicycle, van, truck, SUV, or bus.
            </p>
            <p className="text-white/40 text-lg leading-relaxed font-medium">
              From bicycles for city commutes to luxury SUVs, cargo vans to moving trucks - we offer Kenya's most diverse vehicle fleet across Nairobi and major cities.
            </p>
          </div>
        </AnimatedSection>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
          <AnimatedSection delay={0.1} className="h-full">
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 h-full">
              <h2 className="text-3xl font-black text-white mb-4 flex items-center">
                <span className="mr-4 text-blue-400">🎯</span> Our Mission
              </h2>
              <p className="text-white/70 text-lg leading-relaxed font-medium">
                To democratize car ownership benefits by enabling every Kenyan with a vehicle to earn income, while providing affordable, flexible, and convenient transportation options.
              </p>
            </div>
          </AnimatedSection>
          <AnimatedSection delay={0.3} className="h-full">
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 h-full">
              <h2 className="text-3xl font-black text-white mb-4 flex items-center">
                <span className="mr-4 text-purple-400">🌟</span> Our Vision
              </h2>
              <p className="text-white/70 text-lg leading-relaxed font-medium">
                To become East Africa's most trusted car-sharing platform, where every idle vehicle becomes an opportunity and every journey begins with confidence.
              </p>
            </div>
          </AnimatedSection>
        </div>

        {/* Who We Serve */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">👥</span> Who We Serve
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-5xl mb-4 text-center">🚙</div>
              <h3 className="text-white font-bold text-xl mb-3 text-center">Vehicle Owners</h3>
              <p className="text-white/70 leading-relaxed">
                Turn your idle vehicle into a revenue stream. List your car, motorcycle, bicycle, van, truck, SUV, or bus - set your price, and earn money while helping others access reliable transportation. Perfect for anyone looking to offset vehicle maintenance costs or generate passive income.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-5xl mb-4 text-center">🧳</div>
              <h3 className="text-white font-bold text-xl mb-3 text-center">Renters</h3>
              <p className="text-white/70 leading-relaxed">
                Access quality vehicles without the burden of ownership. Whether you need a car for a road trip, business meeting, airport pickup, or daily commute, find the perfect vehicle at competitive rates with flexible rental periods.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-5xl mb-4 text-center">💼</div>
              <h3 className="text-white font-bold text-xl mb-3 text-center">Businesses</h3>
              <p className="text-white/70 leading-relaxed">
                Scale your transportation needs without heavy capital investment. Access a fleet of vehicles for corporate events, employee transport, or business operations with flexible terms and transparent pricing.
              </p>
            </div>
          </div>
        </div>

        {/* Problem & Solution */}
        <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">⚡</span> The Problem We Solve
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-red-300 font-semibold text-xl mb-3">🚫 Traditional Challenges:</h3>
              <ul className="text-white/80 space-y-2 text-lg">
                <li>• Expensive traditional car rental companies</li>
                <li>• Limited vehicle availability in many areas</li>
                <li>• Cars sitting idle and depreciating</li>
                <li>• Lengthy paperwork and rigid terms</li>
                <li>• High upfront costs for car ownership</li>
                <li>• Lack of trust and transparency</li>
              </ul>
            </div>
            <div>
              <h3 className="text-green-300 font-semibold text-xl mb-3">✅ Our Solution:</h3>
              <ul className="text-white/80 space-y-2 text-lg">
                <li>• Up to 40% cheaper than traditional rentals</li>
                <li>• Vehicles available across Kenya</li>
                <li>• Owners monetize idle vehicles</li>
                <li>• Digital booking in minutes</li>
                <li>• Pay only for what you use</li>
                <li>• Verified users and secure platform</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Impact */}
        <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="mr-3">📊</span> Our Impact
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">1000+</div>
              <p className="text-white/70">Active Vehicles</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">5000+</div>
              <p className="text-white/70">Happy Renters</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">KSh 50M+</div>
              <p className="text-white/70">Earned by Owners</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">98%</div>
              <p className="text-white/70">Satisfaction Rate</p>
            </div>
          </div>
        </div>

        {/* Core Values */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-5xl mb-4">🛡️</div>
              <h3 className="text-white font-semibold text-xl mb-2">Trust & Safety</h3>
              <p className="text-white/70">All users verified, vehicles insured, and transactions secured</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">💪</div>
              <h3 className="text-white font-semibold text-xl mb-2">Empowerment</h3>
              <p className="text-white/70">Enabling financial independence for car owners</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-white font-semibold text-xl mb-2">Community</h3>
              <p className="text-white/70">Building a trusted network of responsible drivers and owners</p>
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
                <div>📧 drivekenyaorg@gmail.com</div>
                <div>📞 +254 717 052 939</div>
                <div>📍 Nairobi, Kenya</div>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-xl mb-4">Send Message</h3>
              {contactSubmitMessage && (
                <div className={`mb-4 p-3 rounded-lg ${contactSubmitMessage.includes('Error') ? 'bg-red-500/20 border border-red-400/30 text-red-300' :
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
  const handleCarSelect = (car: Car) => {
    setSelectedCar(car);
    setViewingCar(car);
    window.scrollTo(0, 0);
  };

  const handleBackToList = () => {
    setViewingCar(null);
  };

  if (viewingCar) {
    return <CarDetailView car={viewingCar} onBack={handleBackToList} />;
  }

  return (
    <div className="min-h-screen font-['Poppins'] bg-gradient-to-br from-blue-900 via-purple-800 to-slate-900">
      <Navigation />
      {currentPage === 'home' && renderHome()}
      {currentPage === 'cars' && renderCars()}
      {currentPage === 'listcar' && renderListCar()}
      {currentPage === 'bookings' && renderBookings()}
      {currentPage === 'mycars' && renderMyCars()}
      {currentPage === 'phase4' && <Phase4Dashboard />}
      {currentPage === 'about' && renderAbout()}
      {currentPage === 'contact' && renderContact()}
      {currentPage === 'owner-dashboard' && user?.role === 'host' && (
        <OwnerDashboard user={user} onLogout={handleLogout} onNavigate={setCurrentPage} />
      )}
      {currentPage === 'pricing' && <PricingCalculator onBookCar={(bookingData) => {
        setSelectedCar(bookingData.car);
        setShowBookingModal(true);
      }} />}

      <AuthModal />
      <ForgotPasswordModal />
      <ResetPasswordModal />
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

      {/* Car Inquiries Modal */}
      {showCarInquiries && selectedInquiryCar && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowCarInquiries(false)}>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Customer Inquiries</h2>
                  <p className="text-white/60 text-sm">{selectedInquiryCar.make} {selectedInquiryCar.model}</p>
                </div>
                <button
                  onClick={() => setShowCarInquiries(false)}
                  className="text-white/60 hover:text-white transition-colors text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="flex items-center space-x-2 text-sm text-white/70">
                <span>💬</span>
                <span>{carInquiries.length} customer(s) inquired about this car</span>
              </div>
            </div>

            {/* Inquiries List */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
              {carInquiries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Inquiries Yet</h3>
                  <p className="text-white/60">
                    When customers ask about this car, their messages will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carInquiries.map((inquiry) => (
                    <div
                      key={inquiry.customer_id}
                      className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors border border-white/10 cursor-pointer"
                      onClick={() => {
                        // Open chat with this customer
                        setShowCarInquiries(false);
                        setShowChatModal(true);
                        setSelectedCar(selectedInquiryCar);
                        // You might want to pass customer info to chat modal
                      }}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {inquiry.avatar_url ? (
                            <img
                              src={inquiry.avatar_url}
                              alt={inquiry.customer_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                              {inquiry.customer_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>

                        {/* Customer Info */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-white font-semibold">{inquiry.customer_name}</h4>
                            {inquiry.unread_count > 0 && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                {inquiry.unread_count} new
                              </span>
                            )}
                          </div>
                          <p className="text-white/60 text-sm mb-2">{inquiry.customer_email}</p>
                          <div className="flex items-center space-x-4 text-xs text-white/50">
                            <span>💬 {inquiry.message_count} message{inquiry.message_count !== 1 ? 's' : ''}</span>
                            <span>📅 Last: {new Date(inquiry.last_message_date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Chat Button */}
                        <button className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm">
                          Open Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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

      {/* Car Management Interface */}
      {managingCarId && (
        <ManageCar
          carId={managingCarId}
          onClose={() => setManagingCarId(null)}
          onUpdated={() => {
            // Reload cars to reflect changes
            setManagingCarId(null);
            window.location.reload();
          }}
        />
      )}

      {/* Profile Settings Modal */}
      {showProfileSettings && user && token && (
        <ProfileSettings
          user={user}
          token={token}
          onClose={() => setShowProfileSettings(false)}
          onUserUpdated={(updatedUser) => {
            setUser(updatedUser);
            authStorage.setUser(updatedUser);
          }}
        />
      )}

      {/* Phase 4 Advanced Features */}
      {/* EmergencyButton removed - now available in Profile & Settings > Emergency Info tab */}
      <LiveChatSupport />
      <PerformanceMonitor />
    </div>
  );
}

export default App;