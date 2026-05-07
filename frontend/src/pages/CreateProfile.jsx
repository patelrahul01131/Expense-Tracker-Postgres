import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function CreateProfile() {
  const navigate = useNavigate();
  const [profileType, setProfileType] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    currency: 'USD',
    avatar_url: '',
  });

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a profile name');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:3000/api/profile',
        {
          name: formData.name,
          currency: formData.currency,
          avatar_url: formData.avatar_url || null,
        },
        { headers: { token } }
      );

      if (response.status === 201) {
        toast.success('Profile created! Welcome to ExpenseSync 🎉');
        setTimeout(() => navigate('/'), 1200);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 overflow-hidden">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-600 to-indigo-600">
          <h1 className="text-3xl font-bold text-white">Complete Your Profile</h1>
          <p className="mt-2 text-blue-100">One last step — let's set up your profile to get started.</p>
        </div>

        <form onSubmit={handleComplete} className="p-8 space-y-8">

          {/* Avatar / Name */}
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                {formData.name ? (
                  <span className="text-2xl font-bold">
                    {formData.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Profile Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. John's Personal Account"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Profile Type */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-900 dark:text-white">
              What are you tracking expenses for?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'personal', title: 'Personal', desc: 'Individual use', emoji: '👤' },
                { id: 'business', title: 'Business', desc: 'Company tracking', emoji: '💼' },
                { id: 'friends', title: 'Friends/Family', desc: 'Shared expenses', emoji: '👨‍👩‍👧' },
              ].map((type) => (
                <div
                  key={type.id}
                  onClick={() => setProfileType(type.id)}
                  className={`cursor-pointer rounded-2xl p-4 border-2 transition-all ${
                    profileType === type.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{type.emoji}</span>
                      <span className={`font-semibold ${profileType === type.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                        {type.title}
                      </span>
                    </div>
                    {profileType === type.id && <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <p className={`text-sm ${profileType === type.id ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-slate-500 dark:text-slate-400'}`}>
                    {type.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Primary Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="USD" className="bg-white dark:bg-slate-800">USD ($) — US Dollar</option>
              <option value="EUR" className="bg-white dark:bg-slate-800">EUR (€) — Euro</option>
              <option value="GBP" className="bg-white dark:bg-slate-800">GBP (£) — British Pound</option>
              <option value="INR" className="bg-white dark:bg-slate-800">INR (₹) — Indian Rupee</option>
              <option value="AUD" className="bg-white dark:bg-slate-800">AUD ($) — Australian Dollar</option>
              <option value="CAD" className="bg-white dark:bg-slate-800">CAD ($) — Canadian Dollar</option>
            </select>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-sm shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                'Complete Setup →'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
