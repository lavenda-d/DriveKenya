import { useEffect, useMemo, useState } from 'react';
import { reviewsAPI, bookingsAPI, authStorage } from '../../services/api';
import { LoadingSpinner, ErrorDisplay, useToast, ProgressBar } from '../UIUtils';

const MAX_FILES = 10;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const ReviewForm = ({ carId, onSubmitted }) => {
  const token = authStorage.getToken();
  const user = authStorage.getUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [rentalId, setRentalId] = useState('');

  const [rating, setRating] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ratings, setRatings] = useState({ vehicle: '', cleanliness: '', communication: '', value: '' });
  const [comment, setComment] = useState('');

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!token || !user) { setLoading(false); setRentals([]); return; }
      try {
        setLoading(true);
        setError(null);
        const res = await bookingsAPI.getUserBookings(token);
        const list = (res.bookings || []).filter(b => b.car?.id === Number(carId) && b.status === 'completed');
        if (mounted) {
          setRentals(list);
          setRentalId(list[0]?.id || '');
        }
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load bookings');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (carId) load();
    return () => { mounted = false; };
  }, [carId, token, user]);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  const onPickFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    const filtered = [];
    for (const f of selected) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > MAX_SIZE) { showToast(`File too large: ${f.name}`, 'error'); continue; }
      filtered.push(f);
      if (filtered.length + files.length >= MAX_FILES) break;
    }
    setFiles(prev => [...prev, ...filtered].slice(0, MAX_FILES));
    e.target.value = '';
  };

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const canSubmit = !!token && !!rentalId && rating >= 1 && rating <= 5 && !busy;

  const submit = async () => {
    try {
      setBusy(true);
      setProgress(10);
      await reviewsAPI.createReview({
        carId: Number(carId),
        rentalId: Number(rentalId),
        rating: Number(rating),
        ratings: {
          vehicle: ratings.vehicle ? Number(ratings.vehicle) : undefined,
          cleanliness: ratings.cleanliness ? Number(ratings.cleanliness) : undefined,
          communication: ratings.communication ? Number(ratings.communication) : undefined,
          value: ratings.value ? Number(ratings.value) : undefined,
        },
        comment: comment?.trim() || undefined,
        images: files,
      }, token);
      setProgress(100);
      showToast('Review submitted');
      setRating(0);
      setRatings({ vehicle: '', cleanliness: '', communication: '', value: '' });
      setComment('');
      setFiles([]);
      onSubmitted && onSubmitted();
    } catch (e) {
      showToast(e.message || 'Failed to submit review', 'error');
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(0), 400);
    }
  };

  if (!user || !token) return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">Login to write a review.</div>
  );

  if (loading) return <LoadingSpinner size="md" message="Loading eligibility..." />;
  if (error) return <ErrorDisplay message={error} />;
  if (!rentals || rentals.length === 0) return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">You can review after completing a rental for this car.</div>
  );

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <ToastContainer />
      <div className="font-semibold">Write a review</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Rental</label>
          <select value={rentalId} onChange={(e) => setRentalId(e.target.value)} className="w-full border rounded p-2">
            {rentals.map(r => (
              <option key={r.id} value={r.id}>{new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()} • {r.car?.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Overall rating</label>
          <div className="flex items-center gap-2">
            {[1,2,3,4,5].map(v => (
              <button key={v} type="button" onClick={() => setRating(v)} className={`text-2xl ${rating >= v ? 'text-yellow-500' : 'text-gray-300'}`}>★</button>
            ))}
            <span className="text-sm text-gray-600 ml-2">{rating || 'Select'}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Comment (optional)</label>
        <textarea className="w-full border rounded p-2" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience" />
      </div>

      <div>
        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-blue-600 hover:underline">
          {showAdvanced ? 'Hide' : 'Show'} category ratings
        </button>
        {showAdvanced && (
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {['vehicle','cleanliness','communication','value'].map(key => (
              <div key={key}>
                <label className="block text-sm text-gray-600 mb-1 capitalize">{key}</label>
                <select value={ratings[key] || ''} onChange={(e) => setRatings(prev => ({ ...prev, [key]: e.target.value }))} className="w-full border rounded p-2">
                  <option value="">Not set</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Photos (optional)</label>
        <input type="file" accept="image/*" multiple onChange={onPickFiles} />
        {files.length > 0 && (
          <div className="mt-2 grid grid-cols-3 md:grid-cols-6 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="preview" className="w-full h-20 object-cover rounded" />
                <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {progress > 0 && <ProgressBar progress={progress} label="Uploading..." />}

      <div>
        <button onClick={submit} disabled={!canSubmit} className={`px-4 py-2 rounded text-white ${canSubmit ? 'bg-green-600 hover:bg-green-700' : 'bg-green-300'}`}>Submit review</button>
      </div>
    </div>
  );
};

export default ReviewForm;
