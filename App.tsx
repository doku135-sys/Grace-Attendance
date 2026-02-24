
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import MemberManagement from './components/MemberManagement';
import AttendanceLog from './components/AttendanceLog';
import Scanner from './components/Scanner';
import Login from './components/Login';
import AccountSettings from './components/AccountSettings';
import { storageService } from './services/storageService';
import { Member, AttendanceRecord } from './types';

type View = 'dashboard' | 'members' | 'scan' | 'log' | 'account';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'admin' | 'scanner' | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [scanStatus, setScanStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const refreshData = async () => {
    const [m, a, u] = await Promise.all([
      storageService.fetchMembers(),
      storageService.fetchAttendance(),
      storageService.fetchUsers()
    ]);
    setMembers(m);
    setAttendance(a);
  };

  useEffect(() => {
    const init = async () => {
      // Check initial authentication state from storage
      const auth = storageService.isAuthenticated();
      const role = storageService.getUserRole();
      setIsAuthenticated(auth);
      setUserRole(role);
      
      if (auth) {
        await refreshData();
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async () => {
    setIsAuthenticated(true);
    setUserRole(storageService.getUserRole());
    setCurrentView('dashboard');
    await refreshData();
  };

  const handleLogout = () => {
    storageService.setSession(false);
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentView('dashboard');
    setMembers([]);
    setAttendance([]);
  };

  const handleScan = async (id: string) => {
    const member = members.find(m => m.id === id);

    if (member) {
      const success = await storageService.recordAttendance(id);
      if (success) {
        setScanStatus(`Welcome, ${member.name}! Checked in.`);
        await refreshData(); // Refresh to show new attendance
      } else {
        setScanStatus(`${member.name} is already checked in for today.`);
      }
    } else {
      setScanStatus(`Member ID ${id} not found.`);
    }

    setTimeout(() => setScanStatus(''), 3000);
  };

  // Prevent flash of login screen while checking session
  if (loading) return null;

  // If not logged in, only show the Login portal
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <i className="fas fa-church text-xl"></i>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">GraceAttend</h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none">Church Attendance System</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            {(userRole === 'admin' ? ['dashboard', 'members', 'scan', 'log'] : ['dashboard', 'scan']).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setCurrentView(view as View)}
                className={`text-sm font-semibold transition-colors capitalize ${
                  currentView === view ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-500'
                }`}
              >
                {view === 'log' ? 'Attendance Log' : view}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setCurrentView('account')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                currentView === 'account' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              title="Account Settings"
            >
              <i className="fas fa-user-cog"></i>
            </button>
            <button 
              type="button"
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition flex items-center justify-center"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {currentView === 'dashboard' && <Dashboard members={members} attendance={attendance} />}
        {currentView === 'members' && userRole === 'admin' && <MemberManagement members={members} onUpdate={refreshData} />}
        {currentView === 'log' && userRole === 'admin' && <AttendanceLog members={members} attendance={attendance} onUpdate={refreshData} />}
        {currentView === 'account' && <AccountSettings onLogout={handleLogout} onUpdate={refreshData} userRole={userRole} />}
        {currentView === 'scan' && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-8 text-center text-slate-800">Scan Member ID</h2>
            <Scanner onScan={handleScan} statusMessage={scanStatus} />
            <div className="mt-12 max-w-sm w-full bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] text-center shadow-inner">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                 <i className="fas fa-info-circle text-indigo-400 text-xl"></i>
               </div>
               <p className="text-indigo-900 font-bold mb-1">Instruction</p>
               <p className="text-indigo-700/70 text-sm leading-relaxed">Align the member's QR code within the camera frame. The system will detect the member and check them in automatically.</p>
            </div>
          </div>
        )}
      </main>

      {/* Global Desktop Footer / Mobile Non-Sticky Footer */}
      <div className="w-full pb-20 md:pb-8 pt-4">
        <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
          © RT
        </p>
      </div>

      <footer className="md:hidden bg-white border-t sticky bottom-0 z-40 h-16 flex items-center justify-around px-4">
        <button type="button" onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center ${currentView === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <i className="fas fa-th-large text-lg"></i>
          <span className="text-[10px] font-bold uppercase mt-1">Home</span>
        </button>
        {userRole === 'admin' && (
          <button type="button" onClick={() => setCurrentView('members')} className={`flex flex-col items-center ${currentView === 'members' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fas fa-users text-lg"></i>
            <span className="text-[10px] font-bold uppercase mt-1">Folks</span>
          </button>
        )}
        <button type="button" onClick={() => setCurrentView('scan')} className={`relative flex items-center justify-center w-12 h-12 -mt-10 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 ring-4 ring-slate-50 ${currentView === 'scan' ? 'bg-indigo-700' : ''}`}>
          <i className="fas fa-barcode text-xl"></i>
        </button>
        {userRole === 'admin' && (
          <button type="button" onClick={() => setCurrentView('log')} className={`flex flex-col items-center ${currentView === 'log' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className="fas fa-calendar-check text-lg"></i>
            <span className="text-[10px] font-bold uppercase mt-1">Logs</span>
          </button>
        )}
        <button type="button" onClick={() => setCurrentView('account')} className={`flex flex-col items-center ${currentView === 'account' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <i className="fas fa-user-circle text-lg"></i>
          <span className="text-[10px] font-bold uppercase mt-1">Profile</span>
        </button>
      </footer>
    </div>
  );
};

export default App;
