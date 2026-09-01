import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messagesAPI, getMediaUrl } from '../services/api';
import { CameraIcon, MessagesIcon, CloseIcon } from '../components/common/Icons';

export const MessagesPage = () => {
  const { username: routeUsername } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newText, setNewText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const res = await messagesAPI.getConversations();
      setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  };

  const fetchChat = async (targetUsername) => {
    if (!targetUsername) return;
    setLoadingChat(true);
    try {
      const res = await messagesAPI.getChat(targetUsername);
      setActivePartner(res.data.partner);
      setMessages(res.data.messages || []);
      fetchConversations();
    } catch (err) {
      console.error('Failed to load chat', err);
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (routeUsername) {
      fetchChat(routeUsername);
    } else {
      setActivePartner(null);
      setMessages([]);
    }
  }, [routeUsername]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Periodic polling for new messages every 4 seconds
  useEffect(() => {
    if (!routeUsername) return;
    const interval = setInterval(() => {
      messagesAPI.getChat(routeUsername).then((res) => {
        setMessages(res.data.messages || []);
      }).catch((e) => console.warn(e));
    }, 4000);
    return () => clearInterval(interval);
  }, [routeUsername]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newText.trim() && !imageFile) || !routeUsername || isSending) return;

    setIsSending(true);
    try {
      const formData = new FormData();
      if (newText.trim()) formData.append('content', newText.trim());
      if (imageFile) formData.append('image', imageFile);

      const res = await messagesAPI.sendMessage(routeUsername, formData);
      setMessages((prev) => [...prev, res.data]);
      setNewText('');
      setImageFile(null);
      fetchConversations();
    } catch (err) {
      console.error('Send message error', err);
    } finally {
      setIsSending(false);
    }
  };

  const isChatOpenOnMobile = !!routeUsername;

  return (
    <div className={`messages-layout glass-panel ${isChatOpenOnMobile ? 'chat-active-mobile' : 'list-active-mobile'}`}>
      {/* Left Column: Conversations List */}
      <div className="messages-sidebar">
        <div className="messages-sidebar-header">
          <h3 className="messages-sidebar-title">Direct Messages</h3>
        </div>

        <div className="messages-conversations-list">
          {conversations.map((conv) => {
            const partner = conv.user;
            const isSelected = partner.username === routeUsername;
            const avatarUrl = partner.profile_picture ? getMediaUrl(partner.profile_picture) : null;

            return (
              <Link
                key={partner.id}
                to={`/messages/${partner.username}`}
                className={`conversation-item ${isSelected ? 'selected' : ''}`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={partner.username} className="avatar-img-sm" />
                ) : (
                  <div className="avatar-placeholder-sm">
                    {partner.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="conv-meta-wrap">
                  <div className="conv-user-row">
                    <span className="conv-username">
                      {partner.username}
                      {partner.is_verified && (
                        <svg className="verified-badge-sm" viewBox="0 0 24 24" width="12" height="12" fill="var(--accent)">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </span>
                    {conv.time && (
                      <span className="conv-time">
                        {conv.time}
                      </span>
                    )}
                  </div>
                  <div className="conv-preview-row">
                    <span className={`conv-last-msg ${conv.unread_count > 0 ? 'unread' : ''}`}>
                      {conv.last_message || 'Start chatting...'}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="conv-unread-pill">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {conversations.length === 0 && (
            <div className="empty-conv-state">
              <p>No messages yet.</p>
              <span>Visit an athlete's profile to start a conversation!</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Chat Window */}
      <div className="messages-chat-pane">
        {routeUsername ? (
          <div className="chat-window-inner">
            {/* Chat Top Header */}
            <div className="chat-header">
              {/* Mobile Back Button to conversation list */}
              <button
                type="button"
                className="chat-back-btn"
                onClick={() => navigate('/messages')}
                aria-label="Back to conversations"
              >
                &larr;
              </button>

              {activePartner && (
                <Link to={`/profile/${activePartner.username}`} className="chat-header-user">
                  {activePartner.profile_picture ? (
                    <img src={getMediaUrl(activePartner.profile_picture)} alt={activePartner.username} className="avatar-img-sm" />
                  ) : (
                    <div className="avatar-placeholder-sm">
                      {activePartner.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="chat-header-info">
                    <div className="chat-header-name">
                      {activePartner.username}
                      {activePartner.is_verified && (
                        <svg className="verified-badge-sm" viewBox="0 0 24 24" width="14" height="14" fill="var(--accent)">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                    <div className="chat-header-role">
                      {activePartner.role} {activePartner.sport ? `• ${activePartner.sport}` : ''}
                    </div>
                  </div>
                </Link>
              )}
            </div>

            {/* Messages Thread */}
            <div className="chat-messages-thread">
              {loadingChat ? (
                <div className="chat-loading">Loading chat history...</div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender?.username === currentUser?.username;
                  const imgAttachment = m.image ? getMediaUrl(m.image) : null;

                  return (
                    <div
                      key={m.id}
                      className={`message-bubble-wrapper ${isMine ? 'mine' : 'theirs'}`}
                    >
                      <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                        {imgAttachment && (
                          <img src={imgAttachment} alt="Attachment" className="message-bubble-img" />
                        )}
                        {m.content && <div className="message-text">{m.content}</div>}
                      </div>
                      <span className="message-timestamp">
                        {m.time} {isMine && (m.is_read ? '✓✓' : '✓')}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form Bar */}
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              {imageFile && (
                <div className="chat-attachment-preview">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <CameraIcon size={14} /> Attachment: {imageFile.name}
                  </span>
                  <button type="button" onClick={() => setImageFile(null)} className="chat-remove-attach-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CloseIcon size={14} />
                  </button>
                </div>
              )}
              <div className="chat-input-row">
                <label className="chat-attach-btn" title="Attach Image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  <CameraIcon size={18} />
                </label>

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="chat-text-input"
                />

                <button
                  type="submit"
                  disabled={(!newText.trim() && !imageFile) || isSending}
                  className="btn btn-primary btn-sm chat-send-btn"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="chat-no-selection">
            <div className="no-chat-icon" style={{ color: 'var(--accent)', display: 'flex', justifyContent: 'center' }}>
              <MessagesIcon size={44} />
            </div>
            <h3>Select a conversation</h3>
            <p>Choose an existing message thread or visit a user's profile to chat.</p>
          </div>
        )}
      </div>
    </div>
  );
};
