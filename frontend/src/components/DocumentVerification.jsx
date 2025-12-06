import { useState, useEffect } from 'react';
import { authStorage } from '../services/api';
import { getVerificationStatus, uploadVerificationDocuments } from '../services/apiExtensions';
import { LoadingSpinner, ErrorDisplay, useToast, ProgressBar } from './UIUtils';

const DOCUMENT_TYPES = [
    { value: 'national_id', label: 'National ID', requiresBoth: true },
    { value: 'drivers_license', label: "Driver's License", requiresBoth: true },
    { value: 'passport', label: 'Passport', requiresBoth: false }
];

const VERIFICATION_STATUS = {
    NOT_SUBMITTED: 'not_submitted',
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

const DocumentVerification = () => {
    const [documentType, setDocumentType] = useState('national_id');
    const [frontFile, setFrontFile] = useState(null);
    const [backFile, setBackFile] = useState(null);
    const [frontPreview, setFrontPreview] = useState(null);
    const [backPreview, setBackPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showToast, ToastContainer } = useToast();

    const selectedDocType = DOCUMENT_TYPES.find(dt => dt.value === documentType);

    useEffect(() => {
        loadVerificationStatus();
    }, []);

    const loadVerificationStatus = async () => {
        const token = authStorage.getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const data = await getVerificationStatus(token);
            if (data) {
                setStatus(data.status || VERIFICATION_STATUS.NOT_SUBMITTED);
            }
        } catch (err) {
            console.error('Failed to load verification status:', err);
        } finally {
            setLoading(false);
        }
    };

    const validateFile = (file) => {
        if (!file) return 'No file selected';
        if (!file.type.startsWith('image/')) {
            return 'Invalid file type. Please upload an image.';
        }
        if (file.size > 10 * 1024 * 1024) {
            return 'File too large. Maximum size is 10MB.';
        }
        return null;
    };

    const handleFileSelect = (file, side) => {
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            showToast(validationError, 'error');
            return;
        }

        setError(null);

        // Generate preview
        const reader = new FileReader();
        reader.onloadend = () => {
            if (side === 'front') {
                setFrontFile(file);
                setFrontPreview(reader.result);
            } else {
                setBackFile(file);
                setBackPreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!frontFile) {
            showToast('Please upload the front of your document', 'error');
            return;
        }

        if (selectedDocType.requiresBoth && !backFile) {
            showToast('Please upload the back of your document', 'error');
            return;
        }

        const token = authStorage.getToken();
        if (!token) {
            showToast('Please login to submit documents', 'error');
            return;
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 10, 90));
            }, 300);

            // Use apiExtensions helper to upload verification documents
            const data = await uploadVerificationDocuments(documentType, frontFile, backFile, token);

            clearInterval(progressInterval);
            setProgress(100);

            showToast('Documents submitted successfully! We will review them shortly.', 'success');
            setStatus(VERIFICATION_STATUS.PENDING);

            // Reset form
            setTimeout(() => {
                setFrontFile(null);
                setBackFile(null);
                setFrontPreview(null);
                setBackPreview(null);
                setProgress(0);
            }, 1000);

        } catch (err) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to submit documents');
            showToast(err.message || 'Submission failed', 'error');
            setProgress(0);
        } finally {
            setUploading(false);
        }
    };

    const getStatusBadge = () => {
        switch (status) {
            case VERIFICATION_STATUS.PENDING:
                return (
                    <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg flex items-center">
                        <span className="text-xl mr-2">⏳</span>
                        <div>
                            <p className="font-semibold">Verification Pending</p>
                            <p className="text-sm">We're reviewing your documents. This usually takes 1-2 business days.</p>
                        </div>
                    </div>
                );
            case VERIFICATION_STATUS.APPROVED:
                return (
                    <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg flex items-center">
                        <span className="text-xl mr-2">✅</span>
                        <div>
                            <p className="font-semibold">Verified</p>
                            <p className="text-sm">Your identity has been verified successfully!</p>
                        </div>
                    </div>
                );
            case VERIFICATION_STATUS.REJECTED:
                return (
                    <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-2 rounded-lg flex items-center">
                        <span className="text-xl mr-2">❌</span>
                        <div>
                            <p className="font-semibold">Verification Failed</p>
                            <p className="text-sm">Please submit clear, valid documents and try again.</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return <LoadingSpinner size="lg" message="Loading verification status..." />;
    }

    const isVerified = status === VERIFICATION_STATUS.APPROVED;
    const isPending = status === VERIFICATION_STATUS.PENDING;
    const canSubmit = !isVerified && !isPending;

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <ToastContainer />

            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">🔐 Document Verification</h3>
                <span className="text-sm text-gray-500">Secure & Confidential</span>
            </div>

            {/* Status Badge */}
            {getStatusBadge()}

            {/* Info Box */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Why verify your identity?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Build trust with car owners and renters</li>
                    <li>• Access premium features and better rates</li>
                    <li>• Required for hosting cars on the platform</li>
                    <li>• Helps prevent fraud and keep everyone safe</li>
                </ul>
            </div>

            {canSubmit && (
                <>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start">
                            <span className="text-lg mr-2">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Document Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Document Type
                        </label>
                        <select
                            value={documentType}
                            onChange={(e) => {
                                setDocumentType(e.target.value);
                                setFrontFile(null);
                                setBackFile(null);
                                setFrontPreview(null);
                                setBackPreview(null);
                            }}
                            disabled={uploading}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                        >
                            {DOCUMENT_TYPES.map(dt => (
                                <option key={dt.value} value={dt.value}>{dt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Upload Areas */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Front Side */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {selectedDocType.requiresBoth ? 'Front Side *' : 'Document *'}
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileSelect(e.target.files?.[0], 'front')}
                                    className="hidden"
                                    id="front-upload"
                                    disabled={uploading}
                                />
                                <label htmlFor="front-upload" className="cursor-pointer">
                                    {frontPreview ? (
                                        <div className="relative">
                                            <img src={frontPreview} alt="Front preview" className="w-full h-40 object-cover rounded-lg" />
                                            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                                                ✓
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-4xl mb-2">📄</div>
                                            <p className="text-sm text-gray-600">Click to upload</p>
                                            <p className="text-xs text-gray-500 mt-1">Max 10MB</p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Back Side */}
                        {selectedDocType.requiresBoth && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Back Side *
                                </label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileSelect(e.target.files?.[0], 'back')}
                                        className="hidden"
                                        id="back-upload"
                                        disabled={uploading}
                                    />
                                    <label htmlFor="back-upload" className="cursor-pointer">
                                        {backPreview ? (
                                            <div className="relative">
                                                <img src={backPreview} alt="Back preview" className="w-full h-40 object-cover rounded-lg" />
                                                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                                                    ✓
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-4xl mb-2">📄</div>
                                                <p className="text-sm text-gray-600">Click to upload</p>
                                                <p className="text-xs text-gray-500 mt-1">Max 10MB</p>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Upload Progress */}
                    {uploading && progress > 0 && (
                        <ProgressBar progress={progress} label="Submitting documents..." />
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={uploading || !frontFile || (selectedDocType.requiresBoth && !backFile)}
                        className={`w-full py-3 rounded-lg font-semibold transition-all ${uploading || !frontFile || (selectedDocType.requiresBoth && !backFile)
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 transform hover:scale-105 shadow-lg'
                            }`}
                    >
                        {uploading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Submitting {progress}%...
                            </span>
                        ) : (
                            'Submit for Verification'
                        )}
                    </button>

                    {/* Guidelines */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">📋 Document Guidelines</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Ensure all text is clearly visible and readable</li>
                            <li>• Take photos in good lighting conditions</li>
                            <li>• Avoid glare and shadows on the document</li>
                            <li>• Make sure the entire document is in frame</li>
                            <li>• Documents must be valid (not expired)</li>
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
};

export default DocumentVerification;
