import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import type { UserProfile, UserRole, UserAccountRecord, AuthContextType } from '../types/auth';

const STORAGE_SESSION_KEY = 'mixo_auth_user';
const STORAGE_TEAM_KEY = 'mixo_team_users';

const DEFAULT_USERS: UserAccountRecord[] = [
  {
    id: 'usr_admin_001',
    email: 'admin@mixo.app',
    password: 'admin123',
    nombre: 'Carlos Méndez',
    rol: 'admin',
    cargo: 'Gerente General',
    debeCambiarPassword: false,
    fechaCreacion: new Date().toISOString()
  },
  {
    id: 'usr_chef_001',
    email: 'chef@mixo.app',
    password: 'chef123',
    nombre: 'Renato Querales',
    rol: 'chef',
    cargo: 'Chef Ejecutivo',
    debeCambiarPassword: false,
    fechaCreacion: new Date().toISOString()
  }
];

const getStoredTeam = (): UserAccountRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_TEAM_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_TEAM_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_USERS;
  }
};

const saveStoredTeam = (team: UserAccountRecord[]) => {
  localStorage.setItem(STORAGE_TEAM_KEY, JSON.stringify(team));
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  updateInitialPassword: async () => ({ success: false }),
  createUserAccount: async () => ({ success: false }),
  resetUserPassword: async () => ({ success: false }),
  deleteUserAccount: async () => ({ success: false }),
  getUsersList: () => []
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [teamList, setTeamList] = useState<UserAccountRecord[]>(getStoredTeam);

  // Sincronizar equipo en arranque
  useEffect(() => {
    const team = getStoredTeam();
    setTeamList(team);
  }, []);

  // Inicializar sesión
  useEffect(() => {
    const initAuth = async () => {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile: UserProfile = {
              id: session.user.id,
              email: session.user.email || '',
              nombre: session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || 'Usuario',
              rol: (session.user.user_metadata?.rol as UserRole) || 'admin',
              cargo: session.user.user_metadata?.cargo || 'Miembro del Equipo',
              debeCambiarPassword: Boolean(session.user.user_metadata?.debe_cambiar_password)
            };
            setUser(profile);
          }
        } catch (err) {
          console.warn('Error recuperando sesión de Supabase:', err);
        }
      } else {
        // Modo local / offline
        const saved = localStorage.getItem(STORAGE_SESSION_KEY);
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (e) {
            localStorage.removeItem(STORAGE_SESSION_KEY);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nombre: session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || 'Usuario',
            rol: (session.user.user_metadata?.rol as UserRole) || 'admin',
            cargo: session.user.user_metadata?.cargo || 'Miembro del Equipo',
            debeCambiarPassword: Boolean(session.user.user_metadata?.debe_cambiar_password)
          });
        } else {
          setUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Verificar contra el registro de usuarios autorizados
    const currentTeam = getStoredTeam();
    const account = currentTeam.find(u => u.email.toLowerCase() === cleanEmail);

    if (account && account.password === password) {
      const profile: UserProfile = {
        id: account.id,
        email: account.email,
        nombre: account.nombre,
        rol: account.rol,
        cargo: account.cargo,
        debeCambiarPassword: Boolean(account.debeCambiarPassword),
        fechaCreacion: account.fechaCreacion
      };
      setUser(profile);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(profile));
      setIsLoading(false);
      return { success: true };
    }

    // 2. Autenticación con Supabase Auth si está configurado
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (!error && data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || '',
            nombre: data.user.user_metadata?.nombre || data.user.email?.split('@')[0] || 'Usuario',
            rol: (data.user.user_metadata?.rol as UserRole) || 'admin',
            cargo: data.user.user_metadata?.cargo || 'Miembro del Equipo',
            debeCambiarPassword: Boolean(data.user.user_metadata?.debe_cambiar_password)
          };
          setUser(profile);
          localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(profile));
          setIsLoading(false);
          return { success: true };
        }

        if (error) {
          setIsLoading(false);
          return { success: false, error: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
        }
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message || 'Error al conectar con el servidor de autenticación' };
      }
    }

    setIsLoading(false);
    return { success: false, error: 'Correo o contraseña incorrectos. Solo usuarios autorizados pueden acceder.' };
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(STORAGE_SESSION_KEY);
  }, []);

  // Actualizar contraseña obligatoria / inicial
  const updateInitialPassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'No hay sesión activa' };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
    }

    setIsLoading(true);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
          data: { debe_cambiar_password: false }
        });
        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message };
      }
    }

    // Actualizar registro local
    const currentTeam = getStoredTeam();
    const index = currentTeam.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (index >= 0) {
      currentTeam[index].password = newPassword;
      currentTeam[index].debeCambiarPassword = false;
      saveStoredTeam(currentTeam);
      setTeamList([...currentTeam]);
    }

    const updatedProfile: UserProfile = {
      ...user,
      debeCambiarPassword: false
    };
    setUser(updatedProfile);
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updatedProfile));
    setIsLoading(false);
    return { success: true };
  }, [user]);

  // Crear usuario con contraseña temporal (Admin)
  const createUserAccount = useCallback(async (data: {
    nombre: string;
    email: string;
    rol: UserRole;
    cargo?: string;
    tempPassword: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const currentTeam = getStoredTeam();

    if (currentTeam.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Ya existe un usuario con este correo electrónico.' };
    }

    if (!data.tempPassword || data.tempPassword.length < 4) {
      return { success: false, error: 'La contraseña temporal debe tener al menos 4 caracteres.' };
    }

    const newUser: UserAccountRecord = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      email: cleanEmail,
      nombre: data.nombre.trim(),
      rol: data.rol,
      cargo: data.cargo?.trim() || (data.rol === 'admin' ? 'Administrador' : 'Chef de Cocina'),
      password: data.tempPassword,
      debeCambiarPassword: true,
      fechaCreacion: new Date().toISOString()
    };

    const updated = [newUser, ...currentTeam];
    saveStoredTeam(updated);
    setTeamList(updated);

    return { success: true };
  }, []);

  // Restablecer contraseña temporal a un usuario
  const resetUserPassword = useCallback(async (userId: string, newTempPassword: string): Promise<{ success: boolean; error?: string }> => {
    const currentTeam = getStoredTeam();
    const index = currentTeam.findIndex(u => u.id === userId);
    if (index < 0) return { success: false, error: 'Usuario no encontrado.' };

    currentTeam[index].password = newTempPassword;
    currentTeam[index].debeCambiarPassword = true;
    saveStoredTeam(currentTeam);
    setTeamList([...currentTeam]);

    return { success: true };
  }, []);

  // Eliminar usuario
  const deleteUserAccount = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const currentTeam = getStoredTeam();
    const filtered = currentTeam.filter(u => u.id !== userId);
    saveStoredTeam(filtered);
    setTeamList(filtered);
    return { success: true };
  }, []);

  // Obtener lista de usuarios para el panel
  const getUsersList = useCallback((): UserProfile[] => {
    return teamList.map(u => ({
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      cargo: u.cargo,
      debeCambiarPassword: u.debeCambiarPassword,
      fechaCreacion: u.fechaCreacion
    }));
  }, [teamList]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
        updateInitialPassword,
        createUserAccount,
        resetUserPassword,
        deleteUserAccount,
        getUsersList
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
