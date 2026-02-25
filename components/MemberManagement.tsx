
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { storageService } from '../services/storageService';
import { Member, MemberCategory, ServiceGroup, UserRole } from '../types';
import { CATEGORIES, SERVICE_GROUPS } from '../constants';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MemberManagementProps {
  members: Member[];
  onUpdate: () => Promise<void>;
  userRole: UserRole | null;
}

const MemberManagement: React.FC<MemberManagementProps> = ({ members, onUpdate, userRole }) => {
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<Member | null>(null);
  const [showStatsModal, setShowStatsModal] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [filterCategory, setFilterCategory] = useState<MemberCategory | 'All'>('All');
  const [filterGroup, setFilterGroup] = useState<ServiceGroup | 'All'>('All');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'Praise and Worship' as MemberCategory,
    serviceGroup: 'KC 1' as ServiceGroup,
  });

  const attendance = storageService.getAttendance();

  const handleOpenModal = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        phone: member.phone,
        email: member.email,
        category: member.category,
        serviceGroup: member.serviceGroup || 'KC 1',
      });
    } else {
      setEditingMember(null);
      setFormData({ name: '', phone: '', email: '', category: 'Praise and Worship', serviceGroup: 'KC 1' });
    }
    setShowModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingMember) {
      const updatedMember = { ...editingMember, ...formData };
      await storageService.updateMember(updatedMember);
    } else {
      const newMember: Member = {
        id: `CH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        ...formData,
        joinedDate: new Date().toISOString().split('T')[0],
      };
      await storageService.saveMember(newMember);
    }
    
    await onUpdate();
    setShowModal(false);
  };

  const handleDeleteMember = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this member? This will also remove their attendance history.')) {
      await storageService.deleteMember(id);
      await onUpdate();
    }
  };

  const downloadQRCode = async (member: Member) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${member.id}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const img = new Image();
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set dimensions (500x500 QR + padding for text and border)
        const padding = 60;
        const topPadding = 100;
        canvas.width = 500 + (padding * 2);
        canvas.height = 500 + topPadding + padding;

        // 1. Draw Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Purple Border (Indigo-600 style)
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 15;
        ctx.strokeRect(ctx.lineWidth/2, ctx.lineWidth/2, canvas.width - ctx.lineWidth, canvas.height - ctx.lineWidth);

        // 3. Draw Header Text
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.textAlign = 'center';
        
        // Category + Group
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`${member.category} • ${member.serviceGroup}`, canvas.width / 2, 45);
        
        // Name
        ctx.font = 'black 36px sans-serif';
        ctx.fillStyle = '#4f46e5'; // Indigo-600
        ctx.fillText(member.name.toUpperCase(), canvas.width / 2, 85);

        // 4. Draw QR Code
        ctx.drawImage(img, padding, topPadding);

        // 5. Draw ID at bottom
        ctx.fillStyle = '#94a3b8'; // Slate-400
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`ID: ${member.id}`, canvas.width / 2, canvas.height - 25);

        // 6. Download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `QR_${member.name.replace(/\s+/g, '_')}_${member.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    } catch (err) {
      console.error("Failed to download QR code", err);
    }
  };

  const memberStatsData = useMemo(() => {
    if (!showStatsModal) return [];
    const currentYear = new Date().getFullYear().toString();
    const memberAttendance = attendance.filter(r => r.memberId === showStatsModal.id && r.date.startsWith(currentYear));
    
    const monthlyCounts = new Array(12).fill(0);
    memberAttendance.forEach(record => {
      const monthIndex = new Date(record.date).getMonth();
      monthlyCounts[monthIndex]++;
    });

    return MONTHS.map((name, index) => ({
      name,
      count: monthlyCounts[index]
    }));
  }, [showStatsModal, attendance]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const categoryMatch = filterCategory === 'All' || m.category === filterCategory;
      const groupMatch = filterGroup === 'All' || m.serviceGroup === filterGroup;
      return categoryMatch && groupMatch;
    });
  }, [members, filterCategory, filterGroup]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Church Members ({filteredMembers.length})</h2>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm text-slate-700 shadow-sm"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat: MemberCategory) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select 
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value as any)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm text-slate-700 shadow-sm"
          >
            <option value="All">All Groups</option>
            {SERVICE_GROUPS.map((group: ServiceGroup) => <option key={group} value={group}>{group}</option>)}
          </select>
          <button 
            type="button"
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 text-white px-5 py-2 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200 font-bold"
          >
            <i className="fas fa-plus"></i> Add New Member
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service Group</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No members found matching the filters.
                  </td>
                </tr>
              ) : filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{member.name}</div>
                    <div className="font-mono text-[10px] text-indigo-500 font-bold uppercase">{member.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                      {member.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                      {member.serviceGroup}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2"><i className="fas fa-phone text-[10px]"></i> {member.phone}</div>
                    <div className="flex items-center gap-2"><i className="fas fa-envelope text-[10px]"></i> {member.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1">
                      <button 
                        type="button"
                        onClick={() => setShowStatsModal(member)}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition"
                        title="View Attendance Chart"
                      >
                        <i className="fas fa-chart-bar"></i>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowQRModal(member)}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition"
                        title="View & Download QR"
                      >
                        <i className="fas fa-qrcode"></i>
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleOpenModal(member)}
                        className={`p-2 rounded-lg transition ${userRole === 'superadmin' ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600' : 'text-slate-200 cursor-not-allowed'}`}
                        title={userRole === 'superadmin' ? "Edit Profile" : "Edit restricted to Superadmin"}
                        disabled={userRole !== 'superadmin'}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleDeleteMember(e, member.id)}
                        className={`p-2 rounded-lg transition ${userRole === 'superadmin' ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-red-100 cursor-not-allowed'}`}
                        title={userRole === 'superadmin' ? "Delete Member" : "Delete restricted to Superadmin"}
                        disabled={userRole !== 'superadmin'}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{showStatsModal.name}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                  <i className="fas fa-calendar-alt mr-2 text-indigo-500"></i> Annual Attendance • {new Date().getFullYear()}
                </p>
              </div>
              <button 
                onClick={() => setShowStatsModal(null)}
                className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200 transition"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="h-[300px] w-full mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberStatsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} dy={10} fontStyle="bold" />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={25}>
                    {memberStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#6366f1' : '#f1f5f9'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total check-ins</p>
                <p className="text-2xl font-black text-slate-800">{memberStatsData.reduce((acc, curr) => acc + curr.count, 0)}</p>
              </div>
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 text-center">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Most Active Month</p>
                <p className="text-2xl font-black text-indigo-700">
                  {memberStatsData.reduce((prev, current) => (prev.count > current.count) ? prev : current).name}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">{editingMember ? 'Edit Profile' : 'New Member Registration'}</h3>
            <form onSubmit={handleSaveMember} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    placeholder="Enter full name"
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as MemberCategory})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                  >
                    {CATEGORIES.map((cat: MemberCategory) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Service Group</label>
                  <select
                    value={formData.serviceGroup}
                    onChange={e => setFormData({...formData, serviceGroup: e.target.value as ServiceGroup})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                  >
                    {SERVICE_GROUPS.map((group: ServiceGroup) => <option key={group} value={group}>{group}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    placeholder="080 0000 0000"
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    placeholder="member@example.com"
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition"
                >
                  {editingMember ? 'Update Member' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <h3 className="text-2xl font-black text-slate-900 mb-2">{showQRModal.name}</h3>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-8">{showQRModal.id}</p>
            
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 inline-block shadow-inner">
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${showQRModal.id}`} 
                 alt="Member QR" 
                 className="w-48 h-48 mix-blend-multiply"
               />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => downloadQRCode(showQRModal)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition shadow-xl shadow-slate-200"
              >
                <i className="fas fa-download"></i> Download Image
              </button>
              <button
                type="button"
                onClick={() => setShowQRModal(null)}
                className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement;
