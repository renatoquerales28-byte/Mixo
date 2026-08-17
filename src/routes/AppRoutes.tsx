import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import type { ConfiguracionCostos } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { AppShell } from '../components/layout/AppShell';
import { LoginView } from '../components/auth/LoginView';
import { ChangePasswordView } from '../components/auth/ChangePasswordView';
import { LandingView } from '../components/home/LandingView';
import { ChefConsole } from '../components/ChefConsole';
import { AdminConsole } from '../components/AdminConsole';

export const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('mixo_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [config, setConfig] = useState<ConfiguracionCostos | null>(null);
  const [loadError, setLoadError] = useState(false);

  const fetchConfig = async () => {
    const current = await db.getConfiguracion();
    setConfig(current);
  };

  useEffect(() => {
    fetchConfig();
    const timeout = setTimeout(() => setLoadError(true), 8000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mixo_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const handleUpdateConfig = async (newConfig: ConfiguracionCostos) => {
    const updated = await db.saveConfiguracion(newConfig);
    setConfig(updated);
  };

  const handleNavigateTabGlobal = (tab: string) => {
    switch (tab) {
      case 'dashboard':
      case 'resumen':
        navigate('/resumen');
        break;
      case 'recetas':
        navigate('/recetas');
        break;
      case 'lotes':
      case 'produccion':
        navigate('/produccion');
        break;
      case 'planificador':
        navigate('/planificador');
        break;
      case 'ventas':
        navigate('/ventas');
        break;
      case 'compras':
        navigate('/compras/facturas');
        break;
      case 'insumos':
      case 'inventario':
        navigate('/inventario');
        break;
      case 'mermas':
        navigate('/mermas');
        break;
      case 'financiero':
      case 'gastos-fijos':
        navigate('/gastos-fijos');
        break;
      case 'usuarios':
      case 'equipo':
        navigate('/equipo');
        break;
      default:
        navigate('/resumen');
    }
  };

  if (authLoading || !config) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        {!loadError ? (
          <>
            <div className="loading-spinner" />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
              Cargando Mixo...
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '32px' }}>⚠️</span>
            <span style={{ color: '#ff8a80', fontSize: '14px', textAlign: 'center', lineHeight: '1.6' }}>
              No se pudo conectar a la base de datos.<br />
              Verifica tu conexión o recarga la página.
            </span>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              Recargar
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <Routes>
      {/* 1. Portada / Landing Page Principal */}
      <Route path="/" element={<LandingView theme={theme} />} />

      {/* 2. Rutas Públicas / Autenticación */}
      <Route
        path="/iniciar-sesion"
        element={
          isAuthenticated ? (
            <Navigate to="/resumen" replace />
          ) : (
            <LoginView theme={theme} onToggleTheme={toggleTheme} />
          )
        }
      />
      <Route
        path="/cambiar-clave"
        element={
          !isAuthenticated ? (
            <Navigate to="/iniciar-sesion" replace />
          ) : (
            <ChangePasswordView theme={theme} onToggleTheme={toggleTheme} />
          )
        }
      />

      {/* 3. Shell Principal Protegido con Navegación 100% en Español */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell theme={theme} onToggleTheme={toggleTheme} />
          </ProtectedRoute>
        }
      >
        <Route
          path="/resumen"
          element={
            <ChefConsole
              config={config}
              activeTab="dashboard"
              onChangeTab={(t) => handleNavigateTabGlobal(t)}
              onSwitchTabGlobal={handleNavigateTabGlobal}
            />
          }
        />
        <Route
          path="/recetas"
          element={
            <ChefConsole
              config={config}
              activeTab="recetas"
              onChangeTab={(t) => handleNavigateTabGlobal(t)}
              onSwitchTabGlobal={handleNavigateTabGlobal}
            />
          }
        />
        <Route
          path="/produccion"
          element={
            <ChefConsole
              config={config}
              activeTab="lotes"
              onChangeTab={(t) => handleNavigateTabGlobal(t)}
              onSwitchTabGlobal={handleNavigateTabGlobal}
            />
          }
        />
        <Route
          path="/planificador"
          element={
            <ChefConsole
              config={config}
              activeTab="planificador"
              onChangeTab={(t) => handleNavigateTabGlobal(t)}
              onSwitchTabGlobal={handleNavigateTabGlobal}
            />
          }
        />

        {/* Módulos de Administración con Guardián RequireAdmin */}
        <Route
          path="/ventas"
          element={
            <ProtectedRoute requireAdmin>
              <AdminConsole
                config={config}
                onUpdateConfig={handleUpdateConfig}
                activeSubTab="ventas"
                onChangeSubTab={handleNavigateTabGlobal}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/compras" element={<Navigate to="/compras/facturas" replace />} />
        <Route
          path="/compras/facturas"
          element={
            <ProtectedRoute requireAdmin>
              <AdminConsole
                config={config}
                onUpdateConfig={handleUpdateConfig}
                activeSubTab="compras"
                activeComprasSubTab="facturas"
                onChangeSubTab={handleNavigateTabGlobal}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compras/proveedores"
          element={
            <ProtectedRoute requireAdmin>
              <AdminConsole
                config={config}
                onUpdateConfig={handleUpdateConfig}
                activeSubTab="compras"
                activeComprasSubTab="proveedores"
                onChangeSubTab={handleNavigateTabGlobal}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compras/historial"
          element={
            <ProtectedRoute requireAdmin>
              <AdminConsole
                config={config}
                onUpdateConfig={handleUpdateConfig}
                activeSubTab="compras"
                activeComprasSubTab="historial"
                onChangeSubTab={handleNavigateTabGlobal}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compras/historial-precios"
          element={
            <ProtectedRoute requireAdmin>
              <AdminConsole
                config={config}
                onUpdateConfig={handleUpdateConfig}
                activeSubTab="compras"
                activeComprasSubTab="historial_precios"
                onChangeSubTab={handleNavigateTabGlobal}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventario"
          element={
            <AdminConsole
              config={config}
              onUpdateConfig={handleUpdateConfig}
              activeSubTab="insumos"
              onChangeSubTab={handleNavigateTabGlobal}
            />
          }
        />
        <Route
          path="/mermas"
          element={
            <AdminConsole
              config={config}
              onUpdateConfig={handleUpdateConfig}
              activeSubTab="mermas"
              onChangeSubTab={handleNavigateTabGlobal}
            />
          }
        />
        <Route
          path="/gastos-fijos"
          element={
            <ProtectedRoute requireAdmin>
              <AdminConsole
                config={config}
                onUpdateConfig={handleUpdateConfig}
                activeSubTab="financiero"
                onChangeSubTab={handleNavigateTabGlobal}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/equipo"
          element={
            <ProtectedRoute requireAdmin>
              <AdminConsole
                config={config}
                onUpdateConfig={handleUpdateConfig}
                activeSubTab="usuarios"
                onChangeSubTab={handleNavigateTabGlobal}
              />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 3. Fallback 404 / Rutas desconocidas */}
      <Route path="*" element={<Navigate to="/resumen" replace />} />
    </Routes>
  );
};
