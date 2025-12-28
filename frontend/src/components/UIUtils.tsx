import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimationProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

/**
 * Reusable Motion Variants
 */
export const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
};

export const staggerContainer = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

/**
 * Standalone Toast Notification Function
 * Creates and shows a toast notification without React hooks
 */
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000) => {
    // Remove any existing toasts
    const existingToast = document.getElementById('standalone-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'standalone-toast';
    toast.className = 'fixed top-4 right-4 text-white px-6 py-4 rounded-lg shadow-2xl z-[10000] flex items-center space-x-3 max-w-md transition-all duration-300 transform translate-y-0 opacity-100';

    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

    toast.className += ` ${bgColor}`;
    toast.innerHTML = `
        <span class="text-2xl">${icon}</span>
        <p class="flex-1 font-medium">${message}</p>
        <button class="text-white hover:text-gray-200 text-2xl font-bold ml-4" onclick="this.parentElement.remove()">×</button>
    `;

    document.body.appendChild(toast);

    // Simple entrance animation hack for vanilla DOM
    toast.style.transform = 'translateX(100%)';
    requestAnimationFrame(() => {
        toast.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        toast.style.transform = 'translateX(0)';
    });

    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }
    }, duration);
};

/**
 * Toast Notification Component
 * Displays temporary success/error messages with Framer Motion
 */
interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
}

const Toast = ({ message, type = 'success', onClose }: ToastProps) => {
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-2xl shadow-2xl z-[10000] flex items-center space-x-3 max-w-md border border-white/20 backdrop-blur-md`}
        >
            <span className="text-2xl">{icon}</span>
            <p className="flex-1 font-semibold">{message}</p>
            <button
                onClick={onClose}
                className="text-white/70 hover:text-white text-2xl transition-colors ml-4"
            >
                <XCircleIcon />
            </button>
        </motion.div>
    );
};

const XCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
);

/**
 * Animated Section Wrapper
 * Reveals content when it enters the viewport
 */
export const AnimatedSection = ({ children, delay = 0, className = "" }: AnimationProps) => (
    <motion.div
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-100px" }}
        variants={{
            initial: { opacity: 0, y: 40 },
            animate: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }
            }
        }}
        className={className}
    >
        {children}
    </motion.div>
);

/**
 * Stagger Container
 * Animates multiple children in sequence
 */
export const StaggerContainer = ({ children, className = "" }: AnimationProps) => (
    <motion.div
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
        className={className}
    >
        {children}
    </motion.div>
);

/**
 * Stagger Item
 * Child of StaggerContainer
 */
export const StaggerItem = ({ children }: { children: ReactNode }) => (
    <motion.div variants={fadeIn}>
        {children}
    </motion.div>
);

/**
 * Scale Interaction
 * Wraps buttons/cards for high-quality tactile feedback
 */
export const ScaleInteraction = ({ children, className = "" }: AnimationProps) => (
    <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={className}
    >
        {children}
    </motion.div>
);

/**
 * Loading Spinner Component
 * Reusable loading indicator
 */
interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
}

export const LoadingSpinner = ({ size = 'md', message }: LoadingSpinnerProps) => {
    const sizeClasses: Record<string, string> = {
        sm: 'h-6 w-6',
        md: 'h-12 w-12',
        lg: 'h-16 w-16'
    };

    return (
        <div className="flex flex-col items-center justify-center p-8">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className={`rounded-full border-2 border-transparent border-t-blue-500 border-r-purple-500 ${sizeClasses[size]}`}
            />
            {message && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-white/50 text-sm font-medium tracking-wide"
                >
                    {message}
                </motion.p>
            )}
        </div>
    );
};

/**
 * Error Display Component
 */
export const ErrorDisplay = ({ message, onRetry }: { message: string, onRetry?: () => void }) => {
    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl p-8 text-center"
        >
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
            <p className="text-red-400 mb-6">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold shadow-lg"
                >
                    🔄 Try Again
                </button>
            )}
        </motion.div>
    );
};

/**
 * Empty State Component
 */
export const EmptyState = ({ icon = '📭', title, message, action }: { icon?: string, title: string, message: string, action?: ReactNode }) => {
    return (
        <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            className="text-center py-16 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-sm"
        >
            <div className="text-7xl mb-6">{icon}</div>
            <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
            <p className="text-white/40 mb-8 max-w-sm mx-auto">{message}</p>
            {action && action}
        </motion.div>
    );
};

/**
 * Toast Notification Hook
 */
export const useToast = () => {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), duration);
    };

    const ToastContainer = () => (
        <AnimatePresence>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </AnimatePresence>
    );

    return { showToast, ToastContainer };
};

/**
 * Confirmation Dialog Component
 * Reusable confirmation modal with premium animation
 */
interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

export const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }: ConfirmDialogProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl max-w-md w-full p-8 relative z-10"
                    >
                        <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
                        <p className="text-white/60 mb-8 leading-relaxed">{message}</p>
                        <div className="flex space-x-4">
                            <button
                                onClick={onCancel}
                                className="flex-1 px-6 py-3 bg-white/5 text-white/70 rounded-xl hover:bg-white/10 hover:text-white transition-all font-bold border border-white/5"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all shadow-xl ${danger
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-blue-500/25'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

/**
 * Progress Bar Component
 */
export const ProgressBar = ({ progress, label }: { progress: number; label?: string }) => {
    return (
        <div className="w-full">
            {label && <p className="text-sm text-white/60 font-medium mb-3">{label}</p>}
            <div className="h-4 bg-white/5 border border-white/5 rounded-full overflow-hidden p-1">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-lg"
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </div>
            <div className="flex justify-between mt-2">
                <p className="text-[10px] text-white/30 font-bold tracking-widest uppercase">Process Status</p>
                <p className="text-xs text-blue-400 font-bold">{progress}%</p>
            </div>
        </div>
    );
};

/**
 * Custom Dropdown Component
 * Premium alternative to native select
 */
interface DropdownOption {
    label: string;
    value: string;
    icon?: ReactNode;
}

interface CustomDropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
    className?: string;
}

export const CustomDropdown = ({ options, value, onChange, label, className = "" }: CustomDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(opt => opt.value === value) || options[0];

    return (
        <div className={`relative ${className} z-[100]`}>
            {label && <label className="block text-muted-foreground/50 text-xs font-black uppercase tracking-widest mb-2 ml-1">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-6 py-3 bg-muted/20 border border-border rounded-xl text-foreground hover:bg-muted/40 transition-all group shadow-inner"
            >
                <div className="flex items-center space-x-3">
                    {selectedOption?.icon}
                    <span className="font-bold text-sm tracking-wide">{selectedOption?.label}</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "anticipate" }}
                >
                    <ChevronDownIcon />
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(10px)" }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute top-full mt-3 left-0 right-0 bg-popover/95 backdrop-blur-3xl border border-border rounded-2xl shadow-2xl py-3 z-[1000] min-w-[160px]"
                        >
                            <div className="max-h-[300px] overflow-y-auto hide-scrollbar">
                                {options.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center space-x-3 px-6 py-3 text-left transition-all ${value === option.value
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                            }`}
                                    >
                                        {option.icon}
                                        <span className="text-sm uppercase tracking-widest font-black">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
);

export default Toast;
