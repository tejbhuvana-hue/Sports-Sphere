import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { messagesAPI, exploreAPI, getMediaUrl } from '../services/api';
import { CameraIcon, MessagesIcon, CloseIcon, SearchIcon } from '../components/common/Icons';

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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Ref to chat thread container
  const chatThreadRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  const scrollToBottom = (smooth = false) => {
    if (chatThreadRef.current) {
      if (smooth) {
        chatThreadRef.current.scrollTo({
          top: chatThreadRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
      }
    }
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
      setActivePartner(res.data?.partner || null);
      setMessages(res.data?.messages || []);
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

  // When route changes (opening a conversation or returning to list)
  useEffect(() => {
    isInitialLoadRef.current = true;
    if (routeUsername) {
      fetchChat(routeUsername);
    } else {
      setActivePartner(null);
      setMessages([]);
    }
  }, [routeUsername]);

  // When chat finished loading or messages first populated, scroll to bottom
  useLayoutEffect(() => {
    if (!loadingChat && routeUsername && chatThreadRef.current) {
      // Force instant scroll to bottom on chat open / re-open
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
      const timeoutId = setTimeout(() => {
        if (chatThreadRef.current) {
          chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [routeUsername, loadingChat]);

  // Periodic polling for new messages every 4 seconds (without interrupting user scroll)
  useEffect(() => {
    if (!routeUsername) return;
    const interval = setInterval(async () => {
      try {
        const res = await messagesAPI.getChat(routeUsername);
        const incomingMessages = res.data?.messages || [];
        
        setMessages((prevMessages) => {
          // Check if messages actually changed
          if (incomingMessages.length === prevMessages.length) {
            const lastPrev = prevMessages[prevMessages.length - 1];
            const lastIncoming = incomingMessages[incomingMessages.length - 1];
            if (lastPrev?.id === lastIncoming?.id && lastPrev?.is_read === lastIncoming?.is_read) {
              return prevMessages; // Keep reference unchanged to prevent unnecessary render
            }
          }

          // If new messages arrived, check if user is near bottom
          if (chatThreadRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatThreadRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
            if (isNearBottom) {
              setTimeout(() => {
                scrollToBottom(true);
              }, 60);
            }
          }

          return incomingMessages;
        });
      } catch (e) {
        console.warn('Chat poll warning', e);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [routeUsername]);

  // Search users API debounced when user types in search bar
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSearchedUsers([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);
    const timer = setTimeout(async () => {
      try {
        const res = await exploreAPI.search({ q: query });
        const found = res.data?.users || [];
        // Filter out self and existing conversation partners to show as new people
        const existingUsernames = new Set(conversations.map((c) => c.user?.username));
        const filteredNewUsers = found.filter(
          (u) => u.username !== currentUser?.username && !existingUsernames.has(u.username)
        );
        setSearchedUsers(filteredNewUsers);
      } catch (err) {
        console.error('Search users error', err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, conversations, currentUser]);

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
      
      // Immediately scroll to bottom on send
      setTimeout(() => {
        scrollToBottom(false);
      }, 30);
    } catch (err) {
      console.error('Send message error', err);
    } finally {
      setIsSending(false);
    }
  };

  // Filter existing conversations based on search query
  const query = searchQuery.trim().toLowerCase();
  const filteredConversations = conversations.filter((conv) => {
    if (!query) return true;
    const partner = conv.user || {};
    const username = (partner.username || '').toLowerCase();
    const fullName = `${partner.first_name || ''} ${partner.last_name || ''}`.toLowerCase();
    const sport = (partner.sport || '').toLowerCase();
    return username.includes(query) || fullName.includes(query) || sport.includes(query);
  });

  const isChatOpenOnMobile = !!routeUsername;

  return (
    <div className={`messages-layout glass-panel ${isChatOpenOnMobile ? 'chat-active-mobile' : 'list-active-mobile'}`}>
      {/* Left Column: Conversations List */}
      <div className="messages-sidebar">
        {/* Only search bar and placeholder in sidebar header */}
        <div className="messages-sidebar-header">
          <div className="messages-search-bar">
            <SearchIcon size={16} className="messages-search-icon" />
            <input
              type="text"
              placeholder="Search people by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="messages-search-input"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className="messages-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="messages-conversations-list">
          {/* 1. Existing Conversations */}
          {filteredConversations.map((conv) => {
            const partner = conv.user;
            const isSelected = partner.username === routeUsername;
            const avatarUrl = partner.profile_picture ? getMediaUrl(partner.profile_picture) : null;

            return (
              <Link
                key={partner.id || partner.username}
                to={`/messages/${partner.username}`}
                onClick={() => setSearchQuery('')}
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
                      {partner.first_name ? `${partner.first_name} ${partner.last_name || ''}` : partner.username}
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
                      {conv.last_message || `@${partner.username}`}
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

          {/* 2. Discovered People from Search */}
          {searchQuery.trim() && searchedUsers.length > 0 && (
            <>
              <div className="messages-search-divider">
                <span>Other People</span>
              </div>
              {searchedUsers.map((user) => {
                const isSelected = user.username === routeUsername;
                const avatarUrl = user.profile_picture ? getMediaUrl(user.profile_picture) : null;
                const displayName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username;

                return (
                  <Link
                    key={user.id || user.username}
                    to={`/messages/${user.username}`}
                    onClick={() => setSearchQuery('')}
                    className={`conversation-item ${isSelected ? 'selected' : ''}`}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={user.username} className="avatar-img-sm" />
                    ) : (
                      <div className="avatar-placeholder-sm">
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="conv-meta-wrap">
                      <div className="conv-user-row">
                        <span className="conv-username">
                          {displayName}
                          {user.is_verified && (
                            <svg className="verified-badge-sm" viewBox="0 0 24 24" width="12" height="12" fill="var(--accent)">
                              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          )}
                        </span>
                      </div>
                      <div className="conv-preview-row">
                        <span className="conv-last-msg">
                          @{user.username} {user.role ? `• ${user.role}` : ''} {user.sport ? `• ${user.sport}` : ''}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </>
          )}

          {/* Empty state when searching */}
          {searchQuery.trim() && filteredConversations.length === 0 && searchedUsers.length === 0 && !isSearchingUsers && (
            <div className="empty-conv-state">
              <p>No people found</p>
              <span>No user matching "{searchQuery}"</span>
            </div>
          )}

          {/* Empty state when no conversations and not searching */}
          {!searchQuery.trim() && conversations.length === 0 && (
            <div className="empty-conv-state">
              <p>No messages yet.</p>
              <span>Use the search bar above or visit an athlete's profile to start chatting!</span>
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
                      {activePartner.first_name ? `${activePartner.first_name} ${activePartner.last_name || ''}` : activePartner.username}
                      {activePartner.is_verified && (
                        <svg className="verified-badge-sm" viewBox="0 0 24 24" width="14" height="14" fill="var(--accent)">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      )}
                    </div>
                    <div className="chat-header-role">
                      @{activePartner.username} {activePartner.role ? `• ${activePartner.role}` : ''} {activePartner.sport ? `• ${activePartner.sport}` : ''}
                    </div>
                  </div>
                </Link>
              )}
            </div>

            {/* Messages Thread */}
            <div className="chat-messages-thread" ref={chatThreadRef}>
              {loadingChat ? (
                <div className="chat-loading">Loading chat history...</div>
              ) : messages.length === 0 ? (
                <div className="empty-chat-state">
                  <p>No messages here yet.</p>
                  <span>Send a message to say hello!</span>
                </div>
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
            <p>Choose an existing message thread or search people by name to chat.</p>
          </div>
        )}
      </div>
    </div>
  );
};
