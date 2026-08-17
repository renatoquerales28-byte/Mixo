import { useState, useEffect } from 'react';
import { db } from './services/db';
import type { ConfiguracionCostos } from './services/db';
import { ChefConsole } from './components/ChefConsole';
import { AdminConsole } from './components/AdminConsole';
import { ToastProvider } from './hooks/useToast';
import { Toast } from './components/Toast';
import logoBlanco from './assets/logo-blanco.svg';
import logoNegro from './assets/logo-negro.svg';
import {
  LayoutDashboard, BookOpen, FlameKindling, CalendarDays,
  TrendingUp, ShoppingCart, Receipt, Truck, ClipboardList,
  BarChart2, Package, Trash2, Settings
} from 'lucide-react';

type ChefTab      = 'dashboard' | 'recetas' | 'lotes' | 'planificador';
type AdminSubTab  = 'compras' | 'insumos' | 'ventas' | 'mermas' | 'financiero';
type ComprasSubTab = 'facturas' | 'proveedores' | 'historial' | 'historial_precios';
type ActiveSection = 'chef' | 'admin';

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('mixo_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  const [activeSection, setActiveSection]         = useState<ActiveSection>('chef');
  const [activeChefTab,  setActiveChefTab]         = useState<ChefTab>('dashboard');
  const [activeAdminTab, setActiveAdminTab]        = useState<AdminSubTab>('compras');
  const [activeComprasSubTab, setActiveComprasSubTab] = useState<ComprasSubTab>('facturas');
  const [comprasExpanded, setComprasExpanded]      = useState(false);
  const [config, setConfig]                        = useState<ConfiguracionCostos | null>(null);
  const [refreshTrigger, setRefreshTrigger]        = useState(0);
  const [loadError, setLoadError]                  = useState(false);

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

  // Colapsar Compras al navegar fuera
  useEffect(() => {
    if (activeSection !== 'admin' || activeAdminTab !== 'compras') {
      setComprasExpanded(false);
    }
  }, [activeSection, activeAdminTab]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const handleUpdateConfig = async (newConfig: ConfiguracionCostos) => {
    const updated = await db.saveConfiguracion(newConfig);
    setConfig(updated);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSwitchTab = (tab: string, section: 'chef' | 'admin' = 'chef') => {
    setActiveSection(section);
    if (section === 'chef') {
      setActiveChefTab(tab as ChefTab);
    } else {
      setActiveAdminTab(tab as AdminSubTab);
    }
  };

  if (!config) {
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

  // Sub-ítems de Compras (expandible)
  const comprasSubTabs: { key: ComprasSubTab; label: string; Icon: React.ElementType }[] = [
    { key: 'facturas',          label: 'Facturas de Compra',  Icon: Receipt       },
    { key: 'proveedores',       label: 'Proveedores',         Icon: Truck         },
    { key: 'historial',         label: 'Historial',           Icon: ClipboardList },
    { key: 'historial_precios', label: 'Historial de Costos', Icon: BarChart2     },
  ];

  return (
    <ToastProvider>
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
            className={`sidebar-nav-item ${activeSection === 'chef' && activeChefTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveSection('chef'); setActiveChefTab('dashboard'); }}
            title="Resumen General"
          >
            <LayoutDashboard size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Resumen General
          </button>

          {/* Sección Cocina */}
          <div className="sidebar-section-label">Cocina</div>

          <button
            className={`sidebar-nav-item ${activeSection === 'chef' && activeChefTab === 'recetas' ? 'active' : ''}`}
            onClick={() => { setActiveSection('chef'); setActiveChefTab('recetas'); }}
          >
            <BookOpen size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Recetario
          </button>

          <button
            className={`sidebar-nav-item ${activeSection === 'chef' && activeChefTab === 'lotes' ? 'active' : ''}`}
            onClick={() => { setActiveSection('chef'); setActiveChefTab('lotes'); }}
          >
            <FlameKindling size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Producción
          </button>

          <button
            className={`sidebar-nav-item ${activeSection === 'chef' && activeChefTab === 'planificador' ? 'active' : ''}`}
            onClick={() => { setActiveSection('chef'); setActiveChefTab('planificador'); }}
          >
            <CalendarDays size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Planificador
          </button>

          {/* Sección Admin */}
          <div className="sidebar-section-label">Administración</div>

          {/* Ventas */}
          <button
            className={`sidebar-nav-item ${activeSection === 'admin' && activeAdminTab === 'ventas' ? 'active' : ''}`}
            onClick={() => { setActiveSection('admin'); setActiveAdminTab('ventas'); }}
          >
            <TrendingUp size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Ventas
          </button>

          {/* Compras — ítem expandible */}
          <button
            className={`sidebar-nav-item ${activeSection === 'admin' && activeAdminTab === 'compras' ? 'active' : ''}`}
            onClick={() => {
              setActiveSection('admin');
              setActiveAdminTab('compras');
              setComprasExpanded(prev =>
                activeSection === 'admin' && activeAdminTab === 'compras' ? !prev : true
              );
            }}
          >
            <ShoppingCart size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Compras
            <span className={`sidebar-chevron ${comprasExpanded ? 'open' : ''}`}>›</span>
          </button>

          {/* Sub-ítems de Compras */}
          {comprasExpanded && comprasSubTabs.map(sub => (
            <button
              key={sub.key}
              className={`sidebar-sub-item ${
                activeSection === 'admin' &&
                activeAdminTab === 'compras' &&
                activeComprasSubTab === sub.key ? 'active' : ''
              }`}
              onClick={() => {
                setActiveSection('admin');
                setActiveAdminTab('compras');
                setActiveComprasSubTab(sub.key);
              }}
            >
              <sub.Icon size={14} style={{ marginRight: '8px', opacity: 0.7, flexShrink: 0 }} />
              {sub.label}
            </button>
          ))}

          {/* Inventario */}
          <button
            className={`sidebar-nav-item ${activeSection === 'admin' && activeAdminTab === 'insumos' ? 'active' : ''}`}
            onClick={() => { setActiveSection('admin'); setActiveAdminTab('insumos'); }}
          >
            <Package size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Inventario
          </button>

          {/* Mermas */}
          <button
            className={`sidebar-nav-item ${activeSection === 'admin' && activeAdminTab === 'mermas' ? 'active' : ''}`}
            onClick={() => { setActiveSection('admin'); setActiveAdminTab('mermas'); }}
          >
            <Trash2 size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Mermas
          </button>

          {/* Gastos Fijos */}
          <button
            className={`sidebar-nav-item ${activeSection === 'admin' && activeAdminTab === 'financiero' ? 'active' : ''}`}
            onClick={() => { setActiveSection('admin'); setActiveAdminTab('financiero'); }}
          >
            <Settings size={16} style={{ marginRight: '10px', opacity: 0.75, flexShrink: 0 }} />
            Gastos Fijos
          </button>

          {/* Footer del sidebar */}
          <div className="sidebar-footer">
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={toggleTheme}>
              {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="app-content">
          {activeSection === 'admin' ? (
            <AdminConsole
              config={config}
              onUpdateConfig={handleUpdateConfig}
              key={`admin-${refreshTrigger}`}
              onRefreshData={fetchConfig}
              activeSubTab={activeAdminTab}
              onChangeSubTab={setActiveAdminTab}
              activeComprasSubTab={activeComprasSubTab}
            />
          ) : (
            <ChefConsole
              config={config}
              activeTab={activeChefTab}
              onChangeTab={setActiveChefTab}
              key={`chef-${refreshTrigger}`}
              onRefreshData={fetchConfig}
              onSwitchTabGlobal={handleSwitchTab}
            />
          )}
        </main>
      </div>
      <Toast />
    </ToastProvider>
  );
}

export default App;
