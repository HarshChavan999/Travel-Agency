'use client';

import { useEffect, useState } from 'react';

interface BlogViewTrackerProps {
  slug: string;
  blogId?: string;
  initialViews?: number;
  fallbackViewsText?: string;
}

export default function BlogViewTracker({ slug, blogId, initialViews, fallbackViewsText }: BlogViewTrackerProps) {
  const [displayViews, setDisplayViews] = useState<string>(
    typeof initialViews === 'number' ? initialViews.toLocaleString('en-US') : (fallbackViewsText || '1')
  );

  useEffect(() => {
    if (!slug && !blogId) return;

    // 1. Skip incrementing in local development (localhost) so author testing doesn't count
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return;
    }

    // 2. Prevent duplicate views on refresh (count only once per user per 24 hours)
    const storageKey = `tripdm_view_${blogId || slug}`;
    try {
      const lastViewed = localStorage.getItem(storageKey);
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      if (lastViewed && now - Number(lastViewed) < TWENTY_FOUR_HOURS) {
        // User already viewed this post within the last 24 hours; do not increment on refresh
        return;
      }
    } catch {
      // In case localStorage is disabled/restricted in the user's browser
    }

    let isMounted = true;
    fetch('/api/blog/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, id: blogId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && typeof data.views === 'number') {
          try {
            localStorage.setItem(storageKey, Date.now().toString());
          } catch {
            // Ignore storage errors
          }
          setDisplayViews(data.views.toLocaleString('en-US'));
        }
      })
      .catch((err) => console.error('Failed to increment blog view count:', err));

    return () => {
      isMounted = false;
    };
  }, [slug, blogId]);

  return <span>{displayViews} Views</span>;
}
