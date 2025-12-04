import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';
import { Shield, Smartphone, Mail, Key, CheckCircle, AlertCircle } from 'lucide-react';

const TwoFactorAuth = ({ isEnabled, onToggle, userEmail }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState('setup');
  const [method, setMethod] = useState('app'); // 'app', 'sms', 'email'
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const setupAuthenticatorApp = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/setup-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setQrCode(data.qrCodeUrl);
        setBackupCodes(data.backupCodes);
        setStep('verify-app');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to setup authenticator app');
    }
    setLoading(false);
  };

  const setupSMS = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/setup-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ phone })
      });
      
      const data = await response.json();
      if (data.success) {
        setStep('verify-sms');
        setSuccess('Verification code sent to your phone');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to setup SMS authentication');
    }
    setLoading(false);
  };

  const setupEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/setup-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setStep('verify-email');
        setSuccess('Verification code sent to your email');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to setup email authentication');
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          code: verificationCode,
          method 
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess('Two-factor authentication enabled successfully!');
        onToggle(true);
        setStep('completed');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to verify code');
    }
    setLoading(false);
  };

  const disable2FA = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code: verificationCode })
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess('Two-factor authentication disabled');
        onToggle(false);
        setStep('setup');
        setVerificationCode('');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to disable 2FA');
    }
    setLoading(false);
  };

  if (isEnabled) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="text-green-500" size={24} />
          <h3 className="text-lg font-semibold">{t('auth.twoFactorAuth')}</h3>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
            {t('common.enabled')}
          </span>
        </div>
        
        <p className="text-gray-600 mb-4">
          Two-factor authentication is currently enabled for your account.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('auth.enterCode')}
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="123456"
              maxLength={6}
            />
          </div>

          <button
            onClick={disable2FA}
            disabled={!verificationCode || loading}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? t('common.loading') : 'Disable 2FA'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="text-red-500" size={16} />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <CheckCircle className="text-green-500" size={16} />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Shield className="text-gray-400" size={24} />
        <h3 className="text-lg font-semibold">{t('auth.twoFactorAuth')}</h3>
        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
          Disabled
        </span>
      </div>

      {step === 'setup' && (
        <div className="space-y-4">
          <p className="text-gray-600">
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setMethod('app')}
              className={`p-4 border rounded-lg text-center hover:border-blue-500 transition-colors ${
                method === 'app' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <Smartphone className="mx-auto mb-2" size={24} />
              <div className="font-medium">Authenticator App</div>
              <div className="text-sm text-gray-500">Google Authenticator, Authy</div>
            </button>

            <button
              onClick={() => setMethod('sms')}
              className={`p-4 border rounded-lg text-center hover:border-blue-500 transition-colors ${
                method === 'sms' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <Smartphone className="mx-auto mb-2" size={24} />
              <div className="font-medium">SMS</div>
              <div className="text-sm text-gray-500">Text message codes</div>
            </button>

            <button
              onClick={() => setMethod('email')}
              className={`p-4 border rounded-lg text-center hover:border-blue-500 transition-colors ${
                method === 'email' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <Mail className="mx-auto mb-2" size={24} />
              <div className="font-medium">Email</div>
              <div className="text-sm text-gray-500">Email verification codes</div>
            </button>
          </div>

          {method === 'sms' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('auth.phone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="+254712345678"
              />
            </div>
          )}

          <button
            onClick={() => {
              if (method === 'app') setupAuthenticatorApp();
              else if (method === 'sms') setupSMS();
              else setupEmail();
            }}
            disabled={loading || (method === 'sms' && !phone)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('common.loading') : `Setup ${method.toUpperCase()}`}
          </button>
        </div>
      )}

      {step === 'verify-app' && (
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="font-medium mb-2">Scan QR Code</h4>
            <div className="bg-white p-4 rounded-lg border inline-block">
              <QRCode value={qrCode} size={200} />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Scan this code with your authenticator app
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('auth.enterCode')}
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="123456"
              maxLength={6}
            />
          </div>

          <button
            onClick={verifyCode}
            disabled={!verificationCode || loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('auth.verifyCode')}
          </button>

          {backupCodes.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <Key size={16} className="mr-2" />
                Backup Codes
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                Save these codes in a secure location. You can use them to access your account if you lose your authenticator device.
              </p>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="bg-white p-2 rounded border">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(step === 'verify-sms' || step === 'verify-email') && (
        <div className="space-y-4">
          <div className="text-center">
            <h4 className="font-medium mb-2">
              Verify {method === 'sms' ? 'Phone' : 'Email'}
            </h4>
            <p className="text-gray-600">
              Enter the verification code sent to your {method === 'sms' ? 'phone' : 'email'}.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('auth.enterCode')}
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="123456"
              maxLength={6}
            />
          </div>

          <button
            onClick={verifyCode}
            disabled={!verificationCode || loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('auth.verifyCode')}
          </button>
        </div>
      )}

      {step === 'completed' && (
        <div className="text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h4 className="font-medium text-green-700">2FA Enabled Successfully!</h4>
          <p className="text-gray-600 mt-2">
            Your account is now protected with two-factor authentication.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="text-red-500" size={16} />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="text-green-500" size={16} />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth;