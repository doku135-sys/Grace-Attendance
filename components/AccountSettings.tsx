
import React, { useState } from 'react';
import { storageService } from '../services/storageService';

interface AccountSettingsProps {
  onLogout?: () => void;
}

// A dedicated public bin for GraceAttend sync
const SYNC_API_URL = 'https://api.npoint.io/e1f86847c2936798a72b';

const AccountSettings: React.FC<AccountSettingsProps> = ({ onLogout }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [syncId, setSyncId] = useState(storageService.getSyncId());
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSyncing, setIsSyncing] = useState(false);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'Password too short (min 4 chars).' });
      return;
    }
    storageService.updateAdminPassword(newPassword);
    setMessage({ type: 'success', text: 'Password saved successfully!' });
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handlePushToCloud = async () => {
    const cleanSyncId = syncId.trim();
    if (!cleanSyncId || cleanSyncId.length < 5) {
      setMessage({ type: 'error', text: 'Please enter a Sync Key (at least 5 characters).' });
      return;
    }
    
    setIsSyncing(true);
    setMessage({ type: 'info', text: 'Uploading data to cloud...' });
    storageService.setSyncId(cleanSyncId);
    
    try {
      // 1. Get existing registry
      const getRes = await fetch(SYNC_API_URL);
      let registry = {};
      if (getRes.ok) {
        registry = await getRes.json();
      }

      // 2. Add/Update our church data
      const data = storageService.exportFullState();
      const updatedRegistry = { ...registry, [cleanSyncId]: data };

      // 3. Save back to cloud
      const putRes = await fetch(SYNC_API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRegistry)
      });

      if (putRes.ok) {
        setMessage({ type: 'success', text: 'Backup Successful! You can now fetch this on other devices.' });
      } else {
        throw new Error('Cloud storage rejected the update.');
      }
    } catch (err) {
      console.error("Sync Error:", err);
      setMessage({ type: 'error', text: 'Upload failed. Check your internet connection.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handlePullFromCloud = async () => {
    const cleanSyncId = syncId.trim();
    if (!cleanSyncId) {
      setMessage({ type: 'error', text: 'Enter your unique Church Sync Key first.' });
      return;
    }
    
    setIsSyncing(true);
    setMessage({ type: 'info', text: 'Fetching your data...' });
    
    try {
      const response = await fetch(SYNC_API_URL);
      if (!response.ok) throw new Error('Cloud service unavailable.');
      
      const allData = await response.json();
      const churchData = allData[cleanSyncId];

      if (churchData && churchData.members) {
        if (window.confirm('Cloud data found! This will replace everything on this device. Continue?')) {
          storageService.importFullState(churchData);
          storageService.setSyncId(cleanSyncId);
          setMessage({ type: 'success', text: 'Sync Complete! Restarting app...' });
          
          // CRITICAL: Reload the app to ensure all components refresh with the new data
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } else {
        setMessage({ type: 'error', text: 'No data found for this Sync Key. Did you upload from the other device first?' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Sync failed. Ensure you are online and the key is correct.' });
    } finally {
      setIsSyncing(false);
      if (message.type !== 'success') {
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <i className="fas fa-user-cog text-2xl"></i>
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Management Settings</h2>
          <p className="text-slate-500 text-sm font-medium">Configure credentials and multi-device sync</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* SYNC SECTION */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
              <i className="fas fa-cloud text-[8rem]"></i>
            </div>
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                 <i className="fas fa-sync-alt"></i>
               </div>
               <h3 className="text-lg font-bold text-slate-800">Multi-Device Sync</h3>
            </div>
            
            <p className="text-slate-500 text-sm mb-6">
              Share your member list across multiple devices. Use a private <strong>Church Sync Key</strong> to back up and restore your data instantly.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Church Sync Key (Keep it Private)</label>
                <input
                  type="text"
                  value={syncId}
                  onChange={(e) => setSyncId(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-700"
                  placeholder="e.g. Grace-Church-2024"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handlePushToCloud}
                  disabled={isSyncing}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <i className={`fas ${isSyncing ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`}></i>
                  Upload (Send)
                </button>
                <button
                  type="button"
                  onClick={handlePullFromCloud}
                  disabled={isSyncing}
                  className="flex-1 px-6 py-4 border-2 border-blue-600 text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <i className={`fas ${isSyncing ? 'fa-spinner fa-spin' : 'fa-cloud-download-alt'}`}></i>
                  Fetch (Receive)
                </button>
              </div>
            </div>
          </div>

          {/* PASSWORD SECTION */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-lock"></i>
              </div>
              Update Admin Password
            </h3>
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">New Password</label>
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-50"
              >
                Save Password
              </button>
            </form>
          </div>

          {message.text && (
            <div className={`p-5 rounded-2xl text-sm font-bold flex items-center gap-3 border animate-in slide-in-from-top-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
              message.type === 'info' ? 'bg-blue-50 text-blue-600 border-blue-100' :
              'bg-red-50 text-red-600 border-red-100'
            }`}>
              <i className={`fas ${
                message.type === 'success' ? 'fa-check-circle' : 
                message.type === 'info' ? 'fa-circle-notch fa-spin' :
                'fa-exclamation-circle'
              }`}></i>
              {message.text}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition duration-700">
               <i className="fas fa-shield-alt text-[12rem]"></i>
            </div>
            <div className="relative z-10">
              <h4 className="text-xl font-bold mb-4">Sync Instruction</h4>
              <ul className="space-y-4">
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <i className="fas fa-check-circle text-emerald-400 mt-0.5"></i>
                  Step 1: On your main device, click "Upload".
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <i className="fas fa-check-circle text-emerald-400 mt-0.5"></i>
                  Step 2: On the new device, use the SAME key.
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <i className="fas fa-check-circle text-emerald-400 mt-0.5"></i>
                  Step 3: Click "Fetch" and wait for the auto-reload.
                </li>
              </ul>
            </div>
          </div>

          <button 
            type="button"
            onClick={onLogout}
            className="w-full py-5 bg-white border-2 border-red-100 text-red-500 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-red-50 transition flex items-center justify-center gap-3"
          >
            <i className="fas fa-power-off"></i> Logout Admin
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
