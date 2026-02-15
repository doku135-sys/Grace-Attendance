
import { Member, AttendanceRecord, AdminUser } from '../types';

const MEMBERS_KEY = 'church_members';
const ATTENDANCE_KEY = 'church_attendance';
const ADMIN_KEY = 'church_admin_creds';
const SESSION_KEY = 'church_admin_session';
const SYNC_KEY = 'church_sync_id';

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

  saveMember: (member: Member) => {
    const members = storageService.getMembers();
    localStorage.setItem(MEMBERS_KEY, JSON.stringify([...members, member]));
  },

  updateMembers: (members: Member[]) => {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  },

  deleteMember: (id: string): Member[] => {
    const members = storageService.getMembers();
    const updatedMembers = members.filter(m => m.id !== id);
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(updatedMembers));
    
    const attendance = storageService.getAttendance();
    const updatedAttendance = attendance.filter(r => r.memberId !== id);
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updatedAttendance));
    
    return updatedMembers;
  },

  getAttendance: (): AttendanceRecord[] => {
    const data = localStorage.getItem(ATTENDANCE_KEY);
    return data ? JSON.parse(data) : [];
  },

  recordAttendance: (memberId: string) => {
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
    return true;
  },

  // Sync Helpers
  getSyncId: () => localStorage.getItem(SYNC_KEY) || '',
  setSyncId: (id: string) => localStorage.setItem(SYNC_KEY, id),
  
  exportFullState: () => {
    return {
      members: storageService.getMembers(),
      attendance: storageService.getAttendance()
    };
  },

  importFullState: (data: { members: Member[], attendance: AttendanceRecord[] }) => {
    if (data.members) localStorage.setItem(MEMBERS_KEY, JSON.stringify(data.members));
    if (data.attendance) localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data.attendance));
  },

  clearAllData: () => {
    localStorage.removeItem(MEMBERS_KEY);
    localStorage.removeItem(ATTENDANCE_KEY);
  }
};
