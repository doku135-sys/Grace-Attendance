
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

interface AccountSettingsProps {
  onLogout?: () => void;
}

// A more robust endpoint for data persistence
const SYNC_API_URL = 'https://api.npoint.io/e1f86847c2936798a72b';

const AccountSettings: React.FC<AccountSettingsProps> = ({ onLogout }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [syncId, setSyncId] = useState(storageService.getSyncId());
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSyncing, setIsSyncing] = useState(false);

  const showMsg = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    if (type !== 'info') {
      setTimeout(() => setMessage({ type: '', text: '' }), 6000);
    }
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

  // --- CLOUD SYNC LOGIC ---
  const handlePushToCloud = async () => {
    const key = syncId.trim();
    if (key.length < 5) {
      showMsg('error', 'Sync Key must be at least 5 characters.');
      return;
    }

    setIsSyncing(true);
    showMsg('info', 'Connecting to Cloud Registry...');
    storageService.setSyncId(key);

    try {
      // Fetch the existing registry first
      const getRes = await fetch(SYNC_API_URL);
      let registry: any = {};
      if (getRes.ok) {
        registry = await getRes.json();
      }

      // Update the specific church entry
      const localData = storageService.exportFullState();
      registry[key] = {
        data: localData,
        updatedAt: new Date().toISOString()
      };

      // Save the entire registry back
      const putRes = await fetch(SYNC_API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registry)
      });

      if (putRes.ok) {
        showMsg('success', 'Cloud Backup Successful! Now use this key on your other device.');
      } else {
        throw new Error('Cloud storage error');
      }
    } catch (err) {
      console.error(err);
      showMsg('error', 'Cloud Sync failed. Please try "File Backup" instead.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    const key = syncId.trim();
    if (!key) {
      showMsg('error', 'Please enter your Church Sync Key.');
      return;
    }

    setIsSyncing(true);
    showMsg('info', 'Searching for Cloud Data...');

    try {
      const response = await fetch(SYNC_API_URL);
      if (!response.ok) throw new Error();
      
      const registry = await response.json();
      const churchEntry = registry[key];

      if (churchEntry && churchEntry.data) {
        if (window.confirm('Cloud data found! Overwrite current device data with this backup?')) {
          storageService.importFullState(churchEntry.data);
          storageService.setSyncId(key);
          showMsg('success', 'Data Restored! Restarting app in 2 seconds...');
          setTimeout(() => window.location.reload(), 2000);
        }
      } else {
        showMsg('error', 'No data found for this Key. Did you Upload from the original device?');
      }
    } catch (err) {
      showMsg('error', 'Fetch failed. Ensure your Sync Key is correct and you are online.');
    } finally {
      setIsSyncing(false);
    }
  };

  // --- FILE SYNC LOGIC ---
  const handleExportFile = () => {
    const data = storageService.exportFullState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GraceAttend_Backup_${new Date().toISOString().split('T')[0]}.church`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMsg('success', 'Backup file (.church) downloaded!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.members && Array.isArray(data.members)) {
          if (window.confirm('Import this backup file? This replaces your current list.')) {
            storageService.importFullState(data);
            showMsg('success', 'File imported successfully! Restarting...');
            setTimeout(() => window.location.reload(), 1500);
          }
        } else {
          showMsg('error', 'Invalid backup file format.');
        }
      } catch (err) {
        showMsg('error', 'Failed to read backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 px-4 sm:px-0">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <i className="fas fa-sync-alt text-2xl"></i>
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sync & Security</h2>
          <p className="text-slate-500 text-sm font-medium">Keep your church data safe and shared</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* OPTION 1: CLOUD SYNC */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition duration-1000">
              <i className="fas fa-cloud-upload-alt text-[10rem]"></i>
            </div>
            
            <div className="flex items-center gap-3 mb-6 relative">
               <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                 <i className="fas fa-globe"></i>
               </div>
               <h3 className="text-lg font-bold text-slate-800">Cloud Sync (Easiest)</h3>
            </div>
            
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Upload your data to the cloud using a <strong>Sync Key</strong>. Enter the same key on any other device to fetch your members instantly.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Church Sync Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={syncId}
                    onChange={(e) => setSyncId(e.target.value)}
                    className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-700"
                    placeholder="e.g. MyChurch-ID-2024"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(syncId);
                      showMsg('success', 'Sync Key copied to clipboard!');
                    }}
                    className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition"
                    title="Copy Key"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePushToCloud}
                  disabled={isSyncing}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-100"
                >
                  <i className={`fas ${isSyncing ? 'fa-spinner fa-spin' : 'fa-arrow-up'}`}></i>
                  Upload to Cloud
                </button>
                <button
                  type="button"
                  onClick={handlePullFromCloud}
                  disabled={isSyncing}
                  className="flex-1 px-6 py-4 border-2 border-blue-600 text-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <i className={`fas ${isSyncing ? 'fa-spinner fa-spin' : 'fa-arrow-down'}`}></i>
                  Fetch from Cloud
                </button>
              </div>
            </div>
          </div>

          {/* OPTION 2: FILE BACKUP */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                 <i className="fas fa-file-export"></i>
               </div>
               <h3 className="text-lg font-bold text-slate-800">File Backup (Guaranteed)</h3>
            </div>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              If the cloud is offline, download a <code>.church</code> file and send it via WhatsApp/Email to your other device.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleExportFile}
                className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition"
              >
                <i className="fas fa-download"></i>
                Save Backup File
              </button>
              <label className="flex-1 px-6 py-4 border-2 border-slate-900 text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition cursor-pointer text-center">
                <i className="fas fa-upload"></i>
                Upload Backup File
                <input type="file" accept=".church" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
          </div>

          {/* ADMIN PASSWORD SECTION */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-lock"></i>
              </div>
              Change Admin Password
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
                className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-50"
              >
                Update Password
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
          <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group border border-white/10">
            <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition duration-700">
               <i className="fas fa-sync text-[12rem]"></i>
            </div>
            <div className="relative z-10">
              <h4 className="text-xl font-black mb-4 flex items-center gap-2">
                <i className="fas fa-lightbulb text-amber-400"></i>
                Sync Tips
              </h4>
              <ul className="space-y-4">
                <li className="flex gap-3 text-xs font-medium text-indigo-100 leading-relaxed">
                  <i className="fas fa-check-circle text-emerald-400 mt-0.5"></i>
                  Data is <strong>not</strong> saved automatically in the cloud. You must click "Upload" after making changes.
                </li>
                <li className="flex gap-3 text-xs font-medium text-indigo-100 leading-relaxed">
                  <i className="fas fa-check-circle text-emerald-400 mt-0.5"></i>
                  The Sync Key is your only access. Use a unique name like <code>GraceChurchChicago-Admin</code>.
                </li>
                <li className="flex gap-3 text-xs font-medium text-indigo-100 leading-relaxed">
                  <i className="fas fa-check-circle text-emerald-400 mt-0.5"></i>
                  If Cloud Sync fails, always use the <strong>File Backup</strong> option. It never fails!
                </li>
              </ul>
            </div>
          </div>

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
