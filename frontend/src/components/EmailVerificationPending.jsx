import React, { useState } from 'react';

const EmailVerificationPending = ({ email, onBackToLogin, onResendEmail }) => {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setResending(true);
    setError('');
    setResent(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setResent(true);
        if (onResendEmail) onResendEmail();
      } else {
        setError(data.message || 'Failed to resend verification email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Resend verification error:', err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="text-center p-8">
      {/* Success Icon */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-400/30 animate-pulse">
          <span className="text-5xl">📧</span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email!</h2>
      <p className="text-muted-foreground mb-6">
        We've sent a verification link to
      </p>

      {/* Email Display */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 mb-6">
        <p className="text-lg font-semibold text-foreground break-all">{email}</p>
      </div>

      {/* Instructions */}
      <div className="space-y-4 mb-8">
        <div className="flex items-start gap-3 text-left p-3 bg-blue-500/10 rounded-xl">
          <span className="text-lg">1️⃣</span>
          <p className="text-sm text-foreground">Open your email inbox and look for our verification email</p>
        </div>
        <div className="flex items-start gap-3 text-left p-3 bg-blue-500/10 rounded-xl">
          <span className="text-lg">2️⃣</span>
          <p className="text-sm text-foreground">Click the "Verify Email" button in the email</p>
        </div>
        <div className="flex items-start gap-3 text-left p-3 bg-blue-500/10 rounded-xl">
          <span className="text-lg">3️⃣</span>
          <p className="text-sm text-foreground">You'll be redirected back to log in with your new account</p>
        </div>
      </div>

      {/* Didn't receive email */}
      <div className="border-t border-border pt-6">
        <p className="text-sm text-muted-foreground mb-4">Didn't receive the email?</p>
        
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
            ❌ {error}
          </div>
        )}

        {resent && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm mb-4">
            ✅ Verification email resent! Check your inbox.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-all"
          >
            {resending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Sending...
              </span>
            ) : resent ? (
              '✅ Email Sent!'
            ) : (
              '🔄 Resend Email'
            )}
          </button>
          <button
            onClick={onBackToLogin}
            className="flex-1 bg-muted/50 hover:bg-muted text-foreground py-3 rounded-xl font-medium transition-all"
          >
            ← Back to Login
          </button>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-xl">
        <p className="text-xs text-yellow-300/90">
          <span className="font-semibold">💡 Tip:</span> Check your spam/junk folder if you don't see the email in your inbox. The email comes from <span className="font-medium">noreply@drivekenya.com</span>
        </p>
      </div>
    </div>
  );
};

export default EmailVerificationPending;
