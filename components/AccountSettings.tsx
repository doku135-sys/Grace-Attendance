
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

interface AccountSettingsProps {
  onLogout?: () => void;
}

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
      setMessage({ type: 'error', text: 'Password too short.' });
      return;
    }
    storageService.updateAdminPassword(newPassword);
    setMessage({ type: 'success', text: 'Password saved successfully!' });
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Simple Cloud Sync Logic using a public JSON store service
  const handlePushToCloud = async () => {
    if (!syncId || syncId.length < 5) {
      setMessage({ type: 'error', text: 'Please enter a Sync Key (at least 5 chars).' });
      return;
    }
    
    setIsSyncing(true);
    storageService.setSyncId(syncId);
    const data = storageService.exportFullState();

    try {
      // Using npoint.io as a simple public JSON store for this demo
      // In a real app, you would use a dedicated API
      const response = await fetch(`https://api.npoint.io/0880340578635836a995`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [syncId]: data })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Data uploaded to cloud!' });
      } else {
        throw new Error();
      }
    } catch (err) {
      // Fallback: If npoint fails, explain that a real DB is needed
      setMessage({ type: 'error', text: 'Cloud sync requires a database setup. Data remains local for now.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const handlePullFromCloud = async () => {
    if (!syncId) {
      setMessage({ type: 'error', text: 'Enter your Church Sync Key first.' });
      return;
    }
    
    setIsSyncing(true);
    try {
      const response = await fetch(`https://api.npoint.io/0880340578635836a995`);
      const allData = await response.json();
      const churchData = allData[syncId];

      if (churchData) {
        if (window.confirm('This will overwrite your current device data with the cloud backup. Continue?')) {
          storageService.importFullState(churchData);
          setMessage({ type: 'success', text: 'Data synced from cloud!' });
          // Optional: Force a slight delay before UI update
        }
      } else {
        setMessage({ type: 'error', text: 'No data found for this Sync Key.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Could not connect to sync service.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
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
               <h3 className="text-lg font-bold text-slate-800">Cloud Sync (Multi-Device)</h3>
            </div>
            
            <p className="text-slate-500 text-sm mb-6">
              Use a <strong>Church Sync Key</strong> to move your members and attendance logs to another phone or tablet. 
              Upload on one device, then Fetch on the other.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Church Sync Key</label>
                <input
                  type="text"
                  value={syncId}
                  onChange={(e) => setSyncId(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-700"
                  placeholder="e.g. Grace-Chicago-Main"
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
                  Upload to Cloud
                </button>
                <button
                  type="button"
                  onClick={handlePullFromCloud}
                  disabled={isSyncing}
                  className="flex-1 px-6 py-4 border-2 border-blue-600 text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <i className={`fas ${isSyncing ? 'fa-spinner fa-spin' : 'fa-cloud-download-alt'}`}></i>
                  Fetch from Cloud
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
              Admin Credentials
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
                Update Password
              </button>
            </form>
          </div>

          {message.text && (
            <div className={`p-5 rounded-2xl text-sm font-bold flex items-center gap-3 border animate-in slide-in-from-top-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
            }`}>
              <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
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
              <h4 className="text-xl font-bold mb-4">Sync Tips</h4>
              <ul className="space-y-4">
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <i className="fas fa-check-circle text-emerald-400 mt-0.5"></i>
                  Create a unique "Church Name" as your Sync Key.
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <i className="fas fa-check-circle text-emerald-400 mt-0.5"></i>
                  Always "Upload" after you add new members.
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <i className="fas fa-check-circle text-emerald-400 mt-0.5"></i>
                  Click "Fetch" on your other devices to download the latest data.
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
