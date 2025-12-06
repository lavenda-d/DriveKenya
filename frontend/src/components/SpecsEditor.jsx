import { useState, useEffect } from 'react';
import enhancedCarsAPI from '../services/enhancedCarsAPI';
import { LoadingSpinner } from './UIUtils';

const SpecsEditor = ({ carId, token, onUpdate }) => {
    const [specs, setSpecs] = useState({});
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [newSpec, setNewSpec] = useState({
        category: 'engine',
        spec_key: '',
        spec_value: ''
    });

    const categories = [
        { value: 'engine', label: 'Engine & Powertrain', icon: '🔧' },
        { value: 'dimensions', label: 'Dimensions', icon: '📏' },
        { value: 'features', label: 'Features', icon: '✨' },
        { value: 'safety', label: 'Safety', icon: '🛡️' },
        { value: 'performance', label: 'Performance', icon: '⚡' },
        { value: 'comfort', label: 'Comfort & Convenience', icon: '🪑' }
    ];

    useEffect(() => {
        loadSpecs();
    }, [carId]);

    const loadSpecs = async () => {
        try {
            setLoading(true);
            const response = await enhancedCarsAPI.getCarSpecs(carId);
            setSpecs(response.data.grouped);
        } catch (error) {
            console.error('Failed to load specs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSpec = async (e) => {
        e.preventDefault();

        if (!newSpec.spec_key || !newSpec.spec_value) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await enhancedCarsAPI.addCarSpecs(carId, [newSpec], token);
            alert('✅ Specification added successfully');
            setNewSpec({ category: 'engine', spec_key: '', spec_value: '' });
            loadSpecs();
            if (onUpdate) onUpdate();
        } catch (error) {
            alert('❌ Failed to add specification: ' + error.message);
        }
    };

    const handleDeleteSpec = async (specId) => {
        if (!confirm('Are you sure you want to delete this specification?')) return;

        try {
            await enhancedCarsAPI.deleteCarSpec(carId, specId, token);
            alert('✅ Specification deleted successfully');
            loadSpecs();
            if (onUpdate) onUpdate();
        } catch (error) {
            alert('❌ Failed to delete specification: ' + error.message);
        }
    };

    const handleBulkAdd = async () => {
        const commonSpecs = {
            engine: [
                { spec_key: 'Engine Type', spec_value: '' },
                { spec_key: 'Horsepower', spec_value: '' },
                { spec_key: 'Torque', spec_value: '' },
                { spec_key: 'Transmission', spec_value: '' }
            ],
            dimensions: [
                { spec_key: 'Length', spec_value: '' },
                { spec_key: 'Width', spec_value: '' },
                { spec_key: 'Height', spec_value: '' },
                { spec_key: 'Wheelbase', spec_value: '' }
            ],
            features: [
                { spec_key: 'Infotainment System', spec_value: '' },
                { spec_key: 'Climate Control', spec_value: '' },
                { spec_key: 'Connectivity', spec_value: '' }
            ],
            safety: [
                { spec_key: 'Airbags', spec_value: '' },
                { spec_key: 'ABS', spec_value: '' },
                { spec_key: 'Stability Control', spec_value: '' }
            ]
        };

        const category = prompt('Enter category (engine/dimensions/features/safety):');
        if (!category || !commonSpecs[category]) {
            alert('Invalid category');
            return;
        }

        const specsToAdd = commonSpecs[category].map(spec => ({
            ...spec,
            category
        }));

        try {
            await enhancedCarsAPI.addCarSpecs(carId, specsToAdd, token);
            alert(`✅ Added ${specsToAdd.length} specifications template`);
            loadSpecs();
            if (onUpdate) onUpdate();
        } catch (error) {
            alert('❌ Failed to add specifications: ' + error.message);
        }
    };

    if (loading) {
        return <LoadingSpinner size="lg" message="Loading specifications..." />;
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">📝 Edit Specifications</h3>
                <div className="flex space-x-2">
                    <button
                        onClick={handleBulkAdd}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-semibold"
                    >
                        ➕ Add Template
                    </button>
                    <button
                        onClick={() => setEditMode(!editMode)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${editMode
                            ? 'bg-gray-500 text-white hover:bg-gray-600'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                    >
                        {editMode ? '✓ Done' : '✏️ Edit Mode'}
                    </button>
                </div>
            </div>

            {/* Add New Spec Form */}
            <form onSubmit={handleAddSpec} className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6">
                <h4 className="font-bold text-gray-800 mb-4">➕ Add New Specification</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category
                        </label>
                        <select
                            value={newSpec.category}
                            onChange={(e) => setNewSpec({ ...newSpec, category: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {categories.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Specification Name
                        </label>
                        <input
                            type="text"
                            value={newSpec.spec_key}
                            onChange={(e) => setNewSpec({ ...newSpec, spec_key: e.target.value })}
                            placeholder="e.g., Engine Type"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Value
                        </label>
                        <input
                            type="text"
                            value={newSpec.spec_value}
                            onChange={(e) => setNewSpec({ ...newSpec, spec_value: e.target.value })}
                            placeholder="e.g., 2.0L Turbo"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
                >
                    ➕ Add Specification
                </button>
            </form>

            {/* Existing Specs */}
            <div className="space-y-4">
                <h4 className="font-bold text-gray-800">Current Specifications</h4>
                {Object.keys(specs).length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No specifications added yet</p>
                    </div>
                ) : (
                    Object.entries(specs).map(([category, items]) => {
                        const categoryInfo = categories.find(c => c.value === category) || { icon: '📁', label: category };
                        return (
                            <div key={category} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-3 font-semibold text-gray-800">
                                    {categoryInfo.icon} {categoryInfo.label} ({items.length})
                                </div>
                                <div className="p-4 space-y-2">
                                    {items.map(spec => (
                                        <div
                                            key={spec.id}
                                            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <span className="font-medium text-gray-700">{spec.key}:</span>
                                                <span className="ml-2 text-gray-900">{spec.value}</span>
                                            </div>
                                            {editMode && (
                                                <button
                                                    onClick={() => handleDeleteSpec(spec.id)}
                                                    className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-semibold"
                                                >
                                                    🗑️ Delete
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Help Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">💡 Tips</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Use "Add Template" to quickly add common specifications</li>
                    <li>• Organize specs by category for better presentation</li>
                    <li>• Enable "Edit Mode" to delete existing specifications</li>
                    <li>• Be specific with values (e.g., "250 HP" instead of just "250")</li>
                </ul>
            </div>
        </div>
    );
};

export default SpecsEditor;
