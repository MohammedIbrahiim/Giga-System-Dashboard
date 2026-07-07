export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';

export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  profileImageBase64?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  admin: boolean;
}

export interface UpdateUserRequest {
  name: string;
  email: string;
  admin: boolean;
  profileImageBase64?: string | null;
}

export interface UpdateUserRoleRequest {
  admin: boolean;
}

export interface UserDialogData {
  mode: 'add' | 'edit';
  user?: AppUser;
}
