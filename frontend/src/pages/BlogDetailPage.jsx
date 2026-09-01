import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogsAPI, getMediaUrl } from '../services/api';
import { CalendarIcon, UserIcon, ArrowLeftIcon } from '../components/common/Icons';

export const BlogDetailPage = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await blogsAPI.getBlogDetail(slug);
        setBlog(res.data);
      } catch (err) {
        console.error('Failed to load blog detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlog();
  }, [slug]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-secondary)' }}>Loading article...</div>;
  }

  if (!blog) {
    return (
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '40px', borderRadius: 'var(--border-radius)' }}>
        <h2>Article Not Found</h2>
        <Link to="/blogs" className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>Back to Blogs</Link>
      </div>
    );
  }

  const imgUrl = blog.featured_image_url || (blog.featured_image ? getMediaUrl(blog.featured_image) : null);

  return (
    <article className="blog-detail-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 20px 80px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/blogs" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeftIcon size={16} /> Back to all articles
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '36px', borderRadius: 'var(--border-radius)' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
          SportsSphere Editorial
        </div>

        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', lineHeight: '1.25', color: 'var(--text-primary)', marginBottom: '16px' }}>
          {blog.title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CalendarIcon size={14} /> {new Date(blog.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          {blog.author && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <UserIcon size={14} /> Published by <strong>{blog.author.username}</strong>
            </span>
          )}
        </div>

        {imgUrl && (
          <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '28px', maxHeight: '420px' }}>
            <img src={imgUrl} alt={blog.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div
          className="blog-article-content"
          style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-primary)' }}
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />
      </div>
    </article>
  );
};
