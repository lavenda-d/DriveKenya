import { useEffect, useState, useMemo } from 'react';
import { reviewsAPI } from '../../services/api';
import { LoadingSpinner, ErrorDisplay, EmptyState } from '../UIUtils';

const Bar = ({ label, value = 0, max = 5 }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm text-gray-600">
        <span>{label}</span>
        <span className="font-medium">{value ? value.toFixed(2) : '0.00'}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const Distribution = ({ data }) => {
  const total = Object.values(data || {}).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-2">
      {[5,4,3,2,1].map(star => {
        const count = data?.[star] || 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-3">
            <span className="w-8 text-sm text-gray-600">{star}★</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 text-right text-sm text-gray-600">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
};

const ReviewSummary = ({ carId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await reviewsAPI.getCarReviewSummary(carId);
        if (mounted) setData(res.data);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load summary');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (carId) load();
    return () => { mounted = false; };
  }, [carId]);

  const average = data?.average || 0;
  const total = data?.total || 0;

  if (loading) return <LoadingSpinner size="md" message="Loading ratings..." />;
  if (error) return <ErrorDisplay message={error} />;
  if (!total) return <EmptyState icon="⭐" title="No ratings yet" message="Be the first to review this car." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <div>
          <div className="text-4xl font-bold">{average.toFixed(2)}</div>
          <div className="text-yellow-500 text-xl">{'★'.repeat(Math.round(average))}{'☆'.repeat(5 - Math.round(average))}</div>
          <div className="text-sm text-gray-600 mt-1">{total} review{total !== 1 ? 's' : ''}</div>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Bar label="Vehicle" value={data?.categories?.vehicle || 0} />
          <Bar label="Cleanliness" value={data?.categories?.cleanliness || 0} />
          <Bar label="Communication" value={data?.categories?.communication || 0} />
          <Bar label="Value" value={data?.categories?.value || 0} />
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Rating distribution</h4>
        <Distribution data={data?.distribution} />
      </div>
    </div>
  );
};

export default ReviewSummary;
