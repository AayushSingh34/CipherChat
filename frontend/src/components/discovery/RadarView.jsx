import React, { useState } from "react";
import API from "../services/api";
import { Compass, UserPlus, CheckCircle, Clock } from "lucide-react";

export default function RadarView({ currentUser, friendsMap, onFriendAdded }) {
  const [nearby, setNearby] = useState([]);
  const [status, setStatus] = useState(
    "Click Scan Nearby to discover users in your area.",
  );

  const scanNeighborhood = () => {
    setStatus("Acquiring coordinates...");
    if (!navigator.geolocation) {
      fallbackScan();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await API.post("/discovery/location", {
            username: currentUser.username,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          const res = await API.get("/discovery/nearby", {
            params: { username: currentUser.username, radiusKm: 15 },
          });
          setNearby(res.data);
          setStatus(`Found ${res.data.length} discoverable user(s) nearby.`);
        } catch {
          setStatus("Error scanning neighborhood.");
        }
      },
      () => fallbackScan(),
    );
  };

  const fallbackScan = async () => {
    await API.post("/discovery/location", {
      username: currentUser.username,
      latitude: 28.6139 + (Math.random() - 0.5) * 0.02,
      longitude: 77.209 + (Math.random() - 0.5) * 0.02,
    });
    const res = await API.get("/discovery/nearby", {
      params: { username: currentUser.username, radiusKm: 15 },
    });
    setNearby(res.data);
    setStatus(
      `Found ${res.data.length} user(s) in simulated neighborhood radar.`,
    );
  };

  const addFriend = async (targetUsername) => {
    await API.post("/friends/request", {
      requester: currentUser.username,
      addressee: targetUsername,
    });
    onFriendAdded();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
            <Compass className="text-emerald-400" size={20} /> Neighborhood
            Radar
          </h2>
          <p className="text-xs text-slate-400">{status}</p>
        </div>
        <button
          onClick={scanNeighborhood}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition"
        >
          Scan Nearby
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {nearby.map((u) => {
          const relation = friendsMap[u.username];
          const isFriend = relation?.status === "ACCEPTED";
          const isPending = relation?.status === "PENDING";

          return (
            <div
              key={u.username}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-white">@{u.username}</p>
                <p className="text-xs text-emerald-400">
                  {u.distanceKm} km away
                </p>
              </div>

              {isFriend ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <CheckCircle size={14} /> Already Friend
                </span>
              ) : isPending ? (
                <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                  <Clock size={14} /> Request Pending
                </span>
              ) : (
                <button
                  onClick={() => addFriend(u.username)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
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
