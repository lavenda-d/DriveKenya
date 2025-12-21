import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint, Eye, Shield, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable
} from '@simplewebauthn/browser';

const BiometricLogin = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkSupport();
    checkRegistration();
  }, []);

  const checkSupport = async () => {
    const supported = browserSupportsWebAuthn();
    const platformAvailable = await platformAuthenticatorIsAvailable();

    setIsSupported(supported);
    setIsPlatformAvailable(platformAvailable);
  };

  const checkRegistration = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/api/auth/biometric/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsRegistered(data.isRegistered);
      } else {
        setIsRegistered(false);
      }
    } catch (err) {
      console.error('Failed to check biometric registration status');
      setIsRegistered(false);
    }
  };

  const registerBiometric = async () => {
    setLoading(true);
    setError('');

    try {
      // Get registration options from server
      const optionsResponse = await fetch('/api/auth/biometric/register/begin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const options = await optionsResponse.json();

      if (!options.success) {
        throw new Error(options.message);
      }

      // Start WebAuthn registration
      const attResp = await startRegistration(options.options);

      // Send response to server for verification
      const verificationResponse = await fetch('/api/auth/biometric/register/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          credential: attResp
        })
      });

      const verificationData = await verificationResponse.json();

      if (verificationData.success) {
        setSuccess('Biometric authentication registered successfully!');
        setIsRegistered(true);
        onSuccess?.('Biometric registration completed');
      } else {
        throw new Error(verificationData.message);
      }
    } catch (err) {
      console.error('Biometric registration error:', err);
      setError(err.message || 'Failed to register biometric authentication');
      onError?.(err.message);
    }

    setLoading(false);
  };

  const authenticateWithBiometric = async () => {
    setLoading(true);
    setError('');

    try {
      // Get authentication options from server
      const optionsResponse = await fetch('/api/auth/biometric/authenticate/begin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const options = await optionsResponse.json();

      if (!options.success) {
        throw new Error(options.message);
      }

      // Start WebAuthn authentication
      const asseResp = await startAuthentication(options.options);

      // Send response to server for verification
      const verificationResponse = await fetch('/api/auth/biometric/authenticate/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credential: asseResp
        })
      });

      const verificationData = await verificationResponse.json();

      if (verificationData.success) {
        setSuccess('Authentication successful!');
        onSuccess?.(verificationData);
      } else {
        throw new Error(verificationData.message);
      }
    } catch (err) {
      console.error('Biometric authentication error:', err);
      setError(err.message || 'Authentication failed');
      onError?.(err.message);
    }

    setLoading(false);
  };

  const removeBiometric = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/biometric/remove', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Biometric authentication removed');
        setIsRegistered(false);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to remove biometric authentication');
    }

    setLoading(false);
  };

  if (!isSupported) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Fingerprint className="text-gray-400" size={24} />
          <h3 className="text-lg font-semibold">{t('auth.fingerprintLogin')}</h3>
        </div>

        <div className="text-center py-8">
          <Smartphone className="mx-auto text-gray-300 mb-4" size={48} />
          <h4 className="text-gray-600 font-medium mb-2">Not Supported</h4>
          <p className="text-gray-500 text-sm">
            Your browser or device doesn't support biometric authentication.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Fingerprint className={isRegistered ? "text-green-500" : "text-gray-400"} size={24} />
        <h3 className="text-lg font-semibold">{t('auth.fingerprintLogin')}</h3>
        {isRegistered && (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
            Registered
          </span>
        )}
      </div>

      <div className="space-y-4">
        {!isPlatformAvailable && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700 text-sm">
              Platform authenticator not available. External security keys can still be used.
            </p>
          </div>
        )}

        {!isRegistered ? (
          <div className="text-center">
            <div className="mb-6">
              <Fingerprint className="mx-auto text-gray-300 mb-4" size={64} />
              <h4 className="font-medium mb-2">Setup Biometric Login</h4>
              <p className="text-gray-600 text-sm">
                Use your fingerprint, face recognition, or security key to login quickly and securely.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 border border-gray-200 rounded-lg">
                <Fingerprint className="mx-auto mb-2" size={24} />
                <div className="text-sm font-medium">Fingerprint</div>
                <div className="text-xs text-gray-500">Touch sensor</div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <Eye className="mx-auto mb-2" size={24} />
                <div className="text-sm font-medium">Face ID</div>
                <div className="text-xs text-gray-500">Camera recognition</div>
              </div>
            </div>

            <button
              onClick={registerBiometric}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('auth.enableBiometrics')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="mx-auto text-green-500 mb-2" size={48} />
              <h4 className="font-medium text-green-700">Biometric Login Active</h4>
              <p className="text-gray-600 text-sm mt-1">
                You can now use biometric authentication to login.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={authenticateWithBiometric}
                disabled={loading}
                className="flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Fingerprint size={16} />
                <span>{loading ? t('common.loading') : t('auth.useBiometrics')}</span>
              </button>

              <button
                onClick={removeBiometric}
                disabled={loading}
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? t('common.loading') : 'Remove'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="text-red-500" size={16} />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <CheckCircle className="text-green-500" size={16} />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          Biometric data is stored securely on your device and never shared.
        </div>
      </div>
    </div>
  );
};

export default BiometricLogin;