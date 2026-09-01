import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { messagesAPI, exploreAPI, getMediaUrl } from '../services/api';
import { CloseIcon, PaperPlaneIcon, SearchIcon, CheckVerifiedIcon } from './common/Icons';

export const SharePostModal = ({ post, isOpen, onClose }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sendingMap, setSendingMap] = useState({});
  const [sentMap, setSentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchContacts = async () => {
      setLoading(true);
      try {
        const res = await messagesAPI.getConversations();
        setConversations(res.data || []);
      } catch (err) {
        console.error('Failed to load chat contacts for sharing', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [isOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await exploreAPI.getExplore(searchQuery.trim());
        setSearchResults(res.data.users || []);
      } catch (err) {
        console.error('Search error in share modal', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen || !post) return null;

  const postUrl = `${window.location.origin}/feed#post-${post.id}`;
  const author = post.author || {};

  const handleSendToUser = async (recipientUsername) => {
    if (sendingMap[recipientUsername] || sentMap[recipientUsername]) return;

    setSendingMap((prev) => ({ ...prev, [recipientUsername]: true }));
    try {
      const shareMessage = `Check out this post by @${author.username || 'athlete'} on SportsSphere:\n"${post.content ? (post.content.length > 100 ? post.content.slice(0, 100) + '...' : post.content) : 'SportsSphere Post'}"\n${postUrl}`;

      const formData = new FormData();
      formData.append('content', shareMessage);

      await messagesAPI.sendMessage(recipientUsername, formData);
      setSentMap((prev) => ({ ...prev, [recipientUsername]: true }));
    } catch (err) {
      console.error('Failed to share post via DM', err);
      alert('Failed to send post. Please try again.');
    } finally {
      setSendingMap((prev) => ({ ...prev, [recipientUsername]: false }));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(postUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by @${author.username} on SportsSphere`,
          text: post.content || 'Check out this post on SportsSphere!',
          url: postUrl
        });
      } catch (err) {}
    } else {
      handleCopyLink();
    }
  };

  // Contacts to show: search results if searching, otherwise recent conversations
  const displayUsers = searchQuery.trim()
    ? searchResults
    : conversations.map((c) => ({
        id: c.other_user?.id || c.id,
        username: c.other_user?.username || c.username,
        profile_picture: c.other_user?.profile_picture || c.profile_picture,
        is_verified: c.other_user?.is_verified || c.is_verified,
        role: c.other_user?.role || c.role,
        sport: c.other_user?.sport || c.sport,
      }));

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-sheet glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <div className="share-modal-handle"></div>
          <div className="share-modal-title-row">
            <h3 className="share-modal-title">
              <PaperPlaneIcon size={18} color="var(--accent)" /> Share Post
            </h3>
            <button type="button" className="share-modal-close" onClick={onClose} aria-label="Close">
              <CloseIcon size={18} />
            </button>
          </div>
        </div>

        {/* Post Preview Snippet */}
        <div className="share-post-preview">
          <div className="share-preview-author">
            @{author.username} {author.is_verified && <CheckVerifiedIcon size={12} />}
          </div>
          <p className="share-preview-text">
            {post.content ? (post.content.length > 80 ? post.content.slice(0, 80) + '...' : post.content) : 'Media post'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="share-search-bar">
          <SearchIcon size={16} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search people to send to..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="share-search-input"
          />
        </div>

        {/* Contact / Conversation List */}
        <div className="share-users-list">
          {loading ? (
            <div className="share-loading">Loading contacts...</div>
          ) : displayUsers.length > 0 ? (
            displayUsers.map((u) => {
              if (u.username === user?.username) return null;
              const avatar = u.profile_picture ? getMediaUrl(u.profile_picture) : null;
              const isSent = sentMap[u.username];
              const isSending = sendingMap[u.username];

              return (
                <div key={u.id || u.username} className="share-user-row">
                  <div className="share-user-info">
                    {avatar ? (
                      <img src={avatar} alt={u.username} className="share-user-avatar" />
                    ) : (
                      <div className="share-user-avatar-placeholder">
                        {u.username ? u.username.slice(0, 2).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="share-user-names">
                      <span className="share-username">
                        {u.username} {u.is_verified && <CheckVerifiedIcon size={12} />}
                      </span>
                      <span className="share-user-role">
                        {u.role || 'Athlete'} {u.sport ? `• ${u.sport}` : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendToUser(u.username)}
                    disabled={isSending || isSent}
                    className={`share-send-btn ${isSent ? 'sent' : ''}`}
                  >
                    {isSent ? 'Sent ✓' : isSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="share-no-users">
              {searchQuery ? 'No athletes or coaches found.' : 'No recent chats. Search users above to share!'}
            </div>
          )}
        </div>

        {/* Bottom Quick Actions (Copy Link & Native Share) */}
        <div className="share-modal-footer">
          <button type="button" onClick={handleCopyLink} className="share-footer-action-btn">
            {copied ? 'Link Copied ✓' : 'Copy Link'}
          </button>
          <button type="button" onClick={handleNativeShare} className="share-footer-action-btn share-footer-primary">
            Share via...
          </button>
        </div>
      </div>
    </div>
  );
};
