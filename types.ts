
export type MemberCategory = 'Praise and Worship' | 'Multimedia' | 'Service Management' | 'Usher';

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  category: MemberCategory;
  birthday: string;
  joinedDate: string;
}

export interface AttendanceRecord {
  memberId: string;
  date: string; // ISO format (YYYY-MM-DD)
  timestamp: string;
}

export interface AttendanceStats {
  date: string;
  count: number;
}

export interface AIInsight {
  summary: string;
  atRiskMembers: string[];
  growthTrend: string;
}

export interface AdminUser {
  username: string;
  password: string;
  lastLogin?: string;
}
