import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Brain, MapPin, Phone, Zap, BarChart3, MessageCircle, Globe, Star } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import TwoFactorAuth from './TwoFactorAuth';
import BiometricLogin from './BiometricLogin';
import FraudDetectionDashboard from './FraudDetectionDashboard';
import AIRecommendations from './AIRecommendations';
import GPSLiveTracking from './GPSLiveTracking';
import EmergencyButton from './EmergencyButton';
import LiveChatSupport from './LiveChatSupport';
import PerformanceMonitor from './PerformanceMonitor';

const Phase4Dashboard = () => {
  const [activeFeature, setActiveFeature] = useState(null);
  const [user, setUser] = useState(null);
  const [features, setFeatures] = useState({
    multiLanguage: true,
    twoFactor: false,
    biometric: false,
    fraudDetection: true,
    aiRecommendations: true,
    gpsTracking: false,
    emergency: true,
    liveChat: true,
    performance: true,
    analytics: true
  });

  useEffect(() => {
    // Load user data and feature states - use the correct localStorage key
    const userData = JSON.parse(localStorage.getItem('driveKenya_user') || '{}');
    console.log('📊 Phase4Dashboard - User data loaded:', userData);
    console.log('📊 User role:', userData?.role);
    setUser(userData);
    
    // Load feature preferences
    const savedFeatures = JSON.parse(localStorage.getItem('phase4Features') || '{}');
    setFeatures(prev => ({ ...prev, ...savedFeatures }));
  }, []);

  const toggleFeature = (featureName) => {
    const newFeatures = {
      ...features,
      [featureName]: !features[featureName]
    };
    setFeatures(newFeatures);
    localStorage.setItem('phase4Features', JSON.stringify(newFeatures));
  };

  const featureItems = [
    {
      id: 'multiLanguage',
      name: 'Multi-Language Support',
      description: 'Switch between English and Swahili',
      icon: Globe,
      color: 'bg-blue-500',
      component: LanguageSwitcher,
      enabled: features.multiLanguage,
      roles: ['customer', 'host', 'admin'] // All users
    },
    {
      id: 'twoFactor',
      name: 'Two-Factor Authentication',
      description: 'Enhanced security with 2FA',
      icon: Shield,
      color: 'bg-green-500',
      component: TwoFactorAuth,
      enabled: features.twoFactor,
      roles: ['customer', 'host', 'admin'] // All users
    },
    {
      id: 'biometric',
      name: 'Biometric Login',
      description: 'Fingerprint and face recognition',
      icon: Star,
      color: 'bg-purple-500',
      component: BiometricLogin,
      enabled: features.biometric,
      roles: ['customer', 'host', 'admin'] // All users
    },
    {
      id: 'fraudDetection',
      name: 'Fraud Detection',
      description: 'AI-powered security monitoring',
      icon: AlertTriangle,
      color: 'bg-red-500',
      component: FraudDetectionDashboard,
      enabled: features.fraudDetection,
      roles: ['host', 'admin'] // Owners and admins only
    },
    {
      id: 'aiRecommendations',
      name: 'AI Recommendations',
      description: 'Personalized car suggestions',
      icon: Brain,
      color: 'bg-indigo-500',
      component: AIRecommendations,
      enabled: features.aiRecommendations,
      roles: ['customer', 'host', 'admin'] // All users
    },
    {
      id: 'gpsTracking',
      name: 'GPS Live Tracking',
      description: 'Real-time location monitoring',
      icon: MapPin,
      color: 'bg-orange-500',
      component: GPSLiveTracking,
      enabled: features.gpsTracking,
      roles: ['customer', 'host', 'admin'] // Customers see their rentals, owners see their cars
    },
    {
      id: 'emergency',
      name: 'Emergency Features',
      description: 'Panic button and emergency contacts',
      icon: Phone,
      color: 'bg-red-600',
      component: EmergencyButton,
      enabled: features.emergency,
      roles: ['customer', 'host', 'admin'] // All users
    },
    {
      id: 'liveChat',
      name: 'Live Chat Support',
      description: '24/7 customer assistance',
      icon: MessageCircle,
      color: 'bg-teal-500',
      component: LiveChatSupport,
      enabled: features.liveChat,
      roles: ['customer', 'host', 'admin'] // All users
    },
    {
      id: 'performance',
      name: 'Performance Monitoring',
      description: 'App performance analytics',
      icon: Zap,
      color: 'bg-yellow-500',
      component: PerformanceMonitor,
      enabled: features.performance,
      roles: ['customer', 'host', 'admin'] // All users
    },
    {
      id: 'analytics',
      name: 'Advanced Analytics',
      description: 'Detailed usage insights',
      icon: BarChart3,
      color: 'bg-cyan-500',
      component: null, // To be implemented
      enabled: features.analytics,
      roles: ['admin'] // Admins only
    }
  ];

  // Filter features based on user role - only show features accessible to this role
  const availableFeatures = featureItems.filter(feature => {
    // If no user is loaded yet, don't show any features
    if (!user || !user.role) return false;
    
    // If feature has no role restrictions, show to everyone
    if (!feature.roles || feature.roles.length === 0) return true;
    
    // Check if user's role is in the allowed roles
    return feature.roles.includes(user.role);
  });

  console.log('📊 Available features for role', user?.role, ':', availableFeatures.length);

  const renderFeatureComponent = () => {
    if (!activeFeature) return null;
    
    const feature = featureItems.find(f => f.id === activeFeature);
    if (!feature || !feature.enabled) return null;
    
    // Check if component exists
    if (!feature.component) {
      return (
        <div className="mt-6 p-6 bg-white rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800">{feature.name}</h3>
            <button
              onClick={() => setActiveFeature(null)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="text-center py-8 text-gray-600">
            <p>This feature is coming soon!</p>
          </div>
        </div>
      );
    }

    const Component = feature.component;
    
    // Special handling for components that need props
    const componentProps = {};
    if (feature.id === 'liveChat') {
      componentProps.standalone = false;
      componentProps.isOpen = true;
      componentProps.onClose = () => setActiveFeature(null);
    }
    
    return (
      <div className="mt-6 p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">{feature.name}</h3>
          <button
            onClick={() => setActiveFeature(null)}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-2"
            title="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-[200px]">
          <Component {...componentProps} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Show loading state if user data not loaded */}
        {!user || !user.role ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                DriveKenya Phase 4 Advanced Features
              </h1>
              <p className="text-lg text-gray-600">
                Experience the future of car rental with our advanced features
              </p>
              {user?.name && (
                <p className="text-sm text-gray-500 mt-2">
                  Welcome back, {user.name}! 
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {user.role === 'host' ? 'Owner' : user.role === 'admin' ? 'Admin' : 'Customer'}
                  </span>
                </p>
              )}
            </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {availableFeatures.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.id}
                className={`
                  relative p-6 rounded-lg shadow-lg cursor-pointer transition-all duration-300
                  ${feature.enabled 
                    ? 'bg-white hover:shadow-xl transform hover:-translate-y-1' 
                    : 'bg-gray-100 opacity-60'
                  }
                `}
                onClick={() => feature.enabled && setActiveFeature(feature.id)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-3 rounded-full ${feature.color} mb-3`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {feature.description}
                  </p>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFeature(feature.id);
                      }}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${feature.enabled ? 'bg-green-600' : 'bg-gray-300'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${feature.enabled ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>
                {feature.enabled && (
                  <div className="absolute top-2 right-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              Active Features
            </h4>
            <div className="text-3xl font-bold text-green-600">
              {Object.values(features).filter(Boolean).length}
            </div>
            <p className="text-sm text-gray-600">out of {featureItems.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              Security Level
            </h4>
            <div className="text-3xl font-bold text-blue-600">
              {features.twoFactor && features.biometric ? 'High' : 
               features.twoFactor || features.biometric ? 'Medium' : 'Basic'}
            </div>
            <p className="text-sm text-gray-600">Authentication</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              AI Features
            </h4>
            <div className="text-3xl font-bold text-purple-600">
              {[features.aiRecommendations, features.fraudDetection].filter(Boolean).length}
            </div>
            <p className="text-sm text-gray-600">ML-powered</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              Real-time
            </h4>
            <div className="text-3xl font-bold text-orange-600">
              {[features.gpsTracking, features.liveChat, features.performance].filter(Boolean).length}
            </div>
            <p className="text-sm text-gray-600">Live features</p>
          </div>
        </div>

        {/* Active Feature Component */}
        {renderFeatureComponent()}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setActiveFeature('emergency')}
              className="p-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Phone className="h-5 w-5" />
              <span>Emergency</span>
            </button>
            <button 
              onClick={() => setActiveFeature('liveChat')}
              className="p-4 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center justify-center space-x-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Get Help</span>
            </button>
            <button 
              onClick={() => setActiveFeature('aiRecommendations')}
              className="p-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Brain className="h-5 w-5" />
              <span>Find Cars</span>
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Phase4Dashboard;