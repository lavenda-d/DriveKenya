import React, { useEffect, useMemo, useState } from 'react';
import { bookingsAPI, carsAPI } from '../services/api';

const toDate = (d) => new Date(d);
const fmtDate = (d) => new Date(d).toISOString().split('T')[0];
const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return fmtDate(d);
};

const OwnerSchedulingAndBlackouts = ({ carId, token }) => {
  const [bufferHours, setBufferHours] = useState(0);
  const [minNoticeHours, setMinNoticeHours] = useState(0);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [blkStart, setBlkStart] = useState(''); // datetime-local
  const [blkEnd, setBlkEnd] = useState('');   // datetime-local
  const [blkReason, setBlkReason] = useState('Maintenance');
  const [creatingBlk, setCreatingBlk] = useState(false);

  const [blackouts, setBlackouts] = useState([]);
  const [loadingBlackouts, setLoadingBlackouts] = useState(false);

  const today = useMemo(() => fmtDate(new Date()), []);
  const rangeEnd = useMemo(() => addDays(today, 180), [today]);

  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      if (!token) return;
      try {
        setLoadingSettings(true);
        const res = await carsAPI.getMyCars(token);
        const cars = res.cars || res?.data?.cars || [];
        const car = cars.find((c) => String(c.id) === String(carId));
        if (mounted && car) {
          setBufferHours(Number(car.buffer_hours || 0));
          setMinNoticeHours(Number(car.min_notice_hours || 0));
        }
      } catch (e) {
        console.warn('Failed to load scheduling settings', e);
      } finally {
        if (mounted) setLoadingSettings(false);
      }
    };
    loadSettings();
    return () => { mounted = false; };
  }, [carId, token]);

  const refreshBlackouts = async () => {
    try {
      setLoadingBlackouts(true);
      const res = await bookingsAPI.getAvailability(carId, today, rangeEnd);
      const events = res.events || [];
      const blks = events.filter((e) => e.type === 'blackout');
      setBlackouts(blks);
    } catch (e) {
      console.warn('Failed to load blackouts', e);
    } finally {
      setLoadingBlackouts(false);
    }
  };

  useEffect(() => {
    refreshBlackouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId]);

  const handleSaveScheduling = async () => {
    if (!token) return;
    try {
      setSavingSettings(true);
      await carsAPI.updateScheduling(carId, {
        buffer_hours: Math.max(0, Number(bufferHours) || 0),
        min_notice_hours: Math.max(0, Number(minNoticeHours) || 0),
      }, token);
      alert('Scheduling settings updated');
    } catch (e) {
      alert(e.message || 'Failed to update scheduling');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateBlackout = async () => {
    if (!token) return;
    if (!blkStart || !blkEnd) {
      alert('Please provide start and end');
      return;
    }
    if (new Date(blkStart) >= new Date(blkEnd)) {
      alert('Start must be before end');
      return;
    }
    try {
      setCreatingBlk(true);
      await carsAPI.createBlackout(carId, { start: blkStart, end: blkEnd, reason: blkReason }, token);
      setBlkStart('');
      setBlkEnd('');
      setBlkReason('Maintenance');
      await refreshBlackouts();
    } catch (e) {
      alert(e.message || 'Failed to create blackout');
    } finally {
      setCreatingBlk(false);
    }
  };

  const handleDeleteBlackout = async (id) => {
    if (!token) return;
    try {
      await carsAPI.deleteBlackout(id, token);
      await refreshBlackouts();
    } catch (e) {
      alert(e.message || 'Failed to delete blackout');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Scheduling Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Buffer (hours)</label>
            <input
              type="number"
              min="0"
              value={bufferHours}
              onChange={(e) => setBufferHours(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Min Notice (hours)</label>
            <input
              type="number"
              min="0"
              value={minNoticeHours}
              onChange={(e) => setMinNoticeHours(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <button
              onClick={handleSaveScheduling}
              disabled={savingSettings || loadingSettings}
              className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-60"
            >
              {savingSettings ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Blackout</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Start</label>
            <input
              type="datetime-local"
              value={blkStart}
              onChange={(e) => setBlkStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">End</label>
            <input
              type="datetime-local"
              value={blkEnd}
              onChange={(e) => setBlkEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={blkReason}
              onChange={(e) => setBlkReason(e.target.value)}
              placeholder="Maintenance / Unavailable"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <button
              onClick={handleCreateBlackout}
              disabled={creatingBlk}
              className="w-full md:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-60"
            >
              {creatingBlk ? 'Creating…' : 'Create Blackout'}
            </button>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-gray-900">Blackouts (next 180 days)</h3>
          <button
            onClick={refreshBlackouts}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
          >
            Refresh
          </button>
        </div>
        {loadingBlackouts ? (
          <div className="text-gray-600">Loading blackouts…</div>
        ) : blackouts.length === 0 ? (
          <div className="text-gray-600">No blackouts scheduled.</div>
        ) : (
          <div className="space-y-2">
            {blackouts.map((b) => (
              <div key={b.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-3 border rounded-lg">
                <div className="text-sm text-gray-800">
                  <div><span className="font-medium">Start:</span> {new Date(b.start).toLocaleString()}</div>
                  <div><span className="font-medium">End:</span> {new Date(b.end).toLocaleString()}</div>
                  {b.reason && <div className="text-gray-600">Reason: {b.reason}</div>}
                </div>
                <div className="mt-2 md:mt-0">
                  <button
                    onClick={() => handleDeleteBlackout(b.id)}
                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerSchedulingAndBlackouts;
