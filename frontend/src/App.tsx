import { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Menu, X, ChevronDown, ChevronRight } from 'lucide-react';
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
import VehicleTypeCarousel from './components/VehicleTypeCarousel';
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
import { FaCar, FaStar, FaMapMarkerAlt, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
const VEHICLE_TYPES = [
  { value: 'all', label: 'All Vehicles', icon: '🚗' },
  { value: 'car', label: 'Cars', icon: '🚗' },
  { value: 'motorcycle', label: 'Motorcycles', icon: '🏍️' },
  { value: 'bicycle', label: 'Bicycles', icon: '🚴' },
  { value: 'van', label: 'Vans', icon: '🚐' },
  { value: 'truck', label: 'Trucks', icon: '🚛' },
  { value: 'suv', label: 'SUVs', icon: '🚙' },
  { value: 'bus', label: 'Buses', icon: '🚌' }
];

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
const Navigation = ({
  user,
  currentPage,
  setCurrentPage,
  setShowNotificationCenter,
  showNotificationCenter,
  unreadCount,
  setShowProfileSettings,
  handleLogout,
  showAuthModal,
  setShowAuthModal,
  t,
  setSelectedCategory,
  vehicleTypes
}: any) => {
  const [showServicesMenu, setShowServicesMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showVehiclesMenu, setShowVehiclesMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);

  const handleVehicleTypeClick = (type: string) => {
    setSelectedCategory(type);
    setCurrentPage('cars');
    setShowVehiclesMenu(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Mobile Menu Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 -ml-2 text-foreground md:hidden hover:bg-muted rounded-xl transition-colors"
              aria-label="Toggle menu"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div
              className="flex items-center space-x-3 text-xl md:text-2xl font-black text-foreground cursor-pointer group"
              onClick={() => { setCurrentPage('home'); setShowMobileMenu(false); }}
            >
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-500">
                <FaCar className="text-white text-lg md:text-xl" />
              </div>
              <span>Drive<span className="text-blue-400">Kenya</span></span>
            </div>
          </div>

          {user && (
            <div className="hidden md:flex items-center space-x-2">
              <ScaleInteraction>
                <button
                  onClick={() => setCurrentPage('home')}
                  className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentPage === 'home'
                    ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
                      ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                  >
                    Vehicles
                    <span className="ml-2 text-[8px]">▼</span>
                  </button>
                </ScaleInteraction>

                {showVehiclesMenu && (
                  <div className="absolute top-full mt-4 right-0 bg-popover/95 backdrop-blur-2xl border border-border rounded-[2rem] shadow-2xl py-4 min-w-[220px] overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="px-6 py-2 border-b border-border mb-2">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Select Type</span>
                    </div>
                    {vehicleTypes.map((type: any) => (
                      <button
                        key={type.value}
                        onClick={() => handleVehicleTypeClick(type.value)}
                        className="w-full px-6 py-3 text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center group"
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
                    className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center transition-all ${['listcar', 'bookings', 'mycars', 'pricing'].includes(currentPage)
                      ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                  >
                    {t('nav.services', 'Services')}
                    <span className="ml-2 text-[8px]">▼</span>
                  </button>
                </ScaleInteraction>

                {showServicesMenu && (
                  <div className="absolute top-full mt-4 right-0 bg-popover/95 backdrop-blur-2xl border border-border rounded-[2.5rem] shadow-2xl py-6 min-w-[240px] z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <button
                      onClick={() => { setCurrentPage('listcar'); setShowServicesMenu(false); }}
                      className="w-full px-8 py-4 text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center group"
                    >
                      <span className="mr-4 text-blue-400 group-hover:scale-125 transition-transform">➕</span>
                      <span className="text-xs font-black uppercase tracking-widest">List Vehicle</span>
                    </button>
                    <button
                      onClick={() => { setCurrentPage('bookings'); setShowServicesMenu(false); }}
                      className="w-full px-8 py-4 text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center group"
                    >
                      <span className="mr-4 text-purple-400 group-hover:scale-125 transition-transform">📋</span>
                      <span className="text-xs font-black uppercase tracking-widest">Bookings</span>
                    </button>
                    <button
                      onClick={() => { setCurrentPage('mycars'); setShowServicesMenu(false); }}
                      className="w-full px-8 py-4 text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center group"
                    >
                      <span className="mr-4 text-emerald-400 group-hover:scale-125 transition-transform">🚙</span>
                      <span className="text-xs font-black uppercase tracking-widest">My Vehicles</span>
                    </button>
                    <button
                      onClick={() => { setCurrentPage('pricing'); setShowServicesMenu(false); }}
                      className="w-full px-8 py-4 text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center group border-t border-border mt-2"
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
                      ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                  >
                    {t('nav.more', 'More')}
                    <span className="ml-2 text-[8px]">▼</span>
                  </button>
                </ScaleInteraction>

                {showMoreMenu && (
                  <div className="absolute top-full mt-4 right-0 bg-popover/95 backdrop-blur-2xl border border-border rounded-[2rem] shadow-2xl py-4 min-w-[180px] z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <button
                      onClick={() => { setCurrentPage('about'); setShowMoreMenu(false); }}
                      className="w-full px-8 py-4 text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center group"
                    >
                      <span className="mr-4 text-xl group-hover:scale-125 transition-transform">ℹ️</span>
                      <span className="text-xs font-black uppercase tracking-widest">About</span>
                    </button>
                    <button
                      onClick={() => { setCurrentPage('contact'); setShowMoreMenu(false); }}
                      className="w-full px-8 py-4 text-left text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center group"
                    >
                      <span className="mr-4 text-xl group-hover:scale-125 transition-transform">📞</span>
                      <span className="text-xs font-black uppercase tracking-widest">Contact</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 md:space-x-4">
            {user ? (
              <div className="flex items-center space-x-2 md:space-x-4">
                <ScaleInteraction>
                  <button
                    onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                    className="relative text-muted-foreground hover:text-foreground p-2 md:p-3 bg-muted/30 rounded-2xl border border-border group"
                    title="Notifications"
                  >
                    <span className="text-lg md:text-xl group-hover:scale-110 transition-transform block">🔔</span>
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
                    className="flex items-center space-x-0 md:space-x-4 bg-secondary/50 hover:bg-secondary p-1 md:p-2 md:pr-6 rounded-2xl md:rounded-[1.5rem] border border-border group transition-all"
                  >
                    <div className="relative">
                      {user.profile_photo ? (
                        <img
                          src={user.profile_photo}
                          alt="Profile"
                          className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all"
                        />
                      ) : (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-xs md:text-base">
                          {user.name?.charAt(0) || user.first_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-foreground text-[10px] font-black uppercase tracking-widest mb-0.5">
                        {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}
                      </div>
                      <div className="text-[9px] text-foreground/70 font-bold uppercase tracking-widest">
                        {user.role?.toLowerCase() === 'host' ? 'OWNER' : user.role?.toUpperCase()}
                      </div>
                    </div>
                  </button>
                </ScaleInteraction>

                <button
                  onClick={handleLogout}
                  className="hidden md:block text-muted-foreground hover:text-destructive font-black text-[10px] uppercase tracking-widest transition-colors px-4 py-2 border border-border rounded-xl hover:bg-destructive/10"
                >
                  Logout
                </button>
              </div>
            ) : (
              <ScaleInteraction>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-foreground text-background px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all hover:bg-primary hover:text-white shadow-2xl shadow-primary/10"
                >
                  Sign In
                </button>
              </ScaleInteraction>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowMobileMenu(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 w-[320px] bg-card/95 backdrop-blur-xl border-r border-border shadow-2xl animate-in slide-in-from-left duration-500 flex flex-col h-screen h-[100dvh]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-3 text-xl font-black text-foreground">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl">
                  <FaCar className="text-white text-lg" />
                </div>
                <span>Drive<span className="text-blue-400">Kenya</span></span>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <button
                onClick={() => { setCurrentPage('home'); setShowMobileMenu(false); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentPage === 'home' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <span>Home</span>
                <ChevronRight size={16} className={currentPage === 'home' ? 'opacity-100' : 'opacity-0'} />
              </button>

              {/* Mobile Vehicles Section */}
              <div className="space-y-1">
                <button
                  onClick={() => setMobileExpandedSection(mobileExpandedSection === 'vehicles' ? null : 'vehicles')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentPage === 'cars' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <span>Vehicles</span>
                  <ChevronDown size={16} className={`transition-transform duration-300 ${mobileExpandedSection === 'vehicles' ? 'rotate-180' : ''}`} />
                </button>
                {mobileExpandedSection === 'vehicles' && (
                  <div className="pl-4 space-y-1 animate-in slide-in-from-top-2 duration-300">
                    {vehicleTypes.map((type: any) => (
                      <button
                        key={type.value}
                        onClick={() => { handleVehicleTypeClick(type.value); setShowMobileMenu(false); }}
                        className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center space-x-3"
                      >
                        <span className="text-lg">{type.icon}</span>
                        <span>{type.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Services Section */}
              <div className="space-y-1">
                <button
                  onClick={() => setMobileExpandedSection(mobileExpandedSection === 'services' ? null : 'services')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${['listcar', 'bookings', 'mycars', 'pricing'].includes(currentPage) ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <span>Services</span>
                  <ChevronDown size={16} className={`transition-transform duration-300 ${mobileExpandedSection === 'services' ? 'rotate-180' : ''}`} />
                </button>
                {mobileExpandedSection === 'services' && (
                  <div className="pl-4 space-y-1 animate-in slide-in-from-top-2 duration-300">
                    <button
                      onClick={() => { setCurrentPage('listcar'); setShowMobileMenu(false); }}
                      className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center space-x-3"
                    >
                      <span>➕</span>
                      <span>List Vehicle</span>
                    </button>
                    <button
                      onClick={() => { setCurrentPage('bookings'); setShowMobileMenu(false); }}
                      className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center space-x-3"
                    >
                      <span>📋</span>
                      <span>Bookings</span>
                    </button>
                    <button
                      onClick={() => { setCurrentPage('mycars'); setShowMobileMenu(false); }}
                      className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center space-x-3"
                    >
                      <span>🚙</span>
                      <span>My Vehicles</span>
                    </button>
                    <button
                      onClick={() => { setCurrentPage('pricing'); setShowMobileMenu(false); }}
                      className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center space-x-3"
                    >
                      <span>📊</span>
                      <span>Pricing Calculator</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile More Section */}
              <div className="space-y-1">
                <button
                  onClick={() => setMobileExpandedSection(mobileExpandedSection === 'more' ? null : 'more')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${['about', 'contact'].includes(currentPage) ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  <span>More</span>
                  <ChevronDown size={16} className={`transition-transform duration-300 ${mobileExpandedSection === 'more' ? 'rotate-180' : ''}`} />
                </button>
                {mobileExpandedSection === 'more' && (
                  <div className="pl-4 space-y-1 animate-in slide-in-from-top-2 duration-300">
                    <button
                      onClick={() => { setCurrentPage('about'); setShowMobileMenu(false); }}
                      className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center space-x-3"
                    >
                      <span>ℹ️</span>
                      <span>About</span>
                    </button>
                    <button
                      onClick={() => { setCurrentPage('contact'); setShowMobileMenu(false); }}
                      className="w-full px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center space-x-3"
                    >
                      <span>📞</span>
                      <span>Contact</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border mt-auto">
              {user ? (
                <button
                  onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                  className="w-full flex items-center px-4 py-3 text-sm font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                >
                  <FaSignOutAlt className="mr-3" />
                  Logout
                </button>
              ) : (
                <button
                  onClick={() => { setShowAuthModal(true); setShowMobileMenu(false); }}
                  className="w-full bg-foreground text-background py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

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

  // Ref to store the role during Google Auth
  const googleAuthRole = useRef('customer');

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

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cars/upload-images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        const newImageUrls = data.data.imageUrls.map(url => `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`);
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/car-inquiries/${carId}`, {
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
    const isVehicleTypeFilter = VEHICLE_TYPES.some(t => t.value === selectedCategory);

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


  // Google Login hook for both sign-up and sign-in
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setAuthLoading(true);
        console.log('Google Login Success:', tokenResponse);

        // Extract the access token
        const accessToken = tokenResponse.access_token;

        // Send to backend
        console.log(`📡 Sending Google token to backend at ${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google-signup`);
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google-signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleToken: accessToken,
            role: googleAuthRole.current,
            accountType: googleAuthRole.current
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
  const handleGoogleSignUp = (selectedRole: string = 'customer') => {
    googleAuthRole.current = selectedRole;
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
          className="absolute inset-0 bg-background/80 backdrop-blur-md animate-in fade-in duration-500"
          onClick={() => setShowAuthModal(false)}
        ></div>

        <div className="relative bg-card/95 backdrop-blur-2xl border border-border rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in slide-in-from-bottom-10 duration-700">
          {/* Decorative Gradient Blob */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

          <div className="p-10 md:p-14 relative z-10">
            <div className="flex justify-between items-start mb-12">
              <div className="animate-in slide-in-from-left-4 duration-500">
                <h2 className="text-4xl font-black text-foreground mb-2 tracking-tighter">
                  {authMode === 'login' ? 'Welcome Back' : 'Join the Elite'}
                </h2>
                <p className="text-muted-foreground text-sm font-medium">
                  {authMode === 'login' ? 'Continue your premium journey' : 'Start earning or exploring today'}
                </p>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-4xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Path Selection */}
            <div className="mb-10 animate-in slide-in-from-up-4 duration-500">
              <p className="text-muted-foreground/50 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Select Your Path</p>
              <div className="grid grid-cols-2 gap-4">
                <ScaleInteraction>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'customer' })}
                    className={`relative p-5 rounded-[1.5rem] border transition-all overflow-hidden group w-full text-center ${formData.role === 'customer'
                      ? 'bg-blue-600 border-blue-400 text-white shadow-2xl shadow-blue-600/20'
                      : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/80'
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
                      : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/80'
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
                    onClick={() => handleGoogleSignUp(formData.role)}
                    className="w-full bg-secondary hover:bg-secondary/80 text-foreground py-4 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-4 border border-border shadow-xl"
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
                  <div className="flex-1 border-t border-border/30"></div>
                  <span className="px-4 text-muted-foreground/30 text-[10px] font-black uppercase tracking-widest">or email</span>
                  <div className="flex-1 border-t border-border/30"></div>
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
                    className="w-full px-6 py-4 bg-input/20 border border-input rounded-2xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium"
                    required
                  />
                  <input
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-6 py-4 bg-input/20 border border-input rounded-2xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium"
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
                  className="w-full px-6 py-4 bg-input/20 border border-input rounded-2xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium"
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
                    className="w-full px-6 py-4 bg-input/20 border border-input rounded-2xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium"
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
                    className="w-full px-6 py-4 bg-input/20 border border-input rounded-2xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium"
                    required
                  />
                </div>
              )}

              <div className="pt-6">
                <ScaleInteraction>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-foreground text-background py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all hover:bg-primary hover:text-white shadow-xl disabled:opacity-50"
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
                className="text-muted-foreground hover:text-foreground text-xs font-black uppercase tracking-widest transition-all"
              >
                {authMode === 'login' ? "New to the platform? Join now" : "Member already? Sign in"}
              </button>

              {authMode === 'login' && (
                <button
                  onClick={() => { setShowAuthModal(false); setShowForgotPassword(true); }}
                  className="text-primary/60 hover:text-primary text-[10px] font-black uppercase tracking-[0.2em] transition-all"
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
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/forgot-password`, {
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
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl max-w-md w-full p-8 relative shadow-xl">
          <button
            onClick={() => {
              setShowForgotPassword(false);
              setResetEmail('');
              setResetMessage('');
            }}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-2xl font-bold"
          >
            ×
          </button>
          <h2 className="text-3xl font-bold text-foreground mb-2">Reset Password</h2>
          <p className="text-muted-foreground mb-6">Enter your email and we'll send you a reset link</p>

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
              className="w-full px-4 py-3 bg-input/20 border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/reset-password`, {
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
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card backdrop-blur-xl border border-border rounded-2xl max-w-md w-full p-8 relative shadow-xl">
          <button
            onClick={() => {
              setShowResetPassword(false);
              setNewPassword('');
              setConfirmPassword('');
              setResetMessage('');
            }}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-2xl font-bold"
          >
            ×
          </button>
          <h2 className="text-3xl font-bold text-foreground mb-2">Set New Password</h2>
          <p className="text-muted-foreground mb-6">Enter your new password below</p>

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
                className="w-full px-4 py-3 bg-input/20 border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full px-4 py-3 bg-input/20 border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
      <section className="relative h-screen flex items-center justify-center text-center bg-black overflow-hidden pt-24">
        {/* Background Video */}
        <div className="absolute inset-0 overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute min-w-full min-h-full object-cover opacity-60"
          >
            <source src="/Screen Recording 2025-12-28 200832.mp4" type="video/mp4" />
          </video>
          {/* Enhanced Gradient Overlay with definitive bottom edge */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/20"></div>
        </div>

        {/* Animated Background Blobs for extra depth */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <AnimatedSection delay={0.2}>
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 bg-muted/30 backdrop-blur-sm border border-border rounded-full px-6 py-2 mb-6">
                <span className={`w-2 h-2 rounded-full ${apiConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
                <span className="text-white/80 text-sm font-medium">
                  {apiConnected ? '⚡ Live Database Connected' : '🚧 Demo Mode'} • {cars.length} Vehicles Available
                </span>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.4}>
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tight drop-shadow-2xl">
              Drive<span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent animate-gradient-x">Kenya</span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.6}>
            <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed max-w-3xl mx-auto font-medium drop-shadow-lg">
              Experience Kenyan roads like never before. Premium vehicle rentals - from Luxury SUVs to reliable Bicycles, all at your fingertips.
            </p>
          </AnimatedSection>

          {/* Role-based Welcome Message */}
          {user && (
            <AnimatedSection delay={0.7}>
              <div className="mb-8">
                <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary/10 to-purple-600/10 backdrop-blur-sm border border-primary/20 rounded-full px-6 py-3">
                  <span className="text-2xl">
                    {user.role === 'host' ? '🔑' : user.role === 'admin' ? '👑' : '🚗'}
                  </span>
                  <span className="text-white font-bold tracking-wide">
                    {user.role === 'host' ?
                      `Welcome back, Owner! Manage your ${myCars.length} vehicles` :
                      user.role === 'admin' ?
                        'Welcome Back, Administrator' :
                        `Hello, ${user.name?.split(' ')[0] || 'Driver'}! Ready to ride?`
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
                        className="bg-muted/50 hover:bg-muted border border-border text-foreground px-8 py-4 rounded-full font-bold transition-all backdrop-blur-sm"
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
                    className="w-full sm:w-auto bg-muted/50 hover:bg-muted border border-border text-foreground px-10 py-5 rounded-full font-bold text-lg transition-all backdrop-blur-sm shadow-xl"
                  >
                    Sign In to Book
                  </button>
                </ScaleInteraction>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Vehicle Type Carousel */}
      <VehicleTypeCarousel onSelectCategory={(category) => {
        setSelectedCategory(category);
        setCurrentPage('cars');
        window.scrollTo(0, 0);
      }} />

      {/* Stats Section */}
      <section className="py-24 bg-muted/20 relative overflow-hidden group">
        {/* Dynamic Background Pattern */}
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, var(--primary) 1.5px, transparent 0)`,
          backgroundSize: '48px 48px'
        }}></div>

        {/* Animated Background Blobs for depth */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse pointer-events-none group-hover:bg-primary/20 transition-all duration-1000"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] animate-pulse pointer-events-none group-hover:bg-purple-600/20 transition-all duration-1000" style={{ animationDelay: '2s' }}></div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Cars Available', value: `${cars.length}+` },
              { label: user ? 'Your Bookings' : 'Active Bookings', value: userBookings.length },
              { label: 'Support', value: '24/7' },
              { label: 'Average Rating', value: '4.9' }
            ].map((stat, idx) => (
              <StaggerItem key={idx}>
                <div className="bg-card backdrop-blur-md border border-border rounded-[2rem] p-10 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 group">
                  <div className="text-5xl font-black text-foreground mb-3 bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent group-hover:scale-110 transition-transform">{stat.value}</div>
                  <div className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">{stat.label}</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>
      {/* Featured Cars */}
      <section className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-foreground mb-6">Featured Fleet</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-primary to-purple-500 mx-auto rounded-full"></div>
            <p className="text-xl text-muted-foreground mt-6 font-medium">Discover our most premium vehicles curated for you</p>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {filteredCars.slice(0, 3).map(car => (
              <StaggerItem key={car.id}>
                <div className="group bg-card backdrop-blur-xl border border-border rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all duration-500">
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={car.image}
                      alt={car.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute top-6 right-6 bg-background/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-border flex items-center space-x-2">
                      <span className="text-yellow-400 text-xs">★</span>
                      <span className="text-foreground font-black text-sm">{car.rating?.toFixed(1) || '4.8'}</span>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-black text-foreground mb-2 group-hover:text-primary transition-colors">{car.name}</h3>
                    <p className="text-muted-foreground mb-6 font-medium flex items-center">
                      <FaMapMarkerAlt className="mr-2 text-primary/50" /> {car.location}
                    </p>
                    <div className="flex justify-between items-center pt-6 border-t border-border">
                      <div>
                        <div className="text-3xl font-black text-foreground">KSh {car.price?.toLocaleString()}</div>
                        <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">per day</div>
                      </div>
                      <ScaleInteraction>
                        <button
                          onClick={() => {
                            setSelectedCar(car);
                            if (user) setShowBookingModal(true);
                            else setShowAuthModal(true);
                          }}
                          className="bg-foreground text-background px-8 py-3 rounded-2xl font-black text-sm transition-all hover:bg-primary hover:text-white"
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
        <div className="min-h-screen bg-background pt-28 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-foreground text-xl">Loading cars...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background pt-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Available {getVehicleTypeLabel(selectedCategory, true, true)}
            </h1>
            <p className="text-xl text-muted-foreground">
              {apiConnected ? 'Real-time data from our database' : 'Demo data'}  {filteredCars?.length || 0} of {cars?.length || 0} {getVehicleTypeLabel(selectedCategory, true)} shown
            </p>
          </div>
          {/* View Toggle */}
          <div className="mb-8">
            <div className="flex justify-center">
              <div className="bg-muted/30 backdrop-blur-lg border border-border rounded-full p-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${viewMode === 'grid'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                >
                  🏷️ Grid View
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${viewMode === 'map'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                >
                  🗺️ Map View
                </button>
              </div>
            </div>
          </div>
          {/* Enhanced Search and Filter Section */}
          <div className="bg-card backdrop-blur-lg border border-border rounded-2xl p-6 mb-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* Search with suggestions */}
              <div className="relative">
                <label className="block text-muted-foreground text-sm font-medium mb-2">🔍 Search</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Car name, model, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => searchTerm.length > 1 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full px-4 py-3 bg-input/20 border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  )}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg">
                      {searchSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-muted/50 cursor-pointer text-foreground"
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
                <label className="block text-muted-foreground text-sm font-medium mb-2">🏷️ Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-input/20 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                <label className="block text-muted-foreground text-sm font-medium mb-2">💰 Price (KSh/day)</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange[0]}
                    min="0"
                    onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                    className="w-full px-3 py-3 bg-input/20 border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange[1]}
                    min={priceRange[0] + 100}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 15000])}
                    className="w-full px-3 py-3 bg-input/20 border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <div>
                  <label className="block text-muted-foreground text-sm font-medium mb-2">⭐ Min. Rating</label>
                  <div className="flex items-center space-x-2">
                    {[0, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setMinRating(rating === minRating ? 0 : rating)}
                        className={`px-3 py-1 rounded-full text-sm ${minRating === rating
                          ? 'bg-yellow-500 text-black'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
            <div className="border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-6">
                {/* Show Transmission only for motorized vehicles */}
                {selectedCategory !== 'bicycle' && (
                  <div>
                    <label className="block text-muted-foreground text-sm font-medium mb-2">⚙️ Transmission</label>
                    <div className="flex space-x-2">
                      {['All', 'Automatic', 'Manual'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setTransmission(type === 'All' ? 'all' : type.toLowerCase())}
                          className={`px-3 py-1 rounded-full text-sm ${transmission === type.toLowerCase() || (type === 'All' && transmission === 'all')
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
                    <label className="block text-muted-foreground text-sm font-medium mb-2">⛽ Fuel Type</label>
                    <div className="flex space-x-2">
                      {['All', 'Petrol', 'Diesel', 'Hybrid', 'Electric'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFuelType(type === 'All' ? 'all' : type.toLowerCase())}
                          className={`px-3 py-1 rounded-full text-sm ${fuelType === type.toLowerCase() || (type === 'All' && fuelType === 'all')
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <label className="block text-muted-foreground text-sm font-medium mb-2">🔧 Features</label>
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
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
                    className="px-4 py-2 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg font-medium transition-all"
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
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6"
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
              <div className="bg-card backdrop-blur-lg border border-border rounded-xl p-4 flex justify-between items-center">
                <div className="text-foreground font-medium">
                  {viewMode === 'grid' ? '📋 Grid View' : '🗺️ Map View'} - {filteredCars.length} cars
                </div>
                <div className="flex bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${viewMode === 'grid'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                  >
                    📋 Grid
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${viewMode === 'map'
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
              <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-12 max-w-lg mx-auto">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  No {getVehicleTypeLabel(selectedCategory, true)} found
                </h3>
                <p className="text-muted-foreground mb-6">Try adjusting your filters or search terms</p>
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
            <div className="bg-card backdrop-blur-lg border border-border rounded-2xl overflow-hidden shadow-sm mb-8">
              <div className="p-6 bg-gradient-to-r from-primary/10 to-purple-600/10 border-b border-border">
                <h3 className="text-xl font-bold text-foreground mb-2">🗺️ Interactive Nairobi Car Map</h3>
                <p className="text-muted-foreground bg-transparent">Explore cars across Nairobi's key areas: CBD, Westlands, Karen, Kilimani & more. Click markers to view details and book instantly.</p>
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
                  <div className="group bg-card backdrop-blur-xl border border-border rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500">
                    <div className="relative">
                      <img src={car.image} alt={car.name} className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md text-foreground px-3 py-1 rounded-2xl flex items-center border border-border">
                        <span className="text-yellow-400">★</span>
                        <span className="text-foreground text-xs font-black ml-1">{car.rating?.toFixed(1) || '4.8'}</span>
                      </div>
                      {car.available && (
                        <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                          InstaBook
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-black text-foreground mb-2 group-hover:text-primary transition-colors">{car.name}</h3>
                      <div className="text-muted-foreground text-[11px] font-bold uppercase tracking-wider mb-6 flex flex-wrap gap-x-4 gap-y-2">
                        <span>📍 {car.location}</span>
                        <span>👥 {car.seats} SEATS</span>
                        <span>⛽ {car.fuel?.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between items-center py-4 border-t border-border">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-[9px] font-black uppercase">Start From</span>
                          <span className="text-2xl font-black text-foreground">KSh {car.price?.toLocaleString()}</span>
                        </div>
                        <div className="flex space-x-2">
                          {user && (
                            <ScaleInteraction>
                              <button
                                onClick={() => handleOpenChat(car)}
                                className="bg-muted hover:bg-muted/80 text-foreground w-10 h-10 rounded-xl flex items-center justify-center transition-all border border-border"
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
                              className="bg-foreground text-background px-6 py-2 rounded-xl font-black text-xs uppercase tracking-tighter transition-all hover:bg-primary hover:text-white"
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
      </div >
    );
  };

  // Enhanced Bookings Page
  const renderBookings = () => {
    if (!user) {
      return (
        <div className="min-h-screen bg-background pt-28">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-8 text-center">My Bookings</h1>
            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-12 text-center shadow-sm">
              <div className="text-6xl mb-4">🔐</div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Sign In Required</h3>
              <p className="text-muted-foreground mb-6">Please sign in to list your vehicle</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/80 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
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
        <div className="min-h-screen bg-background pt-28">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-8 text-center">My Bookings</h1>
            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-12 text-center shadow-sm">
              <div className="text-6xl mb-4">📆</div>
              <h3 className="text-2xl font-bold text-foreground mb-4">No Bookings Yet</h3>
              <p className="text-muted-foreground mb-6">You haven't made any bookings yet. Start by browsing our available vehicles!</p>
              <button
                onClick={() => setCurrentPage('cars')}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/80 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
              >
                Browse Cars
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background pt-28">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-8 text-center">My Bookings</h1>
          <div className="space-y-6">
            {userBookings.map((booking) => (
              <div key={booking.id} className="bg-card backdrop-blur-sm border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{booking.car?.name || 'Car Rental'}</h3>
                    <p className="text-muted-foreground">
                      {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Status: <span className={`font-medium ${booking.status === 'confirmed' ? 'text-green-500' : booking.status === 'pending' ? 'text-yellow-500' : 'text-red-500'}`}>
                        {booking.status}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">KSh {booking.totalPrice?.toLocaleString()}</div>
                    <p className="text-muted-foreground text-sm">Total</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between items-center">
                    <div className="text-muted-foreground text-sm">
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
        <div className="min-h-screen bg-background pt-28">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-8 text-center">My Vehicles</h1>
            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Sign In Required</h3>
              <p className="text-muted-foreground mb-6">Please sign in to view your vehicles</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/80 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
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
        <div className="min-h-screen bg-background pt-28">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-8 text-center">My Vehicles</h1>
            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Loading Your Vehicles...</h3>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background pt-28">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-8 text-center">My Vehicles</h1>
          {myCars.length === 0 ? (
            <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🚗</div>
              <h3 className="text-2xl font-bold text-foreground mb-4">No vehicles listed yet</h3>
              <p className="text-muted-foreground mb-6">Start earning by listing your first vehicle!</p>
              <button
                onClick={() => setCurrentPage('listcar')}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/80 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all"
              >
                List Your Vehicle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {myCars.map((car) => (
                <div key={car.id} className="bg-card backdrop-blur-lg border border-border rounded-2xl overflow-hidden group hover:scale-[1.02] transition-all duration-300">
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
                    <h3 className="text-2xl font-bold text-foreground">{car.name}</h3>
                    <p className="text-muted-foreground mb-2">{car.year} • {car.location}</p>
                    <p className="text-muted-foreground/80 mb-4 text-sm line-clamp-2">{car.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-foreground">KSh {car.price?.toLocaleString()}</div>
                        <div className="text-muted-foreground text-sm">per day</div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-foreground">{car.rating || 4.8}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => setManagingCarId(car.id)}
                        className="w-full flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <span className="mr-2">📝</span>
                        Manage Car
                      </button>
                      <button
                        onClick={() => handleViewCarInquiries(car.id)}
                        className="w-full bg-muted/50 hover:bg-muted border border-border text-foreground py-2 rounded-lg font-semibold transition-all"
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

  const renderListCar = () => (
    <div className="min-h-screen bg-background pt-28">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-br from-card via-card to-purple-500/5 backdrop-blur-xl border border-border rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/20 transition-all duration-700"></div>

          <div className="relative z-10">
            <div className="flex flex-col items-center mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">List Your Vehicle</h2>
            </div>

            {carSubmitMessage && (
              <div className={`mb-8 p-4 rounded-xl text-center font-bold ${carSubmitMessage.includes('✅') || carSubmitMessage.includes('Success') ? 'bg-green-500/20 text-green-600 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                {carSubmitMessage}
              </div>
            )}
            <form onSubmit={handleSubmitCar}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Make</label>
                  <input type="text" name="make" value={carForm.make} onChange={handleCarFormChange} className="w-full bg-input/20 border border-input rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all" placeholder="e.g. Toyota" required />
                </div>
                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Model</label>
                  <input type="text" name="model" value={carForm.model} onChange={handleCarFormChange} className="w-full bg-input/20 border border-input rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all" placeholder="e.g. Land Cruiser" required />
                </div>
                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Year</label>
                  <input type="number" name="year" value={carForm.year} onChange={handleCarFormChange} className="w-full bg-input/20 border border-input rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all" placeholder="e.g. 2020" required />
                </div>
                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">License Plate</label>
                  <input type="text" name="license_plate" value={carForm.license_plate} onChange={handleCarFormChange} className="w-full bg-input/20 border border-input rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all" placeholder="e.g. KAA 123X" required />
                </div>
                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Vehicle Type</label>
                  <select name="vehicle_type" value={carForm.vehicle_type} onChange={handleCarFormChange} className="w-full bg-input/20 border border-input rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all">
                    <option value="car">Car</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                    <option value="bicycle">Bicycle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Category</label>
                  <select name="category" value={carForm.category} onChange={handleCarFormChange} className="w-full bg-input/20 border border-input rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all">
                    <option value="economy">Economy</option>
                    <option value="luxury">Luxury</option>
                    <option value="suv">SUV</option>
                    <option value="offroad">Off-road</option>
                    <option value="electric">Electric</option>
                    <option value="sport">Sport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Transmission</label>
                  <div className="flex space-x-4">
                    {['Automatic', 'Manual'].map(type => (
                      <label key={type} className={`flex-1 cursor-pointer border rounded-xl p-3 flex items-center justify-center space-x-2 transition-all ${carForm.transmission === type ? 'bg-primary border-primary text-primary-foreground' : 'bg-input/20 border-input text-muted-foreground hover:bg-input/30'}`}>
                        <input type="radio" name="transmission" value={type} checked={carForm.transmission === type} onChange={handleCarFormChange} className="hidden" />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Fuel Type</label>
                  <div className="flex space-x-4">
                    {['Petrol', 'Diesel', 'Hybrid', 'Electric'].map(type => (
                      <label key={type} className={`flex-1 cursor-pointer border rounded-xl p-3 flex items-center justify-center space-x-2 transition-all ${carForm.fuel_type === type ? 'bg-primary border-primary text-primary-foreground' : 'bg-input/20 border-input text-muted-foreground hover:bg-input/30'}`}>
                        <input type="radio" name="fuel_type" value={type} checked={carForm.fuel_type === type} onChange={handleCarFormChange} className="hidden" />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Color</label>
                  <input type="text" name="color" value={carForm.color} onChange={handleCarFormChange} className="w-full bg-input/20 border border-input rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all" placeholder="e.g. Black" required />
                </div>
                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Location</label>
                  <div className="relative">
                    <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" name="location" value={carForm.location} onChange={handleCarFormChange} className="w-full bg-input/20 border border-input rounded-xl pl-12 pr-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all" placeholder="e.g. Nairobi CBD" required />
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Price Per Day (KSh)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">KSh</span>
                    <input type="number" name="price_per_day" value={carForm.price_per_day} onChange={handleCarFormChange} className="w-full bg-input/20 border border-input rounded-xl pl-14 pr-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold text-lg" placeholder="e.g. 5000" required />
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-4">Vehicle Images (First is Main)</label>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {uploadedCarImages.map((url, index) => (
                    <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-border">
                      <img src={url} alt={`Vehicle ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUploadedCarImages(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                      {index === 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] font-bold uppercase text-center py-1">
                          Main Image
                        </div>
                      )}
                    </div>
                  ))}

                  <label className="cursor-pointer border-2 border-dashed border-border rounded-xl aspect-square flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 transition-all">
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

                          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/cars/upload-images`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            },
                            body: formData
                          });

                          if (response.ok) {
                            const data = await response.json();
                            const newImages = data.data.imageUrls.map(url => `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`);
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
                    {isUploadingImages ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    ) : (
                      <>
                        <span className="text-4xl mb-2">+</span>
                        <span className="text-sm font-bold">Add Images</span>
                      </>
                    )}
                  </label>
                </div>
                {isUploadingImages && (
                  <div className="text-center text-muted-foreground py-2">
                    <span className="ml-2">Uploading...</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Features</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    'Air Conditioning', 'Bluetooth', 'Navigation', 'Sunroof',
                    'Leather Seats', 'Heated Seats', 'Backup Camera', 'Cruise Control',
                    '4x4 / AWD', 'Third Row Seating', 'Roof Rack', 'Tow Hitch'
                  ].map(feature => (
                    <label key={feature} className={`cursor-pointer border rounded-xl p-3 flex items-center space-x-2 transition-all ${carForm.features.includes(feature) ? 'bg-primary/20 border-primary text-primary' : 'bg-input/20 border-input text-muted-foreground hover:bg-input/30'}`}>
                      <input
                        type="checkbox"
                        checked={carForm.features.includes(feature)}
                        onChange={(e) => {
                          const newFeatures = e.target.checked
                            ? [...carForm.features, feature]
                            : carForm.features.filter(f => f !== feature);
                          handleCarFormChange({ target: { name: 'features', value: newFeatures } });
                        }}
                        className="hidden"
                      />
                      <span className="text-sm font-bold">{feature}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Description</label>
                <textarea name="description" value={carForm.description} onChange={handleCarFormChange} className="w-full bg-input/20 border border-input rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all h-32" placeholder="Describe your vehicle..." required></textarea>
              </div>

              <div>
                <label className="block text-muted-foreground text-sm font-bold uppercase tracking-wider mb-2">Video URL (optional)</label>
                <input
                  name="video_url"
                  value={carForm.video_url}
                  onChange={handleCarFormChange}
                  placeholder="https://youtube.com/watch?v=... or direct video URL"
                  type="url"
                  className="w-full bg-input/20 border border-input rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
                <p className="text-muted-foreground text-xs mt-1">Optional: Add a YouTube or direct video link to showcase your car</p>
              </div>

              <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-xl text-primary">
                <p className="text-sm">
                  <strong>Note:</strong> After listing, you can manage availability status and set calendar blocks from "My Vehicles" → "Manage Vehicle"
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmittingCar}
                className="w-full bg-foreground text-background py-5 rounded-2xl font-black uppercase tracking-widest text-lg hover:bg-primary hover:text-white transition-all shadow-xl disabled:opacity-50 mt-8"
              >
                {isSubmittingCar ? 'Listing Vehicle...' : 'List Vehicle Now'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  /* About Page */
  const renderAbout = () => (
    <div className="min-h-screen bg-background pt-28">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <AnimatedSection className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-black text-foreground mb-6 tracking-tight">
            About Drive<span className="text-primary">Kenya</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Revolutionizing mobility in Kenya through a seamless, decentralized vehicle rental platform.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
          <AnimatedSection delay={0.2}>
            <div className="group relative rounded-[2.5rem] overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2940&auto=format&fit=crop"
                alt="Driving in Kenya"
                className="w-full h-[500px] object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8">
                <div className="text-3xl font-black text-white mb-2">Freedom to Move</div>
                <p className="text-white/80">Experience the beauty of Kenya on your own terms.</p>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.4}>
            <div className="space-y-8">
              <div className="bg-card backdrop-blur-lg border border-border rounded-3xl p-8 hover:shadow-xl transition-all">
                <div className="text-4xl mb-4">🔮</div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Our Vision</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To become Kenya's leading vehicle rental marketplace, empowering both car owners and travelers through technology, trust, and transparency.
                </p>
              </div>

              <div className="bg-card backdrop-blur-lg border border-border rounded-3xl p-8 hover:shadow-xl transition-all">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Provide a secure, reliable, and easy-to-use platform that connects vehicle owners with verified renters, simplifying the rental process for everyone.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>

        <section className="mb-20">
          <h2 className="text-4xl font-black text-foreground mb-12 text-center">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🚀', title: 'Instant Booking', desc: 'No paperwork, no waiting. Book and go.' },
              { icon: '💎', title: 'Premium Fleet', desc: 'Curated selection of high-quality vehicles.' },
              { icon: '🤝', title: 'Trusted Community', desc: 'Verified users and secure transactions.' },
              { icon: '📱', title: 'Mobile First', desc: 'Manage everything from your phone.' },
              { icon: '📍', title: 'Countrywide', desc: 'Available in major cities across Kenya.' },
              { icon: '💳', title: 'Secure Payments', desc: 'M-PESA & Card payments supported.' }
            ].map((feature, idx) => (
              <AnimatedSection key={idx} delay={0.1 * idx}>
                <div className="bg-card backdrop-blur-sm border border-border rounded-2xl p-8 hover:bg-muted/50 transition-all group">
                  <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  /* Contact Page */
  const renderContact = () => (
    <div className="min-h-screen bg-background pt-28 pb-12 px-4 sm:px-6 lg:px-8 font-['Poppins']">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-foreground sm:text-5xl">
            Get in Touch
          </h2>
          <p className="mt-4 text-xl text-muted-foreground">
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="bg-gradient-to-br from-card via-card to-purple-500/5 backdrop-blur-xl border border-border rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/20 transition-all duration-700"></div>

          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-black text-foreground mb-8 text-center tracking-tight">Send a Message</h3>

            {contactSubmitMessage && (
              <div className={`mb-6 p-4 rounded-lg flex items-center ${contactSubmitMessage.includes('Error')
                ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                : 'bg-green-500/10 border border-green-500/20 text-green-600'
                }`}>
                {contactSubmitMessage}
              </div>
            )}

            <form onSubmit={handleSubmitContact} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Name</label>
                  <input
                    name="name"
                    value={contactForm.name}
                    onChange={handleContactFormChange}
                    placeholder="Your Name"
                    className="w-full px-4 py-3 bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <input
                    name="email"
                    value={contactForm.email}
                    onChange={handleContactFormChange}
                    placeholder="your@email.com"
                    type="email"
                    className="w-full px-4 py-3 bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Subject</label>
                <input
                  name="subject"
                  value={contactForm.subject}
                  onChange={handleContactFormChange}
                  placeholder="How can we help?"
                  className="w-full px-4 py-3 bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Message</label>
                <textarea
                  name="message"
                  value={contactForm.message}
                  onChange={handleContactFormChange}
                  placeholder="Tell us more about your inquiry..."
                  rows={5}
                  className="w-full px-4 py-3 bg-muted/30 border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmittingContact}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-primary/25 transition-all transform hover:-translate-y-0.5"
              >
                {isSubmittingContact ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Sending...
                  </span>
                ) : 'Send Message'}
              </button>
            </form>
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
    <div className="min-h-screen font-['Poppins'] bg-background text-foreground transition-colors duration-300">
      <Navigation
        user={user}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        setShowNotificationCenter={setShowNotificationCenter}
        showNotificationCenter={showNotificationCenter}
        unreadCount={unreadCount}
        setShowProfileSettings={setShowProfileSettings}
        handleLogout={handleLogout}
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        t={t}
        setSelectedCategory={setSelectedCategory}
        vehicleTypes={VEHICLE_TYPES}
      />
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
        <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCarInquiries(false)}>
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-border bg-muted/30">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Customer Inquiries</h2>
                  <p className="text-muted-foreground text-sm">{selectedInquiryCar.make} {selectedInquiryCar.model}</p>
                </div>
                <button
                  onClick={() => setShowCarInquiries(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>💬</span>
                <span>{carInquiries.length} customer(s) inquired about this car</span>
              </div>
            </div>

            {/* Inquiries List */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)] bg-card">
              {carInquiries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Inquiries Yet</h3>
                  <p className="text-muted-foreground">
                    When customers ask about this car, their messages will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carInquiries.map((inquiry) => (
                    <div
                      key={inquiry.customer_id}
                      className="bg-muted/30 hover:bg-muted/50 rounded-xl p-4 transition-colors border border-border cursor-pointer group"
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
                              className="w-12 h-12 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20">
                              {inquiry.customer_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>

                        {/* Customer Info */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-foreground font-semibold">{inquiry.customer_name}</h4>
                            {inquiry.unread_count > 0 && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                                {inquiry.unread_count} new
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">{inquiry.customer_email}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground/80">
                            <span>💬 {inquiry.message_count} message{inquiry.message_count !== 1 ? 's' : ''}</span>
                            <span>📅 Last: {new Date(inquiry.last_message_date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Chat Button */}
                        <button className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors font-medium text-sm shadow-sm group-hover:shadow-md">
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
        <div className="fixed top-20 right-4 w-80 bg-popover/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl z-40 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
            <div>
              <h3 className="text-foreground font-semibold">Messages</h3>
              <p className="text-muted-foreground text-xs">
                {user?.role === 'host' ? '🔑 Owner Inbox' : '🚗 Customer Messages'}
              </p>
            </div>
            <button
              onClick={() => setShowMessagesPanel(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
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
                  <div key={notification.id} className="bg-muted/20 rounded-lg p-3 hover:bg-muted/40 transition-colors cursor-pointer border border-transparent hover:border-border">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">
                        {notification.senderRole === 'host' ? '🔑' :
                          notification.senderRole === 'customer' ? '🚗' : '💬'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-foreground text-sm font-medium">
                            {notification.senderName || 'Unknown'}
                          </p>
                          {notification.chatContext && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {notification.chatContext === 'owner-managing-inquiries' ? 'Inquiry' :
                                notification.chatContext === 'customer-inquiring' ? 'Rental' : 'Chat'}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">{notification.message}</p>
                        <p className="text-muted-foreground/70 text-xs mt-1">
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