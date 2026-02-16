
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { storageService } from '../services/storageService';
import { MemberCategory } from '../types';

const CATEGORIES: MemberCategory[] = [
  'Praise and Worship',
  'Multimedia',
  'Service Management',
  'Usher'
];

const Dashboard: React.FC = () => {
  const members = storageService.getMembers();
  const attendance = storageService.getAttendance();
  const [selectedCategory, setSelectedCategory] = useState<MemberCategory | 'All'>('All');

  const filteredMembers = useMemo(() => {
    if (selectedCategory === 'All') return members;
    return members.filter(m => m.category === selectedCategory);
  }, [members, selectedCategory]);

  const filteredAttendance = useMemo(() => {
    if (selectedCategory === 'All') return attendance;
    const categoryMemberIds = new Set(filteredMembers.map(m => m.id));
    return attendance.filter(record => categoryMemberIds.has(record.memberId));
  }, [attendance, filteredMembers, selectedCategory]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthlyAttendance = filteredAttendance.filter(a => a.date.startsWith(currentMonth));
    
    const weeks: { [key: string]: number } = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0, 'Week 5': 0 };
    
    monthlyAttendance.forEach(a => {
      const day = new Date(a.date).getDate();
      const weekIndex = Math.ceil(day / 7);
      weeks[`Week ${weekIndex}`]++;
    });

    return Object.entries(weeks).map(([name, count]) => ({ name, count }));
  }, [filteredAttendance]);

  // --- LEADERBOARD LOGIC ---
  const leaderboardData = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyAttendance = filteredAttendance.filter(a => a.date.startsWith(currentMonth));
    
    // Count per member
    const counts: { [id: string]: number } = {};
    filteredMembers.forEach(m => counts[m.id] = 0);
    monthlyAttendance.forEach(a => {
      if (counts[a.memberId] !== undefined) {
        counts[a.memberId]++;
      }
    });

    const sorted = filteredMembers.map(m => ({
      name: m.name,
      count: counts[m.id],
      id: m.id,
      category: m.category
    })).sort((a, b) => b.count - a.count);

    const highest = sorted.slice(0, 3);
    const lowest = [...sorted].sort((a, b) => a.count - b.count).slice(0, 3);

    return { highest, lowest };
  }, [filteredAttendance, filteredMembers]);

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredAttendance.filter(r => r.date === today).length;
  }, [filteredAttendance]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Attendance Dashboard</h2>
          <p className="text-sm text-slate-500">Monitor engagement across ministries</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden lg:block">Filter Ministry:</label>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm text-slate-700"
          >
            <option value="All">All Ministries</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Present Today</p>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-3xl font-black text-indigo-600">{todayCount}</p>
            <p className="text-xs text-slate-400 mb-1">/{filteredMembers.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Team Size</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{filteredMembers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Avg Sunday</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">
            {weeklyData.filter(w => w.count > 0).length ? 
              Math.round(weeklyData.reduce((acc, v) => acc + v.count, 0) / weeklyData.filter(w => w.count > 0).length) : 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT CHART: WEEKLY BAR CHART */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <i className="fas fa-chart-bar text-emerald-500"></i> {selectedCategory === 'All' ? 'Church' : selectedCategory} Weekly
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Current Month</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} dy={10} fontStyle="bold" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                  {weeklyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#10b981' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT PANEL: LEADERBOARD */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2 text-slate-800">
            <i className="fas fa-award text-indigo-500"></i> Monthly Highs & Lows
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* HIGHEST */}
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fas fa-arrow-trend-up"></i> Top 3 (Consistent)
              </p>
              <div className="space-y-4">
                {leaderboardData.highest.length > 0 ? leaderboardData.highest.map((m, idx) => (
                  <div key={m.id} className="relative p-4 bg-emerald-50/30 rounded-2xl border border-emerald-50 group hover:bg-emerald-50/50 transition">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black text-emerald-700">{idx + 1}. {m.name}</span>
                      <span className="text-xs font-bold text-emerald-600">{m.count} check-ins</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((m.count / 5) * 100, 100)}%` }}></div>
                    </div>
                    <p className="text-[9px] font-bold text-emerald-800/40 uppercase mt-1">{m.category}</p>
                  </div>
                )) : (
                  <p className="text-slate-400 text-xs italic py-4">No attendance data yet.</p>
                )}
              </div>
            </div>

            {/* LOWEST */}
            <div>
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fas fa-arrow-trend-down"></i> Bottom 3 (Needs Care)
              </p>
              <div className="space-y-4">
                {leaderboardData.lowest.length > 0 ? leaderboardData.lowest.map((m, idx) => (
                  <div key={m.id} className="relative p-4 bg-rose-50/30 rounded-2xl border border-rose-50 group hover:bg-rose-50/50 transition">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black text-rose-700">{m.name}</span>
                      <span className="text-xs font-bold text-rose-600">{m.count} check-ins</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-400 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((m.count / 5) * 100, 100)}%` }}></div>
                    </div>
                    <p className="text-[9px] font-bold text-rose-800/40 uppercase mt-1">{m.category}</p>
                  </div>
                )) : (
                  <p className="text-slate-400 text-xs italic py-4">No members found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
