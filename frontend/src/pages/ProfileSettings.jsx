import { useState } from 'react';
import ProfilePhoto from '../components/ProfilePhoto';
import DocumentVerification from '../components/DocumentVerification';
import PasswordStrength from '../components/PasswordStrength';
import { authStorage, authAPI } from '../services/api';
import { changePassword } from '../services/apiExtensions';
import { useToast, LoadingSpinner } from '../components/UIUtils';

const ProfileSettings = ({ user, token, onClose, onUserUpdated }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState(false);
    const { showToast, ToastContainer } = useToast();

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

    const tabs = [
        { id: 'profile', label: 'Profile Info', icon: '👤' },
        { id: 'photo', label: 'Profile Photo', icon: '📸' },
        { id: 'verification', label: 'Verification', icon: '🔐' },
        { id: 'security', label: 'Security', icon: '🔒' }
    ];

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Update profile via API
            const response = await authAPI.updateProfile(formData, token);

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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-4">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium">Account Type:</span>{' '}
                                        {user?.is_car_owner ? 'Car Owner' : 'Renter'}
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
