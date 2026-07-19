import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Upload } from 'lucide-react';

export default function AgencyLoginView() {
  const { signIn, signInWithGoogle, register } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Register Fields
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [businessLocation, setBusinessLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [agencyDescription, setAgencyDescription] = useState('');
  const [operatingFromHome, setOperatingFromHome] = useState(false);
  const [operatingFromOffice, setOperatingFromOffice] = useState(false);
  const [officeAddress, setOfficeAddress] = useState('');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [declarationChecked, setDeclarationChecked] = useState(false);
  
  // Files
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!declarationChecked) {
      setError('Please accept the declaration to proceed with registration.');
      return;
    }

    if (!phone || !businessLocation || !fullAddress || !agencyDescription || !refundPolicy) {
      setError('Please fill in all required fields.');
      return;
    }

    if (operatingFromOffice && !officeAddress) {
      setError('Please provide office address when operating from office.');
      return;
    }

    setLoading(true);
    try {
      if (register) {
        const agencyData = {
          name: contactPersonName,
          companyName,
          phone: `${countryCode} ${phone}`,
          contactNumber: `${countryCode} ${phone}`,
          businessLocation,
          fullAddress,
          agencyDescription,
          refundPolicy,
          operatingFromHome,
          operatingFromOffice,
          officeAddress: operatingFromOffice ? officeAddress : '',
        };

        await register(email, password, 'agency', agencyData, logoFile || undefined);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
    <div className="min-h-screen bg-white lg:flex lg:h-screen lg:overflow-hidden">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-black overflow-hidden h-full">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=2021&q=80" 
          alt="Travel" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center p-12 text-white">
          <img src="/tripdm-logo.png" alt="TripDM" className="h-12 w-auto object-contain mb-8 origin-left" style={{ filter: 'brightness(0) invert(1)' }} />
          <h1 className="text-5xl font-bold mb-6 leading-tight">Grow Your Travel Business</h1>
          <p className="text-xl opacity-90 max-w-lg leading-relaxed">Join thousands of agencies connecting directly with travelers to provide unforgettable experiences.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col py-12 px-6 sm:px-12 xl:px-20 lg:h-screen lg:overflow-y-scroll">
        <div className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center">
          <div className="text-center lg:text-left mb-8">
            <div className="lg:hidden flex justify-center mb-6">
               <img src="/tripdm-logo.png" alt="TripDM" className="h-10 w-auto object-contain bg-[#0B0F19] px-4 py-2 rounded" />
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 text-orange-500">
              <Building2 className="h-8 w-8" />
              <h2 className="text-3xl font-bold text-gray-900">Agency Portal</h2>
            </div>
            <p className="text-gray-500 mt-2">Sign in or register to manage your listings and bookings</p>
          </div>

          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'login' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'signup' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Register Agency
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 text-sm text-red-500 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-lg transition-all shadow-md mt-6"
              >
                {loading ? 'Please wait...' : 'Login & Continue'}
              </button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-lg px-4 py-3.5 hover:bg-gray-50 transition-all font-semibold text-gray-700"
              >
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">G</div>
                Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agency Company Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    value={contactPersonName}
                    onChange={(e) => setContactPersonName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                  <div className="flex gap-2">
                    <select 
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-20 border border-gray-200 rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-white"
                    >
                      <option value="+91">+91</option>
                      <option value="+1">+1</option>
                      <option value="+44">+44</option>
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 min-w-0"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Location (City/State) *</label>
                <input
                  type="text"
                  value={businessLocation}
                  onChange={(e) => setBusinessLocation(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Business Address *</label>
                <textarea
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 resize-none"
                  required
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3">Operating Setup</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={operatingFromHome}
                      onChange={(e) => setOperatingFromHome(e.target.checked)}
                      className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" 
                    />
                    <span className="text-sm text-gray-700">Operating from Home</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={operatingFromOffice}
                      onChange={(e) => setOperatingFromOffice(e.target.checked)}
                      className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" 
                    />
                    <span className="text-sm text-gray-700">Operating from Office</span>
                  </label>
                </div>
                {operatingFromOffice && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Address *</label>
                    <textarea
                      value={officeAddress}
                      onChange={(e) => setOfficeAddress(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 resize-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency Description *</label>
                <textarea
                  value={agencyDescription}
                  onChange={(e) => setAgencyDescription(e.target.value)}
                  placeholder="Tell us about your agency, your specialties, and experience..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Refund Policy *</label>
                <textarea
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  placeholder="State your general refund and cancellation policy..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agency Logo (Optional)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    id="logo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLogoFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label htmlFor="logo-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-6 w-6 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-orange-500">Click to upload logo</span>
                    <span className="text-xs text-gray-500 mt-1">{logoFile ? logoFile.name : 'PNG, JPG up to 5MB'}</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
                    required
                  />
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mt-6">
                <label className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    checked={declarationChecked}
                    onChange={(e) => setDeclarationChecked(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-orange-500 rounded border-orange-300 focus:ring-orange-500" 
                  />
                  <span className="text-xs text-gray-700 leading-relaxed">
                    I declare that all information provided is true and accurate. I understand that my agency account will be pending approval from the admin before I can start listing packages. I agree to the Terms of Service and Privacy Policy.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold py-3.5 rounded-lg transition-all shadow-md mt-2"
              >
                {loading ? 'Submitting Registration...' : 'Submit Agency Registration'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
