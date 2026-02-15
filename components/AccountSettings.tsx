
import React, { useState } from 'react';
import { storageService } from '../services/storageService';

interface AccountSettingsProps {
  onLogout?: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ onLogout }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in both fields.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'Password must be at least 4 characters.' });
      return;
    }

    storageService.updateAdminPassword(newPassword);
    setMessage({ type: 'success', text: 'Password saved successfully!' });
    
    setNewPassword('');
    setConfirmPassword('');
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <i className="fas fa-key text-2xl"></i>
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Security Settings</h2>
          <p className="text-slate-500 text-sm font-medium">Update admin access credentials</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-lg font-bold text-slate-800">Change Admin Password</h3>
              <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                User: Admin
              </div>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">New Password</label>
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition font-medium"
                    placeholder="Enter your new password"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirm New Password</label>
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition font-medium"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              {message.text && (
                <div className={`p-5 rounded-2xl text-sm font-bold flex items-center gap-3 border animate-in slide-in-from-top-2 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                }`}>
                  <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                  {message.text}
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full md:w-auto px-12 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition font-black shadow-xl shadow-indigo-100 uppercase tracking-widest text-xs"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-sign-out-alt text-2xl"></i>
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2">End Session</h3>
             <p className="text-slate-500 text-sm mb-6 max-w-xs">Logging out will return you to the login screen and clear your current active session.</p>
             <button 
              type="button"
              onClick={onLogout}
              className="px-12 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition shadow-xl shadow-slate-200"
             >
               Logout Now
             </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition duration-700">
               <i className="fas fa-shield-alt text-[12rem]"></i>
            </div>
            <div className="relative z-10">
              <h4 className="text-xl font-bold mb-4">Security Rules</h4>
              <ul className="space-y-4">
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <i className="fas fa-circle-check text-emerald-400 mt-0.5"></i>
                  The username "admin" is permanent and cannot be changed.
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <i className="fas fa-circle-check text-emerald-400 mt-0.5"></i>
                  Password updates are saved instantly to this device.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
