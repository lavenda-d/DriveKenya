import { useState } from 'react';

/**
 * Toast Notification Component
 * Displays temporary success/error messages
 */
const Toast = ({ message, type = 'success', onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

    return (
        <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-lg shadow-2xl z-50 animate-slide-in-right flex items-center space-x-3 max-w-md`}>
            <span className="text-2xl">{icon}</span>
            <p className="flex-1 font-medium">{message}</p>
            <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl font-bold ml-4"
            >
                ×
            </button>
        </div>
    );
};

/**
 * Loading Spinner Component
 * Reusable loading indicator
 */
export const LoadingSpinner = ({ size = 'md', message }) => {
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-12 w-12',
        lg: 'h-16 w-16'
    };

    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className={`animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]}`}></div>
            {message && <p className="mt-4 text-gray-600 text-sm">{message}</p>}
        </div>
    );
};

/**
 * Error Display Component
 * Shows error messages with retry option
 */
export const ErrorDisplay = ({ message, onRetry }) => {
    return (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-red-900 mb-2">Something went wrong</h3>
            <p className="text-red-700 mb-4">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
                >
                    🔄 Try Again
                </button>
            )}
        </div>
    );
};

/**
 * Empty State Component
 * Shows when no data is available
 */
export const EmptyState = ({ icon = '📭', title, message, action }) => {
    return (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="text-6xl mb-4">{icon}</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
            <p className="text-gray-500 mb-4">{message}</p>
            {action && action}
        </div>
    );
};

/**
 * Toast Notification Hook
 * Manages toast notifications state
 */
export const useToast = () => {
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success', duration = 3000) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), duration);
    };

    const ToastContainer = () => (
        toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null
    );

    return { showToast, ToastContainer };
};

/**
 * Confirmation Dialog Component
 * Reusable confirmation modal
 */
export const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex space-x-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${danger
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Progress Bar Component
 * Shows upload/loading progress
 */
export const ProgressBar = ({ progress, label }) => {
    return (
        <div className="w-full">
            {label && <p className="text-sm text-gray-600 mb-2">{label}</p>}
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">{progress}%</p>
        </div>
    );
};

export default Toast;
