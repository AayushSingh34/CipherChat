import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import { sounds } from '../services/soundEffects';
import { Compass, RefreshCw, UserPlus, Globe, Plus, Hash, Users, MapPin } from 'lucide-react';
export default function RadarView({ currentUser, onSelectUser, onFriendAction }) {
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [publicChannels, setPublicChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [locationLabel, setLocationLabel] = useState('Detecting GPS location...');
  const coordsRef = useRef({ lat: null, lon: null });
  const resolveLocationAndScan = (manual = false) => {
    if (!currentUser?.username) return;
    if (manual) setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          coordsRef.current = { lat, lon };
          setLocationLabel(`GPS Active (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`);
          scanExplorer(lat, lon, manual);
        },
        () => {
          setLocationLabel('GPS Permission Denied (Using Network Region)');
          scanExplorer(coordsRef.current.lat, coordsRef.current.lon, manual);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
    } else {
      setLocationLabel('GPS Unavailable (Using Network Region)');
      scanExplorer(null, null, manual);
    }
  };
  useEffect(() => {
    resolveLocationAndScan(true);
    const interval = setInterval(() => {
      scanExplorer(coordsRef.current.lat, coordsRef.current.lon, false);
    }, 3000);
    return () => clearInterval(interval);
  }, [currentUser?.username]);
  const scanExplorer = async (lat = coordsRef.current.lat, lon = coordsRef.current.lon, showSpinner = false) => {
    if (!currentUser?.username) return;
    if (showSpinner) setLoading(true);
    try {
      const params = { username: currentUser.username, radiusKm: 50000 };
      if (lat !== null && lon !== null) {
        params.lat = lat;
        params.lon = lon;
      }
      const nearbyRes = await API.get('/discovery/nearby', { params });
      setNearbyUsers(Array.isArray(nearbyRes.data) ? nearbyRes.data : []);
    } catch (err) {
      console.error('Nearby users scan error:', err);
    }
    try {
      const chRes = await API.get('/channels/discover', {
        params: { username: currentUser.username },
      });
      setPublicChannels(Array.isArray(chRes.data) ? chRes.data : []);
    } catch (err) {
      console.error('Channels scan error:', err);
    }
    if (showSpinner) setLoading(false);
  };
  const formatDistance = (distKm) => {
    if (distKm === undefined || distKm === null) return 'Nearby';
    if (distKm < 0.1) return 'Within 100m';
    if (distKm < 1) return `${Math.round(distKm * 1000)}m away`;
    return `${distKm.toFixed(1)} km away`;
  };
  const handleSendFriendRequest = async (targetUser, displayName) => {
    try {
      await API.post('/friends/request', {
        requester: currentUser.username,
        addressee: targetUser,
      });
      sounds?.playAccept?.();
      setStatusMsg(`Friend request sent to ${displayName || targetUser}!`);
      onFriendAction?.();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not send friend request');
    }
  };
  const handleJoinChannel = async (ch) => {
    try {
      const res = await API.post('/channels/join', {
        channelId: ch.id,
        username: currentUser.username,
      });
      sounds?.playAccept?.();
      if (res.data?.status === 'PENDING') {
        setStatusMsg(`Join request sent to #${ch.name} (Waiting for Admin approval)`);
      } else {
        setStatusMsg(`Joined #${ch.name}!`);
      }
      onFriendAction?.();
      scanExplorer(coordsRef.current.lat, coordsRef.current.lon, false);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch {
      alert('Failed to join channel');
    }
  };
  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-white">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Compass size={26} className={loading ? 'animate-spin' : ''} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Encrypted Node Explorer</h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <MapPin size={12} className="text-emerald-400" />
              <span>{locationLabel}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => resolveLocationAndScan(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-600/20"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Scan Now
        </button>
      </div>
      {statusMsg && (
        <div className="bg-indigo-600/20 border border-indigo-500/50 text-indigo-300 px-4 py-2.5 rounded-xl text-xs font-medium">
          {statusMsg}
        </div>
      )}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Users size={16} className="text-indigo-400" />
          Discoverable Users ({nearbyUsers.length})
        </h3>
        {nearbyUsers.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-500">
            No other visible users right now. Users in Ghost Mode are hidden from Radar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyUsers.map((u) => {
              const shownName = u.displayName || u.username;
              return (
                <div
                  key={u.username}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-500/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 uppercase">
                      {shownName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{shownName}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDistance(u.distanceKm)} • {u.strictPrivacy ? '🔒 Friends-Only DM' : '🌐 Open DM'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!u.strictPrivacy && onSelectUser && (
                      <button
                        onClick={() => onSelectUser(u)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-indigo-300 cursor-pointer"
                      >
                        Chat
                      </button>
                    )}
                    <button
                      onClick={() => handleSendFriendRequest(u.username, shownName)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium text-white flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus size={13} /> Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Globe size={16} className="text-emerald-400" />
          Groups & Open Communities ({publicChannels.length})
        </h3>
        {publicChannels.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-500">
            No groups or communities created yet. Create one from the left sidebar!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicChannels.map((ch) => {
              const isMember = ch.members?.includes(currentUser.username);
              const isPending = ch.pendingRequests?.includes(currentUser.username);
              return (
                <div
                  key={ch.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                      <Hash size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{ch.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {ch.type} • {ch.members?.length || 1} member(s)
                      </p>
                    </div>
                  </div>
                  {isMember ? (
                    <span className="px-3 py-1 bg-slate-800 text-emerald-400 rounded-lg text-xs font-medium">
                      Joined
                    </span>
                  ) : isPending ? (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg text-xs font-medium">
                      Pending
                    </span>
                  ) : (
                    <button
                      onClick={() => handleJoinChannel(ch)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={13} /> Join
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}