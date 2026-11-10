import React, { useState, useEffect, useRef } from 'react';
import API from './services/api';
import { getOrCreateIdentityKeys, encryptText } from './crypto/cipherEngine';
import { connectSocket, sendEncryptedSocketMessage } from './services/socketService';
import { sounds } from './services/soundEffects';
import ChatWindow from './components/ChatWindow';
import RadarView from './components/RadarView';
import {
  Shield, Users, Compass, EyeOff, Lock, Key, Download, X, Check,
  UserX, ShieldBan, Palette, UserCheck, MessageSquare,
  Globe, Plus, HelpCircle, CheckCircle, Clock, UserPlus, Search, Settings, Menu
} from 'lucide-react';
const PRESET_THEMES = [
  { id: 'obsidian', name: 'Obsidian Night', bgClass: 'bg-slate-950', bubbleClass: 'bg-indigo-600' },
  { id: 'emerald', name: 'Deep Emerald', bgClass: 'bg-emerald-950', bubbleClass: 'bg-emerald-600' },
  { id: 'amethyst', name: 'Royal Amethyst', bgClass: 'bg-purple-950', bubbleClass: 'bg-purple-600' },
  { id: 'crimson', name: 'Crimson Glow', bgClass: 'bg-rose-950', bubbleClass: 'bg-rose-600' },
];
export default function App() {
  const [user, setUser] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [securityQuestionInput, setSecurityQuestionInput] = useState('');
  const [securityAnswerInput, setSecurityAnswerInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [fetchedQuestion, setFetchedQuestion] = useState('');
  const [resetAnswer, setResetAnswer] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [sidebarMode, setSidebarMode] = useState(() => localStorage.getItem('cipherchat_sidebar_mode') || 'on');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [chatSection, setChatSection] = useState('personal');
  const [activeTab, setActiveTab] = useState('chat');
  const [activeChat, setActiveChat] = useState(null);
  const [friends, setFriends] = useState({ accepted: [], blocked: [], pending: [] });
  const [friendsMap, setFriendsMap] = useState({});
  const [groups, setGroups] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [exploreResults, setExploreResults] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [pendingRequests, setPendingRequests] = useState([]);
  const [unreadMap, setUnreadMap] = useState({});
  const [typingMap, setTypingMap] = useState({});
  const [incomingTrigger, setIncomingTrigger] = useState(0);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelAvatar, setNewChannelAvatar] = useState('');
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSecurityQ, setEditSecurityQ] = useState('');
  const [editSecurityA, setEditSecurityA] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [activeTheme, setActiveTheme] = useState(() => {
    try { const saved = localStorage.getItem('cipherchat_theme'); return saved ? JSON.parse(saved) : { ...PRESET_THEMES[0], customImage: null }; } catch { return { ...PRESET_THEMES[0], customImage: null }; }
  });
  // Shared themes per conversation (friend username or channel ID)
  const [sharedThemes, setSharedThemes] = useState(() => {
    try { const saved = localStorage.getItem('cipherchat_shared_themes'); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });
  const handleSharedThemeUpdate = (chatKey, newThemeObj) => {
    setSharedThemes((prev) => {
      const next = { ...prev, [chatKey]: newThemeObj };
      localStorage.setItem('cipherchat_shared_themes', JSON.stringify(next));
      return next;
    });
  };
  // Broadcast theme change to the active friend, group, or community so everyone sees it!
  const applyAndBroadcastTheme = (newThemeObj) => {
    setActiveTheme(newThemeObj);
    localStorage.setItem('cipherchat_theme', JSON.stringify(newThemeObj));
  };
  const activeChatRef = useRef(null);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);
  const handleSetSidebarMode = (mode) => {
    setSidebarMode(mode);
    localStorage.setItem('cipherchat_sidebar_mode', mode);
  };
  const handleAuth = async (e) => {
    e.preventDefault();
    const { publicKeyBase64, privateKey: privKey } = await getOrCreateIdentityKeys(usernameInput);
    setPrivateKey(privKey);
    const endpoint = isRegistering ? '/auth/register' : '/auth/login';
    try {
      const res = await API.post(endpoint, {
        username: usernameInput,
        passwordHash: passwordInput,
        publicKey: publicKeyBase64,
        securityQuestion: securityQuestionInput || undefined,
        securityAnswer: securityAnswerInput || undefined,
      });
      setUser(res.data);
      setEditDisplayName(res.data.displayName || res.data.username);
      setAvatarPreview(res.data.avatar || '');
      setEditSecurityQ(res.data.securityQuestion || '');
      const initialOnline = await API.get('/chat/presence/online');
      setOnlineUsers(new Set(initialOnline.data));
      connectSocket(res.data.username, {
        onMessageReceived: (incomingMsg) => {
          const isCurrentPartner = activeChatRef.current?.username === incomingMsg.senderUsername;
          const isCurrentChannel = activeChatRef.current?.id === incomingMsg.receiverUsername;
          if (!isCurrentPartner && !isCurrentChannel && incomingMsg.senderUsername !== res.data.username) {
            setUnreadMap((prev) => ({
              ...prev,
              [incomingMsg.senderUsername]: (prev[incomingMsg.senderUsername] || 0) + 1,
            }));
          }
          setIncomingTrigger((prev) => prev + 1);
        },
        onTypingReceived: (typingEvent) => {
          setTypingMap((prev) => ({
            ...prev,
            [typingEvent.senderUsername]: typingEvent.isTyping,
          }));
        },
        onNotificationReceived: () => {
          fetchSocialData();
          setIncomingTrigger((prev) => prev + 1);
          sounds.playIncomingRequest();
        },
        onPresenceUpdate: (data) => {
          if (data.type === 'PROFILE_UPDATED') {
            fetchSocialData();
          } else if (data.allOnline) {
            setOnlineUsers(new Set(data.allOnline));
          }
        },
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Authentication failed');
    }
  };
  const handleFetchSecurityQuestion = async (e) => {
    e.preventDefault();
    try {
      const res = await API.get('/auth/security-question', { params: { username: usernameInput } });
      setFetchedQuestion(res.data.question);
      setForgotStep(2);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not fetch question');
    }
  };
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await API.post('/auth/reset-password', {
        username: usernameInput,
        securityAnswer: resetAnswer,
        newPassword: newPasswordInput,
      });
      alert('Password reset successful! You can now login.');
      setIsForgotPassword(false);
      setForgotStep(1);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  };
  const fetchSocialData = async () => {
    if (!user) return;
    try {
      const res = await API.get('/friends/list', { params: { username: user.username } });
      const all = res.data;
      const incoming = all.filter((f) => f.status === 'PENDING' && !f.isRequester);
      const accepted = all.filter((f) => f.status === 'ACCEPTED');
      const blocked = all.filter((f) => f.status === 'BLOCKED' && f.blockedBy === user.username);
      const map = {};
      all.forEach((rel) => { map[rel.username] = rel; });
      setPendingRequests(incoming);
      setFriends({ accepted, blocked, pending: all.filter((f) => f.status === 'PENDING') });
      setFriendsMap(map);
      const gRes = await API.get('/channels', { params: { type: 'GROUP' } });
      const cRes = await API.get('/channels', { params: { type: 'COMMUNITY' } });
      setGroups(gRes.data);
      setCommunities(cRes.data);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    fetchSocialData();
  }, [user, incomingTrigger]);
  const selectChat = (item, isChannel = false) => {
    setActiveChat({ ...item, isChannel });
    setActiveTab('chat');
    if (!isChannel) {
      setUnreadMap((prev) => {
        const copy = { ...prev };
        delete copy[item.username];
        return copy;
      });
    }
  };
  const handleRespondRequest = async (friendshipId, action) => {
    if (action === 'ACCEPT') sounds.playAccept();
    else sounds.playRejectOrBlock();
    await API.post('/friends/respond', { friendshipId, action, username: user.username });
    fetchSocialData();
  };
  const handleSearchFriend = (e) => {
    e.preventDefault();
    const query = searchUsername.trim();
    if (!query) { setSearchResult(null); return; }
    if (query.toLowerCase() === user.username.toLowerCase()) {
      setSearchResult({ username: query, isSelf: true });
      return;
    }
    const rel = friendsMap[query];
    setSearchResult({ username: query, isSelf: false, status: rel ? rel.status : 'NONE' });
  };
  const addSearchedFriend = async (target) => {
    try {
      await API.post('/friends/request', { requester: user.username, addressee: target });
      setSearchResult({ username: target, isSelf: false, status: 'PENDING' });
      fetchSocialData();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not send request');
    }
  };
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    const type = chatSection === 'groups' ? 'GROUP' : 'COMMUNITY';
    try {
      const res = await API.post('/channels', {
        name: newChannelName.trim(),
        type,
        description: newChannelDesc.trim(),
        username: user.username,
        avatar: newChannelAvatar,
        isPrivate: isPrivateChannel,
      });
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelAvatar('');
      setIsPrivateChannel(false);
      setShowCreateChannelModal(false);
      await fetchSocialData();
      selectChat(res.data, true);
    } catch {
      alert('Could not create channel');
    }
  };
  const handleSearchChannels = async (e) => {
    e.preventDefault();
    const type = chatSection === 'groups' ? 'GROUP' : 'COMMUNITY';
    const res = await API.get('/channels/search', { params: { query: searchQuery, type } });
    setExploreResults(res.data);
  };
  const handleRequestJoinChannel = async (channelId) => {
    try {
      await API.post('/channels/request-join', { channelId, username: user.username });
      handleSearchChannels({ preventDefault: () => {} });
      fetchSocialData();
      sounds.playAccept();
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to join channel');
    }
  };
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put('/auth/profile', {
        username: user.username,
        displayName: editDisplayName,
        newPassword: editPassword || undefined,
        avatar: avatarPreview,
        securityQuestion: editSecurityQ || undefined,
        securityAnswer: editSecurityA || undefined,
      });
      setUser(res.data);
      setShowProfileModal(false);
      sounds.playAccept();
    } catch {
      alert('Could not update profile');
    }
  };
  const togglePrivacy = async (field) => {
    const updated = {
      username: user.username,
      discoverable: field === 'discoverable' ? !user.discoverable : user.discoverable,
      strictPrivacy: field === 'strictPrivacy' ? !user.strictPrivacy : user.strictPrivacy,
    };
    const res = await API.put('/discovery/privacy', updated);
    setUser(res.data);
  };
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl">
            <Shield size={24} /> CipherChat
          </div>
          {isForgotPassword ? (
            <div className="space-y-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <HelpCircle size={18} className="text-indigo-400" /> Account Recovery
              </h3>
              {forgotStep === 1 ? (
                <form onSubmit={handleFetchSecurityQuestion} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter your exact username"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl font-medium text-sm text-white transition">
                    Find Security Question
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-[11px] text-slate-400 block mb-1">Your Security Question:</span>
                    <p className="text-sm font-medium text-indigo-300">{fetchedQuestion}</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Your Answer"
                    required
                    value={resetAnswer}
                    onChange={(e) => setResetAnswer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                  <input
                    type="password"
                    placeholder="Enter New Passphrase"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl font-medium text-sm text-white transition">
                    Reset Passphrase
                  </button>
                </form>
              )}
              <p onClick={() => { setIsForgotPassword(false); setForgotStep(1); }} className="text-center text-xs text-slate-400 cursor-pointer hover:text-white">
                Back to Login
              </p>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4">
              <p className="text-xs text-slate-400">Zero phone numbers required. Instant local browser encryption.</p>
              <input
                type="text"
                placeholder="Username"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
              />
              <input
                type="password"
                placeholder="Passphrase"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
              />
              {isRegistering && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">Password Recovery Setup (Optional)</span>
                  <input
                    type="text"
                    placeholder="Make your own security question"
                    value={securityQuestionInput}
                    onChange={(e) => setSecurityQuestionInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Answer to your security question"
                    value={securityAnswerInput}
                    onChange={(e) => setSecurityAnswerInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white"
                  />
                </div>
              )}
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl font-medium text-sm text-white transition">
                {isRegistering ? 'Create Encrypted Identity' : 'Unlock & Login'}
              </button>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span onClick={() => setIsRegistering(!isRegistering)} className="cursor-pointer hover:text-white">
                  {isRegistering ? 'Already registered? Login' : 'Need an identity? Register'}
                </span>
                {!isRegistering && (
                  <span onClick={() => setIsForgotPassword(true)} className="cursor-pointer text-indigo-400 hover:underline">
                    Forgot Password?
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }
  const isSidebarVisible = sidebarMode === 'on' || (sidebarMode === 'autohide' && isSidebarHovered);
  return (
    <div className="h-screen flex overflow-hidden relative bg-slate-950">
      {sidebarMode === 'autohide' && !isSidebarHovered && (
        <div
          onMouseEnter={() => setIsSidebarHovered(true)}
          className="w-3 h-full bg-indigo-600/20 hover:bg-indigo-600/50 cursor-pointer z-40 transition-colors flex items-center justify-center"
          title="Hover to reveal sidebar"
        />
      )}
      {isSidebarVisible && (
        <div
          onMouseLeave={() => { if (sidebarMode === 'autohide') setIsSidebarHovered(false); }}
          className={`${
            sidebarMode === 'autohide' ? 'fixed left-0 top-0 bottom-0 z-40 shadow-2xl' : 'relative'
          } w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full transition-all`}
        >
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/40" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs ring-1 ring-emerald-500/30">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="leading-tight">
                  <span className="font-bold text-sm text-white block truncate max-w-[110px]">{user.displayName || user.username}</span>
                  <span className="text-[10px] text-slate-400">@{user.username}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`p-2 rounded-lg ${activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  title="Chats"
                >
                  <Users size={16} />
                </button>
                <button
                  onClick={() => setActiveTab('radar')}
                  className={`p-2 rounded-lg ${activeTab === 'radar' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  title="Neighborhood Radar"
                >
                  <Compass size={16} />
                </button>
                <button
                  onClick={() => setActiveTab('blocked')}
                  className={`p-2 rounded-lg ${activeTab === 'blocked' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  title="Blocked List"
                >
                  <ShieldBan size={16} />
                </button>
              </div>
            </div>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => togglePrivacy('discoverable')}
                className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 border transition ${
                  user.discoverable ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-slate-700 text-slate-400'
                }`}
              >
                <EyeOff size={12} /> {user.discoverable ? 'Radar Visible' : 'Ghost Mode'}
              </button>
              <button
                onClick={() => togglePrivacy('strictPrivacy')}
                className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 border transition ${
                  user.strictPrivacy ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-slate-700 text-slate-400'
                }`}
              >
                <Lock size={12} /> {user.strictPrivacy ? 'Friends Only' : 'Open DMs'}
              </button>
            </div>
            <form onSubmit={handleSearchFriend} className="flex gap-1">
              <input
                type="text"
                placeholder="Search friend by username..."
                value={searchUsername}
                onChange={(e) => {
                  setSearchUsername(e.target.value);
                  if (!e.target.value.trim()) setSearchResult(null);
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-3 rounded-lg text-xs font-medium text-white transition flex items-center gap-1">
                <Search size={12} /> Search
              </button>
            </form>
            {searchResult && (
              <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">@{searchResult.username}</p>
                  <p className="text-[10px] text-slate-400">
                    {searchResult.isSelf ? 'This is you' : searchResult.status === 'ACCEPTED' ? 'Connected friend' : searchResult.status === 'PENDING' ? 'Pending request' : 'User located'}
                  </p>
                </div>
                {searchResult.isSelf ? null : searchResult.status === 'ACCEPTED' ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                    <CheckCircle size={12} /> Already Friend
                  </span>
                ) : searchResult.status === 'PENDING' ? (
                  <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                    <Clock size={12} /> Pending
                  </span>
                ) : (
                  <button
                    onClick={() => addSearchedFriend(searchResult.username)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-medium"
                  >
                    <UserPlus size={12} /> Add Friend
                  </button>
                )}
              </div>
            )}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => { setChatSection('personal'); setActiveTab('chat'); }}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                  chatSection === 'personal' && activeTab === 'chat' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users size={13} /> Personal
              </button>
              <button
                onClick={() => { setChatSection('groups'); setActiveTab('chat'); }}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                  chatSection === 'groups' && activeTab === 'chat' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare size={13} /> Groups
              </button>
              <button
                onClick={() => { setChatSection('communities'); setActiveTab('chat'); }}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                  chatSection === 'communities' && activeTab === 'chat' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe size={13} /> Communities
              </button>
              <button
                onClick={() => setActiveTab('explore')}
                className={`px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
                  activeTab === 'explore' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                }`}
                title="Explore & Search Groups/Communities"
              >
                <Search size={13} />
              </button>
            </div>
          </div>
          {pendingRequests.length > 0 && (
            <div className="p-3 bg-indigo-950/40 border-b border-indigo-900/60 space-y-2">
              <p className="text-[11px] font-semibold text-indigo-300 flex items-center justify-between">
                <span>Incoming Friend Requests</span>
                <span className="bg-indigo-600 text-white text-[10px] px-1.5 rounded-full">{pendingRequests.length}</span>
              </p>
              {pendingRequests.map((req) => (
                <div key={req.friendshipId} className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-center justify-between shadow-sm">
                  <span className="text-xs font-medium text-white truncate max-w-[100px]">@{req.username}</span>
                  <div className="flex gap-1">
                    <button onClick={() => handleRespondRequest(req.friendshipId, 'ACCEPT')} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white" title="Accept">
                      <Check size={12} />
                    </button>
                    <button onClick={() => handleRespondRequest(req.friendshipId, 'REJECT')} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300" title="Decline">
                      <X size={12} />
                    </button>
                    <button onClick={() => handleRespondRequest(req.friendshipId, 'BLOCK')} className="p-1.5 bg-rose-600/80 hover:bg-rose-600 rounded text-white" title="Block">
                      <UserX size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 pb-16">
            {activeTab === 'blocked' ? (
              <div className="space-y-1">
                <p className="text-[11px] text-slate-400 px-2 py-1">Blocked Users</p>
                {friends.blocked?.length === 0 && <p className="text-xs text-slate-600 px-2">No blocked users.</p>}
                {friends.blocked?.map((b) => (
                  <div key={b.username} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">@{b.username}</span>
                    <button onClick={() => handleRespondRequest(b.friendshipId, 'UNBLOCK')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] rounded text-emerald-400">
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            ) : activeTab === 'explore' ? (
              <div className="space-y-3 p-1">
                <p className="text-xs font-semibold text-emerald-400">Explore {chatSection === 'groups' ? 'Groups' : 'Communities'}</p>
                <form onSubmit={handleSearchChannels} className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Search channel name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <button type="submit" className="bg-emerald-600 px-3 rounded-lg text-xs font-medium text-white">Go</button>
                </form>
                <div className="space-y-2 pt-2">
                  {exploreResults.map((ch) => {
                    const isMember = ch.members.includes(user.username);
                    const isPending = ch.pendingRequests?.includes(user.username);
                    return (
                      <div key={ch.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white"># {ch.name}</span>
                          <span className="text-[10px] text-slate-400">{ch.isPrivate ? 'Private' : 'Public'}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{ch.description || 'No description'}</p>
                        {isMember ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Joined</span>
                        ) : isPending ? (
                          <span className="text-xs text-amber-400 flex items-center gap-1"><Clock size={12} /> Approval Pending</span>
                        ) : (
                          <button
                            onClick={() => handleRequestJoinChannel(ch.id)}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
                          >
                            Request to Join
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : chatSection === 'personal' ? (
              friends.accepted?.map((f) => {
                const isOnline = onlineUsers.has(f.username);
                const isSelected = activeChat?.username === f.username && !activeChat?.isChannel;
                return (
                  <div
                    key={f.username}
                    onClick={() => selectChat(f, false)}
                    className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between ${
                      isSelected ? 'bg-indigo-600/20 border border-indigo-500/40' : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full transition-colors ${isOnline ? 'bg-emerald-400 ring-2 ring-emerald-500/30' : 'bg-slate-600'}`} />
                      {f.avatar ? (
                        <img src={f.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-400 uppercase">
                          {f.username.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">@{f.username}</p>
                        <p className="text-[11px] text-slate-400">
                          {typingMap[f.username] ? (
                            <span className="text-indigo-400 font-medium">typing...</span>
                          ) : isOnline ? (
                            'Online'
                          ) : (
                            'Offline'
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadMap[f.username] > 0 && (
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unreadMap[f.username]}
                        </span>
                      )}
                      <Lock size={14} className="text-emerald-400" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">
                    {chatSection === 'groups' ? 'Group Circles' : 'Open Communities'}
                  </span>
                  <button
                    onClick={() => setShowCreateChannelModal(true)}
                    className="p-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition"
                    title="Create Channel"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                {(chatSection === 'groups' ? groups : communities)
                  .filter((ch) => ch.members.includes(user.username))
                  .map((ch) => {
                    const isSelected = activeChat?.id === ch.id;
                    return (
                      <div
                        key={ch.id}
                        onClick={() => selectChat(ch, true)}
                        className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between ${
                          isSelected ? 'bg-indigo-600/20 border border-indigo-500/40' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {ch.avatar ? (
                            <img src={ch.avatar} alt="ch" className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                              #
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">{ch.name}</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                              {ch.description || `${ch.members.length} member(s)`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Main View Area */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {activeTab === 'radar' ? (
          <RadarView
            currentUser={user}
            friendsMap={friendsMap}
            onFriendAdded={() => {
              fetchSocialData();
              setActiveTab('chat');
            }}
          />
        ) : (
          <ChatWindow
            currentUser={user}
            privateKey={privateKey}
            activeChat={activeChat}
            activePartner={activeChat}
            incomingTrigger={incomingTrigger}
            isPartnerTyping={Boolean(activeChat && typingMap[activeChat.username])}
            themeConfig={activeTheme}
            sharedThemes={sharedThemes}
            onSharedThemeUpdate={handleSharedThemeUpdate}
            onFriendUpdated={(clearActive) => { if (clearActive) setActiveChat(null); fetchSocialData(); }}
          />
        )}
      </div>
      {/* Bottom-Left Settings Hub */}
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition transform active:scale-95"
          title="Customization & Sidebar Settings"
        >
          <Settings size={20} className={showSettingsMenu ? 'animate-spin' : ''} />
        </button>
        {showSettingsMenu && (
          <div className="absolute bottom-14 left-0 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 space-y-3">
            <div className="border-b border-slate-800 pb-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <Menu size={13} className="text-indigo-400" /> Sidebar Visibility
              </p>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {['on', 'autohide', 'off'].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleSetSidebarMode(m)}
                    className={`py-1 rounded-lg text-[11px] font-medium capitalize transition ${
                      sidebarMode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m === 'autohide' ? 'Auto' : m}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => { setShowSettingsMenu(false); setShowProfileModal(true); }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5"
              >
                <UserCheck size={15} className="text-indigo-400" /> Profile & Security Setup
              </button>
              <button
                onClick={() => { setShowSettingsMenu(false); setShowThemeModal(true); }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5"
              >
                <Palette size={15} className="text-emerald-400" /> Sync Chat Wallpaper & Theme
              </button>
              <button
                onClick={() => { setShowSettingsMenu(false); setShowKeyModal(true); }}
                className="w-full px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2.5"
              >
                <Key size={15} className="text-amber-400" /> Backup Encryption Keys
              </button>
            </div>
          </div>
        )}
      </div>
      {/* MODAL: Create Group/Community */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateChannel} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">
                Create {chatSection === 'groups' ? 'Group Circle' : 'Community'}
              </h3>
              <button type="button" onClick={() => setShowCreateChannelModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-2">
              {newChannelAvatar ? (
                <img src={newChannelAvatar} alt="Preview" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400 font-bold text-xl">
                  #
                </div>
              )}
              <label className="text-xs text-indigo-400 hover:underline cursor-pointer">
                Upload Profile Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const r = new FileReader();
                    r.onload = (ev) => setNewChannelAvatar(ev.target.result);
                    r.readAsDataURL(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <input
              type="text"
              placeholder="Channel Name"
              required
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
            />
            <textarea
              placeholder="Description (optional)"
              value={newChannelDesc}
              onChange={(e) => setNewChannelDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
              rows={2}
            />
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isPrivateChannel}
                onChange={(e) => setIsPrivateChannel(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
              />
              Private Channel (Requires Admin Approval to Join)
            </label>
            <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium text-white transition">
              Create Channel
            </button>
          </form>
        </div>
      )}
      {/* MODAL: Profile Settings */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <UserCheck className="text-indigo-400" size={18} /> Profile & Security
              </h3>
              <button type="button" onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-2">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold uppercase">
                  {user.username.charAt(0)}
                </div>
              )}
              <label className="text-xs text-indigo-400 hover:underline cursor-pointer">
                Change Profile Picture
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const r = new FileReader();
                    r.onload = (ev) => setAvatarPreview(ev.target.result);
                    r.readAsDataURL(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Display Name</label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">New Passphrase (optional)</label>
              <input
                type="password"
                value={editPassword}
                placeholder="Leave blank to keep current"
                onChange={(e) => setEditPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[11px] text-amber-400 font-semibold block">Password Recovery Question</span>
              <input
                type="text"
                placeholder="Your custom question..."
                value={editSecurityQ}
                onChange={(e) => setEditSecurityQ(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Answer to your security question"
                value={editSecurityA}
                onChange={(e) => setEditSecurityA(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>
            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium text-white transition">
              Save Preferences
            </button>
          </form>
        </div>
      )}
      {/* MODAL: Shared Theme Customizer (Broadcasts to Partner / Group / Community) */}
      {showThemeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Palette className="text-emerald-400" size={18} /> Shared Chat Theme
              </h3>
              <button onClick={() => setShowThemeModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {activeChat
                ? `Changing this theme will automatically update the chat background & bubbles for everyone in ${activeChat.isChannel ? '#' + activeChat.name : '@' + activeChat.username}!`
                : 'Select a chat first if you want your theme change to sync with a friend or group.'}
            </p>
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-medium">Custom Wallpaper from Device</p>
              <label className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-xs font-medium text-white cursor-pointer border border-slate-700 transition">
                Browse Photo from System
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const r = new FileReader();
                    r.onload = (ev) => {
                      const updated = { ...activeTheme, name: 'Custom Wallpaper', customImage: ev.target.result };
                      applyAndBroadcastTheme(updated);
                      setShowThemeModal(false);
                    };
                    r.readAsDataURL(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-400 font-medium">Preset Shared Themes</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      const updated = { ...theme, customImage: null };
                      applyAndBroadcastTheme(updated);
                      setShowThemeModal(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition ${
                      activeTheme.id === theme.id && !activeTheme.customImage
                        ? 'border-indigo-500 bg-indigo-600/20 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{theme.name}</span>
                    <span className={`w-3 h-3 rounded-full ${theme.bubbleClass}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Key Backup */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Key className="text-indigo-400" size={18} /> E2EE Key Backup
              </h3>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-400">Download your encryption keys to restore conversations on another device.</p>
            <button
              onClick={() => {
                const saved = localStorage.getItem(`cipherchat_keys_${user.username}`);
                const blob = new Blob([saved], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cipherchat_backup_${user.username}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-xl text-xs font-medium text-white transition"
            >
              <Download size={14} /> Export Backup (.json)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}