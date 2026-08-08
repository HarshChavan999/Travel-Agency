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

    let isMounted = true;
    fetch('/api/blog/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, id: blogId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && typeof data.views === 'number') {
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
