import { useState } from 'react';
import { reviewsAPI, authStorage } from '../../services/api';
import { useToast, ConfirmDialog } from '../UIUtils';

const OwnerResponse = ({ reviewId, response, isHost, onChanged }) => {
  const { showToast, ToastContainer } = useToast();
  const token = authStorage.getToken();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(response?.content || '');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const submit = async () => {
    try {
      setBusy(true);
      await reviewsAPI.upsertOwnerResponse(reviewId, content, token);
      showToast('Response saved');
      setEditing(false);
      onChanged && onChanged();
    } catch (e) {
      showToast(e.message || 'Failed to save response', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      setBusy(true);
      await reviewsAPI.deleteOwnerResponse(reviewId, token);
      showToast('Response deleted');
      setConfirmOpen(false);
      onChanged && onChanged();
    } catch (e) {
      showToast(e.message || 'Failed to delete response', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!response && !isHost) return null;

  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <ToastContainer />
      <div className="flex items-start gap-2">
        <div className="text-sm font-semibold text-gray-700">Owner response</div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea className="w-full border rounded p-2" rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a response" />
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy || !content.trim()} className={`px-4 py-2 rounded text-white ${busy || !content.trim() ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}>Save</button>
            <button onClick={() => { setEditing(false); setContent(response?.content || ''); }} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-sm text-gray-800 whitespace-pre-line">
          {response ? response.content : 'No response yet.'}
        </div>
      )}
      {isHost && (
        <div className="mt-2 flex gap-2">
          {!editing && <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">{response ? 'Edit response' : 'Add response'}</button>}
          {response && !editing && (
            <button onClick={() => setConfirmOpen(true)} className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
          )}
        </div>
      )}
      <ConfirmDialog isOpen={confirmOpen} title="Delete response" message="Are you sure you want to delete this response?" onConfirm={remove} onCancel={() => setConfirmOpen(false)} danger confirmText="Delete" />
    </div>
  );
};

export default OwnerResponse;
