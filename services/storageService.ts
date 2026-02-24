
import { Member, AttendanceRecord, AdminUser } from '../types';
import { supabase } from './supabaseClient';

const MEMBERS_KEY = 'church_members';
const ATTENDANCE_KEY = 'church_attendance';
const ADMIN_KEY = 'church_admin_creds';
const SCANNER_KEY = 'church_scanner_creds';
const USERS_KEY = 'church_users_list';
const SESSION_KEY = 'church_admin_session';
const ROLE_KEY = 'church_user_role';

export const storageService = {
  // Authentication
  fetchUsers: async (): Promise<AdminUser[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(data));
    return data as AdminUser[];
  },

  getAdminCreds: (): AdminUser => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const admin = users.find((u: any) => u.role === 'admin');
    if (admin) return admin;

    const data = localStorage.getItem(ADMIN_KEY);
    if (!data) {
      const defaultAdmin: AdminUser = { username: 'admin', password: 'admin', role: 'admin' };
      localStorage.setItem(ADMIN_KEY, JSON.stringify(defaultAdmin));
      return defaultAdmin;
    }
    try {
      const creds = JSON.parse(data);
      creds.username = 'admin';
      creds.role = 'admin';
      return creds;
    } catch (e) {
      const defaultAdmin: AdminUser = { username: 'admin', password: 'admin', role: 'admin' };
      localStorage.setItem(ADMIN_KEY, JSON.stringify(defaultAdmin));
      return defaultAdmin;
    }
  },

  getScannerCreds: (): AdminUser => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const scanner = users.find((u: any) => u.role === 'scanner');
    if (scanner) return scanner;

    const data = localStorage.getItem(SCANNER_KEY);
    if (!data) {
      const defaultScanner: AdminUser = { username: 'scanner', password: 'scanner', role: 'scanner' };
      localStorage.setItem(SCANNER_KEY, JSON.stringify(defaultScanner));
      return defaultScanner;
    }
    try {
      const creds = JSON.parse(data);
      creds.username = 'scanner';
      creds.role = 'scanner';
      return creds;
    } catch (e) {
      const defaultScanner: AdminUser = { username: 'scanner', password: 'scanner', role: 'scanner' };
      localStorage.setItem(SCANNER_KEY, JSON.stringify(defaultScanner));
      return defaultScanner;
    }
  },

  updateAdminPassword: async (newPassword: string) => {
    const creds = storageService.getAdminCreds();
    creds.password = newPassword;
    localStorage.setItem(ADMIN_KEY, JSON.stringify(creds));
    
    const { error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('role', 'admin');
    
    if (error) console.error('Error updating admin password in Supabase:', error);
    await storageService.fetchUsers();
  },

  updateScannerPassword: async (newPassword: string) => {
    const creds = storageService.getScannerCreds();
    creds.password = newPassword;
    localStorage.setItem(SCANNER_KEY, JSON.stringify(creds));

    const { error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('role', 'scanner');
    
    if (error) console.error('Error updating scanner password in Supabase:', error);
    await storageService.fetchUsers();
  },

  setSession: (isAuthenticated: boolean, role?: 'admin' | 'scanner') => {
    if (isAuthenticated && role) {
      localStorage.setItem(SESSION_KEY, 'true');
      localStorage.setItem(ROLE_KEY, role);
    } else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ROLE_KEY);
    }
  },

  isAuthenticated: (): boolean => {
    return localStorage.getItem(SESSION_KEY) === 'true';
  },

  getUserRole: (): 'admin' | 'scanner' | null => {
    return localStorage.getItem(ROLE_KEY) as 'admin' | 'scanner' | null;
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
    if (error) {
      console.error('CRITICAL: Failed to save member to Supabase.', error);
      alert(`Database Error: ${error.message}. Please check if the 'members' table has 'serviceGroup' and 'joinedDate' columns.`);
    }
  },

  updateMember: async (member: Member) => {
    const members = storageService.getMembers();
    const updated = members.map(m => m.id === member.id ? member : m);
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(updated));

    const { error } = await supabase.from('members').update(member).eq('id', member.id);
    if (error) {
      console.error('CRITICAL: Failed to update member in Supabase.', error);
      alert(`Database Error: ${error.message}`);
    }
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
    // Use local date string YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    
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
