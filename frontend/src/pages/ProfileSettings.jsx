import { useState, useEffect } from 'react';
import ProfilePhoto from '../components/ProfilePhoto';
import DocumentVerification from '../components/DocumentVerification';
import PasswordStrength from '../components/PasswordStrength';
import { authStorage, usersAPI } from '../services/api';
import { changePassword } from '../services/apiExtensions';
import { useToast, LoadingSpinner } from '../components/UIUtils';

const ProfileSettings = ({ user, token, onClose, onUserUpdated }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState(false);
    const { showToast, ToastContainer } = useToast();

    // Handle photo updated
    const handlePhotoUpdated = (photoUrl) => {
        const busted = `${photoUrl}?t=${Date.now()}`;
        const updatedUser = { ...user, profile_photo: busted };
        onUserUpdated(updatedUser);
    };

    // Profile form state
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || ''
    });

    // Password change state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Advanced features state (persisted in localStorage)
    const [advancedFeatures, setAdvancedFeatures] = useState(() => {
        const saved = localStorage.getItem('dk_advanced_features');
        return saved ? JSON.parse(saved) : {
            aiRecommendations: false,
            gpsTracking: true,
            emergencyFeatures: true,
            liveChat: true,
            performanceMonitoring: false,
            fraudDetection: false,
            advancedAnalytics: false
        };
    });

    const toggleFeature = (feature) => {
        setAdvancedFeatures(prev => {
            const updated = { ...prev, [feature]: !prev[feature] };
            localStorage.setItem('dk_advanced_features', JSON.stringify(updated));
            showToast(`${feature} ${updated[feature] ? 'enabled' : 'disabled'}!`, 'success');
            return updated;
        });
    };

    const tabs = [
        { id: 'profile', label: 'Profile Info', icon: '👤' },
        { id: 'photo', label: 'Profile Photo', icon: '📸' },
        { id: 'verification', label: 'Verification', icon: '🔐' },
        { id: 'security', label: 'Security', icon: '🔒' },
        { id: 'emergency', label: 'Emergency Info', icon: '🚨' },
        { id: 'advanced', label: 'Advanced Features', icon: '⚙️' }
    ];

    // Emergency Contacts state
    const [primaryContact, setPrimaryContact] = useState({ name: '', relationship: '', phone: '' });
    const [secondaryContact, setSecondaryContact] = useState({ name: '', relationship: '', phone: '' });
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [savedContacts, setSavedContacts] = useState(null);

    // Load emergency contacts when emergency tab is active
    useEffect(() => {
        const loadEmergencyContacts = async () => {
            if (activeTab === 'emergency' && token) {
                setLoadingContacts(true);
                try {
                    const response = await fetch('http://localhost:5000/api/users/emergency-contacts', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.data) {
                            setSavedContacts(data.data);
                            // Pre-fill form with saved data
                            if (data.data.primary) {
                                setPrimaryContact(data.data.primary);
                            }
                            if (data.data.secondary) {
                                setSecondaryContact(data.data.secondary);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to load emergency contacts:', error);
                } finally {
                    setLoadingContacts(false);
                }
            }
        };
        loadEmergencyContacts();
    }, [activeTab, token]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Update profile via API
            const response = await usersAPI.updateProfile(formData, token);

            if (response.success) {
                const updatedUser = { ...user, ...formData };
                authStorage.setUser(updatedUser);
                onUserUpdated(updatedUser);
                showToast('Profile updated successfully!', 'success');
            }
        } catch (error) {
            showToast(error.message || 'Failed to update profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }

        setSaving(true);

        try {
            await changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, token);

            showToast('Password changed successfully!', 'success');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            showToast(error.message || 'Failed to change password', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <ToastContainer />

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Profile & Settings</h2>
                        <p className="text-sm text-gray-600 mt-1">Manage your account and preferences</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-3xl font-light"
                    >
                        ×
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 bg-gray-50">
                    <div className="flex overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {/* Profile Info Tab */}
                    {activeTab === 'profile' && (
                        <div className="max-w-2xl">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                            
                            {/* User Status Cards */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="text-sm text-blue-600 font-medium mb-1">Account Type</div>
                                    <div className="text-lg font-semibold text-blue-900">
                                        {user?.role === 'host' ? '🔑 Car Owner' : user?.role === 'admin' ? '👑 Administrator' : '🚗 Customer'}
                                    </div>
                                </div>
                                <div className={`border rounded-lg p-4 ${
                                    user?.email_verified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                                }`}>
                                    <div className={`text-sm font-medium mb-1 ${
                                        user?.email_verified ? 'text-green-600' : 'text-yellow-600'
                                    }`}>Verification Status</div>
                                    <div className={`text-lg font-semibold ${
                                        user?.email_verified ? 'text-green-900' : 'text-yellow-900'
                                    }`}>
                                        {user?.email_verified ? '✓ Verified' : '⚠ Not Verified'}
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                        />
                                        {user?.email_verified && (
                                            <span className="text-green-600 text-xl" title="Email Verified">✓</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+254 700 000 000"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-4">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium">Member Since:</span>{' '}
                                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${saving
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Profile Photo Tab */}
                    {activeTab === 'photo' && (
                        <div className="max-w-2xl">
                            <ProfilePhoto
                                currentPhotoUrl={user?.profile_photo}
                                onPhotoUpdated={(url) => {
                                    const updatedUser = { ...user, profile_photo: url };
                                    authStorage.setUser(updatedUser);
                                    onUserUpdated(updatedUser);
                                }}
                            />
                        </div>
                    )}

                    {/* Verification Tab */}
                    {activeTab === 'verification' && (
                        <div className="max-w-2xl">
                            <DocumentVerification />
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="max-w-2xl">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current Password *
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={(e) =>
                                            setPasswordData({ ...passwordData, currentPassword: e.target.value })
                                        }
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        New Password *
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) =>
                                            setPasswordData({ ...passwordData, newPassword: e.target.value })
                                        }
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    />
                                    <div className="mt-2">
                                        <PasswordStrength password={passwordData.newPassword} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm New Password *
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) =>
                                            setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                                        }
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${saving
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                    >
                                        {saving ? 'Changing...' : 'Change Password'}
                                    </button>
                                </div>
                            </form>

                            <div className="mt-8 pt-8 border-t border-gray-200">
                                <h4 className="font-semibold text-gray-800 mb-2">Account Security</h4>
                                <ul className="text-sm text-gray-600 space-y-2">
                                    <li>✓ Your password is encrypted and secure</li>
                                    <li>✓ We never share your personal information</li>
                                    <li>✓ Two-factor authentication (Coming soon)</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Emergency Info Tab */}
                    {activeTab === 'emergency' && (
                        <div className="max-w-2xl">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Emergency Information</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Add emergency contacts who can be reached if something happens during your rental.
                            </p>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <span className="text-2xl mr-3">⚠️</span>
                                    <div>
                                        <h4 className="font-semibold text-yellow-900 mb-1">Safety First</h4>
                                        <p className="text-sm text-yellow-800">
                                            Your emergency contacts will only be contacted in case of an accident, breakdown, or emergency alert.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Primary Emergency Contact */}
                                <div className="border border-gray-300 rounded-lg p-6 bg-white">
                                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                                        <span className="text-xl mr-2">👤</span>
                                        Primary Emergency Contact
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                            <input
                                                type="text"
                                                placeholder="John Doe"
                                                value={primaryContact.name}
                                                onChange={(e) => setPrimaryContact({ ...primaryContact, name: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                                            <select
                                                value={primaryContact.relationship}
                                                onChange={(e) => setPrimaryContact({ ...primaryContact, relationship: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
                                                <option value="">Select relationship</option>
                                                <option value="spouse">Spouse</option>
                                                <option value="parent">Parent</option>
                                                <option value="sibling">Sibling</option>
                                                <option value="friend">Friend</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                            <input
                                                type="tel"
                                                placeholder="+254 700 000000"
                                                value={primaryContact.phone}
                                                onChange={(e) => setPrimaryContact({ ...primaryContact, phone: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Secondary Emergency Contact */}
                                <div className="border border-gray-300 rounded-lg p-6 bg-white">
                                    <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                                        <span className="text-xl mr-2">👥</span>
                                        Secondary Emergency Contact
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                            <input
                                                type="text"
                                                placeholder="Jane Smith"
                                                value={secondaryContact.name}
                                                onChange={(e) => setSecondaryContact({ ...secondaryContact, name: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                                            <select
                                                value={secondaryContact.relationship}
                                                onChange={(e) => setSecondaryContact({ ...secondaryContact, relationship: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900">
                                                <option value="">Select relationship</option>
                                                <option value="spouse">Spouse</option>
                                                <option value="parent">Parent</option>
                                                <option value="sibling">Sibling</option>
                                                <option value="friend">Friend</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                            <input
                                                type="tel"
                                                placeholder="+254 700 000000"
                                                value={secondaryContact.phone}
                                                onChange={(e) => setSecondaryContact({ ...secondaryContact, phone: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Saved Contacts Display */}
                                {savedContacts && (savedContacts.primary || savedContacts.secondary) && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                                        <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                                            <span className="text-xl mr-2">✅</span>
                                            Saved Emergency Contacts
                                        </h4>
                                        <div className="space-y-3">
                                            {savedContacts.primary && savedContacts.primary.name && (
                                                <div className="bg-white rounded-lg p-4">
                                                    <div className="flex items-start">
                                                        <span className="text-2xl mr-3">👤</span>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">{savedContacts.primary.name}</p>
                                                            <p className="text-sm text-gray-600 capitalize">{savedContacts.primary.relationship}</p>
                                                            <p className="text-sm text-gray-800 mt-1">📞 {savedContacts.primary.phone}</p>
                                                        </div>
                                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Primary</span>
                                                    </div>
                                                </div>
                                            )}
                                            {savedContacts.secondary && savedContacts.secondary.name && (
                                                <div className="bg-white rounded-lg p-4">
                                                    <div className="flex items-start">
                                                        <span className="text-2xl mr-3">👥</span>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">{savedContacts.secondary.name}</p>
                                                            <p className="text-sm text-gray-600 capitalize">{savedContacts.secondary.relationship}</p>
                                                            <p className="text-sm text-gray-800 mt-1">📞 {savedContacts.secondary.phone}</p>
                                                        </div>
                                                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">Secondary</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const token = authStorage.getToken();
                                            if (!token) {
                                                showToast('Please login to save contacts', 'error');
                                                return;
                                            }
                                            // Use actual form state
                                            const payload = {
                                                primary: primaryContact,
                                                secondary: secondaryContact
                                            };
                                            const res = await fetch('http://localhost:5000/api/users/emergency-contacts', {
                                                method: 'PUT',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify(payload)
                                            });
                                            const data = await res.json();
                                            if (res.ok && data.success) {
                                                showToast('Emergency contacts saved', 'success');
                                                // Reload saved contacts
                                                setSavedContacts(payload);
                                            } else {
                                                throw new Error(data.message || 'Failed to save contacts');
                                            }
                                        } catch (e) {
                                            showToast(e.message, 'error');
                                        }
                                    }}
                                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Save Emergency Contacts
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Advanced Features Tab */}
                    {activeTab === 'advanced' && (
                        <div className="max-w-2xl">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Advanced Features</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Explore advanced features to enhance your DriveKenya experience.
                            </p>

                            <div className="space-y-4">
                                {/* Language Selection - All Users */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">🌐 Language Preference</h4>
                                            <p className="text-sm text-gray-600">Choose your preferred language</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-3">
                                        <button className="flex-1 px-4 py-2 border-2 border-blue-600 bg-blue-50 text-blue-600 rounded-lg font-medium">
                                            English
                                        </button>
                                        <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">
                                            Kiswahili
                                        </button>
                                    </div>
                                </div>

                                {/* Two-Factor Authentication - All Users */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">🔐 Two-Factor Authentication</h4>
                                            <p className="text-sm text-gray-600">Add an extra layer of security</p>
                                        </div>
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                            Coming Soon
                                        </span>
                                    </div>
                                </div>

                                {/* Biometric Login - All Users */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">👆 Biometric Login</h4>
                                            <p className="text-sm text-gray-600">Use fingerprint or face recognition</p>
                                        </div>
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                            Coming Soon
                                        </span>
                                    </div>
                                </div>

                                {/* AI Recommendations - All Users */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">🤖 AI Car Recommendations</h4>
                                            <p className="text-sm text-gray-600">Get personalized car suggestions</p>
                                        </div>
                                        <button 
                                            onClick={() => toggleFeature('aiRecommendations')}
                                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                                                advancedFeatures.aiRecommendations
                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                            }`}>
                                            {advancedFeatures.aiRecommendations ? '✓ Enabled' : 'Enable'}
                                        </button>
                                    </div>
                                </div>

                                {/* GPS Tracking - All Users */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">📍 GPS Live Tracking</h4>
                                            <p className="text-sm text-gray-600">Track your rental in real-time</p>
                                        </div>
                                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                            Available
                                        </span>
                                    </div>
                                </div>

                                {/* Emergency Features - All Users */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">📞 Emergency Features</h4>
                                            <p className="text-sm text-gray-600">Panic button and emergency contacts</p>
                                        </div>
                                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                            Available
                                        </span>
                                    </div>
                                </div>

                                {/* Live Chat Support - All Users */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">💬 Live Chat Support</h4>
                                            <p className="text-sm text-gray-600">24/7 customer assistance</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                showToast('Opening live chat...', 'info');
                                                setTimeout(() => window.location.hash = '#chat', 500);
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                                            Start Chat
                                        </button>
                                    </div>
                                </div>

                                {/* Performance Monitoring - All Users */}
                                <div className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-semibold text-gray-800">⚡ Performance Monitoring</h4>
                                            <p className="text-sm text-gray-600">App performance analytics</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => showToast('Performance Stats: App load time: 1.2s | API response: 250ms | Uptime: 99.9%', 'success')}
                                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                                                View Stats
                                            </button>
                                            <button 
                                                onClick={() => toggleFeature('performanceMonitoring')}
                                                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                                                    advancedFeatures.performanceMonitoring
                                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                                }`}>
                                                {advancedFeatures.performanceMonitoring ? '✓ Enabled' : 'Enable'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Fraud Detection - Host & Admin Only */}
                                {(user?.role === 'host' || user?.role === 'admin') && (
                                    <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold text-gray-800">⚠️ Fraud Detection</h4>
                                                <p className="text-sm text-gray-600">AI-powered security monitoring</p>
                                            </div>
                                            <button 
                                                onClick={() => showToast('Opening Fraud Detection Dashboard...', 'info')}
                                                className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700">
                                                View Dashboard
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Advanced Analytics - Admin Only */}
                                {user?.role === 'admin' && (
                                    <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold text-gray-800">📊 Advanced Analytics</h4>
                                                <p className="text-sm text-gray-600">Detailed platform insights & reports</p>
                                            </div>
                                            <button 
                                                onClick={() => showToast('Loading Analytics Dashboard...', 'info')}
                                                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
                                                View Reports
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
