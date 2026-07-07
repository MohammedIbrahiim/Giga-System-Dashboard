import { UserRole } from './user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  profileImageBase64?: string | null;
  token: string;
}

export type CurrentUser = LoginResponse;
