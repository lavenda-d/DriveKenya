import { useState, useEffect } from 'react';
import { authStorage } from '../services/api';
import { getBlackoutDates, createBlackoutPeriod, deleteBlackoutPeriod } from '../services/apiExtensions';
import { LoadingSpinner, ErrorDisplay, EmptyState, useToast, ConfirmDialog } from './UIUtils';

const BlackoutManager = ({ carId }) => {
    const [blackouts, setBlackouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        reason: ''
    });

    const { showToast, ToastContainer } = useToast();

    useEffect(() => {
        if (carId) {
            loadBlackouts();
        }
    }, [carId]);

    const loadBlackouts = async () => {
        const token = authStorage.getToken();
        if (!token) {
            setError('Please login to manage blackout dates');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const data = await getBlackoutDates(carId);
            // API may return { blackouts: [...] } or an array directly
            setBlackouts(data?.blackouts || data || []);
        } catch (err) {
            console.error('Load error:', err);
            setError(err.message || 'Failed to load blackout dates');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBlackout = async (e) => {
        e.preventDefault();

        if (!formData.startDate || !formData.endDate) {
            showToast('Please select start and end dates', 'error');
            return;
        }

        if (new Date(formData.startDate) > new Date(formData.endDate)) {
            showToast('End date must be after start date', 'error');
            return;
        }

        const token = authStorage.getToken();
        if (!token) {
            showToast('Please login to add blackout dates', 'error');
            return;
        }

        setSubmitting(true);

        try {
            await createBlackoutPeriod(carId, formData, token);

            showToast('Blackout period added successfully', 'success');

            // Reset form
            setFormData({ startDate: '', endDate: '', reason: '' });
            setShowAddForm(false);

            // Reload blackouts
            loadBlackouts();

        } catch (err) {
            console.error('Add error:', err);
            showToast(err.message || 'Failed to add blackout period', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBlackout = async (blackoutId) => {
        const token = authStorage.getToken();
        if (!token) {
            showToast('Please login to delete blackout dates', 'error');
            return;
        }

        try {
            await deleteBlackoutPeriod(carId, blackoutId, token);

            showToast('Blackout period removed', 'success');
            setDeleteConfirm(null);
            loadBlackouts();

        } catch (err) {
            console.error('Delete error:', err);
            showToast(err.message || 'Failed to delete blackout period', 'error');
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const calculateDays = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1; // Include both start and end day
    };

    if (loading) {
        return <LoadingSpinner size="lg" message="Loading blackout dates..." />;
    }

    if (error) {
        return <ErrorDisplay message={error} onRetry={loadBlackouts} />;
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <ToastContainer />

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-800">🚫 Blackout Dates</h3>
                    <p className="text-sm text-gray-600 mt-1">Block dates when your car is unavailable</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                    {showAddForm ? 'Cancel' : '+ Add Blackout'}
                </button>
            </div>

            {/* Add Blackout Form */}
            {showAddForm && (
                <form onSubmit={handleAddBlackout} className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                min={new Date().toISOString().split('T')[0]}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date *
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                min={formData.startDate || new Date().toISOString().split('T')[0]}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason (Optional)
                        </label>
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="e.g., Personal use, Maintenance, etc."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full py-2 rounded-lg font-semibold transition-colors ${submitting
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                    >
                        {submitting ? 'Adding...' : 'Add Blackout Period'}
                    </button>
                </form>
            )}

            {/* Blackout List */}
            {blackouts.length === 0 ? (
                <EmptyState
                    icon="📅"
                    title="No blackout dates"
                    message="Add blackout periods to block dates when your car is unavailable for rent."
                />
            ) : (
                <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700">
                        Active Blackout Periods ({blackouts.length})
                    </h4>

                    {blackouts.map((blackout) => (
                        <div
                            key={blackout.id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <span className="text-2xl">🚫</span>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {formatDate(blackout.start_date)} → {formatDate(blackout.end_date)}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {calculateDays(blackout.start_date, blackout.end_date)} day
                                                {calculateDays(blackout.start_date, blackout.end_date) !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {blackout.reason && (
                                        <p className="text-sm text-gray-700 ml-11">
                                            <span className="font-medium">Reason:</span> {blackout.reason}
                                        </p>
                                    )}

                                    <p className="text-xs text-gray-500 ml-11 mt-1">
                                        Added {formatDate(blackout.created_at)}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setDeleteConfirm(blackout)}
                                    className="text-red-500 hover:text-red-700 font-semibold text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Blackout dates prevent new bookings during that period</li>
                    <li>• Existing confirmed bookings are not affected</li>
                    <li>• You can add multiple blackout periods</li>
                    <li>• Blackout dates appear as "unavailable" in the calendar</li>
                </ul>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm !== null}
                title="Delete Blackout Period"
                message={`Are you sure you want to remove the blackout period from ${deleteConfirm ? formatDate(deleteConfirm.start_date) : ''} to ${deleteConfirm ? formatDate(deleteConfirm.end_date) : ''}?`}
                onConfirm={() => handleDeleteBlackout(deleteConfirm.id)}
                onCancel={() => setDeleteConfirm(null)}
                confirmText="Delete"
                cancelText="Cancel"
                danger={true}
            />
        </div>
    );
};

export default BlackoutManager;
