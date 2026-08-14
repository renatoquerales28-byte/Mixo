import React, { useState } from 'react';
import type { ConfiguracionCostos } from '../../services/db';
import { ComprasTab } from './ComprasTab';
import { ProveedoresTab } from './ProveedoresTab';
import { AuditoriaTab } from './AuditoriaTab';
import { HistorialPreciosTab } from './HistorialPreciosTab';

type ComprasInternalTab = 'facturas' | 'proveedores' | 'historial' | 'historial_precios';

interface ComprasModuleProps {
  onRefresh?: () => void;
  config?: ConfiguracionCostos;
}

export const ComprasModule: React.FC<ComprasModuleProps> = ({ onRefresh }) => {
  const [activeTab, setActiveTab] = useState<ComprasInternalTab>('facturas');

  const tabs: { key: ComprasInternalTab; label: string }[] = [
    { key: 'facturas',          label: 'Facturas de Compra' },
    { key: 'proveedores',       label: 'Proveedores' },
    { key: 'historial',         label: 'Historial / Auditoría' },
    { key: 'historial_precios', label: 'Historial de Costos' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', height: '100%', overflow: 'hidden' }}>
      {/* Tabs internas */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '24px',
          paddingBottom: '0',
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: activeTab === tab.key ? '600' : '400',
              color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key
                ? '2px solid var(--color-accent)'
                : '2px solid transparent',
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === 'facturas'          && <ComprasTab    onRefresh={onRefresh} />}
      {activeTab === 'proveedores'       && <ProveedoresTab onRefresh={onRefresh} />}
      {activeTab === 'historial'         && <AuditoriaTab  onRefresh={onRefresh} />}
      {activeTab === 'historial_precios' && <HistorialPreciosTab />}
    </div>
  );
};
