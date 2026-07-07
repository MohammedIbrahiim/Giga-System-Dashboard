import { UserRole } from './user.model';

export interface ProfileResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  profileImageBase64?: string | null;
}

export interface ProfileUpdateRequest {
  name: string;
  email: string;
  profileImageBase64?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
