export const EMPLOYMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'FULL_TIME',  label: 'Full-time' },
  { value: 'PART_TIME',  label: 'Part-time' },
  { value: 'CONTRACT',   label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'REMOTE',  label: 'Remote' },
];

export interface CareerJob {
  id: number;
  title: string;
  slug: string;
  aboutRole: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  location: string;
  employmentType: string;
  active: boolean;
  published: boolean;
  applicationDeadline?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCareerJobRequest {
  title: string;
  aboutRole: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  location: string;
  employmentType: string;
  applicationDeadline?: string | null;
  active: boolean;
  published: boolean;
}

export interface CareerQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
}

export interface CareerDialogData {
  mode: 'add' | 'edit';
  career?: CareerJob;
}

// ─── Applications ───────────────────────────────────────────────────────────

export type ApplicationStatus =
  | 'PENDING'
  | 'REVIEWED'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'REJECTED'
  | 'HIRED';

export const APPLICATION_STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'PENDING',     label: 'Pending' },
  { value: 'REVIEWED',    label: 'Reviewed' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'INTERVIEW',   label: 'Interview' },
  { value: 'REJECTED',    label: 'Rejected' },
  { value: 'HIRED',       label: 'Hired' },
];

export interface JobApplication {
  id: number;
  careerId: number;
  careerTitle: string;
  fullName: string;
  email: string;
  phone: string;
  currentJobTitle?: string | null;
  currentCompany?: string | null;
  location?: string | null;
  yearsOfExperience?: number | null;
  coverLetter?: string | null;
  cvFileName?: string | null;
  status: ApplicationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicationQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  status?: string;
  careerId?: number;
}
