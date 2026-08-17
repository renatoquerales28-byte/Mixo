export type UserRole = 'admin' | 'chef';

export interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  cargo?: string;
  avatarUrl?: string;
  debeCambiarPassword?: boolean;
  fechaCreacion?: string;
}

export interface UserAccountRecord extends UserProfile {
  password: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateInitialPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  createUserAccount: (data: {
    nombre: string;
    email: string;
    rol: UserRole;
    cargo?: string;
    tempPassword: string;
  }) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string, newTempPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteUserAccount: (userId: string) => Promise<{ success: boolean; error?: string }>;
  getUsersList: () => UserProfile[];
}

