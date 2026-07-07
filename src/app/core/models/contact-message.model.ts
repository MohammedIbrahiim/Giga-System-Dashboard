export type ContactMessageStatus = 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';

export interface ContactMessage {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ContactMessageStats {
  total: number;
  newCount: number;
  read: number;
  replied: number;
  archived: number;
}

export interface ContactMessageQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  status?: string;
}

export const CONTACT_STATUS_OPTIONS: { value: ContactMessageStatus; label: string }[] = [
  { value: 'NEW',      label: 'New' },
  { value: 'READ',     label: 'Read' },
  { value: 'REPLIED',  label: 'Replied' },
  { value: 'ARCHIVED', label: 'Archived' },
];
