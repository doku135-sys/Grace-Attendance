
import React, { useMemo, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { MemberCategory, AttendanceRecord, ServiceGroup } from '../types';

const AttendanceLog: React.FC = () => {
  const members = storageService.getMembers();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(storageService.getAttendance());
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const filteredData = useMemo(() => {
    return attendance
      .filter(record => record.date.startsWith(filterMonth))
      .map(record => {
        const member = members.find(m => m.id === record.memberId);
        return {
          ...record,
          memberName: member ? member.name : 'Unknown Member',
          category: member ? member.category : 'N/A' as MemberCategory | 'N/A',
          serviceGroup: member ? (member.serviceGroup || 'KC 1') : 'N/A' as ServiceGroup | 'N/A',
          phone: member ? member.phone : 'N/A',
          email: member ? member.email : 'N/A'
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [attendance, members, filterMonth]);

  const handleDeleteRecord = (memberId: string, timestamp: string) => {
    const member = members.find(m => m.id === memberId);
    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(timestamp).toLocaleDateString();
    
    if (window.confirm(`Delete attendance record for ${member?.name || 'this member'} on ${dateStr} at ${timeStr}?`)) {
      const updated = storageService.deleteAttendanceRecord(memberId, timestamp);
      setAttendance([...updated]);
    }
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    const headers = ['Timestamp', 'Date', 'Member ID', 'Name', 'Category', 'Service Group', 'Phone', 'Email'];
    const rows = filteredData.map(r => [
      new Date(r.timestamp).toLocaleString(),
      r.date,
      r.memberId,
      r.memberName,
      r.category,
      r.serviceGroup,
      r.phone,
      r.email
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Log_${filterMonth}.csv`);
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      if (link.parentNode === document.body) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 100);
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'Praise and Worship': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'Multimedia': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Service Management': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Usher': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Attendance Log</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="month" 
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm font-bold text-slate-700"
          />
          <button 
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 font-bold"
          >
            <i className="fas fa-file-excel"></i> 
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Group</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                       <i className="fas fa-calendar-alt text-5xl"></i>
                       <p className="font-medium">No records found for this month.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.map((record, idx) => (
                <tr key={`${record.memberId}-${record.timestamp}`} className="hover:bg-slate-50/50 transition group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-indigo-600">
                      {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-500">{record.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{record.memberName}</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">{record.memberId}</div>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getCategoryColor(record.category)}`}>
                      {record.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-indigo-50 text-indigo-600 border-indigo-100">
                      {record.serviceGroup}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDeleteRecord(record.memberId, record.timestamp)}
                      className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Entry"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLog;
