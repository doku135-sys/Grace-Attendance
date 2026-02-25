
import React, { useState } from 'react';
import { storageService } from '../services/storageService';

import { UserRole } from '../types';

interface AccountSettingsProps {
  onLogout?: () => void;
  onUpdate: () => Promise<void>;
  userRole: UserRole | null;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ onLogout, onUpdate, userRole }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newScannerPassword, setNewScannerPassword] = useState('');
  const [confirmScannerPassword, setConfirmScannerPassword] = useState('');
  const [newSuperAdminPassword, setNewSuperAdminPassword] = useState('');
  const [confirmSuperAdminPassword, setConfirmSuperAdminPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 6000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg('error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 4) {
      showMsg('error', 'Password must be at least 4 characters.');
      return;
    }
    await storageService.updateAdminPassword(newPassword);
    showMsg('success', 'Admin password updated successfully!');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleUpdateSuperAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSuperAdminPassword !== confirmSuperAdminPassword) {
      showMsg('error', 'Superadmin passwords do not match.');
      return;
    }
    if (newSuperAdminPassword.length < 4) {
      showMsg('error', 'Superadmin password must be at least 4 characters.');
      return;
    }
    await storageService.updateSuperAdminPassword(newSuperAdminPassword);
    showMsg('success', 'Superadmin password updated successfully!');
    setNewSuperAdminPassword('');
    setConfirmSuperAdminPassword('');
  };

  const handleUpdateScannerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newScannerPassword !== confirmScannerPassword) {
      showMsg('error', 'Scanner passwords do not match.');
      return;
    }
    if (newScannerPassword.length < 4) {
      showMsg('error', 'Scanner password must be at least 4 characters.');
      return;
    }
    await storageService.updateScannerPassword(newScannerPassword);
    showMsg('success', 'Scanner password updated successfully!');
    setNewScannerPassword('');
    setConfirmScannerPassword('');
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
    
    reader.onload = async (event) => {
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
            await storageService.importFullState(data);
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
        {/* SUPERADMIN PASSWORD SECTION (Only for Superadmin) */}
        {userRole === 'superadmin' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-user-shield"></i>
              </div>
              Update My Password (Superadmin)
            </h3>
            <form onSubmit={handleUpdateSuperAdminPassword} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  type="password"
                  value={newSuperAdminPassword}
                  placeholder="New Superadmin Password"
                  onChange={(e) => setNewSuperAdminPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                />
                <input
                  required
                  type="password"
                  value={confirmSuperAdminPassword}
                  placeholder="Confirm Superadmin Password"
                  onChange={(e) => setConfirmSuperAdminPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-10 py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 transition shadow-lg shadow-purple-50"
              >
                Update Superadmin Password
              </button>
            </form>
          </div>
        )}

        {/* ADMIN PASSWORD SECTION (Only for Superadmin) */}
        {userRole === 'superadmin' && (
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
                  placeholder="New Admin Password"
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  placeholder="Confirm Admin Password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-50"
              >
                Update Admin Password
              </button>
            </form>
          </div>
        )}

        {/* SCANNER PASSWORD SECTION (Only for Superadmin) */}
        {userRole === 'superadmin' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-barcode"></i>
              </div>
              Update Scanner Password
            </h3>
            <form onSubmit={handleUpdateScannerPassword} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  required
                  type="password"
                  value={newScannerPassword}
                  placeholder="New Scanner Password"
                  onChange={(e) => setNewScannerPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition"
                />
                <input
                  required
                  type="password"
                  value={confirmScannerPassword}
                  placeholder="Confirm Scanner Password"
                  onChange={(e) => setConfirmScannerPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-10 py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition shadow-lg shadow-amber-50"
              >
                Update Scanner Password
              </button>
            </form>
          </div>
        )}

        {userRole === 'admin' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-user-cog text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Admin Account</h3>
            <p className="text-slate-500 text-sm">You are logged in as an administrator. You have full access to manage members and attendance. Password management is restricted to Superadmin.</p>
          </div>
        )}

        {userRole === 'scanner' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-shield-alt text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Scanner Account</h3>
            <p className="text-slate-500 text-sm">You are logged in as a scanner. You have view-only access to the dashboard and full access to the scanner menu.</p>
          </div>
        )}

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
            <i className="fas fa-power-off"></i> Logout {userRole === 'scanner' ? 'Scanner' : userRole === 'admin' ? 'Admin' : 'Superadmin'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
