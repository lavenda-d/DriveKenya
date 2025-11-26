import { useState, useEffect } from 'react';
import enhancedCarsAPI from '../services/enhancedCarsAPI';

const CarSpecs = ({ carId }) => {
    const [specs, setSpecs] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState({});

    useEffect(() => {
        loadSpecs();
    }, [carId]);

    const loadSpecs = async () => {
        try {
            setLoading(true);
            const response = await enhancedCarsAPI.getCarSpecs(carId);
            setSpecs(response.data.grouped);
            // Expand all categories by default
            const expanded = {};
            Object.keys(response.data.grouped).forEach(cat => {
                expanded[cat] = true;
            });
            setExpandedCategories(expanded);
        } catch (error) {
            console.error('Failed to load specs:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (Object.keys(specs).length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500">No specifications available</p>
            </div>
        );
    }

    const categoryConfig = {
        engine: {
            icon: '🔧',
            color: 'blue',
            title: 'Engine & Performance'
        },
        dimensions: {
            icon: '📏',
            color: 'green',
            title: 'Dimensions'
        },
        features: {
            icon: '✨',
            color: 'purple',
            title: 'Features'
        },
        safety: {
            icon: '🛡️',
            color: 'red',
            title: 'Safety'
        },
        performance: {
            icon: '⚡',
            color: 'yellow',
            title: 'Performance'
        },
        comfort: {
            icon: '🪑',
            color: 'indigo',
            title: 'Comfort & Convenience'
        }
    };

    const getColorClasses = (color) => {
        const colors = {
            blue: 'bg-blue-50 border-blue-200 text-blue-700',
            green: 'bg-green-50 border-green-200 text-green-700',
            purple: 'bg-purple-50 border-purple-200 text-purple-700',
            red: 'bg-red-50 border-red-200 text-red-700',
            yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
            indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700'
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">📋 Specifications</h2>
                <button
                    onClick={() => {
                        const allExpanded = Object.values(expandedCategories).every(v => v);
                        const newState = {};
                        Object.keys(specs).forEach(cat => {
                            newState[cat] = !allExpanded;
                        });
                        setExpandedCategories(newState);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    {Object.values(expandedCategories).every(v => v) ? 'Collapse All' : 'Expand All'}
                </button>
            </div>

            <div className="grid gap-4">
                {Object.entries(specs).map(([category, items]) => {
                    const config = categoryConfig[category] || { icon: '📁', color: 'gray', title: category };
                    const isExpanded = expandedCategories[category];

                    return (
                        <div
                            key={category}
                            className={`border-2 rounded-lg overflow-hidden transition-all ${getColorClasses(config.color)}`}
                        >
                            {/* Category Header */}
                            <button
                                onClick={() => toggleCategory(category)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                            >
                                <div className="flex items-center space-x-3">
                                    <span className="text-3xl">{config.icon}</span>
                                    <div className="text-left">
                                        <h3 className="font-bold text-lg">{config.title}</h3>
                                        <p className="text-sm opacity-75">{items.length} specifications</p>
                                    </div>
                                </div>
                                <span className={`text-2xl transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </button>

                            {/* Category Content */}
                            {isExpanded && (
                                <div className="px-6 py-4 bg-white border-t-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {items.map(spec => (
                                            <div
                                                key={spec.id}
                                                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                                            >
                                                <span className="text-gray-600 font-medium">{spec.key}</span>
                                                <span className="font-semibold text-gray-900">{spec.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary Card */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
                <h4 className="font-bold text-gray-800 mb-3">📊 Specification Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(specs).map(([category, items]) => {
                        const config = categoryConfig[category] || { icon: '📁' };
                        return (
                            <div key={category} className="text-center">
                                <div className="text-3xl mb-1">{config.icon}</div>
                                <div className="font-bold text-2xl text-gray-800">{items.length}</div>
                                <div className="text-sm text-gray-600 capitalize">{category}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CarSpecs;
