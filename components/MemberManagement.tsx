
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { Member, MemberCategory } from '../types';

const CATEGORIES: MemberCategory[] = [
  'Praise and Worship',
  'Multimedia',
  'Service Management',
  'Usher'
];

const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<Member[]>(storageService.getMembers());
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthday: '',
    category: 'Praise and Worship' as MemberCategory,
  });

  const handleOpenModal = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        phone: member.phone,
        email: member.email,
        birthday: member.birthday || '',
        category: member.category,
      });
    } else {
      setEditingMember(null);
      setFormData({ name: '', phone: '', email: '', birthday: '', category: 'Praise and Worship' });
    }
    setShowModal(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    const currentMembers = storageService.getMembers();
    
    if (editingMember) {
      const updated = currentMembers.map(m => 
        m.id === editingMember.id ? { ...m, ...formData } : m
      );
      storageService.updateMembers(updated);
      setMembers([...updated]);
    } else {
      const newMember: Member = {
        id: `CH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        ...formData,
        joinedDate: new Date().toISOString().split('T')[0],
      };
      storageService.saveMember(newMember);
      setMembers([...currentMembers, newMember]);
    }
    
    setShowModal(false);
  };

  const handleDeleteMember = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this member? This will also remove their attendance history.')) {
      const updatedMembers = storageService.deleteMember(id);
      // Explicitly spread into a new array to force React to detect the state change
      setMembers([...updatedMembers]);
    }
  };

  const downloadQRCode = async (member: Member) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${member.id}`;
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${member.name.replace(/\s+/g, '_')}_${member.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Church Members ({members.length})</h2>
        <button 
          type="button"
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200 font-bold"
        >
          <i className="fas fa-plus"></i> Add New Member
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Birthday</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No members registered yet.
                  </td>
                </tr>
              ) : members.map((member) => (
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
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {member.birthday ? new Date(member.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2"><i className="fas fa-phone text-[10px]"></i> {member.phone}</div>
                    <div className="flex items-center gap-2"><i className="fas fa-envelope text-[10px]"></i> {member.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1.5">
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
                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleDeleteMember(e, member.id)}
                        className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                        title="Delete Member"
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
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Birthday</label>
                  <input
                    type="date"
                    value={formData.birthday}
                    onChange={e => setFormData({...formData, birthday: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                  <input
                    required
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
                    required
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
