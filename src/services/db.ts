// Tipos de Datos Fuertes para el Ecosistema Mixo
import { supabase, isSupabaseConfigured } from './supabase';

export interface Ingrediente {
  id: string;
  nombre: string;
  unidadReceta: 'g' | 'ml' | 'unidad';
  precioActivo?: number; // Último precio de compra por unidadReceta
  ultimaActualizacion: string;
  stockActual?: number;
  stockMinimo?: number;
  fechaVencimiento?: string; // ISO date string
  conservacion: 'secos' | 'refrigerado' | 'congelado';
  perecibilidad: 'alta' | 'media' | 'baja';
  diasVidaUtil?: number;
}

export interface PasoPreparacion {
  numeroPaso: number;
  estacion: 'preparacion_fria' | 'estufa' | 'parrilla' | 'horno' | 'emplatado';
  descripcion: string;
  tiempoMinutos: number;
  temperaturaObjetivo?: number;
  ingredientesAsociados: string[]; // array de ingredienteId
}

export interface IngredienteReceta {
  ingredienteId: string; // ID de Ingrediente o Receta (sub-receta)
  esRecetaAnidada: boolean;
  cantidadRequerida: number; // en unidad de uso
}

export interface Receta {
  id: string;
  nombre: string;
  esSubReceta: boolean;
  codigoIntegracionPOS?: string; // SKU para Unify
  unidadRendimiento: 'kg' | 'litro' | 'porciones';
  cantidadRendimiento: number;
  vidaUtilHoras?: number;
  temperaturaAlmacenado?: string;
  alergenos: ('gluten' | 'lactosa' | 'frutos_secos' | 'mariscos' | 'huevo' | 'soya')[];
  ingredientes: IngredienteReceta[];
  pasos: PasoPreparacion[];
  tiempoPreparacionTotal: number;
  actualizadoPor: string;
  ultimaActualizacion: string;
  precioVentaMenu?: number; // Precio real al que se vende el plato en el restaurante
  stockActual?: number;
  stockMinimo?: number;
  modoDescuento?: 'explosion_ventas' | 'produccion_previa';
}

export interface ItemVenta {
  recetaId: string;
  cantidadVendida: number;
  precioCobrado: number;
}

export interface RegistroVentas {
  id: string;
  fechaInicio: string;
  fechaFin: string;
  items: ItemVenta[];
  fechaRegistro: string;
  registradoPor: string;
}

export interface Proveedor {
  id: string;
  nombreComercial: string;
  nit: string;
  contactoNombre: string;
  telefono: string;
  correo: string;
}

export interface ItemFactura {
  ingredienteId: string;
  cantidadComprada: number;
  precioCompraAP: number;
  fechaVencimiento?: string;
}

export interface FacturaCompra {
  id: string;
  facturaNumero: string;
  proveedorId: string;
  fechaCompra: string;
  items: ItemFactura[];
  registradoPor: string;
}

export interface RegistroMermaOperativa {
  id: string;
  fechaMerma: string;
  tipoOrigen: 'ingrediente' | 'receta';
  referenciaId: string; // ID de ingrediente o receta
  cantidadPerdida: number;
  motivo: 'vencido' | 'quemado' | 'derrame_caida' | 'error_preparacion';
  costoPerdida: number;
  registradoPor: string;
}

export interface RegistroHistoricoPrecio {
  id: string;
  timestamp: string;
  ingredienteId: string;
  proveedorId: string;
  precioUnitarioAP: number;
  cantidad: number;
}

export interface InsumoUtilizado {
  ingredienteId: string;
  esRecetaAnidada: boolean;
  cantidadReal: number; // en unidadReceta
}

export interface LoteProduccion {
  id: string;
  fecha: string;
  recetaId: string;
  cantidadProducida: number; // Porciones reales obtenidas
  costoTotalInsumos: number; // Suma de costo uso de insumos reales
  costoPorcionReal: number;  // costoTotalInsumos / cantidadProducida
  insumos: InsumoUtilizado[];
  registradoPor: string;
}

export interface ConfiguracionCostos {
  alquiler: number;
  servicesPublicos?: number; // compatibilidad
  serviciosPublicos: number;
  nominaAdministrativa: number;
  otrosGastos: number;
  platosProyectadosMensuales: number;
  factorCondimentoGlobal: number; // ej: 2.0%
  margenAlimentosObjetivo: number; // ej: 30%
  porcentajeImpuestos: number; // ej: 8%
}

export interface SyncQueueItem {
  id: string;
  table: string;
  action: 'upsert' | 'delete';
  payload: any;
  timestamp: number;
}

const CONFIGURACION_INICIAL: ConfiguracionCostos = {
  alquiler: 1200.0,
  serviciosPublicos: 450.0,
  nominaAdministrativa: 1800.0,
  otrosGastos: 250.0,
  platosProyectadosMensuales: 2500,
  factorCondimentoGlobal: 2.0,
  margenAlimentosObjetivo: 30.0,
  porcentajeImpuestos: 8.0
};

const KEYS = {
  INGREDIENTES: 'mixo_ingredientes',
  RECETAS: 'mixo_recetas',
  CONFIGURACION: 'mixo_configuracion',
  PROVEEDORES: 'mixo_proveedores',
  FACTURAS: 'mixo_facturas',
  HISTORICO_PRECIOS: 'mixo_historico_precios',
  MERMAS: 'mixo_mermas',
  LOTES_PRODUCCION: 'mixo_lotes_produccion',
  VENTAS: 'mixo_ventas',
  SYNC_QUEUE: 'mixo_sync_queue'
};

// Utilidad rápida para saber si el cliente está conectado a la red
const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true;
};

// Wrapper para abortar peticiones lentas o bloqueadas en la red
const withTimeout = async <T = any>(thenable: any, timeoutMs = 3500): Promise<T> => {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Network request timeout')), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve(thenable), timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
};

// Mapeos Supabase <-> TypeScript
const mapIngredienteFromDB = (row: any): Ingrediente => ({
  id: row.id,
  nombre: row.nombre,
  unidadReceta: row.unidad_receta,
  precioActivo: row.precio_activo !== null ? Number(row.precio_activo) : undefined,
  stockActual: row.stock_actual !== null ? Number(row.stock_actual) : undefined,
  stockMinimo: row.stock_minimo !== null ? Number(row.stock_minimo) : undefined,
  fechaVencimiento: row.fecha_vencimiento || undefined,
  conservacion: row.conservacion || 'secos',
  perecibilidad: row.perecibilidad || 'media',
  diasVidaUtil: row.dias_vida_util || undefined,
  ultimaActualizacion: row.ultima_actualizacion || new Date().toISOString()
});

const mapIngredienteToDB = (i: Ingrediente) => ({
  id: i.id,
  nombre: i.nombre,
  unidad_receta: i.unidadReceta,
  precio_activo: i.precioActivo,
  stock_actual: i.stockActual,
  stock_minimo: i.stockMinimo,
  fecha_vencimiento: i.fechaVencimiento,
  conservacion: i.conservacion,
  perecibilidad: i.perecibilidad,
  dias_vida_util: i.diasVidaUtil,
  ultima_actualizacion: i.ultimaActualizacion || new Date().toISOString()
});

const mapProveedorFromDB = (row: any): Proveedor => ({
  id: row.id,
  nombreComercial: row.nombre_comercial,
  nit: row.nit || '',
  contactoNombre: row.contacto_nombre || '',
  telefono: row.telefono || '',
  correo: row.correo || ''
});

const mapProveedorToDB = (p: Proveedor) => ({
  id: p.id,
  nombre_comercial: p.nombreComercial,
  nit: p.nit,
  contacto_nombre: p.contactoNombre,
  telefono: p.telefono,
  correo: p.correo
});

const mapRecetaFromDB = (row: any): Receta => ({
  id: row.id,
  nombre: row.nombre,
  esSubReceta: Boolean(row.es_sub_receta),
  codigoIntegracionPOS: row.codigo_integracion_pos || undefined,
  unidadRendimiento: row.unidad_rendimiento,
  cantidadRendimiento: Number(row.cantidad_rendimiento) || 1,
  vidaUtilHoras: row.vida_util_horas ? Number(row.vida_util_horas) : undefined,
  temperaturaAlmacenado: row.temperatura_almacenado || undefined,
  alergenos: Array.isArray(row.alergenos) ? row.alergenos : [],
  ingredientes: Array.isArray(row.ingredientes) ? row.ingredientes : [],
  pasos: Array.isArray(row.pasos) ? row.pasos : [],
  tiempoPreparacionTotal: Number(row.tiempo_preparacion_total) || 0,
  precioVentaMenu: row.precio_venta_menu !== null ? Number(row.precio_venta_menu) : undefined,
  stockActual: row.stock_actual !== null ? Number(row.stock_actual) : undefined,
  stockMinimo: row.stock_minimo !== null ? Number(row.stock_minimo) : undefined,
  modoDescuento: row.modo_descuento || 'explosion_ventas',
  actualizadoPor: row.actualizado_por || 'Chef Ejecutivo',
  ultimaActualizacion: row.ultima_actualizacion || new Date().toISOString()
});

const mapRecetaToDB = (r: Receta) => ({
  id: r.id,
  nombre: r.nombre,
  es_sub_receta: r.esSubReceta,
  codigo_integracion_pos: r.codigoIntegracionPOS,
  unidad_rendimiento: r.unidadRendimiento,
  cantidad_rendimiento: r.cantidadRendimiento,
  vida_util_horas: r.vidaUtilHoras,
  temperatura_almacenado: r.temperaturaAlmacenado,
  alergenos: r.alergenos,
  ingredientes: r.ingredientes,
  pasos: r.pasos,
  tiempo_preparacion_total: r.tiempoPreparacionTotal,
  precio_venta_menu: r.precioVentaMenu,
  stock_actual: r.stockActual,
  stock_minimo: r.stockMinimo,
  modo_descuento: r.modoDescuento,
  actualizado_por: r.actualizadoPor,
  ultima_actualizacion: r.ultimaActualizacion || new Date().toISOString()
});

const mapFacturaFromDB = (row: any): FacturaCompra => ({
  id: row.id,
  facturaNumero: row.factura_numero,
  proveedorId: row.proveedor_id,
  fechaCompra: row.fecha_compra,
  items: Array.isArray(row.items) ? row.items : [],
  registradoPor: row.registrado_por || ''
});

const mapFacturaToDB = (f: FacturaCompra) => ({
  id: f.id,
  factura_numero: f.facturaNumero,
  proveedor_id: f.proveedorId,
  fecha_compra: f.fechaCompra,
  items: f.items,
  registrado_por: f.registradoPor
});

const mapVentaFromDB = (row: any): RegistroVentas => ({
  id: row.id,
  fechaInicio: row.fecha_inicio,
  fechaFin: row.fecha_fin,
  items: Array.isArray(row.items) ? row.items : [],
  fechaRegistro: row.fecha_registro || row.created_at || new Date().toISOString(),
  registradoPor: row.registrado_por || ''
});

const mapVentaToDB = (v: RegistroVentas) => ({
  id: v.id,
  fecha_inicio: v.fechaInicio,
  fecha_fin: v.fechaFin,
  items: v.items,
  fecha_registro: v.fechaRegistro,
  registrado_por: v.registradoPor
});

const mapMermaFromDB = (row: any): RegistroMermaOperativa => ({
  id: row.id,
  fechaMerma: row.fecha_merma,
  tipoOrigen: row.tipo_origen,
  referenciaId: row.referencia_id,
  cantidadPerdida: Number(row.cantidad_perdida) || 0,
  motivo: row.motivo,
  costoPerdida: Number(row.costo_perdida) || 0,
  registradoPor: row.registrado_por || ''
});

const mapMermaToDB = (m: RegistroMermaOperativa) => ({
  id: m.id,
  fecha_merma: m.fechaMerma,
  tipo_origen: m.tipoOrigen,
  referencia_id: m.referenciaId,
  cantidad_perdida: m.cantidadPerdida,
  motivo: m.motivo,
  costo_perdida: m.costoPerdida,
  registrado_por: m.registradoPor
});

const mapHistoricoFromDB = (row: any): RegistroHistoricoPrecio => ({
  id: row.id,
  timestamp: row.timestamp,
  ingredienteId: row.ingrediente_id,
  proveedorId: row.proveedor_id,
  precioUnitarioAP: Number(row.precio_unitario_ap) || 0,
  cantidad: Number(row.cantidad) || 0
});

const mapHistoricoToDB = (h: RegistroHistoricoPrecio) => ({
  id: h.id,
  timestamp: h.timestamp,
  ingrediente_id: h.ingredienteId,
  proveedor_id: h.proveedorId,
  precio_unitario_ap: h.precioUnitarioAP,
  cantidad: h.cantidad
});

const mapLoteFromDB = (row: any): LoteProduccion => ({
  id: row.id,
  fecha: row.fecha,
  recetaId: row.receta_id,
  cantidadProducida: Number(row.cantidad_producida) || 0,
  costoTotalInsumos: Number(row.costo_total_insumos) || 0,
  costoPorcionReal: Number(row.costo_porcion_real) || 0,
  insumos: Array.isArray(row.insumos) ? row.insumos : [],
  registradoPor: row.registrado_por || ''
});

const mapLoteToDB = (l: LoteProduccion) => ({
  id: l.id,
  fecha: l.fecha,
  receta_id: l.recetaId,
  cantidad_producida: l.cantidadProducida,
  costo_total_insumos: l.costoTotalInsumos,
  costo_porcion_real: l.costoPorcionReal,
  insumos: l.insumos,
  registrado_por: l.registradoPor
});

const mapConfigFromDB = (row: any): ConfiguracionCostos => ({
  alquiler: Number(row.alquiler) || 0,
  serviciosPublicos: Number(row.servicios_publicos) || 0,
  nominaAdministrativa: Number(row.nomina_administrativa) || 0,
  otrosGastos: Number(row.otros_gastos) || 0,
  platosProyectadosMensuales: Number(row.platos_proyectados_mensuales) || 1,
  factorCondimentoGlobal: Number(row.factor_condimento_global) || 2.0,
  margenAlimentosObjetivo: Number(row.margen_alimentos_objetivo) || 30.0,
  porcentajeImpuestos: Number(row.porcentaje_impuestos) || 8.0
});

const mapConfigToDB = (c: ConfiguracionCostos) => ({
  id: 'default',
  alquiler: c.alquiler,
  servicios_publicos: c.serviciosPublicos,
  nomina_administrativa: c.nominaAdministrativa,
  otros_gastos: c.otrosGastos,
  platos_proyectados_mensuales: c.platosProyectadosMensuales,
  factor_condimento_global: c.factorCondimentoGlobal,
  margen_alimentos_objetivo: c.margenAlimentosObjetivo,
  porcentaje_impuestos: c.porcentajeImpuestos,
  updated_at: new Date().toISOString()
});

class LocalDatabase {
  // Caché ultrarrápida en memoria RAM sincronizada con LocalStorage
  private memoryCache: Map<string, any> = new Map();
  private inFlightFetches: Map<string, Promise<any>> = new Map();
  private lastFetchTime: Map<string, number> = new Map();
  private CACHE_TTL = 45 * 1000; // 45 segundos de frescura antes de revalidar en segundo plano
  private isSyncing = false;

  private getLocal<T>(key: string, defaultValue: T): T {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) as T;
    }
    try {
      const data = localStorage.getItem(key);
      const val = data ? JSON.parse(data) : defaultValue;
      this.memoryCache.set(key, val);
      return val;
    } catch {
      this.memoryCache.set(key, defaultValue);
      return defaultValue;
    }
  }

  private setLocal<T>(key: string, value: T): void {
    this.memoryCache.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  constructor() {
    // Si el navegador tiene datos residuales de los mocks antiguos en localStorage, limpiarlos
    const storedIngs = this.getLocal<any[]>(KEYS.INGREDIENTES, []);
    if (storedIngs.some(i => i.id === 'ing_tomate_chonto' || i.id === 'ing_pasta_lasana' || i.id === 'ing_carne_molida')) {
      localStorage.removeItem(KEYS.INGREDIENTES);
      localStorage.removeItem(KEYS.PROVEEDORES);
      localStorage.removeItem(KEYS.RECETAS);
      localStorage.removeItem(KEYS.FACTURAS);
      localStorage.removeItem(KEYS.HISTORICO_PRECIOS);
      localStorage.removeItem(KEYS.MERMAS);
      localStorage.removeItem(KEYS.LOTES_PRODUCCION);
      localStorage.removeItem(KEYS.VENTAS);
      localStorage.removeItem(KEYS.SYNC_QUEUE);
      this.memoryCache.clear();
    }

    // Inicializar semillas en memoria
    if (!localStorage.getItem(KEYS.INGREDIENTES)) this.setLocal(KEYS.INGREDIENTES, []);
    if (!localStorage.getItem(KEYS.CONFIGURACION)) this.setLocal(KEYS.CONFIGURACION, CONFIGURACION_INICIAL);
    if (!localStorage.getItem(KEYS.PROVEEDORES)) this.setLocal(KEYS.PROVEEDORES, []);
    if (!localStorage.getItem(KEYS.RECETAS)) this.setLocal(KEYS.RECETAS, []);
    if (!localStorage.getItem(KEYS.FACTURAS)) this.setLocal(KEYS.FACTURAS, []);
    if (!localStorage.getItem(KEYS.HISTORICO_PRECIOS)) this.setLocal(KEYS.HISTORICO_PRECIOS, []);
    if (!localStorage.getItem(KEYS.MERMAS)) this.setLocal(KEYS.MERMAS, []);
    if (!localStorage.getItem(KEYS.LOTES_PRODUCCION)) this.setLocal(KEYS.LOTES_PRODUCCION, []);
    if (!localStorage.getItem(KEYS.VENTAS)) this.setLocal(KEYS.VENTAS, []);
    if (!localStorage.getItem(KEYS.SYNC_QUEUE)) this.setLocal(KEYS.SYNC_QUEUE, []);

    // Escuchar cuando el navegador vuelve a tener conexión a internet
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Mixo: Conexión restablecida. Sincronizando cambios pendientes con Supabase...');
        this.processSyncQueue();
      });

      // Intento inicial si arrancamos online
      setTimeout(() => {
        if (isOnline()) {
          this.processSyncQueue();
        }
      }, 1000);
    }
  }

  // --- COLA DE SINCRONIZACIÓN OFFLINE-TO-ONLINE ---
  private enqueueMutation(table: string, action: 'upsert' | 'delete', payload: any): void {
    const queue = this.getLocal<SyncQueueItem[]>(KEYS.SYNC_QUEUE, []);
    
    // Si es un array de elementos
    if (Array.isArray(payload)) {
      for (const item of payload) {
        queue.push({
          id: item.id || 'sync_' + Math.random().toString(36).substr(2, 9),
          table,
          action,
          payload: item,
          timestamp: Date.now()
        });
      }
    } else {
      // Reemplazar mutaciones previas sobre el mismo registro para evitar duplicidad
      const id = payload.id || (typeof payload === 'string' ? payload : 'item');
      const filtered = queue.filter(q => !(q.table === table && q.id === id));
      filtered.push({
        id,
        table,
        action,
        payload,
        timestamp: Date.now()
      });
      this.setLocal(KEYS.SYNC_QUEUE, filtered);
      
      if (isOnline()) {
        this.processSyncQueue();
      }
      return;
    }

    this.setLocal(KEYS.SYNC_QUEUE, queue);
    if (isOnline()) {
      this.processSyncQueue();
    }
  }

  public async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !isSupabaseConfigured || !isOnline()) {
      return;
    }

    const queue = this.getLocal<SyncQueueItem[]>(KEYS.SYNC_QUEUE, []);
    if (queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    console.log(`Mixo Sync: Procesando ${queue.length} operaciones pendientes...`);

    try {
      const remainingQueue: SyncQueueItem[] = [];

      for (const item of queue) {
        try {
          if (item.action === 'upsert') {
            await withTimeout(supabase.from(item.table).upsert(item.payload), 4000);
          } else if (item.action === 'delete') {
            await withTimeout(supabase.from(item.table).delete().eq('id', item.id), 4000);
          }
        } catch (err) {
          console.warn(`Error sincronizando elemento ${item.table}/${item.id}:`, err);
          remainingQueue.push(item);
        }
      }

      this.setLocal(KEYS.SYNC_QUEUE, remainingQueue);

      if (remainingQueue.length === 0) {
        console.log('Mixo Sync: Todos los datos pendientes fueron sincronizados exitosamente con Supabase.');
        // Revalidar en segundo plano para obtener el estado más reciente de la nube
        this.revalidateAll();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mixo_sync_completed'));
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // Revalidar todos los catálogos silenciosamente tras reconexión
  private revalidateAll(): void {
    this.revalidateIngredientes();
    this.revalidateRecetas();
    this.revalidateProveedores();
    this.revalidateFacturas();
    this.revalidateHistoricoPrecios();
    this.revalidateMermas();
    this.revalidateLotesProduccion();
    this.revalidateVentas();
    this.revalidateConfiguracion();
  }

  // --- MÓDULO 1: INGREDIENTES ---
  async getIngredientes(forceRefresh = false): Promise<Ingrediente[]> {
    const local = this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, []);
    
    // Si no está configurado o estamos offline, responder inmediatamente desde memoria local (0 ms)
    if (!isSupabaseConfigured || !isOnline()) {
      return local;
    }

    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(KEYS.INGREDIENTES) || 0;
    const isCacheStale = now - lastFetch > this.CACHE_TTL;

    // Si ya tenemos datos y no se exige forzar refresco, retornar datos de inmediato y revalidar en segundo plano
    if (local.length > 0 && !forceRefresh) {
      if (isCacheStale) {
        this.revalidateIngredientes(); // Revalidación en background silenciosa
      }
      return local;
    }

    // Si está vacío o se fuerza refresco, esperar la consulta deduplicada
    return this.revalidateIngredientes();
  }

  private async revalidateIngredientes(): Promise<Ingrediente[]> {
    if (!isSupabaseConfigured || !isOnline()) {
      return this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, []);
    }

    if (this.inFlightFetches.has(KEYS.INGREDIENTES)) {
      return this.inFlightFetches.get(KEYS.INGREDIENTES)!;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('ingredientes').select('*').order('nombre', { ascending: true }),
          3500
        );
        if (!error && data) {
          const list = data.map(mapIngredienteFromDB);
          this.setLocal(KEYS.INGREDIENTES, list);
          this.lastFetchTime.set(KEYS.INGREDIENTES, Date.now());
          return list;
        }
      } catch (err) {
        console.warn('Fallo o timeout sincronizando ingredientes desde Supabase:', err);
      } finally {
        this.inFlightFetches.delete(KEYS.INGREDIENTES);
      }
      return this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, []);
    })();

    this.inFlightFetches.set(KEYS.INGREDIENTES, fetchPromise);
    return fetchPromise;
  }

  async saveIngrediente(ingrediente: Ingrediente): Promise<Ingrediente[]> {
    const ingredientes = [...this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, [])];
    const index = ingredientes.findIndex(i => i.id === ingrediente.id);
    const anterior = index >= 0 ? ingredientes[index] : null;

    ingrediente.ultimaActualizacion = new Date().toISOString();

    const precioCambio = !anterior || anterior.precioActivo !== ingrediente.precioActivo;
    let nuevoHistorico: RegistroHistoricoPrecio | null = null;

    if (precioCambio && ingrediente.precioActivo !== undefined && ingrediente.precioActivo > 0) {
      nuevoHistorico = {
        id: 'hist_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        ingredienteId: ingrediente.id,
        proveedorId: 'ajuste_manual',
        precioUnitarioAP: ingrediente.precioActivo,
        cantidad: 0
      };
      const historicos = [...this.getLocal<RegistroHistoricoPrecio[]>(KEYS.HISTORICO_PRECIOS, [])];
      historicos.unshift(nuevoHistorico);
      this.setLocal(KEYS.HISTORICO_PRECIOS, historicos);
      this.enqueueMutation('historico_precios', 'upsert', mapHistoricoToDB(nuevoHistorico));
    }

    if (index >= 0) {
      ingredientes[index] = ingrediente;
    } else {
      ingredientes.push(ingrediente);
    }

    // 1. ACTUALIZACIÓN LOCAL INMEDIATA EN MEMORIA (0 ms)
    this.setLocal(KEYS.INGREDIENTES, ingredientes);

    // 2. ENCOLAR MUTACIÓN PARA SINCRONIZACIÓN OFFLINE/ONLINE
    this.enqueueMutation('ingredientes', 'upsert', mapIngredienteToDB(ingrediente));

    return ingredientes;
  }

  async deleteIngrediente(id: string): Promise<Ingrediente[]> {
    const ingredientes = this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, []);
    const filtrados = ingredientes.filter(i => i.id !== id);
    this.setLocal(KEYS.INGREDIENTES, filtrados);

    this.enqueueMutation('ingredientes', 'delete', { id });

    return filtrados;
  }

  // --- MÓDULO 4: CONFIGURACIÓN FINANCIERA ---
  async getConfiguracion(forceRefresh = false): Promise<ConfiguracionCostos> {
    const local = this.getLocal<ConfiguracionCostos>(KEYS.CONFIGURACION, CONFIGURACION_INICIAL);
    if (!isSupabaseConfigured || !isOnline()) {
      return local;
    }

    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(KEYS.CONFIGURACION) || 0;
    const isCacheStale = now - lastFetch > this.CACHE_TTL;

    if (!forceRefresh) {
      if (isCacheStale) {
        this.revalidateConfiguracion();
      }
      return local;
    }

    return this.revalidateConfiguracion();
  }

  private async revalidateConfiguracion(): Promise<ConfiguracionCostos> {
    if (!isSupabaseConfigured || !isOnline()) {
      return this.getLocal<ConfiguracionCostos>(KEYS.CONFIGURACION, CONFIGURACION_INICIAL);
    }

    if (this.inFlightFetches.has(KEYS.CONFIGURACION)) {
      return this.inFlightFetches.get(KEYS.CONFIGURACION)!;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('configuracion_costos').select('*').eq('id', 'default').maybeSingle(),
          3500
        );
        if (!error && data) {
          const config = mapConfigFromDB(data);
          this.setLocal(KEYS.CONFIGURACION, config);
          this.lastFetchTime.set(KEYS.CONFIGURACION, Date.now());
          return config;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase configuración, usando local:', err);
      } finally {
        this.inFlightFetches.delete(KEYS.CONFIGURACION);
      }
      return this.getLocal<ConfiguracionCostos>(KEYS.CONFIGURACION, CONFIGURACION_INICIAL);
    })();

    this.inFlightFetches.set(KEYS.CONFIGURACION, fetchPromise);
    return fetchPromise;
  }

  async saveConfiguracion(config: ConfiguracionCostos): Promise<ConfiguracionCostos> {
    this.setLocal(KEYS.CONFIGURACION, config);
    this.enqueueMutation('configuracion_costos', 'upsert', mapConfigToDB(config));
    return config;
  }

  // --- MÓDULO 2: RECETAS ---
  async getRecetas(forceRefresh = false): Promise<Receta[]> {
    const local = this.getLocal<Receta[]>(KEYS.RECETAS, []);
    if (!isSupabaseConfigured || !isOnline()) {
      return local;
    }

    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(KEYS.RECETAS) || 0;
    const isCacheStale = now - lastFetch > this.CACHE_TTL;

    if (local.length > 0 && !forceRefresh) {
      if (isCacheStale) {
        this.revalidateRecetas();
      }
      return local;
    }

    return this.revalidateRecetas();
  }

  private async revalidateRecetas(): Promise<Receta[]> {
    if (!isSupabaseConfigured || !isOnline()) {
      return this.getLocal<Receta[]>(KEYS.RECETAS, []);
    }

    if (this.inFlightFetches.has(KEYS.RECETAS)) {
      return this.inFlightFetches.get(KEYS.RECETAS)!;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('recetas').select('*').order('nombre', { ascending: true }),
          3500
        );
        if (!error && data) {
          const list = data.map(mapRecetaFromDB);
          this.setLocal(KEYS.RECETAS, list);
          this.lastFetchTime.set(KEYS.RECETAS, Date.now());
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase recetas, usando local:', err);
      } finally {
        this.inFlightFetches.delete(KEYS.RECETAS);
      }
      return this.getLocal<Receta[]>(KEYS.RECETAS, []);
    })();

    this.inFlightFetches.set(KEYS.RECETAS, fetchPromise);
    return fetchPromise;
  }

  async saveReceta(receta: Receta): Promise<Receta[]> {
    receta.ultimaActualizacion = new Date().toISOString();

    const recetas = [...this.getLocal<Receta[]>(KEYS.RECETAS, [])];
    const index = recetas.findIndex(r => r.id === receta.id);
    if (index >= 0) {
      recetas[index] = receta;
    } else {
      recetas.push(receta);
    }
    
    this.setLocal(KEYS.RECETAS, recetas);
    this.enqueueMutation('recetas', 'upsert', mapRecetaToDB(receta));

    return recetas;
  }

  async deleteReceta(id: string): Promise<Receta[]> {
    const recetas = this.getLocal<Receta[]>(KEYS.RECETAS, []);
    const filtrados = recetas.filter(r => r.id !== id);
    this.setLocal(KEYS.RECETAS, filtrados);

    this.enqueueMutation('recetas', 'delete', { id });

    return filtrados;
  }

  // --- MÓDULO 3: PROVEEDORES ---
  async getProveedores(forceRefresh = false): Promise<Proveedor[]> {
    const local = this.getLocal<Proveedor[]>(KEYS.PROVEEDORES, []);
    if (!isSupabaseConfigured || !isOnline()) {
      return local;
    }

    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(KEYS.PROVEEDORES) || 0;
    const isCacheStale = now - lastFetch > this.CACHE_TTL;

    if (local.length > 0 && !forceRefresh) {
      if (isCacheStale) {
        this.revalidateProveedores();
      }
      return local;
    }

    return this.revalidateProveedores();
  }

  private async revalidateProveedores(): Promise<Proveedor[]> {
    if (!isSupabaseConfigured || !isOnline()) {
      return this.getLocal<Proveedor[]>(KEYS.PROVEEDORES, []);
    }

    if (this.inFlightFetches.has(KEYS.PROVEEDORES)) {
      return this.inFlightFetches.get(KEYS.PROVEEDORES)!;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('proveedores').select('*').order('nombre_comercial', { ascending: true }),
          3500
        );
        if (!error && data) {
          const list = data.map(mapProveedorFromDB);
          this.setLocal(KEYS.PROVEEDORES, list);
          this.lastFetchTime.set(KEYS.PROVEEDORES, Date.now());
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase proveedores, usando local:', err);
      } finally {
        this.inFlightFetches.delete(KEYS.PROVEEDORES);
      }
      return this.getLocal<Proveedor[]>(KEYS.PROVEEDORES, []);
    })();

    this.inFlightFetches.set(KEYS.PROVEEDORES, fetchPromise);
    return fetchPromise;
  }

  async saveProveedor(proveedor: Proveedor): Promise<Proveedor[]> {
    const proveedores = [...this.getLocal<Proveedor[]>(KEYS.PROVEEDORES, [])];
    const index = proveedores.findIndex(p => p.id === proveedor.id);
    
    if (index >= 0) {
      proveedores[index] = proveedor;
    } else {
      proveedores.push(proveedor);
    }
    
    this.setLocal(KEYS.PROVEEDORES, proveedores);
    this.enqueueMutation('proveedores', 'upsert', mapProveedorToDB(proveedor));

    return proveedores;
  }

  async deleteProveedor(id: string): Promise<Proveedor[]> {
    const proveedores = this.getLocal<Proveedor[]>(KEYS.PROVEEDORES, []);
    const filtrados = proveedores.filter(p => p.id !== id);
    this.setLocal(KEYS.PROVEEDORES, filtrados);

    this.enqueueMutation('proveedores', 'delete', { id });

    return filtrados;
  }

  // --- REGISTRO DE COMPRAS (FACTURAS) Y HISTORIAL ---
  async getFacturas(forceRefresh = false): Promise<FacturaCompra[]> {
    const local = this.getLocal<FacturaCompra[]>(KEYS.FACTURAS, []);
    if (!isSupabaseConfigured || !isOnline()) {
      return local;
    }

    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(KEYS.FACTURAS) || 0;
    const isCacheStale = now - lastFetch > this.CACHE_TTL;

    if (local.length > 0 && !forceRefresh) {
      if (isCacheStale) {
        this.revalidateFacturas();
      }
      return local;
    }

    return this.revalidateFacturas();
  }

  private async revalidateFacturas(): Promise<FacturaCompra[]> {
    if (!isSupabaseConfigured || !isOnline()) {
      return this.getLocal<FacturaCompra[]>(KEYS.FACTURAS, []);
    }

    if (this.inFlightFetches.has(KEYS.FACTURAS)) {
      return this.inFlightFetches.get(KEYS.FACTURAS)!;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('facturas_compras').select('*').order('fecha_compra', { ascending: false }),
          3500
        );
        if (!error && data) {
          const list = data.map(mapFacturaFromDB);
          this.setLocal(KEYS.FACTURAS, list);
          this.lastFetchTime.set(KEYS.FACTURAS, Date.now());
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase facturas, usando local:', err);
      } finally {
        this.inFlightFetches.delete(KEYS.FACTURAS);
      }
      return this.getLocal<FacturaCompra[]>(KEYS.FACTURAS, []);
    })();

    this.inFlightFetches.set(KEYS.FACTURAS, fetchPromise);
    return fetchPromise;
  }

  async saveFactura(factura: FacturaCompra): Promise<FacturaCompra[]> {
    const facturas = [...this.getLocal<FacturaCompra[]>(KEYS.FACTURAS, [])];
    facturas.unshift(factura);
    this.setLocal(KEYS.FACTURAS, facturas);

    // Actualizar precios de ingredientes e inyectar al historial
    const ingredientes = [...this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, [])];
    const historicos = [...this.getLocal<RegistroHistoricoPrecio[]>(KEYS.HISTORICO_PRECIOS, [])];
    const nuevosHistoricos: RegistroHistoricoPrecio[] = [];
    const ingredientesModificados: Ingrediente[] = [];

    for (const item of factura.items) {
      const nuevoHistorico: RegistroHistoricoPrecio = {
        id: 'hist_' + Math.random().toString(36).substr(2, 9),
        timestamp: factura.fechaCompra,
        ingredienteId: item.ingredienteId,
        proveedorId: factura.proveedorId,
        precioUnitarioAP: item.precioCompraAP / item.cantidadComprada,
        cantidad: item.cantidadComprada
      };
      nuevosHistoricos.push(nuevoHistorico);
      historicos.unshift(nuevoHistorico);

      const ingIndex = ingredientes.findIndex(i => i.id === item.ingredienteId);
      if (ingIndex >= 0) {
        ingredientes[ingIndex] = {
          ...ingredientes[ingIndex],
          precioActivo: item.precioCompraAP / item.cantidadComprada,
          stockActual: (ingredientes[ingIndex].stockActual || 0) + item.cantidadComprada,
          fechaVencimiento: item.fechaVencimiento || ingredientes[ingIndex].fechaVencimiento,
          ultimaActualizacion: new Date().toISOString()
        };
        ingredientesModificados.push(ingredientes[ingIndex]);
      }
    }

    this.setLocal(KEYS.HISTORICO_PRECIOS, historicos);
    this.setLocal(KEYS.INGREDIENTES, ingredientes);

    // Encolar mutaciones
    this.enqueueMutation('facturas_compras', 'upsert', mapFacturaToDB(factura));
    if (nuevosHistoricos.length > 0) {
      this.enqueueMutation('historico_precios', 'upsert', nuevosHistoricos.map(mapHistoricoToDB));
    }
    if (ingredientesModificados.length > 0) {
      this.enqueueMutation('ingredientes', 'upsert', ingredientesModificados.map(mapIngredienteToDB));
    }

    return facturas;
  }

  async getHistoricoPrecios(forceRefresh = false): Promise<RegistroHistoricoPrecio[]> {
    const local = this.getLocal<RegistroHistoricoPrecio[]>(KEYS.HISTORICO_PRECIOS, []);
    if (!isSupabaseConfigured || !isOnline()) {
      return local;
    }

    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(KEYS.HISTORICO_PRECIOS) || 0;
    const isCacheStale = now - lastFetch > this.CACHE_TTL;

    if (local.length > 0 && !forceRefresh) {
      if (isCacheStale) {
        this.revalidateHistoricoPrecios();
      }
      return local;
    }

    return this.revalidateHistoricoPrecios();
  }

  private async revalidateHistoricoPrecios(): Promise<RegistroHistoricoPrecio[]> {
    if (!isSupabaseConfigured || !isOnline()) {
      return this.getLocal<RegistroHistoricoPrecio[]>(KEYS.HISTORICO_PRECIOS, []);
    }

    if (this.inFlightFetches.has(KEYS.HISTORICO_PRECIOS)) {
      return this.inFlightFetches.get(KEYS.HISTORICO_PRECIOS)!;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('historico_precios').select('*').order('timestamp', { ascending: false }),
          3500
        );
        if (!error && data) {
          const list = data.map(mapHistoricoFromDB);
          this.setLocal(KEYS.HISTORICO_PRECIOS, list);
          this.lastFetchTime.set(KEYS.HISTORICO_PRECIOS, Date.now());
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase histórico precios, usando local:', err);
      } finally {
        this.inFlightFetches.delete(KEYS.HISTORICO_PRECIOS);
      }
      return this.getLocal<RegistroHistoricoPrecio[]>(KEYS.HISTORICO_PRECIOS, []);
    })();

    this.inFlightFetches.set(KEYS.HISTORICO_PRECIOS, fetchPromise);
    return fetchPromise;
  }

  // --- REGISTRO DE MERMAS OPERATIVAS ---
  async getMermas(forceRefresh = false): Promise<RegistroMermaOperativa[]> {
    const local = this.getLocal<RegistroMermaOperativa[]>(KEYS.MERMAS, []);
    if (!isSupabaseConfigured || !isOnline()) {
      return local;
    }

    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(KEYS.MERMAS) || 0;
    const isCacheStale = now - lastFetch > this.CACHE_TTL;

    if (local.length > 0 && !forceRefresh) {
      if (isCacheStale) {
        this.revalidateMermas();
      }
      return local;
    }

    return this.revalidateMermas();
  }

  private async revalidateMermas(): Promise<RegistroMermaOperativa[]> {
    if (!isSupabaseConfigured || !isOnline()) {
      return this.getLocal<RegistroMermaOperativa[]>(KEYS.MERMAS, []);
    }

    if (this.inFlightFetches.has(KEYS.MERMAS)) {
      return this.inFlightFetches.get(KEYS.MERMAS)!;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('mermas_operativas').select('*').order('fecha_merma', { ascending: false }),
          3500
        );
        if (!error && data) {
          const list = data.map(mapMermaFromDB);
          this.setLocal(KEYS.MERMAS, list);
          this.lastFetchTime.set(KEYS.MERMAS, Date.now());
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase mermas, usando local:', err);
      } finally {
        this.inFlightFetches.delete(KEYS.MERMAS);
      }
      return this.getLocal<RegistroMermaOperativa[]>(KEYS.MERMAS, []);
    })();

    this.inFlightFetches.set(KEYS.MERMAS, fetchPromise);
    return fetchPromise;
  }

  async saveMerma(merma: RegistroMermaOperativa): Promise<RegistroMermaOperativa[]> {
    const mermas = [...this.getLocal<RegistroMermaOperativa[]>(KEYS.MERMAS, [])];
    mermas.unshift(merma);
    this.setLocal(KEYS.MERMAS, mermas);

    // Deducir stock localmente
    let ingModificado: Ingrediente | null = null;
    let recModificada: Receta | null = null;

    if (merma.tipoOrigen === 'ingrediente') {
      const ingredientes = [...this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, [])];
      const ingIndex = ingredientes.findIndex(i => i.id === merma.referenciaId);
      if (ingIndex >= 0) {
        ingredientes[ingIndex] = {
          ...ingredientes[ingIndex],
          stockActual: Math.max(0, (ingredientes[ingIndex].stockActual || 0) - merma.cantidadPerdida),
          ultimaActualizacion: new Date().toISOString()
        };
        ingModificado = ingredientes[ingIndex];
        this.setLocal(KEYS.INGREDIENTES, ingredientes);
      }
    } else if (merma.tipoOrigen === 'receta') {
      const recetas = [...this.getLocal<Receta[]>(KEYS.RECETAS, [])];
      const recIndex = recetas.findIndex(r => r.id === merma.referenciaId);
      if (recIndex >= 0) {
        recetas[recIndex] = {
          ...recetas[recIndex],
          stockActual: Math.max(0, (recetas[recIndex].stockActual || 0) - merma.cantidadPerdida),
          ultimaActualizacion: new Date().toISOString()
        };
        recModificada = recetas[recIndex];
        this.setLocal(KEYS.RECETAS, recetas);
      }
    }

    this.enqueueMutation('mermas_operativas', 'upsert', mapMermaToDB(merma));
    if (ingModificado) {
      this.enqueueMutation('ingredientes', 'upsert', mapIngredienteToDB(ingModificado));
    }
    if (recModificada) {
      this.enqueueMutation('recetas', 'upsert', mapRecetaToDB(recModificada));
    }

    return mermas;
  }

  async deleteMerma(id: string): Promise<RegistroMermaOperativa[]> {
    const mermas = this.getLocal<RegistroMermaOperativa[]>(KEYS.MERMAS, []);
    const mermaToDelete = mermas.find(m => m.id === id);
    const filtradas = mermas.filter(m => m.id !== id);
    this.setLocal(KEYS.MERMAS, filtradas);

    let ingModificado: Ingrediente | null = null;
    let recModificada: Receta | null = null;

    if (mermaToDelete) {
      if (mermaToDelete.tipoOrigen === 'ingrediente') {
        const ingredientes = [...this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, [])];
        const ingIndex = ingredientes.findIndex(i => i.id === mermaToDelete.referenciaId);
        if (ingIndex >= 0) {
          ingredientes[ingIndex] = {
            ...ingredientes[ingIndex],
            stockActual: (ingredientes[ingIndex].stockActual || 0) + mermaToDelete.cantidadPerdida,
            ultimaActualizacion: new Date().toISOString()
          };
          ingModificado = ingredientes[ingIndex];
          this.setLocal(KEYS.INGREDIENTES, ingredientes);
        }
      } else if (mermaToDelete.tipoOrigen === 'receta') {
        const recetas = [...this.getLocal<Receta[]>(KEYS.RECETAS, [])];
        const recIndex = recetas.findIndex(r => r.id === mermaToDelete.referenciaId);
        if (recIndex >= 0) {
          recetas[recIndex] = {
            ...recetas[recIndex],
            stockActual: (recetas[recIndex].stockActual || 0) + mermaToDelete.cantidadPerdida,
            ultimaActualizacion: new Date().toISOString()
          };
          recModificada = recetas[recIndex];
          this.setLocal(KEYS.RECETAS, recetas);
        }
      }
    }

    this.enqueueMutation('mermas_operativas', 'delete', { id });
    if (ingModificado) {
      this.enqueueMutation('ingredientes', 'upsert', mapIngredienteToDB(ingModificado));
    }
    if (recModificada) {
      this.enqueueMutation('recetas', 'upsert', mapRecetaToDB(recModificada));
    }

    return filtradas;
  }

  // --- MÓDULO 5: LOTES DE PRODUCCIÓN REAL ---
  async getLotesProduccion(forceRefresh = false): Promise<LoteProduccion[]> {
    const local = this.getLocal<LoteProduccion[]>(KEYS.LOTES_PRODUCCION, []);
    if (!isSupabaseConfigured || !isOnline()) {
      return local;
    }

    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(KEYS.LOTES_PRODUCCION) || 0;
    const isCacheStale = now - lastFetch > this.CACHE_TTL;

    if (local.length > 0 && !forceRefresh) {
      if (isCacheStale) {
        this.revalidateLotesProduccion();
      }
      return local;
    }

    return this.revalidateLotesProduccion();
  }

  private async revalidateLotesProduccion(): Promise<LoteProduccion[]> {
    if (!isSupabaseConfigured || !isOnline()) {
      return this.getLocal<LoteProduccion[]>(KEYS.LOTES_PRODUCCION, []);
    }

    if (this.inFlightFetches.has(KEYS.LOTES_PRODUCCION)) {
      return this.inFlightFetches.get(KEYS.LOTES_PRODUCCION)!;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('lotes_produccion').select('*').order('fecha', { ascending: false }),
          3500
        );
        if (!error && data) {
          const list = data.map(mapLoteFromDB);
          this.setLocal(KEYS.LOTES_PRODUCCION, list);
          this.lastFetchTime.set(KEYS.LOTES_PRODUCCION, Date.now());
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase lotes producción, usando local:', err);
      } finally {
        this.inFlightFetches.delete(KEYS.LOTES_PRODUCCION);
      }
      return this.getLocal<LoteProduccion[]>(KEYS.LOTES_PRODUCCION, []);
    })();

    this.inFlightFetches.set(KEYS.LOTES_PRODUCCION, fetchPromise);
    return fetchPromise;
  }

  async saveLoteProduccion(lote: LoteProduccion): Promise<LoteProduccion[]> {
    const lotes = [...this.getLocal<LoteProduccion[]>(KEYS.LOTES_PRODUCCION, [])];
    const index = lotes.findIndex(l => l.id === lote.id);
    
    const ingredientes = [...this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, [])];
    const recetas = [...this.getLocal<Receta[]>(KEYS.RECETAS, [])];
    const ingredientesModificados: Ingrediente[] = [];
    let recetaModificada: Receta | null = null;

    if (index >= 0) {
      lotes[index] = lote;
    } else {
      lotes.unshift(lote);

      // Deducir stock de insumos reales consumidos localmente
      for (const item of lote.insumos) {
        if (!item.esRecetaAnidada) {
          const ingIndex = ingredientes.findIndex(i => i.id === item.ingredienteId);
          if (ingIndex >= 0) {
            ingredientes[ingIndex] = {
              ...ingredientes[ingIndex],
              stockActual: Math.max(0, (ingredientes[ingIndex].stockActual || 0) - item.cantidadReal),
              ultimaActualizacion: new Date().toISOString()
            };
            ingredientesModificados.push(ingredientes[ingIndex]);
          }
        }
      }

      // Incrementar stock de la receta producida localmente
      const recIndex = recetas.findIndex(r => r.id === lote.recetaId);
      if (recIndex >= 0) {
        recetas[recIndex] = {
          ...recetas[recIndex],
          stockActual: (recetas[recIndex].stockActual || 0) + lote.cantidadProducida,
          ultimaActualizacion: new Date().toISOString()
        };
        recetaModificada = recetas[recIndex];
      }
    }
    
    this.setLocal(KEYS.LOTES_PRODUCCION, lotes);
    this.setLocal(KEYS.INGREDIENTES, ingredientes);
    this.setLocal(KEYS.RECETAS, recetas);

    this.enqueueMutation('lotes_produccion', 'upsert', mapLoteToDB(lote));
    if (ingredientesModificados.length > 0) {
      this.enqueueMutation('ingredientes', 'upsert', ingredientesModificados.map(mapIngredienteToDB));
    }
    if (recetaModificada) {
      this.enqueueMutation('recetas', 'upsert', mapRecetaToDB(recetaModificada));
    }

    return lotes;
  }

  async deleteLoteProduccion(id: string): Promise<LoteProduccion[]> {
    const lotes = this.getLocal<LoteProduccion[]>(KEYS.LOTES_PRODUCCION, []);
    const loteToDelete = lotes.find(l => l.id === id);
    const filtrados = lotes.filter(l => l.id !== id);
    this.setLocal(KEYS.LOTES_PRODUCCION, filtrados);

    const ingredientes = [...this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, [])];
    const recetas = [...this.getLocal<Receta[]>(KEYS.RECETAS, [])];
    const ingredientesModificados: Ingrediente[] = [];
    let recetaModificada: Receta | null = null;

    if (loteToDelete) {
      for (const item of loteToDelete.insumos) {
        if (!item.esRecetaAnidada) {
          const ingIndex = ingredientes.findIndex(i => i.id === item.ingredienteId);
          if (ingIndex >= 0) {
            ingredientes[ingIndex] = {
              ...ingredientes[ingIndex],
              stockActual: (ingredientes[ingIndex].stockActual || 0) + item.cantidadReal,
              ultimaActualizacion: new Date().toISOString()
            };
            ingredientesModificados.push(ingredientes[ingIndex]);
          }
        }
      }

      // Decrementar stock de la receta producida
      const recIndex = recetas.findIndex(r => r.id === loteToDelete.recetaId);
      if (recIndex >= 0) {
        recetas[recIndex] = {
          ...recetas[recIndex],
          stockActual: Math.max(0, (recetas[recIndex].stockActual || 0) - loteToDelete.cantidadProducida),
          ultimaActualizacion: new Date().toISOString()
        };
        recetaModificada = recetas[recIndex];
      }

      this.setLocal(KEYS.INGREDIENTES, ingredientes);
      this.setLocal(KEYS.RECETAS, recetas);
    }

    this.enqueueMutation('lotes_produccion', 'delete', { id });
    if (ingredientesModificados.length > 0) {
      this.enqueueMutation('ingredientes', 'upsert', ingredientesModificados.map(mapIngredienteToDB));
    }
    if (recetaModificada) {
      this.enqueueMutation('recetas', 'upsert', mapRecetaToDB(recetaModificada));
    }

    return filtrados;
  }

  // --- MÓDULO DE VENTAS (REPORTES POS) ---
  async getVentas(forceRefresh = false): Promise<RegistroVentas[]> {
    const local = this.getLocal<RegistroVentas[]>(KEYS.VENTAS, []);
    if (!isSupabaseConfigured || !isOnline()) {
      return local;
    }

    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(KEYS.VENTAS) || 0;
    const isCacheStale = now - lastFetch > this.CACHE_TTL;

    if (local.length > 0 && !forceRefresh) {
      if (isCacheStale) {
        this.revalidateVentas();
      }
      return local;
    }

    return this.revalidateVentas();
  }

  private async revalidateVentas(): Promise<RegistroVentas[]> {
    if (!isSupabaseConfigured || !isOnline()) {
      return this.getLocal<RegistroVentas[]>(KEYS.VENTAS, []);
    }

    if (this.inFlightFetches.has(KEYS.VENTAS)) {
      return this.inFlightFetches.get(KEYS.VENTAS)!;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.from('registros_ventas').select('*').order('fecha_inicio', { ascending: false }),
          3500
        );
        if (!error && data) {
          const list = data.map(mapVentaFromDB);
          this.setLocal(KEYS.VENTAS, list);
          this.lastFetchTime.set(KEYS.VENTAS, Date.now());
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase ventas, usando local:', err);
      } finally {
        this.inFlightFetches.delete(KEYS.VENTAS);
      }
      return this.getLocal<RegistroVentas[]>(KEYS.VENTAS, []);
    })();

    this.inFlightFetches.set(KEYS.VENTAS, fetchPromise);
    return fetchPromise;
  }

  async saveVenta(venta: RegistroVentas): Promise<RegistroVentas[]> {
    const ventas = [...this.getLocal<RegistroVentas[]>(KEYS.VENTAS, [])];
    ventas.unshift(venta);
    this.setLocal(KEYS.VENTAS, ventas);

    // Deducir stock de ingredientes en cascada o de recetas producidas
    const recetas = [...this.getLocal<Receta[]>(KEYS.RECETAS, [])];
    const ingredientes = [...this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, [])];
    
    const deducirIngredientes: { [id: string]: number } = {};
    const deducirRecetas: { [id: string]: number } = {};

    const explotarReceta = (recetaId: string, qty: number, visited = new Set<string>()) => {
      if (visited.has(recetaId)) return;
      visited.add(recetaId);

      const rec = recetas.find(r => r.id === recetaId);
      if (!rec) return;

      if (rec.esSubReceta || rec.modoDescuento === 'produccion_previa') {
        deducirRecetas[recetaId] = (deducirRecetas[recetaId] || 0) + qty;
        return;
      }

      const scaleFactor = qty / (rec.cantidadRendimiento || 1);

      rec.ingredientes.forEach(item => {
        const qtyNeeded = item.cantidadRequerida * scaleFactor;
        if (item.esRecetaAnidada) {
          explotarReceta(item.ingredienteId, qtyNeeded, new Set(visited));
        } else {
          deducirIngredientes[item.ingredienteId] = (deducirIngredientes[item.ingredienteId] || 0) + qtyNeeded;
        }
      });
    };

    for (const item of venta.items) {
      const rec = recetas.find(r => r.id === item.recetaId);
      if (rec && (rec.esSubReceta || rec.modoDescuento === 'produccion_previa')) {
        deducirRecetas[item.recetaId] = (deducirRecetas[item.recetaId] || 0) + item.cantidadVendida;
      } else {
        explotarReceta(item.recetaId, item.cantidadVendida);
      }
    }

    const ingredientesModificados: Ingrediente[] = [];
    for (const ingId of Object.keys(deducirIngredientes)) {
      const ingIdx = ingredientes.findIndex(i => i.id === ingId);
      if (ingIdx >= 0) {
        ingredientes[ingIdx] = {
          ...ingredientes[ingIdx],
          stockActual: Math.max(0, (ingredientes[ingIdx].stockActual || 0) - deducirIngredientes[ingId]),
          ultimaActualizacion: new Date().toISOString()
        };
        ingredientesModificados.push(ingredientes[ingIdx]);
      }
    }

    const recetasModificadas: Receta[] = [];
    for (const recId of Object.keys(deducirRecetas)) {
      const recIdx = recetas.findIndex(r => r.id === recId);
      if (recIdx >= 0) {
        recetas[recIdx] = {
          ...recetas[recIdx],
          stockActual: Math.max(0, (recetas[recIdx].stockActual || 0) - deducirRecetas[recId]),
          ultimaActualizacion: new Date().toISOString()
        };
        recetasModificadas.push(recetas[recIdx]);
      }
    }

    this.setLocal(KEYS.INGREDIENTES, ingredientes);
    this.setLocal(KEYS.RECETAS, recetas);

    this.enqueueMutation('registros_ventas', 'upsert', mapVentaToDB(venta));
    if (ingredientesModificados.length > 0) {
      this.enqueueMutation('ingredientes', 'upsert', ingredientesModificados.map(mapIngredienteToDB));
    }
    if (recetasModificadas.length > 0) {
      this.enqueueMutation('recetas', 'upsert', recetasModificadas.map(mapRecetaToDB));
    }

    return ventas;
  }

  async deleteVenta(id: string): Promise<RegistroVentas[]> {
    const ventas = this.getLocal<RegistroVentas[]>(KEYS.VENTAS, []);
    const ventaToDelete = ventas.find(v => v.id === id);
    const filtradas = ventas.filter(v => v.id !== id);
    this.setLocal(KEYS.VENTAS, filtradas);

    const recetas = [...this.getLocal<Receta[]>(KEYS.RECETAS, [])];
    const ingredientes = [...this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, [])];
    const ingredientesModificados: Ingrediente[] = [];
    const recetasModificadas: Receta[] = [];

    if (ventaToDelete) {
      const resultDevolucion: { [id: string]: number } = {};
      const devolucionRecetas: { [id: string]: number } = {};

      const explotarReceta = (recetaId: string, qty: number, visited = new Set<string>()) => {
        if (visited.has(recetaId)) return;
        visited.add(recetaId);

        const rec = recetas.find(r => r.id === recetaId);
        if (!rec) return;

        if (rec.esSubReceta || rec.modoDescuento === 'produccion_previa') {
          devolucionRecetas[recetaId] = (devolucionRecetas[recetaId] || 0) + qty;
          return;
        }

        const scaleFactor = qty / (rec.cantidadRendimiento || 1);

        rec.ingredientes.forEach(item => {
          const qtyNeeded = item.cantidadRequerida * scaleFactor;
          if (item.esRecetaAnidada) {
            explotarReceta(item.ingredienteId, qtyNeeded, new Set(visited));
          } else {
            resultDevolucion[item.ingredienteId] = (resultDevolucion[item.ingredienteId] || 0) + qtyNeeded;
          }
        });
      };

      for (const item of ventaToDelete.items) {
        const rec = recetas.find(r => r.id === item.recetaId);
        if (rec && (rec.esSubReceta || rec.modoDescuento === 'produccion_previa')) {
          devolucionRecetas[item.recetaId] = (devolucionRecetas[item.recetaId] || 0) + item.cantidadVendida;
        } else {
          explotarReceta(item.recetaId, item.cantidadVendida);
        }
      }

      // Devolver stock al catálogo de ingredientes
      for (const ingId of Object.keys(resultDevolucion)) {
        const ingIdx = ingredientes.findIndex(i => i.id === ingId);
        if (ingIdx >= 0) {
          ingredientes[ingIdx] = {
            ...ingredientes[ingIdx],
            stockActual: (ingredientes[ingIdx].stockActual || 0) + resultDevolucion[ingId],
            ultimaActualizacion: new Date().toISOString()
          };
          ingredientesModificados.push(ingredientes[ingIdx]);
        }
      }

      // Devolver stock al catálogo de recetas
      for (const recId of Object.keys(devolucionRecetas)) {
        const recIdx = recetas.findIndex(r => r.id === recId);
        if (recIdx >= 0) {
          recetas[recIdx] = {
            ...recetas[recIdx],
            stockActual: (recetas[recIdx].stockActual || 0) + devolucionRecetas[recId],
            ultimaActualizacion: new Date().toISOString()
          };
          recetasModificadas.push(recetas[recIdx]);
        }
      }

      this.setLocal(KEYS.INGREDIENTES, ingredientes);
      this.setLocal(KEYS.RECETAS, recetas);
    }

    this.enqueueMutation('registros_ventas', 'delete', { id });
    if (ingredientesModificados.length > 0) {
      this.enqueueMutation('ingredientes', 'upsert', ingredientesModificados.map(mapIngredienteToDB));
    }
    if (recetasModificadas.length > 0) {
      this.enqueueMutation('recetas', 'upsert', recetasModificadas.map(mapRecetaToDB));
    }

    return filtradas;
  }

  // --- MOTOR DE CÁLCULO GASTRONÓMICO ---
  
  /**
   * Calcula el costo neto de uso de un ingrediente en una receta (con merma y densidad)
   */
  calcularCostoUsoIngrediente(ingrediente: Ingrediente, cantidadRequerida: number): number {
    const costoAP = ingrediente.precioActivo || 0;
    return costoAP * cantidadRequerida;
  }

  /**
   * Calcula de forma recursiva y profunda el costo de una Receta (soportando sub-recetas)
   * 100% síncrono e instantáneo en memoria local
   */
  async calcularCostoReceta(recetaId: string, recetasDisponibles?: Receta[], ingredientesDisponibles?: Ingrediente[]): Promise<number> {
    const recetas = recetasDisponibles || this.getLocal<Receta[]>(KEYS.RECETAS, []);
    const receta = recetas.find(r => r.id === recetaId);
    if (!receta) return 0;

    const ingredientes = ingredientesDisponibles || this.getLocal<Ingrediente[]>(KEYS.INGREDIENTES, []);
    let costoTotalLote = 0;

    for (const item of receta.ingredientes) {
      if (item.esRecetaAnidada) {
        const subReceta = recetas.find(r => r.id === item.ingredienteId);
        if (subReceta) {
          const costoSubLote = await this.calcularCostoReceta(subReceta.id, recetas, ingredientes);
          const cantidadLote = subReceta.cantidadRendimiento || 1;
          const costoPorUnidadSub = costoSubLote / cantidadLote;
          costoTotalLote += costoPorUnidadSub * item.cantidadRequerida;
        }
      } else {
        const ing = ingredientes.find(i => i.id === item.ingredienteId);
        if (ing) {
          costoTotalLote += this.calcularCostoUsoIngrediente(ing, item.cantidadRequerida);
        }
      }
    }

    return costoTotalLote;
  }
}

export const db = new LocalDatabase();
