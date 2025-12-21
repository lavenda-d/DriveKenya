import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Phone, Share2, Shield, MapPin, Clock, Users, Send } from 'lucide-react';

const EmergencyButton = ({ bookingId, currentLocation }) => {
  const { t } = useTranslation();
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmergencyContacts();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isEmergency) {
      triggerEmergency();
    }
  }, [countdown, isEmergency]);

  const fetchEmergencyContacts = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/emergency/contacts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        // Use default contacts if API fails
        setEmergencyContacts([
          { name: 'Emergency Services', phone: '999', relationship: 'Emergency', type: 'emergency' },
          { name: 'Police', phone: '112', relationship: 'Law Enforcement', type: 'police' },
          { name: 'DriveKenya Support', phone: '+254700000000', relationship: 'Customer Support', type: 'support' }
        ]);
        return;
      }

      const data = await response.json();
      setEmergencyContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch emergency contacts:', error);
      // Use default contacts on error
      setEmergencyContacts([
        { name: 'Emergency Services', phone: '999', relationship: 'Emergency', type: 'emergency' },
        { name: 'Police', phone: '112', relationship: 'Law Enforcement', type: 'police' },
        { name: 'DriveKenya Support', phone: '+254700000000', relationship: 'Customer Support', type: 'support' }
      ]);
    }
  };

  const handleEmergencyPress = () => {
    setIsEmergency(true);
    setCountdown(5); // 5 second countdown
  };

  const cancelEmergency = () => {
    setIsEmergency(false);
    setCountdown(0);
  };

  const triggerEmergency = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/emergency/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookingId,
          location: currentLocation,
          type: 'panic_button',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Show confirmation
        alert('Emergency alert sent! Authorities and emergency contacts have been notified.');

        // Auto-call emergency services after 10 seconds
        setTimeout(() => {
          window.location.href = 'tel:+254911'; // Kenya emergency number
        }, 10000);
      }
    } catch (error) {
      console.error('Failed to trigger emergency:', error);
      alert('Failed to send emergency alert. Please call emergency services directly.');
    }
    setLoading(false);
    setIsEmergency(false);
  };

  return (
    <div className="space-y-4">
      {/* Emergency Button */}
      <div className="text-center">
        {!isEmergency ? (
          <button
            onClick={handleEmergencyPress}
            className="w-32 h-32 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-full shadow-lg transform transition-transform hover:scale-105 active:scale-95"
            disabled={loading}
          >
            <div className="flex flex-col items-center justify-center">
              <AlertTriangle size={40} />
              <span className="text-sm font-bold mt-1">EMERGENCY</span>
            </div>
          </button>
        ) : (
          <div className="relative">
            <button
              onClick={cancelEmergency}
              className="w-32 h-32 bg-red-800 text-white rounded-full shadow-lg animate-pulse"
            >
              <div className="flex flex-col items-center justify-center">
                <AlertTriangle size={40} />
                <span className="text-lg font-bold">{countdown}</span>
                <span className="text-xs">TAP TO CANCEL</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {isEmergency && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="text-center">
            <h3 className="text-lg font-bold text-red-800 mb-2">
              Emergency Alert Activating
            </h3>
            <p className="text-red-700 text-sm mb-3">
              Emergency services will be contacted in {countdown} seconds
            </p>
            <button
              onClick={cancelEmergency}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel Emergency
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => window.location.href = 'tel:+254911'}
          className="flex items-center justify-center space-x-2 p-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Phone size={16} />
          <span>Call Police</span>
        </button>

        <button
          onClick={() => window.location.href = 'tel:+254999'}
          className="flex items-center justify-center space-x-2 p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <Phone size={16} />
          <span>Medical</span>
        </button>
      </div>

      {/* Emergency Contacts */}
      {emergencyContacts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Users className="mr-2" size={16} />
            Emergency Contacts
          </h4>
          <div className="space-y-2">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="flex items-center justify-between p-2 border border-gray-100 rounded bg-gray-50">
                <div>
                  <div className="font-medium text-gray-900">{contact.name}</div>
                  <div className="text-sm text-gray-600">{contact.relationship || contact.type}</div>
                </div>
                <button
                  onClick={() => window.location.href = `tel:${contact.phone}`}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Phone size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyButton;