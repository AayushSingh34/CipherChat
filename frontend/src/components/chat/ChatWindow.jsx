import React, { useState, useEffect, useRef } from 'react';
import API from '../../services/api';
import { encryptText, decryptText } from '../../crypto/cipherEngine';
import { sendEncryptedSocketMessage, sendTypingStatus } from '../../services/socketService';
import { sounds } from '../../services/soundEffects';
import {
  Lock, Send, Paperclip, Image as ImageIcon, Download, Smile, MoreVertical,
  ShieldBan, UserMinus, UserPlus, Check, X, Users, Mic, Square, Edit3, Trash2
} from 'lucide-react';
const EMOJIS = ['😀', '😂', '🔥', '❤️', '👍', '🎉', '🔒', '👀', '✨', '🚀', '💯', '😎', '🙌', '🤝', '⚡', '🥳'];
export default function ChatWindow(props) {
  const {
    currentUser,
    privateKey,
    activeChat,
    activePartner,
    incomingTrigger,
    isPartnerTyping,
    themeConfig,
    onFriendUpdated,
  } = props;
  const currentChat = activeChat || activePartner;
  const isChannel = Boolean(currentChat?.isChannel);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showEditChannelModal, setShowEditChannelModal] = useState(false);
  const [newMemberInput, setNewMemberInput] = useState('');
  const [channelData, setChannelData] = useState(null);
  const [editChName, setEditChName] = useState('');
  const [editChDesc, setEditChDesc] = useState('');
  const [editChAvatar, setEditChAvatar] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);
  useEffect(() => {
    if (!currentChat) return;
    setChannelData(currentChat);
    setEditChName(currentChat.name || '');
    setEditChDesc(currentChat.description || '');
    setEditChAvatar(currentChat.avatar || '');
    loadHistory();
    setShowMenu(false);
  }, [currentChat?.username, currentChat?.id, incomingTrigger]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);
  const loadHistory = async () => {
    if (!currentChat) return;
    try {
      let rawList = [];
      if (isChannel) {
        const res = await API.get('/chat/history', {
          params: { user1: currentChat.id, user2: currentChat.id },
        });
        rawList = res.data.map((m) => ({ ...m, plaintext: m.ciphertext }));
      } else {
        const res = await API.get('/chat/history', {
          params: { user1: currentUser.username, user2: currentChat.username },
        });
        rawList = await Promise.all(
          res.data.map(async (m) => {
            const plain = await decryptText(m.ciphertext, m.iv, privateKey, currentChat.publicKey);
            return { ...m, plaintext: plain };
          })
        );
      }
      // Filter out any old THEME_CHANGE system messages so themes stay 100% personal
      setMessages(rawList.filter((m) => m.messageType !== 'THEME_CHANGE'));
    } catch (err) {
      console.error('History load error:', err);
    }
  };
  const dispatchPayload = async (rawContent, messageType, fileName = null) => {
    if (!currentChat) return;
    if (isChannel) {
      sendEncryptedSocketMessage({
        senderUsername: currentUser.username,
        receiverUsername: currentChat.id,
        ciphertext: rawContent,
        iv: 'PLAINTEXT',
        messageType,
        fileName,
      });
    } else {
      const { ciphertext, iv } = await encryptText(rawContent, privateKey, currentChat.publicKey);
      sendEncryptedSocketMessage({
        senderUsername: currentUser.username,
        receiverUsername: currentChat.username,
        ciphertext,
        iv,
        messageType,
        fileName,
      });
    }
  };
  const handleDeleteMessage = async (msgId) => {
    try {
      await API.delete(`/chat/message/${msgId}`, {
        params: { username: currentUser.username },
      });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      sounds?.playRejectOrBlock?.();
    } catch {
      alert('Could not delete message');
    }
  };
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (isChannel || !currentChat) return;
    sendTypingStatus(currentUser.username, currentChat.username, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(currentUser.username, currentChat.username, false);
    }, 1500);
  };
  const handleSendText = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentChat) return;
    if (!isChannel) sendTypingStatus(currentUser.username, currentChat.username, false);
    await dispatchPayload(input, 'TEXT');
    setInput('');
    setShowEmojis(false);
  };
  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file || !currentChat) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      await dispatchPayload(event.target.result, type, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async (ev) => {
          await dispatchPayload(ev.target.result, 'AUDIO', `voice_${Date.now()}.webm`);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert('Microphone permission denied or no microphone available.');
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };
  const triggerDownload = (dataUrl, fileName) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName || 'cipherchat_download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  // Fixed Block / Unfriend handler: passes both friendshipId AND targetUsername so it never fails!
  const handleManageFriend = async (action) => {
    try {
      sounds?.playRejectOrBlock?.();
      await API.post('/friends/respond', {
        friendshipId: currentChat.friendshipId || '',
        targetUsername: currentChat.username,
        action,
        username: currentUser.username,
      });
      setShowMenu(false);
      onFriendUpdated?.(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update friend status');
    }
  };
  const handleSaveChannelDetails = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put(`/channels/${currentChat.id}`, {
        name: editChName,
        description: editChDesc,
        avatar: editChAvatar,
      });
      setChannelData(res.data);
      setShowEditChannelModal(false);
      sounds?.playAccept?.();
      onFriendUpdated?.(false);
    } catch {
      alert('Failed to update channel info');
    }
  };
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberInput.trim()) return;
    try {
      const res = await API.post('/channels/add-member', {
        channelId: currentChat.id,
        username: newMemberInput.trim(),
      });
      setChannelData(res.data);
      setNewMemberInput('');
      sounds?.playAccept?.();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not add user');
    }
  };
  const handleModerateMember = async (targetUser, action) => {
    const res = await API.post('/channels/manage-member', {
      channelId: currentChat.id,
      targetUser,
      action,
    });
    setChannelData(res.data);
    sounds?.playRejectOrBlock?.();
  };
  const handleApproveJoin = async (targetUser, action) => {
    const res = await API.post('/channels/respond-join', {
      channelId: currentChat.id,
      username: targetUser,
      action,
    });
    setChannelData(res.data);
    if (action === 'APPROVE') sounds?.playAccept?.();
    else sounds?.playRejectOrBlock?.();
  };
  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        Select any friend, group, or community from the sidebar to start chatting.
      </div>
    );
  }
  const activeChannel = channelData || currentChat;
  // Strictly use your personal themeConfig
  const containerStyle = themeConfig?.customImage
    ? { backgroundImage: `url(${themeConfig.customImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};
  return (
    <div className={`flex-1 flex flex-col h-full relative transition-colors ${themeConfig?.bgClass || 'bg-slate-950'}`} style={containerStyle}>
      {themeConfig?.customImage && <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] pointer-events-none" />}
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          {isChannel ? (
            activeChannel.avatar ? (
              <img src={activeChannel.avatar} alt="channel" className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/40" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-lg">
                #
              </div>
            )
          ) : currentChat.avatar ? (
            <img src={currentChat.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-white uppercase">
              {currentChat.username?.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              {isChannel ? activeChannel.name : `@${currentChat.username}`}
              {isChannel && (
                <button
                  onClick={() => setShowEditChannelModal(true)}
                  className="text-slate-400 hover:text-indigo-400 transition"
                  title="Edit Group/Community Profile & Description"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </h3>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <Lock size={12} />
              {isChannel
                ? `${activeChannel.type} • ${activeChannel.members?.length || 1} Member(s) ${activeChannel.description ? '• ' + activeChannel.description : ''}`
                : 'End-to-End Encrypted (AES-256-GCM)'}
            </p>
          </div>
        </div>
        {isChannel ? (
          <button
            onClick={() => setShowMembersPanel(!showMembersPanel)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white flex items-center gap-1.5"
          >
            <Users size={14} className="text-indigo-400" />
            Manage Members
            {activeChannel.pendingRequests?.length > 0 && (
              <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 rounded-full">
                {activeChannel.pendingRequests.length}
              </span>
            )}
          </button>
        ) : (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-300">
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-20 py-1">
                <button
                  onClick={() => handleManageFriend('UNFRIEND')}
                  className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <UserMinus size={14} className="text-amber-400" /> Unfriend
                </button>
                <button
                  onClick={() => handleManageFriend('BLOCK')}
                  className="w-full px-4 py-2 text-left text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2"
                >
                  <ShieldBan size={14} /> Block User
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Group/Community Member Moderation Drawer */}
      {isChannel && showMembersPanel && (
        <div className="p-4 bg-slate-900/95 border-b border-slate-800 space-y-3 relative z-10 max-h-64 overflow-y-auto">
          <form onSubmit={handleAddMember} className="flex gap-2">
            <input
              type="text"
              placeholder="Add member directly by username..."
              value={newMemberInput}
              onChange={(e) => setNewMemberInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
            />
            <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium text-white flex items-center gap-1">
              <UserPlus size={13} /> Add Member
            </button>
          </form>
          {activeChannel.pendingRequests?.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <p className="text-[11px] font-semibold text-amber-400">Pending Join Requests</p>
              {activeChannel.pendingRequests.map((reqUser) => (
                <div key={reqUser} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-xs text-white">@{reqUser}</span>
                  <div className="flex gap-1">
                    <button onClick={() => handleApproveJoin(reqUser, 'APPROVE')} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-[11px] text-white flex items-center gap-1">
                      <Check size={12} /> Approve
                    </button>
                    <button onClick={() => handleApproveJoin(reqUser, 'DENY')} className="px-2 py-1 bg-rose-600 hover:bg-rose-500 rounded text-[11px] text-white flex items-center gap-1">
                      <X size={12} /> Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400">Channel Members</p>
            {activeChannel.members?.map((m) => (
              <div key={m} className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-white">
                  @{m} {m === activeChannel.createdBy && <span className="text-indigo-400 text-[10px] ml-1">(Admin)</span>}
                </span>
                {m !== currentUser.username && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleModerateMember(m, 'REMOVE')}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-amber-600/30 text-amber-300 rounded text-[10px]"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleModerateMember(m, 'BLOCK')}
                      className="px-2 py-0.5 bg-rose-950 hover:bg-rose-600 text-rose-300 hover:text-white rounded text-[10px]"
                    >
                      Block
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {activeChannel.blockedUsers?.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <p className="text-[11px] font-semibold text-rose-400">Blocked from Channel</p>
              {activeChannel.blockedUsers.map((bUser) => (
                <div key={bUser} className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-400">@{bUser}</span>
                  <button
                    onClick={() => handleModerateMember(bUser, 'UNBLOCK')}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded text-[10px]"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Messages Feed with Delete Option on Your Sent Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
        {messages.map((m) => {
          const isMe = m.senderUsername === currentUser.username;
          return (
            <div key={m.id} className={`flex items-center gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}>
              {isMe && (
                <button
                  onClick={() => handleDeleteMessage(m.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-600 text-slate-400 hover:text-white transition"
                  title="Delete for everyone"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <div
                className={`max-w-xs md:max-w-md p-3 rounded-2xl text-sm shadow-md ${
                  isMe ? `${themeConfig?.bubbleClass || 'bg-indigo-600'} text-white` : 'bg-slate-800/90 text-slate-100 backdrop-blur-sm'
                }`}
              >
                {isChannel && !isMe && (
                  <span className="block text-[11px] font-bold text-indigo-400 mb-1">@{m.senderUsername}</span>
                )}
                {m.messageType === 'IMAGE' ? (
                  <div className="space-y-2">
                    <img src={m.plaintext} alt="attachment" className="rounded-xl max-h-60 w-auto object-cover" />
                    <button
                      onClick={() => triggerDownload(m.plaintext, m.fileName || 'image.png')}
                      className="flex items-center gap-1 text-xs bg-black/40 hover:bg-black/60 px-2 py-1 rounded-lg text-white"
                    >
                      <Download size={12} /> Save to Downloads
                    </button>
                  </div>
                ) : m.messageType === 'AUDIO' ? (
                  <div className="space-y-1.5 min-w-[210px]">
                    <audio controls src={m.plaintext} className="w-full h-9 rounded-lg" />
                    <button
                      onClick={() => triggerDownload(m.plaintext, m.fileName || 'voice_note.webm')}
                      className="flex items-center gap-1 text-[10px] opacity-80 hover:opacity-100 underline"
                    >
                      <Download size={10} /> Download Voice Note
                    </button>
                  </div>
                ) : m.messageType === 'FILE' ? (
                  <div className="flex items-center justify-between gap-4 bg-slate-900/60 p-2.5 rounded-xl">
                    <span className="text-xs truncate max-w-[150px]">{m.fileName}</span>
                    <button
                      onClick={() => triggerDownload(m.plaintext, m.fileName)}
                      className="p-1.5 bg-indigo-500 rounded-lg hover:bg-indigo-400 text-white"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{m.plaintext}</p>
                )}
                <span className="block text-[10px] opacity-60 mt-1 text-right">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        {isPartnerTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800/90 px-4 py-2 rounded-2xl text-xs text-indigo-400 flex items-center gap-1.5 animate-pulse">
              <span>@{currentChat.username} is typing</span>
              <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {/* Emoji Bar */}
      {showEmojis && (
        <div className="px-4 py-2 bg-slate-900/95 border-t border-slate-800 flex gap-3 overflow-x-auto relative z-10">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setInput((prev) => prev + emoji)}
              className="text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {/* Input Bar */}
      <form onSubmit={handleSendText} className="p-3 border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center gap-2 relative z-10">
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, 'IMAGE')}
        />
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={(e) => handleFileUpload(e, 'FILE')}
        />
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className={`p-2 rounded-lg transition ${showEmojis ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          title="Emojis"
        >
          <Smile size={20} />
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current.click()}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Send Picture"
        >
          <ImageIcon size={20} />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Send File"
        >
          <Paperclip size={20} />
        </button>
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold animate-pulse"
            title="Stop & Send Voice Note"
          >
            <Square size={14} /> Stop ({recordingSeconds}s)
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
            title="Record Voice Message"
          >
            <Mic size={20} />
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={`Message ${isChannel ? '#' + activeChannel.name : '@' + currentChat.username}...`}
          className="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center gap-1.5 text-sm font-medium text-white transition"
        >
          <Send size={15} /> Send
        </button>
      </form>
      {/* Edit Group/Community Profile & Description Modal */}
      {showEditChannelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveChannelDetails} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Edit {activeChannel.type} Profile</h3>
              <button type="button" onClick={() => setShowEditChannelModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-2">
              {editChAvatar ? (
                <img src={editChAvatar} alt="Channel Avatar" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400 font-bold text-xl">
                  #
                </div>
              )}
              <label className="text-xs text-indigo-400 hover:underline cursor-pointer">
                Upload {activeChannel.type} Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const r = new FileReader();
                    r.onload = (ev) => setEditChAvatar(ev.target.result);
                    r.readAsDataURL(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Name</label>
              <input
                type="text"
                value={editChName}
                onChange={(e) => setEditChName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Description</label>
              <textarea
                value={editChDesc}
                onChange={(e) => setEditChDesc(e.target.value)}
                rows={3}
                placeholder="Update group or community description..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
              />
            </div>
            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium text-white transition">
              Save Changes
            </button>
          </form>
        </div>
      )}
    </div>
  );
}