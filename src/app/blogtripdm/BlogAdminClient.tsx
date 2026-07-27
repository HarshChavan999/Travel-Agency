'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getDbInstance, getStorageInstance } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressMultipleImages } from '@/lib/imageUtils';

const BLOG_ADMIN_EMAIL = 'tripdm26@gmail.com';

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  published: boolean;
  publishedAt: string;
  updatedAt: string;
  metaTitle: string;
  metaDescription: string;
  readTime: string;
}

const CATEGORIES = [
  'Travel Tips', 'Destinations', 'Budget Travel', 'Luxury Travel',
  'Adventure', 'Family Travel', 'Solo Travel', 'Food & Culture',
  'Travel Guides', 'India Travel', 'International Travel', 'News & Updates'
];

const defaultForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  category: 'Travel Tips',
  tags: '',
  author: 'TripDM Team',
  metaTitle: '',
  metaDescription: '',
  published: false,
};

export default function BlogAdminClient() {
  const { user, signIn, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [view, setView] = useState<'dashboard' | 'create'>('dashboard');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveMsgType, setSaveMsgType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft'>('all');

  // AI States
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiRichData, setAiRichData] = useState<any>(null);
  const [aiGenStep, setAiGenStep] = useState('');

  // Image Upload Method States
  const [imageMethod, setImageMethod] = useState<'upload' | 'url'>('upload');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isAuthorized = user?.email === BLOG_ADMIN_EMAIL;

  useEffect(() => {
    if (form.title && !form.slug) {
      const slug = form.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setForm(f => ({ ...f, slug }));
    }
  }, [form.title]);

  useEffect(() => {
    if (form.title && !form.metaTitle) {
      setForm(f => ({ ...f, metaTitle: form.title.slice(0, 60) }));
    }
  }, [form.title]);

  useEffect(() => {
    if (form.excerpt && !form.metaDescription) {
      setForm(f => ({ ...f, metaDescription: form.excerpt.slice(0, 160) }));
    }
  }, [form.excerpt]);

  const fetchBlogs = useCallback(async () => {
    setBlogsLoading(true);
    try {
      const db = getDbInstance();
      if (!db) return;
      const q = query(collection(db, 'blogs'), orderBy('publishedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedBlogs: Blog[] = [];
      querySnapshot.forEach(d => {
        const data = d.data();
        fetchedBlogs.push({
          id: d.id,
          title: data.title || '',
          slug: data.slug || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          coverImage: data.coverImage || '',
          category: data.category || '',
          tags: data.tags || [],
          author: data.author || 'TripDM Team',
          published: data.published || false,
          publishedAt: data.publishedAt || '',
          updatedAt: data.updatedAt || '',
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          readTime: data.readTime || '5 min read',
        });
      });
      setBlogs(fetchedBlogs);
    } catch (err) {
      console.error(err);
      setBlogs([]);
    } finally {
      setBlogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) fetchBlogs();
  }, [isAuthorized, fetchBlogs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setLoginError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (publish: boolean) => {
    setSaving(true);
    setSaveMsg('');
    try {
      const db = getDbInstance();
      if (!db) throw new Error('DB not initialized');
      
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const wordCount = form.content.trim().split(/\s+/).length;
      const readTime = `${Math.ceil(wordCount / 200)} min read`;
      const now = new Date().toISOString();
      const docId = form.slug || form.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g,'-').trim();

      const blogData: any = {
        title: form.title,
        slug: docId,
        excerpt: form.excerpt,
        content: form.content,
        coverImage: form.coverImage,
        category: form.category || 'Travel',
        tags,
        author: user?.email === BLOG_ADMIN_EMAIL ? 'TripDM Travel Expert' : 'Guest',
        published: publish,
        updatedAt: now,
        metaTitle: form.metaTitle || form.title,
        metaDescription: form.metaDescription || form.excerpt,
        readTime,
        wordCount,
      };

      // Save rich EEAT SEO data if AI generated it
      if (aiRichData) {
        blogData.focusKeyword = aiRichData.seo?.focusKeyword || '';
        blogData.secondaryKeywords = aiRichData.seo?.secondaryKeywords || [];
        blogData.ogTitle = aiRichData.seo?.ogTitle || blogData.metaTitle;
        blogData.ogDescription = aiRichData.seo?.ogDescription || blogData.metaDescription;
        blogData.canonical = aiRichData.seo?.canonical || `https://tripdm.com/blog/${docId}`;
        blogData.faq = aiRichData.faq || [];
        blogData.schema = JSON.stringify(aiRichData.schema || {});
        blogData.relatedTopics = aiRichData.relatedTopics || [];
        blogData.tableOfContents = aiRichData.article?.tableOfContents || [];
      }
      
      const docRef = doc(db, 'blogs', docId);
      await setDoc(docRef, { ...blogData, publishedAt: publish ? now : '' }, { merge: true });

      setSaveMsgType('success');
      setSaveMsg(publish ? '🚀 Blog published successfully!' : '💾 Draft saved!');
      setForm(defaultForm);
      setView('dashboard');
      fetchBlogs();
    } catch (err: any) {
      setSaveMsgType('error');
      setSaveMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageFileChange = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    setUploadingImage(true);
    try {
      const storageInstance = getStorageInstance();
      if (!storageInstance || !user) throw new Error('Storage or User Auth not initialized');

      let fileToUpload = file;
      try {
        const compressed = await compressMultipleImages([file]);
        if (compressed && compressed[0]) {
          fileToUpload = compressed[0];
        }
      } catch (err) {
        console.warn('Image compression failed, using original', err);
      }

      const storageRef = ref(storageInstance, `listings/${user.uid}/covers/${Date.now()}_${fileToUpload.name}`);
      await uploadBytes(storageRef, fileToUpload);
      const downloadUrl = await getDownloadURL(storageRef);

      setForm(f => ({ ...f, coverImage: downloadUrl }));
    } catch (err: any) {
      console.error('Image upload failed:', err);
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiTopic) {
      setAiError('Please enter a topic');
      return;
    }
    setAiError('');
    setAiGenerating(true);
    setAiGenStep('🔍 Researching keywords and search intent...');
    try {
      // Simulate pipeline steps for UX feedback
      setTimeout(() => setAiGenStep('📝 Generating detailed article outline...'), 2000);
      setTimeout(() => setAiGenStep('✍️ Writing 1500–2500 word EEAT article...'), 5000);
      setTimeout(() => setAiGenStep('📊 Creating cost tables, tips & FAQs...'), 10000);
      setTimeout(() => setAiGenStep('🔧 Optimizing metadata & JSON-LD schema...'), 15000);
      setTimeout(() => setAiGenStep('✅ Finalizing and validating JSON output...'), 20000);

      const res = await fetch('/api/ai/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, keywords: aiKeywords }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        setAiRichData(data.richData || null);
        setForm(f => ({
          ...f,
          title: d.title || f.title,
          slug: d.slug || f.slug,
          excerpt: d.excerpt || f.excerpt,
          content: d.content || f.content,
          metaTitle: d.metaTitle || f.metaTitle,
          metaDescription: d.metaDescription || f.metaDescription,
          category: d.category || f.category,
          tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || f.tags),
        }));
        setShowAiModal(false);
        setSaveMsgType('success');
        const wordCount = (d.content || '').trim().split(/\s+/).length;
        setSaveMsg(`✨ EEAT Article generated! ~${wordCount.toLocaleString()} words. Review & publish!`);
      } else {
        setAiError(data.error || 'Failed to generate blog. Please try again.');
      }
    } catch (err: any) {
      setAiError(err.message || 'An error occurred');
    } finally {
      setAiGenerating(false);
      setAiGenStep('');
    }
  };

  const handleTogglePublish = async (blog: Blog) => {
    try {
      const db = getDbInstance();
      if (!db) return;
      await updateDoc(doc(db, 'blogs', blog.id), {
        published: !blog.published,
        publishedAt: !blog.published ? new Date().toISOString() : blog.publishedAt,
        updatedAt: new Date().toISOString()
      });
      fetchBlogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (blog: Blog) => {
    if (!confirm(`Delete "${blog.title}"?`)) return;
    try {
      const db = getDbInstance();
      if (!db) return;
      await deleteDoc(doc(db, 'blogs', blog.id));
      fetchBlogs();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const getRelativeTime = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      if (diffMs < 60000) return 'Just now';
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const filteredBlogs = blogs.filter(b =>
    activeTab === 'all' ? true : activeTab === 'published' ? b.published : !b.published
  );

  // ─── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.splash}>
        <div style={s.splashSpinner} />
      </div>
    );
  }

  // ─── NOT LOGGED IN ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; }
          .glow-btn:hover { box-shadow: 0 0 0 3px rgba(249,115,22,0.25) !important; }
          .google-btn:hover { background: #f1f5f9 !important; border-color: rgba(0,0,0,0.15) !important; }
          input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px #ffffff inset !important; -webkit-text-fill-color: #0f172a !important; }
          @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
          .login-card { animation: fadeUp .5s ease both; }
          .orb1 { animation: pulse 6s ease-in-out infinite; }
          .orb2 { animation: pulse 8s ease-in-out infinite 2s; }
        `}</style>
        <div style={s.loginBg}>
          {/* Background orbs */}
          <div className="orb1" style={s.orb1} />
          <div className="orb2" style={s.orb2} />

          <div className="login-card" style={s.loginCard}>
            {/* Header */}
            <div style={s.loginHeader}>
              <div style={s.loginBrand}>
                <img src="/tripdm-logo.png" alt="TripDM Logo" style={{ height: 52, width: 'auto', objectFit: 'contain' }} />
                <span style={s.loginBrandBadge}>Blog</span>
              </div>
              <h1 style={s.loginH1}>Welcome back</h1>
              <p style={s.loginSub}>Sign in to your blog dashboard</p>
            </div>

            {/* Google Sign In */}
            <button
              className="google-btn"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loginLoading}
              style={s.googleBtn}
            >
              {googleLoading ? (
                <div style={{ ...s.btnSpinner, borderTopColor: '#0f172a' }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
              )}
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div style={s.divider}>
              <div style={s.dividerLine} />
              <span style={s.dividerText}>or continue with email</span>
              <div style={s.dividerLine} />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleLogin} style={s.loginForm}>
              <div style={s.field}>
                <label style={s.fieldLabel}>Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tripdm26@gmail.com"
                  style={s.fieldInput}
                  required
                  autoFocus
                />
              </div>
              <div style={s.field}>
                <label style={s.fieldLabel}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{ ...s.fieldInput, paddingRight: 44 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={s.eyeBtn}
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {loginError && (
                <div style={s.errorAlert}>
                  <span>⚠️</span> {loginError}
                </div>
              )}

              <button
                className="glow-btn"
                type="submit"
                disabled={loginLoading || googleLoading}
                style={s.signInBtn}
              >
                {loginLoading ? <div style={{ ...s.btnSpinner, borderTopColor: '#fff' }} /> : null}
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p style={s.loginFooter}>
              🔒 Restricted to authorized blog administrators only
            </p>
          </div>
        </div>
      </>
    );
  }

  // ─── WRONG USER ────────────────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div style={s.loginBg}>
        <div style={{ ...s.loginCard, textAlign: 'center', padding: '48px 40px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
          <h2 style={{ color: '#ef4444', fontSize: 22, marginBottom: 8 }}>Access Denied</h2>
          <p style={{ color: '#64748b', marginBottom: 8 }}>Logged in as</p>
          <p style={{ color: '#0f172a', fontWeight: 600, marginBottom: 24 }}>{user.email}</p>
          <p style={{ color: '#64748b', marginBottom: 32, fontSize: 14 }}>This dashboard is restricted to the blog administrator.</p>
          <a href="/" style={{ ...s.signInBtn, textDecoration: 'none', display: 'inline-block', width: 'auto' }}>
            ← Go to Home
          </a>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .dash-main { animation: fadeIn .3s ease both; }
        .nav-item:hover { background: rgba(249,115,22,0.08) !important; color: #ea580c !important; }
        .blog-row:hover { border-color: rgba(249,115,22,0.25) !important; background: rgba(249,115,22,0.02) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .action-btn:hover { background: rgba(0,0,0,0.04) !important; color: #0f172a !important; }
        .del-btn:hover { background: rgba(239,68,68,0.1) !important; color: #dc2626 !important; }
        .pub-btn:hover { background: rgba(16,185,129,0.1) !important; color: #059669 !important; }
        .tab:hover { color: #0f172a !important; }
        textarea:focus, input:focus, select:focus { outline: none; border-color: rgba(249,115,22,0.5) !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.1) !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
      `}</style>
      <div style={s.dash}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <div style={s.sidebarTop}>
            <div style={s.sidebarBrand}>
              <img src="/tripdm-logo.png" alt="TripDM Logo" style={{ height: 72, width: 'auto', objectFit: 'contain' }} />
            </div>
            <nav style={s.nav}>
              <button
                className="nav-item"
                onClick={() => setView('dashboard')}
                style={{ ...s.navItem, ...(view === 'dashboard' ? s.navItemActive : {}) }}
              >
                <span style={s.navIcon}>⊞</span> Dashboard
              </button>
              <button
                className="nav-item"
                onClick={() => { setForm(defaultForm); setView('create'); }}
                style={{ ...s.navItem, ...(view === 'create' ? s.navItemActive : {}) }}
              >
                <span style={s.navIcon}>✦</span> New Post
              </button>
              <a
                href="/blog"
                target="_blank"
                className="nav-item"
                style={{ ...s.navItem, textDecoration: 'none', display: 'flex', alignItems: 'center' }}
              >
                <span style={s.navIcon}>↗</span> View Blog
              </a>
            </nav>
          </div>

          <div style={s.sidebarBottom}>
            <div style={s.sidebarUser}>
              <div style={s.userAvatar}>{user.email?.charAt(0).toUpperCase()}</div>
              <div style={s.userInfo}>
                <div style={s.userName}>Blog Admin</div>
                <div style={s.userEmail}>{user.email}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="dash-main" style={s.main}>

          {/* ── Dashboard View ── */}
          {view === 'dashboard' && (
            <div>
              {/* Top bar */}
              <div style={s.topBar}>
                <div>
                  <h1 style={s.pageTitle}>Blog Dashboard</h1>
                  <p style={s.pageSub}>Manage and publish your travel blog content</p>
                </div>
                <button
                  onClick={() => { setForm(defaultForm); setView('create'); }}
                  style={s.newPostBtn}
                >
                  <span>+</span> New Post
                </button>
              </div>

              {saveMsg && (
                <div style={{ ...s.toast, background: saveMsgType === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderColor: saveMsgType === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)', color: saveMsgType === 'success' ? '#059669' : '#dc2626' }}>
                  {saveMsg}
                </div>
              )}

              {/* Stats */}
              <div style={s.statsRow}>
                {[
                  { label: 'Total Posts', value: blogs.length, color: '#ea580c', icon: '📝' },
                  { label: 'Published', value: blogs.filter(b => b.published).length, color: '#059669', icon: '✅' },
                  { label: 'Drafts', value: blogs.filter(b => !b.published).length, color: '#d97706', icon: '📋' },
                  { label: 'This Month', value: blogs.filter(b => b.publishedAt && new Date(b.publishedAt).getMonth() === new Date().getMonth()).length, color: '#7c3aed', icon: '📅' },
                ].map(stat => (
                  <div key={stat.label} style={s.statCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ ...s.statVal, color: stat.color }}>{stat.value}</div>
                        <div style={s.statLabel}>{stat.label}</div>
                      </div>
                      <span style={{ fontSize: 22 }}>{stat.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tab filters */}
              <div style={s.tabs}>
                {(['all', 'published', 'draft'] as const).map(tab => (
                  <button
                    key={tab}
                    className="tab"
                    onClick={() => setActiveTab(tab)}
                    style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span style={{ ...s.tabCount, background: activeTab === tab ? 'rgba(249,115,22,0.1)' : 'rgba(0,0,0,0.06)', color: activeTab === tab ? '#ea580c' : '#64748b' }}>
                      {tab === 'all' ? blogs.length : tab === 'published' ? blogs.filter(b => b.published).length : blogs.filter(b => !b.published).length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Blog list */}
              {blogsLoading ? (
                <div style={s.empty}>
                  <div style={s.loadSpinner} />
                  <p style={{ color: '#64748b', marginTop: 16 }}>Loading posts...</p>
                </div>
              ) : filteredBlogs.length === 0 ? (
                <div style={s.empty}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                  <p style={{ color: '#64748b', marginBottom: 20 }}>No posts yet. Create your first blog post!</p>
                  <button onClick={() => { setForm(defaultForm); setView('create'); }} style={s.newPostBtn}>
                    + Write First Post
                  </button>
                </div>
              ) : (
                <div style={s.postList}>
                  {filteredBlogs.map(blog => (
                    <div key={blog.id} className="blog-row" style={s.postRow}>
                      {blog.coverImage ? (
                        <img src={blog.coverImage} alt={blog.title} style={s.postThumb} />
                      ) : (
                        <div style={{ ...s.postThumb, background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#94a3b8' }}>✈</div>
                      )}
                      <div style={s.postInfo}>
                        <div style={s.postMeta}>
                          <span style={{ ...s.postBadge, ...(blog.published ? s.publishedBadge : s.draftBadge) }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: blog.published ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
                            {blog.published ? 'Published' : 'Draft'}
                          </span>
                          <span style={s.categoryChip}>{blog.category}</span>
                          <span style={s.postDate}>{formatDate(blog.publishedAt || blog.updatedAt)}</span>
                          <span style={s.postDate}>·</span>
                          <span style={s.postDate}>Written {getRelativeTime(blog.publishedAt || blog.updatedAt)}</span>
                        </div>
                        <h3 style={s.postTitle}>{blog.title}</h3>
                        <p style={s.postExcerpt}>{blog.excerpt?.slice(0, 110)}{blog.excerpt?.length > 110 ? '...' : ''}</p>
                      </div>
                      <div style={s.postActions}>
                        <a href={`/blog/${blog.slug}`} target="_blank" className="action-btn" style={s.actionBtn}>View</a>
                        <button onClick={() => handleTogglePublish(blog)} className={blog.published ? 'action-btn' : 'pub-btn action-btn'} style={{ ...s.actionBtn, ...(blog.published ? {} : { color: '#059669', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }) }}>
                          {blog.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button onClick={() => handleDelete(blog)} className="del-btn action-btn" style={{ ...s.actionBtn, color: '#64748b' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Create Post View ── */}
          {view === 'create' && (
            <div>
              <div style={s.topBar}>
                <div>
                  <h1 style={s.pageTitle}>New Blog Post</h1>
                  <p style={s.pageSub}>Fill in the details below to create a SEO-optimized blog post</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    onClick={() => { setAiTopic(''); setAiKeywords(''); setAiError(''); setShowAiModal(true); }} 
                    style={{ ...s.backBtn, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}
                  >
                    ✨ Auto-Generate with AI
                  </button>
                  <button onClick={() => setView('dashboard')} style={s.backBtn}>← Back</button>
                </div>
              </div>

              {/* AI Modal */}
              {showAiModal && (
                <div style={s.modalOverlay}>
                  <div style={s.modalContent}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>✨ EEAT Article Generator</h3>
                      <button onClick={() => setShowAiModal(false)} disabled={aiGenerating} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>×</button>
                    </div>

                    <div style={{ background: 'rgba(124,58,237,0.04)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#6d28d9', lineHeight: 1.6 }}>
                      🏆 Produces <strong>3000–5000 word</strong> EEAT-optimized articles with cost tables, FAQs, JSON-LD schema, and full SEO metadata — ready to compete with Lonely Planet & TripAdvisor.
                    </div>
                    
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Topic <span style={{ color: '#ef4444' }}>*</span></label>
                      <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="e.g. Budget Travel Guide to Goa" style={s.fInput} />
                    </div>
                    
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Keywords / Specific Instructions <span style={s.optLabel}>(Optional)</span></label>
                      <input value={aiKeywords} onChange={e => setAiKeywords(e.target.value)} placeholder="e.g. emphasize local food, backpacker tips" style={s.fInput} />
                    </div>

                    {aiError && (
                      <div style={{ ...s.errorAlert, marginBottom: 16 }}>
                        <span>⚠️</span> {aiError}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                      {aiGenerating && aiGenStep && (
                        <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ ...s.btnSpinner, borderTopColor: '#7c3aed', width: 16, height: 16, flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: '#6d28d9', fontWeight: 500 }}>{aiGenStep}</span>
                        </div>
                      )}
                      <button 
                        onClick={handleAiGenerate}
                        disabled={aiGenerating}
                        style={{ ...s.signInBtn, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 12px rgba(124,58,237,0.25)', opacity: aiGenerating ? 0.8 : 1 }}
                      >
                        {aiGenerating ? <div style={{ ...s.btnSpinner, borderTopColor: '#fff', width: 14, height: 14 }} /> : null}
                        {aiGenerating ? ` Writing article (~25–40 seconds)...` : '🚀 Generate EEAT Article'}
                      </button>
                      <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: 0 }}>This uses Gemini AI to write a full SEO article. Generation takes ~25–40 seconds.</p>
                    </div>
                  </div>
                </div>
              )}

              {saveMsg && (
                <div style={{ ...s.toast, background: saveMsgType === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderColor: saveMsgType === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)', color: saveMsgType === 'success' ? '#059669' : '#dc2626' }}>
                  {saveMsg}
                </div>
              )}

              <div style={s.formLayout}>
                {/* Left — Main Content */}
                <div style={s.formMain}>
                  <div style={s.formCard}>
                    <h2 style={s.cardTitle}>Post Content</h2>
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Title <span style={{ color: '#ef4444' }}>*</span></label>
                      <input name="title" value={form.title} onChange={handleFormChange} placeholder="e.g. 10 Best Places to Visit in Rajasthan" style={s.fInput} />
                      <span style={s.fHint}>{form.title.length}/70 characters</span>
                    </div>

                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>URL Slug</label>
                      <div style={s.slugWrap}>
                        <span style={s.slugPrefix}>tripdm.com/blog/</span>
                        <input name="slug" value={form.slug} onChange={handleFormChange} placeholder="best-places-rajasthan" style={{ ...s.fInput, borderRadius: '0 8px 8px 0', borderLeft: 'none', marginBottom: 0 }} />
                      </div>
                    </div>

                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Excerpt / Summary <span style={{ color: '#ef4444' }}>*</span></label>
                      <textarea name="excerpt" value={form.excerpt} onChange={handleFormChange} placeholder="A brief, compelling summary of this post (1–2 sentences)..." style={{ ...s.fTextarea, minHeight: 80 }} rows={3} />
                      <span style={{ ...s.fHint, color: form.excerpt.length > 160 ? '#ef4444' : '#64748b' }}>
                        {form.excerpt.length}/160 — {form.excerpt.length < 80 ? 'Too short' : form.excerpt.length <= 160 ? '✓ Good length' : '⚠ Too long'}
                      </span>
                    </div>

                    <div style={s.fieldGroup}>
                      <div style={s.contentTip}>
                        <strong style={{ color: '#7c3aed' }}>💡 SEO Content Tips</strong>
                        <ul style={{ marginTop: 8, paddingLeft: 18, color: '#64748b', fontSize: 12, lineHeight: 1.8 }}>
                          <li>Use <code style={{ color: '#ea580c', background: 'rgba(249,115,22,0.1)', padding: '2px 4px', borderRadius: 4 }}>## Heading</code> to structure content</li>
                          <li>Include your main keyword in the first 100 words</li>
                          <li>Aim for <strong style={{ color: '#334155' }}>800–2000 words</strong> for best ranking</li>
                          <li>Use <code style={{ color: '#ea580c', background: 'rgba(249,115,22,0.1)', padding: '2px 4px', borderRadius: 4 }}>**bold**</code> for important phrases</li>
                          <li>Add internal links like <code style={{ color: '#ea580c', background: 'rgba(249,115,22,0.1)', padding: '2px 4px', borderRadius: 4 }}>[text](https://tripdm.com)</code></li>
                        </ul>
                      </div>
                      <label style={s.fLabel}>Full Blog Content <span style={{ color: '#ef4444' }}>*</span></label>
                      <textarea
                        name="content"
                        value={form.content}
                        onChange={handleFormChange}
                        placeholder={`## Introduction\n\nStart with an engaging hook...\n\n## Section 1: Topic\n\nDive deep into your first point...\n\n## Section 2: Topic\n\nContinue with more insights...\n\n## Conclusion\n\nEnd with a clear call to action.`}
                        style={{ ...s.fTextarea, minHeight: 480, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
                        rows={22}
                      />
                      <span style={{ ...s.fHint, color: form.content.split(/\s+/).filter(Boolean).length < 500 ? '#d97706' : '#059669' }}>
                        {form.content.split(/\s+/).filter(Boolean).length} words
                        {form.content.split(/\s+/).filter(Boolean).length < 500 ? ' — Aim for 800+ for best SEO' : ' — ✓ Great length!'}
                      </span>
                    </div>
                  </div>

                  {/* SEO Card */}
                  <div style={s.formCard}>
                    <h2 style={s.cardTitle}>🔍 SEO Settings</h2>

                    {/* Google Preview */}
                    <div style={s.googlePreview}>
                      <div style={s.googlePreviewLabel}>Google Search Preview</div>
                      <div style={s.googlePreviewUrl}>tripdm.com › blog › {form.slug || 'your-slug'}</div>
                      <div style={s.googlePreviewTitle}>{form.metaTitle || form.title || 'Your Blog Title Here'}</div>
                      <div style={s.googlePreviewDesc}>{form.metaDescription || form.excerpt || 'Your meta description will appear here when this page shows in Google search results...'}</div>
                    </div>

                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Meta Title <span style={s.optLabel}>(max 60 chars)</span></label>
                      <input name="metaTitle" value={form.metaTitle} onChange={handleFormChange} placeholder="Best Places in Rajasthan | TripDM Travel" style={s.fInput} maxLength={70} />
                      <div style={s.seoBar}>
                        <div style={{ ...s.seoBarFill, width: `${Math.min(100, (form.metaTitle.length / 60) * 100)}%`, background: form.metaTitle.length > 60 ? '#ef4444' : form.metaTitle.length >= 50 ? '#10b981' : '#f97316' }} />
                      </div>
                      <span style={{ ...s.fHint, color: form.metaTitle.length > 60 ? '#ef4444' : '#64748b' }}>
                        {form.metaTitle.length}/60 {form.metaTitle.length > 60 ? '⚠ Too long' : form.metaTitle.length >= 50 ? '✓ Perfect' : ''}
                      </span>
                    </div>

                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Meta Description <span style={s.optLabel}>(max 160 chars)</span></label>
                      <textarea name="metaDescription" value={form.metaDescription} onChange={handleFormChange} placeholder="Explore the top destinations in Rajasthan with expert tips from TripDM travel agents..." style={{ ...s.fTextarea, minHeight: 80 }} rows={3} maxLength={170} />
                      <div style={s.seoBar}>
                        <div style={{ ...s.seoBarFill, width: `${Math.min(100, (form.metaDescription.length / 160) * 100)}%`, background: form.metaDescription.length > 160 ? '#ef4444' : form.metaDescription.length >= 120 ? '#10b981' : '#f97316' }} />
                      </div>
                      <span style={{ ...s.fHint, color: form.metaDescription.length > 160 ? '#ef4444' : '#64748b' }}>
                        {form.metaDescription.length}/160 {form.metaDescription.length > 160 ? '⚠ Too long' : form.metaDescription.length >= 120 ? '✓ Perfect' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right — Sidebar Settings */}
                <div style={s.formSidebar}>
                  {/* Publish Actions */}
                  <div style={s.formCard}>
                    <h2 style={s.cardTitle}>Publish</h2>
                    <button
                      type="button"
                      onClick={() => handleSubmit(true)}
                      disabled={saving || !form.title || !form.content || !form.excerpt}
                      style={{ ...s.publishBtn, opacity: (saving || !form.title || !form.content || !form.excerpt) ? 0.5 : 1 }}
                    >
                      {saving ? <div style={{ ...s.btnSpinner, width: 16, height: 16, marginRight: 8, borderTopColor: '#fff' }} /> : '🚀 '}
                      {saving ? 'Publishing...' : 'Publish Now'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      disabled={saving || !form.title || !form.content}
                      style={{ ...s.draftBtn, opacity: (saving || !form.title || !form.content) ? 0.5 : 1 }}
                    >
                      💾 Save as Draft
                    </button>
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
                      Published posts are immediately visible on <strong style={{ color: '#475569' }}>tripdm.com/blog</strong>
                    </p>
                  </div>

                  {/* Post Details */}
                  <div style={s.formCard}>
                    <h2 style={s.cardTitle}>Post Details</h2>
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Category</label>
                      <select name="category" value={form.category} onChange={handleFormChange} style={s.fSelect}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Author</label>
                      <input name="author" value={form.author} onChange={handleFormChange} placeholder="TripDM Team" style={s.fInput} />
                    </div>
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Tags <span style={s.optLabel}>(comma-separated)</span></label>
                      <input name="tags" value={form.tags} onChange={handleFormChange} placeholder="india, travel, tips, rajasthan" style={s.fInput} />
                      {form.tags && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                            <span key={tag} style={s.tagChip}>#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div style={s.formCard}>
                    <h2 style={s.cardTitle}>Cover Image</h2>
                    
                    {/* Method Tabs */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 8 }}>
                      <button
                        type="button"
                        onClick={() => setImageMethod('upload')}
                        style={{
                          background: 'none', border: 'none', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          color: imageMethod === 'upload' ? '#ea580c' : '#64748b',
                          borderBottom: imageMethod === 'upload' ? '2px solid #ea580c' : '2px solid transparent',
                          marginBottom: -9, transition: 'all 0.15s'
                        }}
                      >
                        📁 Upload Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageMethod('url')}
                        style={{
                          background: 'none', border: 'none', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          color: imageMethod === 'url' ? '#ea580c' : '#64748b',
                          borderBottom: imageMethod === 'url' ? '2px solid #ea580c' : '2px solid transparent',
                          marginBottom: -9, transition: 'all 0.15s'
                        }}
                      >
                        🔗 Image URL
                      </button>
                    </div>

                    {imageMethod === 'url' ? (
                      <div style={s.fieldGroup}>
                        <label style={s.fLabel}>Image URL</label>
                        <input name="coverImage" value={form.coverImage} onChange={handleFormChange} placeholder="https://..." style={s.fInput} />
                      </div>
                    ) : (
                      <div style={s.fieldGroup}>
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => document.getElementById('cover-file-input')?.click()}
                          style={{
                            border: isDragging ? '2px dashed #ea580c' : '2px dashed rgba(0,0,0,0.08)',
                            background: isDragging ? 'rgba(249,115,22,0.02)' : '#fafafa',
                            borderRadius: 10, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          <input
                            id="cover-file-input"
                            type="file"
                            accept="image/*"
                            onChange={e => e.target.files?.[0] && handleImageFileChange(e.target.files[0])}
                            style={{ display: 'none' }}
                          />
                          {uploadingImage ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                              <div style={{ ...s.btnSpinner, borderTopColor: '#ea580c', width: 24, height: 24 }} />
                              <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 500 }}>Uploading image...</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{ fontSize: 28, marginBottom: 6 }}>📤</span>
                              <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>Click to upload or drag image here</span>
                              <span style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>PNG, JPG up to 10MB</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {form.coverImage ? (
                      <div style={{ position: 'relative', marginTop: 12 }}>
                        <img src={form.coverImage} alt="Cover preview" style={s.coverPreview} />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, coverImage: '' }))}
                          style={{
                            position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none',
                            color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14, fontWeight: 700
                          }}
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div style={s.coverPlaceholder}>
                        <span style={{ fontSize: 32 }}>🖼️</span>
                        <span style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Cover image preview</span>
                      </div>
                    )}
                  </div>

                  {/* SEO Checklist */}
                  <div style={s.formCard}>
                    <h2 style={s.cardTitle}>SEO Checklist</h2>
                    {[
                      { label: 'Title added', ok: form.title.length > 0 },
                      { label: 'Slug defined', ok: form.slug.length > 0 },
                      { label: 'Excerpt written', ok: form.excerpt.length >= 80 },
                      { label: 'Content 800+ words', ok: form.content.split(/\s+/).filter(Boolean).length >= 800 },
                      { label: 'Cover image set', ok: form.coverImage.length > 0 },
                      { label: 'Meta title set', ok: form.metaTitle.length > 0 && form.metaTitle.length <= 60 },
                      { label: 'Meta description set', ok: form.metaDescription.length >= 120 && form.metaDescription.length <= 160 },
                      { label: 'Tags added', ok: form.tags.length > 0 },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, color: item.ok ? '#10b981' : '#94a3b8' }}>{item.ok ? '✓' : '○'}</span>
                        <span style={{ fontSize: 13, color: item.ok ? '#059669' : '#64748b' }}>{item.label}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: 6, fontSize: 12, color: '#059669' }}>
                      {[
                        form.title.length > 0, form.slug.length > 0, form.excerpt.length >= 80,
                        form.content.split(/\s+/).filter(Boolean).length >= 800,
                        form.coverImage.length > 0, form.metaTitle.length > 0 && form.metaTitle.length <= 60,
                        form.metaDescription.length >= 120 && form.metaDescription.length <= 160,
                        form.tags.length > 0
                      ].filter(Boolean).length} / 8 SEO criteria met
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  splash: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  splashSpinner: { width: 36, height: 36, border: '2px solid rgba(249,115,22,0.2)', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  // Login
  loginBg: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute',
    top: '-10%',
    right: '-5%',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute',
    bottom: '-10%',
    left: '-5%',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  loginCard: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 20,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    position: 'relative',
    zIndex: 2,
    boxShadow: '0 24px 64px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,1) inset',
  },
  loginHeader: { textAlign: 'center', marginBottom: 32 },
  loginBrand: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  loginBrandIcon: {
    width: 36, height: 36,
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, color: '#fff', fontWeight: 700,
  },
  loginBrandName: { fontSize: 18, fontWeight: 800, color: '#0f172a' },
  loginBrandBadge: {
    background: 'rgba(249,115,22,0.1)',
    border: '1px solid rgba(249,115,22,0.2)',
    color: '#ea580c',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 20,
    letterSpacing: 0.5,
  },
  loginH1: { fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 6 },
  loginSub: { color: '#64748b', fontSize: 14 },
  googleBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 10,
    padding: '11px 16px',
    color: '#334155',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' },
  dividerLine: { flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' },
  dividerText: { color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' },
  loginForm: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { color: '#475569', fontSize: 13, fontWeight: 500 },
  fieldInput: {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 10,
    padding: '11px 14px',
    color: '#0f172a',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    color: '#94a3b8',
    padding: 4,
  },
  errorAlert: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#dc2626',
    fontSize: 13,
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  signInBtn: {
    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    border: 'none',
    borderRadius: 10,
    padding: '12px 20px',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'box-shadow 0.2s',
    fontFamily: 'inherit',
    width: '100%',
    boxShadow: '0 4px 12px rgba(249,115,22,0.2)',
  },
  btnSpinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(0,0,0,0.1)',
    borderTopColor: '#0f172a',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  loginFooter: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 20 },

  // Dashboard
  dash: { display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#334155' },
  sidebar: {
    width: 220,
    background: '#ffffff',
    borderRight: '1px solid rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexShrink: 0,
    position: 'sticky' as const,
    top: 0,
    height: '100vh',
  },
  sidebarTop: { padding: '20px 0' },
  sidebarBrand: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '0 16px 20px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    marginBottom: 12,
  },
  sidebarBrandIcon: {
    width: 32, height: 32,
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, color: '#fff', fontWeight: 700, flexShrink: 0,
  },
  sidebarBrandName: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  sidebarBrandSub: { fontSize: 10, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' as const },
  nav: { padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    color: '#64748b',
    fontSize: 13,
    fontWeight: 500,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',
    fontFamily: 'inherit',
    width: '100%',
  },
  navItemActive: { background: 'rgba(249,115,22,0.1)', color: '#ea580c' },
  navIcon: { fontSize: 14, width: 18, textAlign: 'center' as const },
  sidebarBottom: {
    borderTop: '1px solid rgba(0,0,0,0.06)',
    padding: '16px',
  },
  sidebarUser: { display: 'flex', alignItems: 'center', gap: 10 },
  userAvatar: {
    width: 30, height: 30,
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  userInfo: { overflow: 'hidden' },
  userName: { fontSize: 12, fontWeight: 600, color: '#0f172a' },
  userEmail: { fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },

  main: { flex: 1, padding: '32px 36px', overflowY: 'auto', minWidth: 0 },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  pageTitle: { fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 },
  pageSub: { fontSize: 13, color: '#64748b' },
  newPostBtn: {
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'inherit',
    boxShadow: '0 4px 16px rgba(249,115,22,0.2)',
    flexShrink: 0,
  },
  backBtn: {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: '8px 14px',
    color: '#475569',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  toast: {
    borderRadius: 10,
    border: '1px solid',
    padding: '12px 16px',
    fontSize: 14,
    marginBottom: 20,
    fontWeight: 500,
  },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 },
  statCard: {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: '18px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  },
  statVal: { fontSize: 30, fontWeight: 800, lineHeight: 1, marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748b' },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 0 },
  tab: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    marginBottom: -1,
    fontFamily: 'inherit',
    transition: 'color 0.15s',
  },
  tabActive: { color: '#ea580c', borderBottomColor: '#ea580c' },
  tabCount: { borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 },
  empty: {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 14,
    padding: '60px 40px',
    textAlign: 'center',
  },
  loadSpinner: { width: 32, height: 32, border: '2px solid rgba(249,115,22,0.2)', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' },
  postList: { display: 'flex', flexDirection: 'column', gap: 8 },
  postRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '14px 16px',
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 12,
    transition: 'border-color 0.2s, background 0.2s',
    cursor: 'default',
    boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
  },
  postThumb: { width: 72, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 },
  postInfo: { flex: 1, minWidth: 0 },
  postMeta: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' as const },
  postBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600,
    padding: '2px 8px', borderRadius: 10,
  },
  publishedBadge: { background: 'rgba(16,185,129,0.1)', color: '#059669' },
  draftBadge: { background: 'rgba(245,158,11,0.1)', color: '#d97706' },
  categoryChip: { fontSize: 11, color: '#475569', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: 10 },
  postDate: { fontSize: 11, color: '#64748b' },
  postTitle: { fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: 1.4, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  postExcerpt: { fontSize: 12, color: '#64748b', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  postActions: { display: 'flex', gap: 4, flexShrink: 0 },
  actionBtn: {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 12,
    color: '#475569',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'all 0.15s',
  },

  // Form
  formLayout: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' },
  formMain: { display: 'flex', flexDirection: 'column', gap: 16 },
  formSidebar: { display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky' as const, top: 16 },
  formCard: {
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 12,
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.7, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.08)' },
  fieldGroup: { marginBottom: 16 },
  fLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 },
  fHint: { display: 'block', fontSize: 11, color: '#64748b', marginTop: 4 },
  optLabel: { color: '#94a3b8', fontWeight: 400 },
  fInput: {
    width: '100%',
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.15)',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#0f172a',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    marginBottom: 0,
    boxSizing: 'border-box' as const,
  },
  fTextarea: {
    width: '100%',
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.15)',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#0f172a',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    lineHeight: 1.65,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box' as const,
  },
  fSelect: {
    width: '100%',
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.15)',
    borderRadius: 8,
    padding: '9px 12px',
    color: '#0f172a',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  slugWrap: { display: 'flex' },
  slugPrefix: {
    background: '#f1f5f9',
    border: '1px solid rgba(0,0,0,0.15)',
    borderRight: 'none',
    borderRadius: '8px 0 0 8px',
    padding: '9px 10px',
    fontSize: 12,
    color: '#64748b',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
  },
  contentTip: {
    background: 'rgba(124,58,237,0.05)',
    border: '1px solid rgba(124,58,237,0.15)',
    borderRadius: 8,
    padding: '12px 14px',
    marginBottom: 12,
    fontSize: 13,
  },
  googlePreview: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '16px',
    marginBottom: 16,
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  googlePreviewLabel: { fontSize: 10, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8, fontFamily: 'Inter, sans-serif' },
  googlePreviewUrl: { fontSize: 12, color: '#166534', marginBottom: 3, fontFamily: 'Inter, sans-serif' },
  googlePreviewTitle: { fontSize: 17, color: '#1a0dab', marginBottom: 4, lineHeight: 1.3, fontFamily: 'Inter, sans-serif' },
  googlePreviewDesc: { fontSize: 12, color: '#475569', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' },
  seoBar: { height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  seoBarFill: { height: '100%', borderRadius: 2, transition: 'width 0.3s, background 0.3s' },
  tagChip: { background: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 500 },
  publishBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    border: 'none',
    borderRadius: 8,
    padding: '11px 0',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginBottom: 8,
    boxShadow: '0 4px 14px rgba(249,115,22,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
  },
  draftBtn: {
    width: '100%',
    background: '#ffffff',
    border: '1px solid rgba(0,0,0,0.15)',
    borderRadius: 8,
    padding: '10px 0',
    color: '#475569',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  coverPreview: { width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 4, border: '1px solid rgba(0,0,0,0.08)' },
  coverPlaceholder: {
    width: '100%', height: 100,
    background: '#f8fafc',
    border: '1px dashed rgba(0,0,0,0.15)',
    borderRadius: 8,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
};
