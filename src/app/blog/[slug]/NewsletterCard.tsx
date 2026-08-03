'use client';

import { useState } from 'react';

export default function NewsletterCard() {
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      alert('Please accept terms & conditions');
      return;
    }
    setSubscribed(true);
  };

  return (
    <div className="bp-sidebar-card">
      <h3 className="bp-sidebar-card-title">Subscribe to our newsletter</h3>
      {subscribed ? (
        <div style={{ color: '#059669', fontWeight: 600, fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
          ✓ Thank you for subscribing!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bp-newsletter-form">
          <div className="bp-newsletter-input-group">
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bp-newsletter-input"
            />
            <button type="submit" className="bp-newsletter-btn">
              SUBSCRIBE
            </button>
          </div>
          <label className="bp-newsletter-terms">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
            />
            <span>Please accept terms & condition</span>
          </label>
        </form>
      )}
    </div>
  );
}
