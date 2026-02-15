
import React, { useState } from 'react';
import { storageService } from '../services/storageService';

interface AccountSettingsProps {
  onLogout?: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ onLogout }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 6000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg('error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 4) {
      showMsg('error', 'Password must be at least 4 characters.');
      return;
    }
    storageService.updateAdminPassword(newPassword);
    showMsg('success', 'Admin password updated successfully!');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleExportFile = () => {
    const data = storageService.exportFullState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `GraceAttend_FullBackup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMsg('success', 'Full system backup downloaded (Includes Members + Attendance)!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      showMsg('error', 'Failed to read file on this device.');
    };
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) throw new Error("File is empty");
        
        const data = JSON.parse(content);
        
        // Validate that we have members at least
        if (data.members && Array.isArray(data.members)) {
          const memberCount = data.members.length;
          const attendanceCount = (data.attendance && Array.isArray(data.attendance)) ? data.attendance.length : 0;
          
          const confirmText = `Found ${memberCount} members and ${attendanceCount} attendance logs. This will REPLACE all current data on this device. Continue?`;
          
          if (window.confirm(confirmText)) {
            storageService.importFullState(data);
            showMsg('success', 'System restored successfully! Refreshing...');
            setTimeout(() => window.location.reload(), 1500);
          }
        } else {
          showMsg('error', 'Invalid file: Data structure not recognized.');
        }
      } catch (err) {
        showMsg('error', 'Failed to process file. Ensure it is a valid GraceAttend backup.');
        console.error("Import error:", err);
      }
    };
    
    // Some mobile devices handle blobs differently, readAsText is usually safest
    reader.readAsText(file);
    
    // Clear the input value so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 px-4 sm:px-0">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <i className="fas fa-cog text-2xl"></i>
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h2>
          <p className="text-slate-500 text-sm font-medium">Manage unified data backups and security</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* UNIFIED FILE BACKUP SECTION */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
              <i className="fas fa-database"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Unified Data Backup</h3>
          </div>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Download a single <code>.json</code> file containing <strong>all members</strong> and <strong>all attendance records</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleExportFile}
              className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-lg shadow-slate-100"
            >
              <i className="fas fa-download"></i>
              Download Full Backup
            </button>
            <label className="flex-1 px-6 py-4 border-2 border-slate-900 text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition cursor-pointer text-center">
              <i className="fas fa-upload"></i>
              Restore Full Data
              <input 
                type="file" 
                accept="application/json,.json,text/plain,.church" 
                onChange={handleImportFile} 
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* ADMIN PASSWORD SECTION */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-lock"></i>
            </div>
            Update Admin Password
          </h3>
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                required
                type="password"
                value={newPassword}
                placeholder="New Password"
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
              <input
                required
                type="password"
                value={confirmPassword}
                placeholder="Confirm Password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-50"
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

        <div className="pt-6">
          <button 
            type="button"
            onClick={onLogout}
            className="w-full py-5 bg-white border-2 border-red-100 text-red-500 rounded-[2.5rem] font-black text-xs uppercase tracking-widest hover:bg-red-50 transition flex items-center justify-center gap-3 shadow-sm"
          >
            <i className="fas fa-power-off"></i> Logout Admin
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
