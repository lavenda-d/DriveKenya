import { useMemo } from 'react';

const PasswordStrength = ({ password }) => {
    const analysis = useMemo(() => {
        if (!password) {
            return { strength: 0, label: 'No password', color: 'gray', suggestions: [] };
        }

        let score = 0;
        const suggestions = [];

        // Length check
        if (password.length >= 8) score += 20;
        else suggestions.push('Use at least 8 characters');

        if (password.length >= 12) score += 10;
        if (password.length >= 16) score += 10;

        // Character variety checks
        if (/[a-z]/.test(password)) score += 15;
        else suggestions.push('Add lowercase letters');

        if (/[A-Z]/.test(password)) score += 15;
        else suggestions.push('Add uppercase letters');

        if (/[0-9]/.test(password)) score += 15;
        else suggestions.push('Add numbers');

        if (/[^a-zA-Z0-9]/.test(password)) score += 15;
        else suggestions.push('Add special characters (!@#$%^&*)');

        // Determine strength level
        let strength, label, color;
        if (score < 30) {
            strength = 1;
            label = 'Weak';
            color = 'red';
        } else if (score < 50) {
            strength = 2;
            label = 'Fair';
            color = 'orange';
        } else if (score < 70) {
            strength = 3;
            label = 'Good';
            color = 'yellow';
        } else if (score < 90) {
            strength = 4;
            label = 'Strong';
            color = 'green';
        } else {
            strength = 5;
            label = 'Very Strong';
            color = 'emerald';
        }

        return { strength, label, color, suggestions, score };
    }, [password]);

    if (!password) {
        return null;
    }

    const getColorClasses = (color) => {
        const colors = {
            gray: 'bg-gray-200',
            red: 'bg-red-500',
            orange: 'bg-orange-500',
            yellow: 'bg-yellow-500',
            green: 'bg-green-500',
            emerald: 'bg-emerald-500'
        };
        return colors[color] || colors.gray;
    };

    const getTextColorClasses = (color) => {
        const colors = {
            gray: 'text-gray-600',
            red: 'text-red-600',
            orange: 'text-orange-600',
            yellow: 'text-yellow-600',
            green: 'text-green-600',
            emerald: 'text-emerald-600'
        };
        return colors[color] || colors.gray;
    };

    return (
        <div className="space-y-2">
            {/* Strength Meter */}
            <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                    {[1, 2, 3, 4, 5].map((level) => (
                        <div
                            key={level}
                            className={`flex-1 transition-all duration-300 ${level <= analysis.strength ? getColorClasses(analysis.color) : ''
                                }`}
                        />
                    ))}
                </div>
                <span className={`text-sm font-semibold ${getTextColorClasses(analysis.color)}`}>
                    {analysis.label}
                </span>
            </div>

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
                <div className="text-xs text-gray-600">
                    <p className="font-medium mb-1">To improve:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                        {analysis.suggestions.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Success Message */}
            {analysis.strength >= 4 && (
                <div className="text-xs text-green-600 flex items-center">
                    <span className="mr-1">✓</span>
                    <span>Great! Your password is secure.</span>
                </div>
            )}
        </div>
    );
};

export default PasswordStrength;
