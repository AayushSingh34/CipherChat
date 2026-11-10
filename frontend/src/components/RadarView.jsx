import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { sounds } from '../services/soundEffects';
import { Compass, RefreshCw, UserPlus, Globe, Plus, Hash, Users } from 'lucide-react';
export default function RadarView({ currentUser, onSelectUser, onFriendAction }) {
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [publicChannels, setPublicChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [coords, setCoords] = useState({ lat: 28.4595, lon: 77.0266 });
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setCoords(newCoords);
          scanExplorer(newCoords.lat, newCoords.lon);
        },
        () => {
          scanExplorer(28.4595, 77.0266);
        },
        { timeout: 4000 }
      );
    } else {
      scanExplorer(28.4595, 77.0266);
    }
  }, []);
  const scanExplorer = async (lat = coords.lat, lon = coords.lon) => {
    if (!currentUser?.username) return;
    setLoading(true);
    try {
      const [nearbyRes, chRes] = await Promise.all([
        API.get('/discovery/nearby', {
          params: { username: currentUser.username, lat, lon, radiusKm: 50000 },
        }),
        API.get('/channels/discover', {
          params: { username: currentUser.username },
        }),
      ]);
      setNearbyUsers(nearbyRes.data || []);
      setPublicChannels(chRes.data || []);
    } catch (err) {
      console.error('Explorer scan failed:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleSendFriendRequest = async (targetUser) => {
    try {
      await API.post('/friends/request', {
        requester: currentUser.username,
        addressee: targetUser,
      });
      sounds?.playAccept?.();
      setStatusMsg(`Friend request sent to @${targetUser}!`);
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
      scanExplorer();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch {
      alert('Failed to join channel');
    }
  };
  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-white">
      {/* Header with ONLY Scan Now button */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Compass size={26} className={loading ? 'animate-spin' : ''} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Encrypted Node Explorer</h2>
            <p className="text-xs text-slate-400">
              Discover active users, groups & communities without sharing phone numbers
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => scanExplorer()}
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
      {/* Discoverable Users */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Users size={16} className="text-indigo-400" />
          Discoverable Users ({nearbyUsers.length})
        </h3>
        {nearbyUsers.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-500">
            No other visible users right now. Ask a friend to register or turn off Ghost Mode!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyUsers.map((u) => (
              <div
                key={u.username}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-500/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 uppercase">
                    {u.username.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">@{u.username}</p>
                    <p className="text-[11px] text-slate-400">
                      {u.distanceKm} km away • {u.strictPrivacy ? '🔒 Friends-Only DM' : '🌐 Open DM'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!u.strictPrivacy && onSelectUser && (
                    <button
                      onClick={() => onSelectUser(u)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-indigo-300"
                    >
                      Chat
                    </button>
                  )}
                  <button
                    onClick={() => handleSendFriendRequest(u.username)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium text-white flex items-center gap-1"
                  >
                    <UserPlus size={13} /> Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Groups & Communities */}
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
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium text-white flex items-center gap-1"
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