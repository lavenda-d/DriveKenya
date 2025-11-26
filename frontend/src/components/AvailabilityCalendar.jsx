import React, { useEffect, useMemo, useState } from 'react';
import { bookingsAPI } from '../services/api';

const formatDate = (d) => new Date(d).toISOString().split('T')[0];

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

// Simple month grid for the next 60 days with booking/blackout shading
const AvailabilityCalendar = ({ carId, days = 60 }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const start = useMemo(() => formatDate(new Date()), []);
  const end = useMemo(() => addDays(start, days), [start, days]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await bookingsAPI.getAvailability(carId, start, end);
        if (mounted) setEvents(res.events || []);
      } catch (e) {
        if (mounted) setError(e.message || 'Failed to load availability');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (carId) load();
    return () => { mounted = false; };
  }, [carId, start, end]);

  const dayStatus = useMemo(() => {
    const map = new Map();
    // Mark booked/blackout days
    events.forEach(ev => {
      const s = formatDate(ev.start);
      const e = formatDate(ev.end);
      let cur = s;
      // include end date - 1 day for bookings spanning end at midnight
      while (cur < e) {
        const existing = map.get(cur) || 'free';
        const nextStatus = ev.type === 'blackout' ? 'blackout' : 'booked';
        // blackout overrides booked, booked overrides free
        const priority = { free: 0, booked: 1, blackout: 2 };
        map.set(cur, priority[nextStatus] >= priority[existing] ? nextStatus : existing);
        cur = addDays(cur, 1);
      }
      // also mark last day if equal (single day blackout windows)
      if (s === e) {
        const existing = map.get(s) || 'free';
        const nextStatus = ev.type === 'blackout' ? 'blackout' : 'booked';
        const priority = { free: 0, booked: 1, blackout: 2 };
        map.set(s, priority[nextStatus] >= priority[existing] ? nextStatus : existing);
      }
    });
    return map;
  }, [events]);

  const daysArray = useMemo(() => {
    const out = [];
    let cur = start;
    while (cur <= end) {
      out.push(cur);
      cur = addDays(cur, 1);
    }
    return out;
  }, [start, end]);

  if (loading) return <div className="text-gray-600">Loading availability…</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-xs text-gray-500 text-center">{d}</div>
        ))}
        {daysArray.map(dateStr => {
          const d = new Date(dateStr);
          const status = dayStatus.get(dateStr) || 'free';
          const isPast = d < new Date(formatDate(new Date()));
          const styles = status === 'blackout' ? 'bg-red-100 text-red-700 border-red-300' :
                        status === 'booked' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                        'bg-green-50 text-green-700 border-green-300';
          return (
            <div key={dateStr} className={`p-2 border rounded text-center text-sm ${styles} ${isPast ? 'opacity-60' : ''}`}>
              <div className="font-medium">{d.getDate()}</div>
              <div className="text-[10px] uppercase tracking-wide">
                {status}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-600 mt-3">
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-green-200 border border-green-300"/> Free</div>
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-yellow-200 border border-yellow-300"/> Booked</div>
        <div className="flex items-center gap-2"><span className="inline-block w-3 h-3 bg-red-200 border border-red-300"/> Blackout</div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
