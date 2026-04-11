
import React, { useMemo, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { MemberCategory, AttendanceRecord, ServiceGroup, Member, UserRole } from '../types';

import { CATEGORIES, SERVICE_GROUPS } from '../constants';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttendanceLogProps {
  members: Member[];
  attendance: AttendanceRecord[];
  onUpdate: () => Promise<void>;
  userRole: UserRole | null;
}

const AttendanceLog: React.FC<AttendanceLogProps> = ({ members, attendance, onUpdate, userRole }) => {
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [showExportModal, setShowExportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    month: new Date().toISOString().slice(0, 7),
    category: 'Usher' as MemberCategory,
    serviceGroup: 'KC 1' as ServiceGroup
  });

  const [manualEntry, setManualEntry] = useState({
    memberId: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Praise and Worship' as MemberCategory,
    serviceGroup: 'KC 1' as ServiceGroup
  });

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

  const handleDeleteRecord = async (memberId: string, timestamp: string) => {
    const member = members.find(m => m.id === memberId);
    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(timestamp).toLocaleDateString();
    
    if (window.confirm(`Delete attendance record for ${member?.name || 'this member'} on ${dateStr} at ${timeStr}?`)) {
      await storageService.deleteAttendanceRecord(memberId, timestamp);
      await onUpdate();
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const [year, month] = exportSettings.month.split('-').map(Number);
    const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
    
    // 1. Title
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(`Monthly Attendance Report: ${monthName} ${year}`, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Team: ${exportSettings.category} | Group: ${exportSettings.serviceGroup}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);

    // 2. Identify Report Dates (Sundays + any other day with attendance)
    const sundays: string[] = [];
    const d = new Date(year, month - 1, 1);
    while (d.getMonth() === month - 1) {
      if (d.getDay() === 0) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        sundays.push(`${y}-${m}-${day}`);
      }
      d.setDate(d.getDate() + 1);
    }

    const teamAttendance = attendance.filter(a => {
      const m = members.find(mem => mem.id === a.memberId);
      return m?.category === exportSettings.category && 
             m?.serviceGroup === exportSettings.serviceGroup && 
             a.date.startsWith(exportSettings.month);
    });

    // Find non-Sunday dates that have attendance
    const eventDates = Array.from(new Set(teamAttendance.map(a => a.date)))
      .filter(date => !sundays.includes(date))
      .sort();

    const reportDates = [...sundays, ...eventDates].sort();

    const dailyCounts = reportDates.map(date => teamAttendance.filter(a => a.date === date).length);
    const avgAttendance = dailyCounts.length > 0 
      ? (dailyCounts.reduce((acc, curr) => acc + curr, 0) / dailyCounts.length).toFixed(1)
      : 0;
    const maxCount = Math.max(...dailyCounts, 5);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Average Attendance: ${avgAttendance} per event`, 14, 42);

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(`Attendance Summary (Sundays & Events)`, 14, 52);

    // Draw simple bars
    const startX = 20;
    const startY = 90;
    const barWidth = 20;
    const spacing = 8;
    const chartHeight = 30;

    // Only show first 6 dates in chart to avoid overflow, or scale
    const chartDates = reportDates.slice(0, 6);
    chartDates.forEach((dateStr, i) => {
      const count = teamAttendance.filter(a => a.date === dateStr).length;
      const barHeight = (count / maxCount) * chartHeight;
      
      // Bar
      doc.setFillColor(16, 185, 129); // Emerald-500
      doc.rect(startX + i * (barWidth + spacing), startY - barHeight, barWidth, barHeight, 'F');
      
      // Label
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const [y, m, day] = dateStr.split('-').map(Number);
      const label = new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      doc.text(label, startX + i * (barWidth + spacing), startY + 5);
      
      // Count
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(count.toString(), startX + i * (barWidth + spacing) + barWidth/2 - 2, startY - barHeight - 2);
    });

    // 3. Table for the selected group
    let currentY = 110;

    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text(`${exportSettings.category} - ${exportSettings.serviceGroup} Detailed List`, 14, currentY);
    currentY += 5;

    const groupMembers = members.filter(m => m.category === exportSettings.category && m.serviceGroup === exportSettings.serviceGroup);
    
    const tableHeaders = ['No.', 'Name', ...reportDates.map(s => {
      const [y, m, day] = s.split('-').map(Number);
      return new Date(y, m - 1, day).toLocaleDateString('en-US', { day: 'numeric' });
    }), 'Total'];
    
    const tableRows = groupMembers.map((m, index) => {
      const row = [(index + 1).toString(), m.name];
      let totalPresent = 0;
      reportDates.forEach(dateStr => {
        const present = attendance.some(a => a.memberId === m.id && a.date === dateStr);
        if (present) totalPresent++;
        row.push(present ? 'P' : 'A');
      });
      row.push(totalPresent.toString());
      return row;
    });

    autoTable(doc, {
      startY: currentY,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 
        0: { cellWidth: 10, halign: 'center' },
        1: { fontStyle: 'bold', cellWidth: 35 },
        [tableHeaders.length - 1]: { fontStyle: 'bold', halign: 'center', cellWidth: 15 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 1 && data.column.index < tableHeaders.length - 1) {
          if (data.cell.text[0] === 'P') {
            data.cell.styles.textColor = [16, 185, 129]; // Emerald
          } else {
            data.cell.styles.textColor = [244, 63, 94]; // Rose
          }
        }
      }
    });

    doc.save(`${exportSettings.category}_${exportSettings.serviceGroup}_Report_${exportSettings.month}.pdf`);
    setShowExportModal(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntry.memberId) {
      alert('Please select a member');
      return;
    }

    const success = await storageService.recordManualAttendance(manualEntry.memberId, manualEntry.date);
    if (success) {
      await onUpdate();
      setShowManualModal(false);
      setManualEntry({
        ...manualEntry,
        memberId: ''
      });
    } else {
      alert('This member is already recorded for the selected date.');
    }
  };

  const filteredMembersForManual = useMemo(() => {
    return members.filter(m => 
      m.category === manualEntry.category && 
      m.serviceGroup === manualEntry.serviceGroup
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [members, manualEntry.category, manualEntry.serviceGroup]);

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
          {userRole === 'superadmin' && (
            <button 
              onClick={() => setShowManualModal(true)}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200 font-bold"
            >
              <i className="fas fa-plus"></i>
              <span className="hidden sm:inline">Manual Entry</span>
            </button>
          )}
          <button 
            onClick={() => setShowExportModal(true)}
            disabled={members.length === 0}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 font-bold"
          >
            <i className="fas fa-file-pdf"></i> 
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Export Monthly Report</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Select Month</label>
                <input 
                  type="month" 
                  value={exportSettings.month}
                  onChange={e => setExportSettings({...exportSettings, month: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ministry Category</label>
                <select 
                  value={exportSettings.category}
                  onChange={e => setExportSettings({...exportSettings, category: e.target.value as MemberCategory})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  {CATEGORIES.map((cat: MemberCategory) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Service Group</label>
                <select 
                  value={exportSettings.serviceGroup}
                  onChange={e => setExportSettings({...exportSettings, serviceGroup: e.target.value as ServiceGroup})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  {SERVICE_GROUPS.map((group: ServiceGroup) => <option key={group} value={group}>{group}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition"
                >
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Manual Attendance Entry</h3>
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Ministry Category</label>
                <select 
                  value={manualEntry.category}
                  onChange={e => setManualEntry({...manualEntry, category: e.target.value as MemberCategory, memberId: ''})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  {CATEGORIES.map((cat: MemberCategory) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Service Group</label>
                <select 
                  value={manualEntry.serviceGroup}
                  onChange={e => setManualEntry({...manualEntry, serviceGroup: e.target.value as ServiceGroup, memberId: ''})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  {SERVICE_GROUPS.map((group: ServiceGroup) => <option key={group} value={group}>{group}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Select Member</label>
                <select 
                  required
                  value={manualEntry.memberId}
                  onChange={e => setManualEntry({...manualEntry, memberId: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="">-- Select Member --</option>
                  {filteredMembersForManual.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {filteredMembersForManual.length === 0 && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">No members found in this category/group.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Attendance Date</label>
                <input 
                  required
                  type="date" 
                  value={manualEntry.date}
                  onChange={e => setManualEntry({...manualEntry, date: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!manualEntry.memberId}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                      className={`p-2 rounded-lg transition-colors ${userRole === 'superadmin' ? 'text-red-300 hover:text-red-600 hover:bg-red-50' : 'text-red-100 cursor-not-allowed'}`}
                      title={userRole === 'superadmin' ? "Delete Entry" : "Delete restricted to Superadmin"}
                      disabled={userRole !== 'superadmin'}
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
