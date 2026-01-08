import React, { useState } from 'react';

const ProfileCompletionModal = ({ isOpen, onClose, onComplete, user }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // If starts with +254, keep it
    if (cleaned.startsWith('+254')) {
      return cleaned;
    }
    // If starts with 254, add +
    if (cleaned.startsWith('254')) {
      return '+' + cleaned;
    }
    // If starts with 0, replace with +254
    if (cleaned.startsWith('0')) {
      return '+254' + cleaned.slice(1);
    }
    // If starts with 7 or 1 (Kenyan mobile), add +254
    if (/^[17]/.test(cleaned)) {
      return '+254' + cleaned;
    }
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      // Validate phone number
      const phoneRegex = /^\+254[17]\d{8}$/;
      if (!phoneRegex.test(formattedPhone)) {
        setError('Please enter a valid Kenyan phone number (e.g., 0712345678)');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('driveKenya_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone: formattedPhone })
      });

      const data = await response.json();

      if (data.success) {
        onComplete(data.user);
        onClose();
      } else {
        setError(data.message || 'Failed to complete profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Profile completion error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-background/90 backdrop-blur-lg"
        onClick={() => {}} // Don't allow closing by clicking backdrop
      ></div>

      <div className="relative bg-card border border-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-500">
        {/* Header Decoration */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-600/10 rounded-full blur-[80px]"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-green-600/10 rounded-full blur-[80px]"></div>

        <div className="p-8 relative z-10">
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-green-500/20 border border-blue-400/30 mb-4">
              <span className="text-4xl">📱</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Almost There!</h2>
            <p className="text-muted-foreground text-sm">
              We need a few more details to finish setting up your account.
            </p>
          </div>

          {/* User Info */}
          {user && (
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl mb-6">
              {user.avatar_url || user.avatar ? (
                <img 
                  src={user.avatar_url || user.avatar} 
                  alt={user.name} 
                  className="w-12 h-12 rounded-full border-2 border-primary/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                  {user.name?.[0] || '👤'}
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  🇰🇪
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="w-full pl-12 pr-4 py-3 bg-input/50 border border-input rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your mobile number for M-Pesa payments and booking updates
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:opacity-50 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Completing Profile...
                </span>
              ) : (
                '✅ Complete My Profile'
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-xl">
            <p className="text-xs text-blue-300 leading-relaxed">
              <span className="font-semibold">Why do we need your phone?</span>
              <br />
              • Receive booking confirmations via SMS
              <br />
              • Enable M-Pesa payments
              <br />
              • Allow car owners to contact you
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;
