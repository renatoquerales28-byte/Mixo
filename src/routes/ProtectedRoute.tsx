import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && requireAdmin && user?.rol !== 'admin') {
      showToast('Acceso restringido a Administradores.', 'warning');
    }
  }, [isLoading, isAuthenticated, requireAdmin, user, showToast]);

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner" />
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Verificando sesión...
        </span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/iniciar-sesion" state={{ from: location }} replace />;
  }

  if (user.debeCambiarPassword && location.pathname !== '/cambiar-clave') {
    return <Navigate to="/cambiar-clave" replace />;
  }

  if (requireAdmin && user.rol !== 'admin') {
    return <Navigate to="/resumen" replace />;
  }

  return <>{children}</>;
};
