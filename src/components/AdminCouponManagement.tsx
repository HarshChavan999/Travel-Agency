'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Percent,
  DollarSign,
  TrendingUp,
  AlertCircle,
  X,
  Loader2,
  Eye,
  Calendar,
  Filter,
  RefreshCw,
  Gift
} from 'lucide-react';
import { Coupon, CouponRedemption } from '@/lib/types';

export default function AdminCouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    maxDiscount: '',
    minOrderAmount: '',
    applicablePlans: ['all'],
    usageLimit: '',
    validFrom: '',
    validUntil: '',
    isActive: true
  });

  // Redemptions Drawer State
  const [viewingRedemptionsCoupon, setViewingRedemptionsCoupon] = useState<Coupon | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await res.json();
      if (data.coupons) {
        setCoupons(data.coupons);
      } else {
        setError(data.error || 'Failed to load coupons');
      }
    } catch (err: any) {
      console.error('Error loading coupons:', err);
      setError('Failed to fetch coupons from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: '',
      maxDiscount: '',
      minOrderAmount: '',
      applicablePlans: ['all'],
      usageLimit: '',
      validFrom: '',
      validUntil: '',
      isActive: true
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      maxDiscount: coupon.maxDiscount ? coupon.maxDiscount.toString() : '',
      minOrderAmount: coupon.minOrderAmount ? coupon.minOrderAmount.toString() : '',
      applicablePlans: coupon.applicablePlans && coupon.applicablePlans.length > 0 ? coupon.applicablePlans : ['all'],
      usageLimit: coupon.usageLimit ? coupon.usageLimit.toString() : '',
      validFrom: coupon.validFrom || '',
      validUntil: coupon.validUntil || '',
      isActive: coupon.isActive
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setFormError('Coupon code is required.');
      return;
    }
    if (!formData.discountValue || Number(formData.discountValue) <= 0) {
      setFormError('Valid discount value is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        minOrderAmount: formData.minOrderAmount ? Number(formData.minOrderAmount) : 0,
        applicablePlans: formData.applicablePlans,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
        validFrom: formData.validFrom || null,
        validUntil: formData.validUntil || null,
        isActive: formData.isActive
      };

      let res;
      if (editingCoupon) {
        res = await fetch('/api/admin/coupons', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCoupon.id, ...payload })
        });
      } else {
        res = await fetch('/api/admin/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();

      if (data.success) {
        setIsFormModalOpen(false);
        fetchCoupons();
      } else {
        setFormError(data.error || 'Failed to save coupon.');
      }
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      setFormError('Failed to save coupon. Check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      const newStatus = !coupon.isActive;
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coupon.id, isActive: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, isActive: newStatus } : c))
        );
      }
    } catch (err) {
      console.error('Error toggling coupon status:', err);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon code "${code}"?`)) return;

    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert(data.error || 'Failed to delete coupon');
      }
    } catch (err) {
      console.error('Delete coupon error:', err);
    }
  };

  const handleTogglePlanChoice = (plan: string) => {
    setFormData((prev) => {
      let current = [...prev.applicablePlans];
      if (plan === 'all') {
        return { ...prev, applicablePlans: ['all'] };
      }
      current = current.filter((p) => p !== 'all');
      if (current.includes(plan)) {
        current = current.filter((p) => p !== plan);
        if (current.length === 0) current = ['all'];
      } else {
        current.push(plan);
      }
      return { ...prev, applicablePlans: current };
    });
  };

  // Stats calculation
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.isActive).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
  const totalDiscountGranted = coupons.reduce((sum, c) => {
    if (c.redemptions) {
      return sum + c.redemptions.reduce((rSum, r) => rSum + (r.discountAmount || 0), 0);
    }
    return sum;
  }, 0);

  // Filtered List
  const filteredCoupons = coupons.filter((c) => {
    const matchesQuery = c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const isExpired = c.validUntil ? new Date(c.validUntil).getTime() < Date.now() : false;

    if (!matchesQuery) return false;
    if (filterStatus === 'active') return c.isActive && !isExpired;
    if (filterStatus === 'inactive') return !c.isActive;
    if (filterStatus === 'expired') return isExpired;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-orange-500" /> Coupon &amp; Discount Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create promotional coupon codes, set usage limits, track agency redemptions, and view discount statistics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCoupons}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh
          </button>
          <button
            onClick={handleOpenCreate}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create New Coupon
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Coupons</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalCoupons}</p>
          <p className="text-[10px] text-slate-400 mt-1">{activeCoupons} active &amp; enabled</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Campaigns</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{activeCoupons}</p>
          <p className="text-[10px] text-slate-400 mt-1">Available for agency upgrades</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Redemptions</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalRedemptions}</p>
          <p className="text-[10px] text-slate-400 mt-1">Agency plan checkouts</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Discount Granted</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">₹{totalDiscountGranted.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400 mt-1">Cumulative savings given</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coupon code..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 font-mono uppercase"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {(['all', 'active', 'inactive', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
            <p className="text-xs text-slate-500 font-medium">Loading coupon list...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Gift className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">No Coupons Found</p>
            <p className="text-xs text-slate-400 mb-4 max-w-sm">
              {searchQuery || filterStatus !== 'all'
                ? 'No coupon matches your search or filter criteria.'
                : 'No promotional coupons created yet. Click below to add your first coupon code.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              Create First Coupon
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Code &amp; Details</th>
                  <th className="px-5 py-3.5">Discount</th>
                  <th className="px-5 py-3.5">Applicable Plans</th>
                  <th className="px-5 py-3.5">Usage Track</th>
                  <th className="px-5 py-3.5">Status &amp; Validity</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                {filteredCoupons.map((coupon) => {
                  const isExpired = coupon.validUntil
                    ? new Date(coupon.validUntil).getTime() < Date.now()
                    : false;
                  const limit = coupon.usageLimit;
                  const used = coupon.usedCount || 0;
                  const usagePercent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

                  return (
                    <tr key={coupon.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Code */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 tracking-wider">
                            {coupon.code}
                          </span>
                        </div>
                        {coupon.minOrderAmount && coupon.minOrderAmount > 0 ? (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Min spend: ₹{coupon.minOrderAmount.toLocaleString('en-IN')}
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 mt-1">No min spend required</p>
                        )}
                      </td>

                      {/* Discount */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-extrabold text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {coupon.discountType === 'percentage' ? (
                            <>
                              <Percent className="w-3 h-3" /> {coupon.discountValue}% OFF
                            </>
                          ) : (
                            <>₹{coupon.discountValue} OFF</>
                          )}
                        </div>
                        {coupon.maxDiscount && coupon.discountType === 'percentage' && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Cap: ₹{coupon.maxDiscount.toLocaleString('en-IN')}
                          </p>
                        )}
                      </td>

                      {/* Applicable Plans */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(coupon.applicablePlans || ['all']).map((plan) => (
                            <span
                              key={plan}
                              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {plan}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Usage Track */}
                      <td className="px-5 py-4">
                        <div className="space-y-1 max-w-[120px]">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                            <span>{used} uses</span>
                            <span className="text-slate-400">{limit ? `/ ${limit}` : '∞'}</span>
                          </div>
                          {limit && (
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  usagePercent >= 100 ? 'bg-red-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                              <XCircle className="w-3 h-3 text-red-500" /> Expired
                            </span>
                          ) : coupon.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                              Disabled
                            </span>
                          )}

                          {coupon.validUntil && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> Until{' '}
                              {new Date(coupon.validUntil).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Active Switch */}
                          <button
                            onClick={() => handleToggleStatus(coupon)}
                            title={coupon.isActive ? 'Disable Coupon' : 'Enable Coupon'}
                            className={`w-8 h-4 rounded-full p-0.5 transition-colors relative ${
                              coupon.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full bg-white transition-transform ${
                                coupon.isActive ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* View Redemptions */}
                          <button
                            onClick={() => setViewingRedemptionsCoupon(coupon)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                            title="View Usage Redemptions"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(coupon)}
                            className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg transition-colors"
                            title="Edit Coupon"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                            title="Delete Coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Coupon Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-400" />
                {editingCoupon ? `Edit Coupon (${editingCoupon.code})` : 'Create New Promotional Coupon'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Code */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Coupon Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER50, WELCOME100"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Discount Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder={formData.discountType === 'percentage' ? '20 (% off)' : '500 (₹ off)'}
                    required
                    min="1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  />
                </div>
              </div>

              {/* Max Discount (for Percentage) & Min Order Amount */}
              <div className="grid grid-cols-2 gap-4">
                {formData.discountType === 'percentage' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                      placeholder="Optional max limit"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                    />
                  </div>
                )}

                <div className={formData.discountType === 'percentage' ? '' : 'col-span-2'}>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    placeholder="0 for no minimum"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  />
                </div>
              </div>

              {/* Applicable Plans */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Applicable Subscription Plans</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All Plans' },
                    { id: 'starter', label: 'Standard (Starter)' },
                    { id: 'premium', label: 'Premium' },
                    { id: 'vip', label: 'VIP Elite' }
                  ].map((plan) => {
                    const isSelected = formData.applicablePlans.includes(plan.id);
                    return (
                      <button
                        type="button"
                        key={plan.id}
                        onClick={() => handleTogglePlanChoice(plan.id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {plan.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Usage Limit */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Usage Limit (Max Total Uses)</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="Leave empty for unlimited usage"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                />
              </div>

              {/* Valid From & Until */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Valid From Date</label>
                  <input
                    type="date"
                    value={formData.validFrom ? formData.validFrom.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Valid Until (Expiry)</label>
                  <input
                    type="date"
                    value={formData.validUntil ? formData.validUntil.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">Enable &amp; Activate Coupon</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors relative ${
                    formData.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Coupon'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redemptions Usage Drawer */}
      {viewingRedemptionsCoupon && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  Redemption History: {viewingRedemptionsCoupon.code}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Total Uses: {viewingRedemptionsCoupon.usedCount || 0} times
                </p>
              </div>
              <button
                onClick={() => setViewingRedemptionsCoupon(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {!viewingRedemptionsCoupon.redemptions ||
              viewingRedemptionsCoupon.redemptions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No redemption records yet for this coupon.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Agency</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Discount Granted</th>
                      <th className="px-4 py-3">Amount Paid</th>
                      <th className="px-4 py-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {viewingRedemptionsCoupon.redemptions.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {r.agencyName || r.agencyId}
                        </td>
                        <td className="px-4 py-3 uppercase font-bold text-[10px] text-orange-600">
                          {r.plan}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 font-bold">
                          - ₹{r.discountAmount?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          ₹{r.amountPaid?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {new Date(r.timestamp).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
