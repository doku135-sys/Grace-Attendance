
import React, { useMemo, useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { storageService } from '../services/storageService';
import { getAttendanceInsights } from '../services/geminiService';
import { Member, AttendanceRecord, AIInsight, MemberCategory } from '../types';

const CATEGORIES: MemberCategory[] = [
  'Praise and Worship',
  'Multimedia',
  'Service Management',
  'Usher'
];

const Dashboard: React.FC = () => {
  const members = storageService.getMembers();
  const attendance = storageService.getAttendance();
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MemberCategory | 'All'>('All');

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true);
      const data = await getAttendanceInsights(members, attendance);
      setInsights(data);
      setLoadingInsights(false);
    };
    fetchInsights();
  }, []);

  // Filter attendance based on selected category
  const filteredAttendance = useMemo(() => {
    if (selectedCategory === 'All') return attendance;
    
    // Find all members in this category
    const categoryMemberIds = new Set(
      members.filter(m => m.category === selectedCategory).map(m => m.id)
    );
    
    return attendance.filter(record => categoryMemberIds.has(record.memberId));
  }, [attendance, members, selectedCategory]);

  const filteredMembers = useMemo(() => {
    if (selectedCategory === 'All') return members;
    return members.filter(m => m.category === selectedCategory);
  }, [members, selectedCategory]);

  const chartData = useMemo(() => {
    const grouped: { [key: string]: number } = {};
    filteredAttendance.forEach(record => {
      grouped[record.date] = (grouped[record.date] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [filteredAttendance]);

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

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredAttendance.filter(r => r.date === today).length;
  }, [filteredAttendance]);

  const monthlyTotal = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return filteredAttendance.filter(a => a.date.startsWith(currentMonth)).length;
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Present Today</p>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-3xl font-black text-indigo-600">{todayCount}</p>
            <p className="text-xs text-slate-400 mb-1">/{filteredMembers.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Monthly Total</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{monthlyTotal}</p>
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

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2 text-slate-800">
            <i className="fas fa-history text-indigo-500"></i> Recent Activity
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#6366f1" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }} 
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {selectedCategory === 'All' && (
        <div className="bg-indigo-900 text-white p-10 rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/5">
           <div className="absolute -top-10 -right-10 p-8 opacity-5">
              <i className="fas fa-church text-[15rem]"></i>
           </div>
           <div className="relative z-10">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
               <h3 className="text-2xl font-black flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                  <i className="fas fa-wand-magic-sparkles text-amber-300"></i>
                </div>
                AI Ministry Insights
              </h3>
              <div className="bg-white/10 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-sm text-xs font-bold uppercase tracking-widest text-indigo-200">
                Powered by Gemini
              </div>
             </div>
            {loadingInsights ? (
              <div className="animate-pulse space-y-6 py-4">
                <div className="h-4 bg-white/10 rounded-full w-3/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="h-24 bg-white/10 rounded-3xl"></div>
                  <div className="h-24 bg-white/10 rounded-3xl"></div>
                </div>
              </div>
            ) : insights ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <p className="text-indigo-50 text-xl leading-relaxed font-medium">{insights.summary}</p>
                  <div className="bg-indigo-800/40 p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-inner">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-2">Growth Analysis</p>
                     <p className="text-sm italic text-indigo-100">{insights.growthTrend}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
                    <i className="fas fa-user-clock text-amber-400"></i> Pastoral Care Required (Missed 2+ Weeks)
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {insights.atRiskMembers.length > 0 ? insights.atRiskMembers.map(m => (
                      <span key={m} className="bg-white/10 hover:bg-white/20 transition cursor-default text-white px-5 py-2.5 rounded-2xl text-sm font-bold border border-white/10 shadow-sm backdrop-blur-sm">
                        {m}
                      </span>
                    )) : (
                      <div className="w-full bg-emerald-500/20 text-emerald-200 p-6 rounded-3xl border border-emerald-500/30 flex items-center gap-4 backdrop-blur-sm">
                         <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                           <i className="fas fa-check"></i>
                         </div>
                         <span className="font-bold">Perfect Attendance! No pastoral follow-up needed today.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-center bg-white/5 rounded-[2rem] border border-white/5">
                 <i className="fas fa-sparkles text-4xl mb-4 text-indigo-400 opacity-50"></i>
                 <p className="text-indigo-200 font-medium">Add more attendance data to unlock AI-powered ministry insights.</p>
              </div>
            )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
