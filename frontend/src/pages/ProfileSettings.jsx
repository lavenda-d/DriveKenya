import { useState, useEffect } from 'react';
import ProfilePhoto from '../components/ProfilePhoto';
import DocumentVerification from '../components/DocumentVerification';
import PasswordStrength from '../components/PasswordStrength';
import { authStorage, authAPI } from '../services/api';
import { changePassword } from '../services/apiExtensions';
import { useToast, LoadingSpinner } from '../components/UIUtils';
import { User, Mail, Phone, Shield, Camera, Lock, Settings, Bell, LifeBuoy, Globe, Fingerprint, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

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
        { id: 'profile', label: 'Profile Info', icon: <User size={18} /> },
        { id: 'photo', label: 'Profile Photo', icon: <Camera size={18} /> },
        { id: 'verification', label: 'Verification', icon: <Shield size={18} /> },
        { id: 'security', label: 'Security', icon: <Lock size={18} /> },
        { id: 'emergency', label: 'Emergency', icon: <LifeBuoy size={18} /> },
        { id: 'advanced', label: 'Advanced', icon: <Settings size={18} /> }
    ];


    // Emergency Contact State
    const [primaryContact, setPrimaryContact] = useState({ name: '', relationship: '', phone: '' });
    const [secondaryContact, setSecondaryContact] = useState({ name: '', relationship: '', phone: '' });
    const [savedContacts, setSavedContacts] = useState(null);

    // Advanced features state (mock)
    const [advancedFeatures, setAdvancedFeatures] = useState({
        aiRecommendations: false,
        performanceMonitoring: false
    });

    const toggleFeature = (feature) => {
        setAdvancedFeatures(prev => ({
            ...prev,
            [feature]: !prev[feature]
        }));
        showToast(`${feature} ${!advancedFeatures[feature] ? 'enabled' : 'disabled'}`, 'success');
    };

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
        <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-md font-sans">
            <div className="bg-card backdrop-blur-xl text-foreground rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border shadow-2xl flex flex-col relative">
                <ToastContainer />

                {/* Animated Background Decorations */}
                <div className="absolute top-0 left-0 -mt-20 -ml-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 -mb-20 -mr-20 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-border relative z-10">
                    <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Profile & Settings</h2>
                        <p className="text-muted-foreground mt-1">Manage your account preferences and security settings</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary p-3 rounded-full transition-all group"
                    >
                        <span className="text-2xl group-hover:scale-110 block leading-none">×</span>
                    </button>
                </div>

                {/* Main Viewport */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative z-10">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border overflow-y-auto bg-muted/10 md:bg-transparent">
                        <div className="p-4 space-y-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${activeTab === tab.id
                                        ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/20 translate-x-1'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                        }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span className="text-sm">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 bg-card">
                        {/* Profile Info Tab */}
                        {activeTab === 'profile' && (
                            <div className="max-w-2xl fade-in space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold text-foreground mb-2">Personal Information</h3>
                                    <p className="text-muted-foreground text-sm">Update your public profile and contact details</p>
                                </div>
                                <form onSubmit={handleProfileUpdate} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground ml-1">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    required
                                                    placeholder="Enter your name"
                                                    className="w-full pl-12 pr-4 py-3 bg-input/20 border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-muted-foreground text-foreground"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-muted-foreground ml-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    required
                                                    className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-muted-foreground cursor-not-allowed"
                                                    disabled
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium text-muted-foreground ml-1">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="+254 700 000 000"
                                                    className="w-full pl-12 pr-4 py-3 bg-input/20 border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-muted-foreground text-foreground"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 border border-border rounded-2xl p-6 mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                                <Shield className="text-blue-500" size={24} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Account Status</p>
                                                <p className="font-bold text-foreground uppercase tracking-wider text-xs">
                                                    Verified {user?.is_car_owner ? 'Fleet Owner' : 'Standard Renter'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className={`px-8 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg ${saving
                                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                                : 'bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-primary/20'
                                                }`}
                                        >
                                            {saving ? 'Updating...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Profile Photo Tab */}
                        {activeTab === 'photo' && (
                            <div className="max-w-2xl fade-in">
                                <ProfilePhoto
                                    currentPhotoUrl={user?.profile_photo}
                                    onPhotoUpdated={(url) => {
                                        const updatedUser = { ...user, profile_photo: url };
                                        authStorage.setUser(updatedUser);
                                        onUserUpdated(updatedUser);
                                    }}
                                />
                                <div className="mt-8 p-6 bg-muted/30 border border-border rounded-2xl">
                                    <p className="text-sm text-muted-foreground flex items-center">
                                        <Camera className="mr-2 opacity-50" size={16} />
                                        Your photo helps owners and renters identify you.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Verification Tab */}
                        {activeTab === 'verification' && (
                            <div className="max-w-2xl fade-in bg-card border border-border rounded-3xl p-8 backdrop-blur-md shadow-sm">
                                <DocumentVerification />
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="max-w-2xl fade-in space-y-10">
                                <div>
                                    <h3 className="text-xl font-bold text-foreground mb-2 flex items-center">
                                        <Lock className="mr-2 text-primary" size={24} />
                                        Security Settings
                                    </h3>
                                    <p className="text-muted-foreground text-sm">Update your password and manage account security</p>
                                </div>

                                <form onSubmit={handlePasswordChange} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground ml-1">Current Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.currentPassword}
                                            onChange={(e) =>
                                                setPasswordData({ ...passwordData, currentPassword: e.target.value })
                                            }
                                            required
                                            className="w-full px-4 py-3 bg-input/20 border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-foreground"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground ml-1">New Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) =>
                                                setPasswordData({ ...passwordData, newPassword: e.target.value })
                                            }
                                            required
                                            className="w-full px-4 py-3 bg-input/20 border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-foreground"
                                        />
                                        <div className="mt-4 bg-muted/30 p-4 rounded-xl border border-border">
                                            <PasswordStrength password={passwordData.newPassword} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground ml-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) =>
                                                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                                            }
                                            required
                                            className="w-full px-4 py-3 bg-input/20 border border-input rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-foreground"
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-10 py-3 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded-xl font-bold transition-all shadow-xl disabled:opacity-50"
                                        >
                                            {saving ? 'Updating...' : 'Change Password'}
                                        </button>
                                    </div>
                                </form>

                                <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                                    <h4 className="font-bold text-blue-600 mb-4 flex items-center">
                                        <Shield size={18} className="mr-2" /> Security Standards
                                    </h4>
                                    <ul className="text-sm text-muted-foreground space-y-2">
                                        <li className="flex items-center text-blue-600/80"><CheckCircle size={14} className="mr-2 text-blue-500" /> Your password is hashed and safely stored</li>
                                        <li className="flex items-center text-blue-600/80"><CheckCircle size={14} className="mr-2 text-blue-500" /> We never share your sensitive information</li>
                                        <li className="flex items-center text-blue-600/80"><Zap size={14} className="mr-2 text-yellow-500" /> 2FA is coming soon for all DriveKenya accounts</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Emergency Info Tab */}
                        {activeTab === 'emergency' && (
                            <div className="max-w-2xl fade-in space-y-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-foreground mb-2">Emergency Contacts</h3>
                                    <p className="text-muted-foreground">Designated contacts for safety and assistance</p>
                                </div>

                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 backdrop-blur-sm">
                                    <div className="flex items-start space-x-4">
                                        <div className="p-3 bg-yellow-500/20 rounded-xl text-yellow-600">
                                            <AlertTriangle size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-yellow-600 mb-1">Safety First</h4>
                                            <p className="text-sm text-yellow-600/80 leading-relaxed">
                                                Your emergency contacts will only be notified in strictly defined cases like accidents, breakdowns, or critical safety alerts.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-muted/20 border border-border rounded-2xl p-6">
                                        <h4 className="font-bold text-foreground mb-6 flex items-center uppercase tracking-widest text-xs">
                                            <User className="mr-2 text-primary" size={16} /> Primary Contact
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground/70 ml-1">FULL NAME</label>
                                                <input
                                                    type="text"
                                                    placeholder="John Doe"
                                                    value={primaryContact.name}
                                                    onChange={(e) => setPrimaryContact({ ...primaryContact, name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-input/20 border border-input rounded-xl text-foreground outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground/70 ml-1">RELATIONSHIP</label>
                                                <select
                                                    value={primaryContact.relationship}
                                                    onChange={(e) => setPrimaryContact({ ...primaryContact, relationship: e.target.value })}
                                                    className="w-full px-4 py-3 bg-input/20 border border-input rounded-xl text-foreground outline-none">
                                                    <option value="" className="text-foreground">Select...</option>
                                                    <option value="spouse" className="text-foreground">Spouse</option>
                                                    <option value="parent" className="text-foreground">Parent</option>
                                                    <option value="sibling" className="text-foreground">Sibling</option>
                                                    <option value="friend" className="text-foreground">Friend</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-xs font-bold text-muted-foreground/70 ml-1">PHONE NUMBER</label>
                                                <input
                                                    type="tel"
                                                    placeholder="+254 700 000 000"
                                                    value={primaryContact.phone}
                                                    onChange={(e) => setPrimaryContact({ ...primaryContact, phone: e.target.value })}
                                                    className="w-full px-4 py-3 bg-input/20 border border-input rounded-xl text-foreground outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const token = authStorage.getToken();
                                                if (!token) {
                                                    showToast('Please login to save contacts', 'error');
                                                    return;
                                                }
                                                const payload = { primary: primaryContact, secondary: secondaryContact };
                                                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/emergency-contacts`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                                    body: JSON.stringify(payload)
                                                });
                                                const data = await res.json();
                                                if (res.ok && data.success) {
                                                    showToast('Emergency contacts updated', 'success');
                                                    setSavedContacts(payload);
                                                } else {
                                                    throw new Error(data.message || 'Failed to update');
                                                }
                                            } catch (e) {
                                                showToast(e.message, 'error');
                                            }
                                        }}
                                        className="w-full py-4 bg-gradient-to-r from-primary to-purple-600 rounded-2xl font-bold text-white shadow-lg hover:shadow-primary/20 active:scale-95 transition-all"
                                    >
                                        Update Emergency Info
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Advanced Features Tab */}
                        {activeTab === 'advanced' && (
                            <div className="max-w-2xl fade-in space-y-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-foreground mb-2">Advanced Labs</h3>
                                    <p className="text-muted-foreground">Experimental features and power settings</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {/* Features mapping */}
                                    <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between group hover:shadow-md transition-all">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                                                <Globe size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground">Multilingual Experience</h4>
                                                <p className="text-sm text-muted-foreground">Switch between English & Swahili</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-1 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded uppercase tracking-tighter">Labs</span>
                                    </div>

                                    <div className="bg-muted/30 border border-border rounded-2xl p-6 flex items-center justify-between group hover:bg-muted/50 transition-all">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                                                <Fingerprint size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground">Biometric Security</h4>
                                                <p className="text-sm text-muted-foreground">FaceID and Fingerprint unlock</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-1 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 rounded uppercase tracking-tighter">Coming Soon</span>
                                    </div>

                                    <div className="bg-muted/30 border border-border rounded-2xl p-6 flex items-center justify-between group hover:bg-muted/50 transition-all">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                                                <Zap size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground">AI Recommendations</h4>
                                                <p className="text-sm text-muted-foreground">Smart matching based on driving style</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleFeature('aiRecommendations')}
                                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${advancedFeatures.aiRecommendations
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-muted text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            {advancedFeatures.aiRecommendations ? 'Enabled' : 'Enable'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
