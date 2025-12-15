import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      // Navigation
      'nav.home': 'Home',
      'nav.cars': 'Browse Cars',
      'nav.services': 'Services',
      'nav.listcar': 'List Your Car',
      'nav.rentals': 'My Rentals',
      'nav.mycars': 'My Cars',
      'nav.advanced': 'Advanced Features',
      'nav.about': 'About Us',
      'nav.contact': 'Contact Support',
      'nav.more': 'More',
      'nav.signin': 'Sign In',
      'nav.signout': 'Sign Out',
      'nav.settings': 'Settings',
      
      // Home Page
      'home.title': 'DriveKenya',
      'home.subtitle': 'Premium car rentals across Kenya with real-time booking and authentic reviews.',
      'home.welcome': 'Welcome back, {{name}}! Ready to explore?',
      'home.browse': 'Browse {{count}} Cars',
      'home.mybookings': 'My Bookings ({{count}})',
      'home.pricing': 'Pricing Calculator',
      
      // Cars
      'cars.perday': '{{price}} / day',
      'cars.available': 'Available',
      'cars.booked': 'Booked',
      'cars.viewdetails': 'View Details',
      'cars.booknow': 'Book Now',
      'cars.search': 'Search cars...',
      'cars.filter': 'Filter',
      'cars.sortby': 'Sort by',
      
      // Booking
      'booking.title': 'Book Your Car',
      'booking.startdate': 'Start Date',
      'booking.enddate': 'End Date',
      'booking.confirm': 'Confirm Booking',
      'booking.total': 'Total Amount',
      'booking.success': 'Booking successful!',
      
      // Account
      'account.customer': 'Customer Account',
      'account.owner': 'Car Owner Account',
      'account.admin': 'Admin Account',
      'account.profile': 'Profile',
      'account.settings': 'Settings',
      
      // Phase 4 Features
      'phase4.title': 'Advanced Features',
      'phase4.multilang': 'Multi-Language Support',
      'phase4.2fa': 'Two-Factor Authentication',
      'phase4.biometric': 'Biometric Login',
      'phase4.fraud': 'Fraud Detection',
      'phase4.ai': 'AI Recommendations',
      'phase4.gps': 'GPS Live Tracking',
      'phase4.emergency': 'Emergency Features',
      'phase4.chat': 'Live Chat Support',
      'phase4.performance': 'Performance Monitoring',
      'phase4.analytics': 'Advanced Analytics',
      
      // Emergency
      'emergency.button': 'Emergency',
      'emergency.breakdown': 'Breakdown',
      'emergency.accident': 'Accident',
      'emergency.medical': 'Medical',
      'emergency.panic': 'Panic',
      'emergency.alertsent': 'Emergency alert sent!',
      
      // Chat
      'chat.support': 'Need Help?',
      'chat.startchat': 'Start Chat',
      'chat.typing': 'Typing...',
      'chat.sendmessage': 'Send Message',
      'support.typeMessage': 'Type your message...',
      
      // Recommendations
      'recommendations.title': 'AI Recommendations',
      'recommendations.all': 'All',
      'recommendations.popular': 'Popular',
      'recommendations.budget': 'Budget',
      'recommendations.luxury': 'Luxury',
      
      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.close': 'Close',
      'common.submit': 'Submit',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.online': 'Online',
      'common.offline': 'Offline',
      'common.connected': 'Connected',
      'common.disconnected': 'Disconnected'
    }
  },
  sw: {
    translation: {
      // Navigation
      'nav.home': 'Nyumbani',
      'nav.cars': 'Magari',
      'nav.listcar': 'Orodhesha Gari',
      'nav.rentals': 'Ukodisho',
      'nav.mycars': 'Magari Yangu',
      'nav.advanced': 'Vipengele vya Juu',
      'nav.about': 'Kuhusu',
      'nav.contact': 'Wasiliana',
      'nav.signin': 'Ingia',
      'nav.signout': 'Toka',
      
      // Home Page
      'home.title': 'DriveKenya',
      'home.subtitle': 'Ukodishaji wa magari bora katika Kenya na uhakikisho wa wakati halisi.',
      'home.welcome': 'Karibu tena, {{name}}! Tayari kuchunguza?',
      'home.browse': 'Angalia Magari {{count}}',
      'home.mybookings': 'Mahifadhi Yangu ({{count}})',
      'home.pricing': 'Kikokotozi cha Bei',
      
      // Cars
      'cars.perday': '{{price}} / siku',
      'cars.available': 'Inapatikana',
      'cars.booked': 'Imehifadhiwa',
      'cars.viewdetails': 'Tazama Maelezo',
      'cars.booknow': 'Hifadhi Sasa',
      'cars.search': 'Tafuta magari...',
      'cars.filter': 'Chuja',
      'cars.sortby': 'Panga kwa',
      
      // Booking
      'booking.title': 'Hifadhi Gari Lako',
      'booking.startdate': 'Tarehe ya Kuanza',
      'booking.enddate': 'Tarehe ya Kumalizika',
      'booking.confirm': 'Thibitisha Uhifadhi',
      'booking.total': 'Jumla ya Kiasi',
      'booking.success': 'Uhifadhi umefanikiwa!',
      
      // Account
      'account.customer': 'Akaunti ya Mteja',
      'account.owner': 'Akaunti ya Mmiliki wa Gari',
      'account.admin': 'Akaunti ya Msimamizi',
      'account.profile': 'Wasifu',
      'account.settings': 'Mipangilio',
      
      // Phase 4 Features
      'phase4.title': 'Vipengele vya Juu',
      'phase4.multilang': 'Msaada wa Lugha Nyingi',
      'phase4.2fa': 'Uthibitishaji wa Hatua Mbili',
      'phase4.biometric': 'Kuingia kwa Bayometriki',
      'phase4.fraud': 'Ugunduzi wa Ulaghai',
      'phase4.ai': 'Mapendekezo ya AI',
      'phase4.gps': 'Ufuatiliaji wa Moja kwa Moja wa GPS',
      'phase4.emergency': 'Vipengele vya Dharura',
      'phase4.chat': 'Msaada wa Mazungumzo ya Moja kwa Moja',
      'phase4.performance': 'Ufuatiliaji wa Utendaji',
      'phase4.analytics': 'Uchanganuzi wa Juu',
      
      // Emergency
      'emergency.button': 'Dharura',
      'emergency.breakdown': 'Kuharibika',
      'emergency.accident': 'Ajali',
      'emergency.medical': 'Matibabu',
      'emergency.panic': 'Hofu',
      'emergency.alertsent': 'Tahadhari ya dharura imetumwa!',
      
      // Chat
      'chat.support': 'Unahitaji Msaada?',
      'chat.startchat': 'Anza Mazungumzo',
      'chat.typing': 'Inaandika...',
      'chat.sendmessage': 'Tuma Ujumbe',
      'support.typeMessage': 'Andika ujumbe wako...',
      
      // Recommendations
      'recommendations.title': 'Mapendekezo ya AI',
      'recommendations.all': 'Yote',
      'recommendations.popular': 'Maarufu',
      'recommendations.budget': 'Bei Nafuu',
      'recommendations.luxury': 'Anasa',
      
      // Common
      'common.loading': 'Inapakia...',
      'common.error': 'Hitilafu',
      'common.success': 'Imefanikiwa',
      'common.cancel': 'Ghairi',
      'common.save': 'Hifadhi',
      'common.delete': 'Futa',
      'common.edit': 'Hariri',
      'common.close': 'Funga',
      'common.submit': 'Wasilisha',
      'common.back': 'Rudi',
      'common.next': 'Ifuatayo',
      'common.online': 'Mtandaoni',
      'common.offline': 'Nje ya Mtandao',
      'common.connected': 'Imeunganishwa',
      'common.disconnected': 'Imetenganishwa'
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: localStorage.getItem('language') || 'en',
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
