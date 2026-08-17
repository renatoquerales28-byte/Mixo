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
            style={{ maxWidth: '80%', height: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Resumen General */}
        <button
          type="button"
          className={`sidebar-nav-item ${pathname === '/resumen' || pathname === '/' ? 'active' : ''}`}
          onClick={() => navigate('/resumen')}
          title="Resumen General"
        >
          <LayoutDashboard size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
          Resumen General
        </button>

        {/* Sección Cocina */}
        <div className="sidebar-section-label">Cocina</div>

        <button
          type="button"
          className={`sidebar-nav-item ${pathname === '/recetas' ? 'active' : ''}`}
          onClick={() => navigate('/recetas')}
        >
          <BookOpen size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
          Recetario
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${pathname === '/produccion' ? 'active' : ''}`}
          onClick={() => navigate('/produccion')}
        >
          <FlameKindling size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
          Producción
        </button>

        <button
          type="button"
          className={`sidebar-nav-item ${pathname === '/planificador' ? 'active' : ''}`}
          onClick={() => navigate('/planificador')}
        >
          <CalendarDays size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
          Planificador
        </button>

        {/* Sección Administración (Solo visible para rol 'admin') */}
        {isAdmin && (
          <>
            <div className="sidebar-section-label">Administración</div>

            {/* Ventas */}
            <button
              type="button"
              className={`sidebar-nav-item ${pathname === '/ventas' ? 'active' : ''}`}
              onClick={() => navigate('/ventas')}
            >
              <TrendingUp size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
              Ventas
            </button>

            {/* Compras — ítem expandible */}
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
            >
              <ShoppingCart size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
              Compras
              <span className={`sidebar-chevron ${comprasExpanded ? 'open' : ''}`}>›</span>
            </button>

            {/* Sub-ítems de Compras */}
            {comprasExpanded && comprasSubTabs.map(sub => (
              <button
                key={sub.path}
                type="button"
                className={`sidebar-sub-item ${pathname === sub.path ? 'active' : ''}`}
                onClick={() => navigate(sub.path)}
              >
                <sub.Icon size={14} style={{ marginRight: '8px', opacity: 0.7, flexShrink: 0 }} />
                {sub.label}
              </button>
            ))}

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
            <button
              type="button"
              className="sidebar-theme-switch"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Botón Cerrar Sesión */}
          <button
            type="button"
            className="btn btn-secondary sidebar-logout-action-btn"
            onClick={logout}
            title="Cerrar sesión"
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};
