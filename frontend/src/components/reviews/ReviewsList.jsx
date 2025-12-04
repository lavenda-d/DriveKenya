import { useEffect, useState } from 'react';
import { reviewsAPI, authStorage } from '../../services/api';
import { LoadingSpinner, ErrorDisplay, EmptyState, useToast } from '../UIUtils';
import OwnerResponse from './OwnerResponse';

const StarRow = ({ rating = 0 }) => {
  const r = Math.round(Number(rating) || 0);
  return (
    <div className="text-yellow-500 text-sm">{'★'.repeat(r)}{'☆'.repeat(5 - r)}</div>
  );
};

const ReviewsList = ({ carId, isHost = false, pageSize = 10 }) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ reviews: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: pageSize } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast, ToastContainer } = useToast();

  const load = async (p = page) => {
    try {
      setLoading(true);
      setError(null);
      const res = await reviewsAPI.getCarReviews(carId, { page: p, limit: pageSize });
      setData(res.data);
    } catch (e) {
      setError(e.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (carId) load(1).then(() => setPage(1)); }, [carId, pageSize]);

  const onChanged = async () => { await load(page); };

  if (loading) return <LoadingSpinner size="md" message="Loading reviews..." />;
  if (error) return <ErrorDisplay message={error} onRetry={() => load(page)} />;
  if (!data.reviews || data.reviews.length === 0) return <EmptyState icon="📝" title="No reviews yet" message="Be the first to write a review." />;

  return (
    <div className="space-y-4">
      <ToastContainer />
      {data.reviews.map((rev) => (
        <div key={rev.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <StarRow rating={rev.rating} />
                <div className="text-sm text-gray-700 font-medium">{rev.reviewer_name || 'Guest'}</div>
                <div className="text-xs text-gray-500">{new Date(rev.created_at).toLocaleDateString()}</div>
              </div>
              {rev.comment && <div className="mt-2 text-sm text-gray-800 whitespace-pre-line">{rev.comment}</div>}
            </div>
          </div>
          {(rev.rating_vehicle || rev.rating_cleanliness || rev.rating_communication || rev.rating_value) && (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
              {rev.rating_vehicle && <div>Vehicle: <span className="font-semibold">{rev.rating_vehicle}</span>/5</div>}
              {rev.rating_cleanliness && <div>Cleanliness: <span className="font-semibold">{rev.rating_cleanliness}</span>/5</div>}
              {rev.rating_communication && <div>Communication: <span className="font-semibold">{rev.rating_communication}</span>/5</div>}
              {rev.rating_value && <div>Value: <span className="font-semibold">{rev.rating_value}</span>/5</div>}
            </div>
          )}
          {rev.photos && rev.photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
              {rev.photos.map(p => (
                <img key={p.id} src={p.image_url} alt="review" className="w-full h-24 object-cover rounded" loading="lazy" />
              ))}
            </div>
          )}
          <OwnerResponse reviewId={rev.id} response={rev.response} isHost={isHost} onChanged={onChanged} />
        </div>
      ))}
      <div className="flex justify-between items-center pt-2">
        <div className="text-sm text-gray-600">Page {data.pagination.currentPage} of {data.pagination.totalPages}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }} className={`px-3 py-1.5 rounded text-sm ${page <= 1 ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 hover:bg-gray-200'}`}>Previous</button>
          <button disabled={page >= data.pagination.totalPages} onClick={() => { const p = page + 1; setPage(p); load(p); }} className={`px-3 py-1.5 rounded text-sm ${page >= data.pagination.totalPages ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 hover:bg-gray-200'}`}>Next</button>
        </div>
      </div>
    </div>
  );
};

export default ReviewsList;
