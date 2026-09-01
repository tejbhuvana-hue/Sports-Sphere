import React, { useState } from 'react';
import { contactAPI } from '../services/api';

export const ContactPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess('');
    setError('');

    try {
      const res = await contactAPI.submitContact(formData);
      setSuccess(res.data.message || 'Your inquiry has been received. We will respond promptly!');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page-container">
      <div className="contact-header-wrap">
        <h1 className="contact-title">Get in Touch</h1>
        <p className="contact-subtitle">
          Have questions, partnership inquiries, or need support? Send us a message.
        </p>
      </div>

      <div className="glass-panel contact-card">
        {success && (
          <div className="alert-box alert-success">
            {success}
          </div>
        )}
        {error && (
          <div className="alert-box alert-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="contact-form">
          <div className="contact-fields-row">
            <div className="contact-field-col">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                required
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="contact-field-col">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Subject</label>
            <input
              type="text"
              required
              placeholder="How can we assist you?"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Message</label>
            <textarea
              rows={5}
              required
              placeholder="Provide details about your query..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="form-textarea"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary contact-submit-btn"
          >
            {isSubmitting ? 'Sending Message...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
};
