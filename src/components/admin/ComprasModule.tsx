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
  activeComprasSubTab?: ComprasInternalTab;
}

export const ComprasModule: React.FC<ComprasModuleProps> = ({ onRefresh, activeComprasSubTab: externalTab }) => {
  const [activeTab, setActiveTab] = useState<ComprasInternalTab>('facturas');

  // Sincronizar con el sub-tab seleccionado desde el sidebar
  React.useEffect(() => {
    if (externalTab) setActiveTab(externalTab);
  }, [externalTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', height: '100%', overflow: 'hidden' }}>
      {/* Contenido controlado directamente por el sidebar */}

      {/* Contenido */}
      {activeTab === 'facturas'          && <ComprasTab    onRefresh={onRefresh} />}
      {activeTab === 'proveedores'       && <ProveedoresTab onRefresh={onRefresh} />}
      {activeTab === 'historial'         && <AuditoriaTab  onRefresh={onRefresh} />}
      {activeTab === 'historial_precios' && <HistorialPreciosTab />}
    </div>
  );
};
