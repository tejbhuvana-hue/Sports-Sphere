import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogsAPI, getMediaUrl } from '../services/api';
import { NewspaperIcon, CalendarIcon, UserIcon, ChevronRightIcon } from '../components/common/Icons';

export const BlogsPage = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await blogsAPI.getBlogs();
        setBlogs(res.data || []);
      } catch (err) {
        console.error('Failed to load blogs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const filteredBlogs = blogs.filter((b) =>
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="blogs-page-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 20px 60px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: '800', marginBottom: '8px' }}>
          SportsSphere Insights & Articles
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          The latest training advice, scouting trends, tournament coverage, and sports industry breakdowns.
        </p>

        <div style={{ maxWidth: '480px', margin: '20px auto 0' }}>
          <input
            type="text"
            placeholder="Search articles by title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '24px',
              border: '1px solid var(--input-border)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.92rem'
            }}
          />
        </div>
      </div>

      {/* Blogs Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading articles...</div>
      ) : filteredBlogs.length > 0 ? (
        <div className="blogs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {filteredBlogs.map((b) => {
            const imgUrl = b.featured_image_url || (b.featured_image ? getMediaUrl(b.featured_image) : null);
            return (
              <article key={b.id} className="blog-card glass-panel" style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--border-radius)', overflow: 'hidden' }}>
                {imgUrl ? (
                  <div className="blog-card-media" style={{ height: '180px', overflow: 'hidden' }}>
                    <img src={imgUrl} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ height: '140px', background: 'var(--bg-subtle-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    <NewspaperIcon size={44} />
                  </div>
                )}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <CalendarIcon size={12} />
                    <span>{new Date(b.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {b.author && (
                      <>
                        <span>•</span>
                        <UserIcon size={12} />
                        <span>{b.author.username}</span>
                      </>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                    {b.title}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px', flex: 1 }}>
                    {b.short_description || b.content?.replace(/<[^>]+>/g, '').slice(0, 120) + '...'}
                  </p>
                  <Link to={`/blogs/${b.slug}`} className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Read Article <ChevronRightIcon size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', borderRadius: 'var(--border-radius)' }}>
          <NewspaperIcon size={44} className="empty-icon" />
          <h3>No Articles Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Try searching for a different keyword.</p>
        </div>
      )}
    </div>
  );
};
