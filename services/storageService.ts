
import { Member, AttendanceRecord, AdminUser } from '../types';
import { supabase } from './supabaseClient';

const MEMBERS_KEY = 'church_members';
const ATTENDANCE_KEY = 'church_attendance';
const ADMIN_KEY = 'church_admin_creds';
const SESSION_KEY = 'church_admin_session';

export const storageService = {
  // Authentication
  getAdminCreds: (): AdminUser => {
    const data = localStorage.getItem(ADMIN_KEY);
    if (!data) {
      const defaultAdmin = { username: 'admin', password: 'admin' };
      localStorage.setItem(ADMIN_KEY, JSON.stringify(defaultAdmin));
      return defaultAdmin;
    }
    try {
      const creds = JSON.parse(data);
      creds.username = 'admin';
      return creds;
    } catch (e) {
      const defaultAdmin = { username: 'admin', password: 'admin' };
      localStorage.setItem(ADMIN_KEY, JSON.stringify(defaultAdmin));
      return defaultAdmin;
    }
  },

  updateAdminPassword: (newPassword: string) => {
    const creds = storageService.getAdminCreds();
    creds.password = newPassword;
    localStorage.setItem(ADMIN_KEY, JSON.stringify(creds));
  },

  setSession: (isAuthenticated: boolean) => {
    if (isAuthenticated) {
      localStorage.setItem(SESSION_KEY, 'true');
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  isAuthenticated: (): boolean => {
    return localStorage.getItem(SESSION_KEY) === 'true';
  },

  // Members
  getMembers: (): Member[] => {
    const data = localStorage.getItem(MEMBERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  fetchMembers: async (): Promise<Member[]> => {
    const { data, error } = await supabase.from('members').select('*');
    if (error) {
      console.error('Error fetching members:', error);
      return storageService.getMembers();
    }
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(data));
    return data as Member[];
  },

  saveMember: async (member: Member) => {
    const members = storageService.getMembers();
    const updated = [...members, member];
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(updated));
    
    const { error } = await supabase.from('members').insert([member]);
    if (error) console.error('Error saving member to Supabase:', error);
  },

  updateMember: async (member: Member) => {
    const members = storageService.getMembers();
    const updated = members.map(m => m.id === member.id ? member : m);
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(updated));

    const { error } = await supabase.from('members').update(member).eq('id', member.id);
    if (error) console.error('Error updating member in Supabase:', error);
  },

  deleteMember: async (id: string): Promise<Member[]> => {
    const members = storageService.getMembers();
    const updatedMembers = members.filter(m => m.id !== id);
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(updatedMembers));
    
    const attendance = storageService.getAttendance();
    const updatedAttendance = attendance.filter(r => r.memberId !== id);
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedAttendance));

    // Supabase deletions
    await supabase.from('attendance').delete().eq('memberId', id);
    await supabase.from('members').delete().eq('id', id);
    
    return updatedMembers;
  },

  // Attendance
  getAttendance: (): AttendanceRecord[] => {
    const data = localStorage.getItem(ATTENDANCE_KEY);
    return data ? JSON.parse(data) : [];
  },

  fetchAttendance: async (): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase.from('attendance').select('*');
    if (error) {
      console.error('Error fetching attendance:', error);
      return storageService.getAttendance();
    }
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data));
    return data as AttendanceRecord[];
  },

  recordAttendance: async (memberId: string) => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const records = storageService.getAttendance();
    
    const alreadyPresent = records.some(r => r.memberId === memberId && r.date === date);
    if (alreadyPresent) return false;

    const newRecord: AttendanceRecord = {
      memberId,
      date,
      timestamp: now.toISOString(),
    };
    
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify([...records, newRecord]));
    
    const { error } = await supabase.from('attendance').insert([newRecord]);
    if (error) console.error('Error recording attendance to Supabase:', error);
    
    return true;
  },

  deleteAttendanceRecord: async (memberId: string, timestamp: string): Promise<AttendanceRecord[]> => {
    const records = storageService.getAttendance();
    const updatedRecords = records.filter(r => !(r.memberId === memberId && r.timestamp === timestamp));
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedRecords));

    const { error } = await supabase.from('attendance').delete().match({ memberId, timestamp });
    if (error) console.error('Error deleting attendance from Supabase:', error);

    return updatedRecords;
  },

  // Sync Helpers
  exportFullState: () => {
    return {
      members: storageService.getMembers(),
      attendance: storageService.getAttendance()
    };
  },

  importFullState: async (data: { members: Member[], attendance: AttendanceRecord[] }) => {
    if (data.members) {
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(data.members));
      await supabase.from('members').upsert(data.members);
    }
    if (data.attendance) {
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data.attendance));
      await supabase.from('attendance').upsert(data.attendance);
    }
  },

  clearAllData: async () => {
    localStorage.removeItem(MEMBERS_KEY);
    localStorage.removeItem(ATTENDANCE_KEY);
    // We don't clear Supabase by default for safety, but we could
  }
};
