
import React, { useState } from 'react';
import { storageService } from '../services/storageService';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminCreds = storageService.getAdminCreds();
    const scannerCreds = storageService.getScannerCreds();
    
    if (username === adminCreds.username && password === adminCreds.password) {
      storageService.setSession(true, 'admin');
      onLogin();
    } else if (username === scannerCreds.username && password === scannerCreds.password) {
      storageService.setSession(true, 'scanner');
      onLogin();
    } else {
      setError('Invalid username or password');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-100 mb-6">
            <i className="fas fa-church text-4xl"></i>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">GraceAttend</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Admin Portal Login</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <i className="fas fa-user text-sm"></i>
                </span>
                <input
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                  placeholder=""
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <i className="fas fa-lock text-sm"></i>
                </span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                  placeholder=""
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-3 border border-red-100 animate-shake">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl hover:bg-indigo-700 transition font-bold shadow-xl shadow-indigo-100 text-lg"
            >
              Sign In
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Secure administrative access only.<br/>
              Contact system administrator if you lost access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
