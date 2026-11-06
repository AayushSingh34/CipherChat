import React, { useState } from 'react';
import API from '../services/api';
import { Compass, UserPlus, CheckCircle, Clock, MapPin } from 'lucide-react';
export default function RadarView({ currentUser, friendsMap = {}, onFriendAdded }) {
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(false);
  const scanNearby = () => {
    setLoading(true);
    const doScan = async (lat, lon) => {
      try {
        await API.post('/discovery/location', { username: currentUser.username, latitude: lat, longitude: lon });
        const res = await API.get('/discovery/nearby', { params: { username: currentUser.username, radiusKm: 50 } });
        setNearby(res.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => doScan(pos.coords.latitude, pos.coords.longitude),
        () => doScan(28.6139, 77.2090)
      );
    } else {
      doScan(28.6139, 77.2090);
    }
  };
  const sendReq = async (target) => {
    try {
      await API.post('/friends/request', { requester: currentUser.username, addressee: target });
      onFriendAdded?.();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not send request');
    }
  };
  return (
    <div className="flex-1 p-6 bg-slate-950 text-white overflow-y-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
            <Compass size={22} /> Neighborhood Radar
          </h2>
          <p className="text-xs text-slate-400">Discover nearby encrypted nodes without sharing phone numbers.</p>
        </div>
        <button
          onClick={scanNearby}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white transition"
        >
          {loading ? 'Scanning...' : 'Scan Radar'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nearby.map((u) => {
          const rel = friendsMap[u.username];
          const status = rel ? rel.status : 'NONE';
          return (
            <div key={u.username} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold uppercase">
                  {u.username.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">@{u.username}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin size={11} className="text-emerald-400" /> {u.distanceKm?.toFixed(1) || '0.5'} km away
                  </p>
                </div>
              </div>
              {status === 'ACCEPTED' ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                  <CheckCircle size={14} /> Already Friend
                </span>
              ) : status === 'PENDING' ? (
                <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                  <Clock size={14} /> Pending
                </span>
              ) : (
                <button
                  onClick={() => sendReq(u.username)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1"
                >
                  <UserPlus size={14} /> Add Friend
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}