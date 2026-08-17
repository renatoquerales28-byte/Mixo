import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logoBlanco from '../../assets/logo-blanco.svg';
import logoNegro from '../../assets/logo-negro.svg';
import {
  LayoutDashboard, BookOpen, FlameKindling, CalendarDays,
  TrendingUp, ShoppingCart, Receipt, Truck, ClipboardList,
  BarChart2, Package, Trash2, Settings, LogOut,
  Sun, Moon, ShieldCheck, ChefHat, Users
} from 'lucide-react';

interface AppShellProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ theme, onToggleTheme }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [comprasExpanded, setComprasExpanded] = useState(() => 
    location.pathname.startsWith('/compras')
  );

  useEffect(() => {
    if (location.pathname.startsWith('/compras')) {
      setComprasExpanded(true);
    }
  }, [location.pathname]);

  const isAdmin = user?.rol === 'admin';
  const pathname = location.pathname;

  const comprasSubTabs = [
    { path: '/compras/facturas',          label: 'Facturas de Compra',  Icon: Receipt       },
    { path: '/compras/proveedores',       label: 'Proveedores',         Icon: Truck         },
    { path: '/compras/historial',         label: 'Historial',           Icon: ClipboardList },
    { path: '/compras/historial-precios', label: 'Historial de Costos', Icon: BarChart2     },
  ];

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="app-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <img
            src={theme === 'dark' ? logoBlanco : logoNegro}
            alt="Mixo"
            style={{ width: '120px', height: 'auto', display: 'block', marginBottom: '8px' }}
          />
        </div>

        {/* Navegación Principal */}
        <div className="sidebar-nav">
          {/* Resumen General */}
          <button
            type="button"
            className={`sidebar-nav-item ${pathname === '/resumen' || pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/resumen')}
          >
            <LayoutDashboard size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Resumen General
          </button>

          {/* SECCIÓN COCINA */}
          <div className="sidebar-section-header">COCINA</div>

          {/* Recetario */}
          <button
            type="button"
            className={`sidebar-nav-item ${pathname === '/recetas' ? 'active' : ''}`}
            onClick={() => navigate('/recetas')}
          >
            <BookOpen size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Recetario
          </button>

          {/* Producción */}
          <button
            type="button"
            className={`sidebar-nav-item ${pathname === '/produccion' ? 'active' : ''}`}
            onClick={() => navigate('/produccion')}
          >
            <FlameKindling size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Producción
          </button>

          {/* Planificador */}
          <button
            type="button"
            className={`sidebar-nav-item ${pathname === '/planificador' ? 'active' : ''}`}
            onClick={() => navigate('/planificador')}
          >
            <CalendarDays size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Planificador
          </button>

          {/* SECCIÓN ADMINISTRACIÓN (Solo Admin) */}
          {isAdmin && (
            <>
              <div className="sidebar-section-header">ADMINISTRACIÓN</div>

              {/* Ventas */}
              <button
                type="button"
                className={`sidebar-nav-item ${pathname === '/ventas' ? 'active' : ''}`}
                onClick={() => navigate('/ventas')}
              >
                <TrendingUp size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
                Ventas
              </button>

              {/* Compras (Desplegable) */}
              <div>
                <button
                  type="button"
                  className={`sidebar-nav-item ${pathname.startsWith('/compras') ? 'active' : ''}`}
                  onClick={() => {
                    if (!comprasExpanded) {
                      setComprasExpanded(true);
                      navigate('/compras/facturas');
                    } else {
                      setComprasExpanded(false);
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ShoppingCart size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
                    Compras
                  </div>
                  <span style={{ fontSize: '11px', opacity: 0.6, transition: 'transform 0.2s', transform: comprasExpanded ? 'rotate(90deg)' : 'none' }}>
                    ›
                  </span>
                </button>

                {comprasExpanded && (
                  <div style={{ paddingLeft: '14px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {comprasSubTabs.map(sub => {
                      const SubIcon = sub.Icon;
                      const isSubActive = pathname === sub.path;
                      return (
                        <button
                          key={sub.path}
                          type="button"
                          className={`sidebar-nav-item ${isSubActive ? 'active' : ''}`}
                          style={{ fontSize: '13px', padding: '6px 10px', height: '32px' }}
                          onClick={() => navigate(sub.path)}
                        >
                          <SubIcon size={14} style={{ marginRight: '8px', opacity: 0.75, flexShrink: 0 }} />
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inventario */}
              <button
                type="button"
                className={`sidebar-nav-item ${pathname === '/inventario' ? 'active' : ''}`}
                onClick={() => navigate('/inventario')}
              >
                <Package size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
                Inventario
              </button>

              {/* Mermas */}
              <button
                type="button"
                className={`sidebar-nav-item ${pathname === '/mermas' ? 'active' : ''}`}
                onClick={() => navigate('/mermas')}
              >
                <Trash2 size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
                Mermas
              </button>

              {/* Gastos Fijos */}
              <button
                type="button"
                className={`sidebar-nav-item ${pathname === '/gastos-fijos' ? 'active' : ''}`}
                onClick={() => navigate('/gastos-fijos')}
              >
                <Settings size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
                Gastos Fijos
              </button>

              {/* Equipo */}
              <button
                type="button"
                className={`sidebar-nav-item ${pathname === '/equipo' ? 'active' : ''}`}
                onClick={() => navigate('/equipo')}
              >
                <Users size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
                Equipo
              </button>
            </>
          )}
        </div>

        {/* Footer del sidebar */}
        <div className="sidebar-footer">
          {/* Fila de Rol alineada con los items + Switch de Tema */}
          <div className="sidebar-user-row">
            <div className="sidebar-user-role-display">
              {user?.rol === 'admin' ? (
                <ShieldCheck size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
              ) : (
                <ChefHat size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
              )}
              <span className="sidebar-role-label">
                {user?.rol === 'admin' ? 'Administrador' : 'Chef de cocina'}
              </span>
            </div>

            {/* Switch circular de tema */}
            <button
              type="button"
              className="sidebar-theme-switch"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Botón de Cerrar Sesión */}
          <button
            type="button"
            className="btn btn-secondary sidebar-logout-action-btn"
            onClick={logout}
            title="Cerrar sesión en Mixo"
          >
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};
