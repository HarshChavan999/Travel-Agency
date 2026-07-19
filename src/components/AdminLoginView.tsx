import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLoginView() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Check for allowed admin emails (though AuthContext also checks this, it's good UX to show error early)
    const allowedEmails = ['phitanshu962@gmail.com', 'harshnpc21@gmail.com'];
    if (!allowedEmails.includes(email.toLowerCase())) {
      setError('Unauthorized access. Admin privileges required.');
      setLoading(false);
      return;
    }

    try {
      if (signIn) {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      if (signInWithGoogle) {
        await signInWithGoogle();
      }
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img src="/tripdm-logo.png" alt="TripDM" className="mx-auto h-12 w-auto object-contain bg-[#0B0F19] px-4 py-2 rounded" />
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Login</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to your admin account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                required
              />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-4 py-2.5 hover:bg-gray-50 transition-all font-medium text-gray-700 text-sm"
            >
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">G</div>
              Sign in with Google
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0B0F19] hover:bg-gray-800 text-white font-bold py-3 rounded-lg mt-4 transition-all disabled:opacity-60 text-sm"
            >
              {loading ? 'Please wait...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
