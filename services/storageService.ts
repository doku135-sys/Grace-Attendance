import { Member, AttendanceRecord, AdminUser, UserRole } from '../types';
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
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.warn('Note: Using local fallback. Fetching users from Supabase returned:', error.message);
        return storageService.getLocalUsersFallback();
      }
      localStorage.setItem(USERS_KEY, JSON.stringify(data));
      return data as AdminUser[];
    } catch (e: any) {
      console.warn('Note: Offline/local fallback active. Fetching users exception:', e?.message || e);
      return storageService.getLocalUsersFallback();
    }
  },

  getLocalUsersFallback: (): AdminUser[] => {
    const local = localStorage.getItem(USERS_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        // ignore JSON parse error and return defaults below
      }
    }
    const defaults = [
      { username: 'admin', password: 'admin', role: 'admin' },
      { username: 'scanner', password: 'scanner', role: 'scanner' },
      { username: 'superadmin', password: 'superadmin', role: 'superadmin' }
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
    return defaults as AdminUser[];
  },

  getAdminCreds: (): AdminUser => {
    const users = storageService.getLocalUsersFallback();
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
    const users = storageService.getLocalUsersFallback();
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
    
    // Update local users fallback list too
    const users = storageService.getLocalUsersFallback();
    const updatedUsers = users.map((u: any) => u.role === 'admin' ? { ...u, password: newPassword } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('role', 'admin');
      
      if (error) console.warn('Supabase password update failed (will use local fallback):', error.message);
    } catch (e: any) {
      console.warn('Supabase password update exception (will use local fallback):', e?.message || e);
    }
    await storageService.fetchUsers();
  },

  updateScannerPassword: async (newPassword: string) => {
    const creds = storageService.getScannerCreds();
    creds.password = newPassword;
    localStorage.setItem(SCANNER_KEY, JSON.stringify(creds));

    // Update local users fallback list too
    const users = storageService.getLocalUsersFallback();
    const updatedUsers = users.map((u: any) => u.role === 'scanner' ? { ...u, password: newPassword } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));

    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('role', 'scanner');
      
      if (error) console.warn('Supabase scanner password update failed:', error.message);
    } catch (e: any) {
      console.warn('Supabase scanner password update exception:', e?.message || e);
    }
    await storageService.fetchUsers();
  },

  getSuperAdminCreds: (): AdminUser => {
    const users = storageService.getLocalUsersFallback();
    const superadmin = users.find((u: any) => u.role === 'superadmin');
    if (superadmin) return superadmin;
    return { username: 'superadmin', password: 'superadmin', role: 'superadmin' };
  },

  updateSuperAdminPassword: async (newPassword: string) => {
    // Update local users fallback list too
    const users = storageService.getLocalUsersFallback();
    const updatedUsers = users.map((u: any) => u.role === 'superadmin' ? { ...u, password: newPassword } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));

    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('role', 'superadmin');
      
      if (error) console.warn('Supabase superadmin password update failed:', error.message);
    } catch (e: any) {
      console.warn('Supabase superadmin password update exception:', e?.message || e);
    }
    await storageService.fetchUsers();
  },

  setSession: (isAuthenticated: boolean, role?: UserRole) => {
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

  getUserRole: (): UserRole | null => {
    return localStorage.getItem(ROLE_KEY) as UserRole | null;
  },

  // Members
  getMembers: (): Member[] => {
    const data = localStorage.getItem(MEMBERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  fetchMembers: async (): Promise<Member[]> => {
    try {
      const { data, error } = await supabase.from('members').select('*');
      if (error) {
        console.warn('Note: Using local fallback. Fetching members from Supabase returned:', error.message);
        return storageService.getMembers();
      }
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(data));
      return data as Member[];
    } catch (e: any) {
      console.warn('Note: Offline/local fallback active. Fetching members exception:', e?.message || e);
      return storageService.getMembers();
    }
  },

  saveMember: async (member: Member) => {
    const members = storageService.getMembers();
    const updated = [...members, member];
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(updated));
    
    try {
      const { error } = await supabase.from('members').insert([member]);
      if (error) {
        console.warn('Supabase save member returned status:', error.message);
      }
    } catch (e: any) {
      console.warn('Supabase save member exception:', e?.message || e);
    }
  },

  updateMember: async (member: Member) => {
    const members = storageService.getMembers();
    const updated = members.map(m => m.id === member.id ? member : m);
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(updated));

    try {
      const { error } = await supabase.from('members').update(member).eq('id', member.id);
      if (error) {
        console.warn('Supabase update member returned status:', error.message);
      }
    } catch (e: any) {
      console.warn('Supabase update member exception:', e?.message || e);
    }
  },

  deleteMember: async (id: string): Promise<Member[]> => {
    const members = storageService.getMembers();
    const updatedMembers = members.filter(m => m.id !== id);
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(updatedMembers));
    
    const attendance = storageService.getAttendance();
    const updatedAttendance = attendance.filter(r => r.memberId !== id);
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedAttendance));

    try {
      await supabase.from('attendance').delete().eq('memberId', id);
      await supabase.from('members').delete().eq('id', id);
    } catch (e: any) {
      console.warn('Supabase delete member exception:', e?.message || e);
    }
    
    return updatedMembers;
  },

  // Attendance
  getAttendance: (): AttendanceRecord[] => {
    const data = localStorage.getItem(ATTENDANCE_KEY);
    return data ? JSON.parse(data) : [];
  },

  fetchAttendance: async (): Promise<AttendanceRecord[]> => {
    try {
      const { data, error } = await supabase.from('attendance').select('*');
      if (error) {
        console.warn('Note: Using local fallback. Fetching attendance from Supabase returned:', error.message);
        return storageService.getAttendance();
      }
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data));
      return data as AttendanceRecord[];
    } catch (e: any) {
      console.warn('Note: Offline/local fallback active. Fetching attendance exception:', e?.message || e);
      return storageService.getAttendance();
    }
  },

  recordAttendance: async (memberId: string) => {
    const now = new Date();
    // Use local date string YYYY-MM-DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    
    // Fetch latest attendance to ensure we don't have stale local data
    let records: AttendanceRecord[] = [];
    try {
      records = await storageService.fetchAttendance();
    } catch (e: any) {
      console.warn('Exception fetching attendance during record (will proceed with local cache):', e?.message || e);
      records = storageService.getAttendance();
    }
    
    const alreadyPresent = records.some(r => r.memberId === memberId && r.date === date);
    if (alreadyPresent) return false;

    const newRecord: AttendanceRecord = {
      memberId,
      date,
      timestamp: now.toISOString(),
    };
    
    // Update local storage immediately for UI responsiveness
    const updatedRecords = [...records, newRecord];
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedRecords));
    
    try {
      const { error } = await supabase.from('attendance').insert([newRecord]);
      if (error) {
        console.warn('Supabase record attendance returned status:', error.message);
      }
    } catch (e: any) {
      console.warn('Supabase record attendance exception:', e?.message || e);
    }
    
    return true;
  },

  recordManualAttendance: async (memberId: string, date: string) => {
    // Fetch latest attendance to ensure we don't have stale local data
    let records: AttendanceRecord[] = [];
    try {
      records = await storageService.fetchAttendance();
    } catch (e: any) {
      console.warn('Exception fetching attendance during manual record (will proceed with local cache):', e?.message || e);
      records = storageService.getAttendance();
    }
    
    const alreadyPresent = records.some(r => r.memberId === memberId && r.date === date);
    if (alreadyPresent) return false;

    // For manual entry, we'll use the selected date at noon local time for the timestamp
    // to avoid timezone issues while still having a valid ISO string
    const timestamp = new Date(`${date}T12:00:00`).toISOString();

    const newRecord: AttendanceRecord = {
      memberId,
      date,
      timestamp,
    };
    
    // Update local storage immediately for UI responsiveness
    const updatedRecords = [...records, newRecord];
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedRecords));
    
    try {
      const { error } = await supabase.from('attendance').insert([newRecord]);
      if (error) {
        console.warn('Supabase record manual attendance returned status:', error.message);
      }
    } catch (e: any) {
      console.warn('Supabase record manual attendance exception:', e?.message || e);
    }
    
    return true;
  },

  deleteAttendanceRecord: async (memberId: string, timestamp: string): Promise<AttendanceRecord[]> => {
    const records = storageService.getAttendance();
    const updatedRecords = records.filter(r => !(r.memberId === memberId && r.timestamp === timestamp));
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedRecords));

    try {
      const { error } = await supabase.from('attendance').delete().match({ memberId, timestamp });
      if (error) console.warn('Supabase delete attendance record returned status:', error.message);
    } catch (e: any) {
      console.warn('Supabase delete attendance record exception:', e?.message || e);
    }

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
      try {
        await supabase.from('members').upsert(data.members);
      } catch (e: any) {
        console.warn('Supabase upsert members exception during import:', e?.message || e);
      }
    }
    if (data.attendance) {
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data.attendance));
      try {
        await supabase.from('attendance').upsert(data.attendance);
      } catch (e: any) {
        console.warn('Supabase upsert attendance exception during import:', e?.message || e);
      }
    }
  },

  clearAllData: async () => {
    localStorage.removeItem(MEMBERS_KEY);
    localStorage.removeItem(ATTENDANCE_KEY);
    // We don't clear Supabase by default for safety, but we could
  }
};
