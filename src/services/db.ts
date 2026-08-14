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
  VENTAS: 'mixo_ventas'
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
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  constructor() {
    // Si el navegador tiene datos residuales de los mocks antiguos en localStorage, limpiarlos
    const storedIngs = this.get<any[]>(KEYS.INGREDIENTES, []);
    if (storedIngs.some(i => i.id === 'ing_tomate_chonto' || i.id === 'ing_pasta_lasana' || i.id === 'ing_carne_molida')) {
      localStorage.removeItem(KEYS.INGREDIENTES);
      localStorage.removeItem(KEYS.PROVEEDORES);
      localStorage.removeItem(KEYS.RECETAS);
      localStorage.removeItem(KEYS.FACTURAS);
      localStorage.removeItem(KEYS.HISTORICO_PRECIOS);
      localStorage.removeItem(KEYS.MERMAS);
      localStorage.removeItem(KEYS.LOTES_PRODUCCION);
      localStorage.removeItem(KEYS.VENTAS);
    }

    // Inicializar semillas vacías
    if (!localStorage.getItem(KEYS.INGREDIENTES)) {
      this.set(KEYS.INGREDIENTES, []);
    }
    if (!localStorage.getItem(KEYS.CONFIGURACION)) {
      this.set(KEYS.CONFIGURACION, CONFIGURACION_INICIAL);
    }
    if (!localStorage.getItem(KEYS.PROVEEDORES)) {
      this.set(KEYS.PROVEEDORES, []);
    }
    if (!localStorage.getItem(KEYS.RECETAS)) {
      this.set(KEYS.RECETAS, []);
    }
    if (!localStorage.getItem(KEYS.FACTURAS)) {
      this.set(KEYS.FACTURAS, []);
    }
    if (!localStorage.getItem(KEYS.HISTORICO_PRECIOS)) {
      this.set(KEYS.HISTORICO_PRECIOS, []);
    }
    if (!localStorage.getItem(KEYS.MERMAS)) {
      this.set(KEYS.MERMAS, []);
    }
    if (!localStorage.getItem(KEYS.LOTES_PRODUCCION)) {
      this.set(KEYS.LOTES_PRODUCCION, []);
    }
    if (!localStorage.getItem(KEYS.VENTAS)) {
      this.set(KEYS.VENTAS, []);
    }
  }

  // --- MÓDULO 1: INGREDIENTES ---
  async getIngredientes(): Promise<Ingrediente[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('ingredientes').select('*').order('nombre', { ascending: true });
        if (!error && data) {
          const list = data.map(mapIngredienteFromDB);
          this.set(KEYS.INGREDIENTES, list);
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase ingredientes, usando fallback local:', err);
      }
    }
    return this.get<Ingrediente[]>(KEYS.INGREDIENTES, []);
  }

  async saveIngrediente(ingrediente: Ingrediente): Promise<Ingrediente[]> {
    const ingredientes = await this.getIngredientes();
    const index = ingredientes.findIndex(i => i.id === ingrediente.id);
    const anterior = index >= 0 ? ingredientes[index] : null;
    
    ingrediente.ultimaActualizacion = new Date().toISOString();
    
    const precioCambio = !anterior || anterior.precioActivo !== ingrediente.precioActivo;
    if (precioCambio && ingrediente.precioActivo !== undefined && ingrediente.precioActivo > 0) {
      const nuevoHistorico: RegistroHistoricoPrecio = {
        id: 'hist_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        ingredienteId: ingrediente.id,
        proveedorId: 'ajuste_manual',
        precioUnitarioAP: ingrediente.precioActivo,
        cantidad: 0
      };
      await this.saveHistoricoPrecio(nuevoHistorico);
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('ingredientes').upsert(mapIngredienteToDB(ingrediente));
      } catch (err) {
        console.error('Error guardando ingrediente en Supabase:', err);
      }
    }

    if (index >= 0) {
      ingredientes[index] = ingrediente;
    } else {
      ingredientes.push(ingrediente);
    }
    
    this.set(KEYS.INGREDIENTES, ingredientes);
    return ingredientes;
  }

  async deleteIngrediente(id: string): Promise<Ingrediente[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('ingredientes').delete().eq('id', id);
      } catch (err) {
        console.error('Error borrando ingrediente en Supabase:', err);
      }
    }
    const ingredientes = await this.getIngredientes();
    const filtrados = ingredientes.filter(i => i.id !== id);
    this.set(KEYS.INGREDIENTES, filtrados);
    return filtrados;
  }

  // --- MÓDULO 4: CONFIGURACIÓN FINANCIERA ---
  async getConfiguracion(): Promise<ConfiguracionCostos> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('configuracion_costos').select('*').eq('id', 'default').maybeSingle();
        if (!error && data) {
          const config = mapConfigFromDB(data);
          this.set(KEYS.CONFIGURACION, config);
          return config;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase configuracion, usando fallback:', err);
      }
    }
    return this.get<ConfiguracionCostos>(KEYS.CONFIGURACION, CONFIGURACION_INICIAL);
  }

  async saveConfiguracion(config: ConfiguracionCostos): Promise<ConfiguracionCostos> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('configuracion_costos').upsert(mapConfigToDB(config));
      } catch (err) {
        console.error('Error guardando configuración en Supabase:', err);
      }
    }
    this.set(KEYS.CONFIGURACION, config);
    return config;
  }

  // --- MÓDULO 2: RECETAS ---
  async getRecetas(): Promise<Receta[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('recetas').select('*').order('nombre', { ascending: true });
        if (!error && data) {
          const list = data.map(mapRecetaFromDB);
          this.set(KEYS.RECETAS, list);
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase recetas, usando fallback:', err);
      }
    }
    return this.get<Receta[]>(KEYS.RECETAS, []);
  }

  async saveReceta(receta: Receta): Promise<Receta[]> {
    receta.ultimaActualizacion = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabase.from('recetas').upsert(mapRecetaToDB(receta));
      } catch (err) {
        console.error('Error guardando receta en Supabase:', err);
      }
    }

    const recetas = await this.getRecetas();
    const index = recetas.findIndex(r => r.id === receta.id);
    if (index >= 0) {
      recetas[index] = receta;
    } else {
      recetas.push(receta);
    }
    
    this.set(KEYS.RECETAS, recetas);
    return recetas;
  }

  async deleteReceta(id: string): Promise<Receta[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('recetas').delete().eq('id', id);
      } catch (err) {
        console.error('Error borrando receta en Supabase:', err);
      }
    }
    const recetas = await this.getRecetas();
    const filtrados = recetas.filter(r => r.id !== id);
    this.set(KEYS.RECETAS, filtrados);
    return filtrados;
  }

  // --- MÓDULO 3: PROVEEDORES ---
  async getProveedores(): Promise<Proveedor[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('proveedores').select('*').order('nombre_comercial', { ascending: true });
        if (!error && data) {
          const list = data.map(mapProveedorFromDB);
          this.set(KEYS.PROVEEDORES, list);
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase proveedores, usando fallback:', err);
      }
    }
    return this.get<Proveedor[]>(KEYS.PROVEEDORES, []);
  }

  async saveProveedor(proveedor: Proveedor): Promise<Proveedor[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('proveedores').upsert(mapProveedorToDB(proveedor));
      } catch (err) {
        console.error('Error guardando proveedor en Supabase:', err);
      }
    }
    const proveedores = await this.getProveedores();
    const index = proveedores.findIndex(p => p.id === proveedor.id);
    
    if (index >= 0) {
      proveedores[index] = proveedor;
    } else {
      proveedores.push(proveedor);
    }
    
    this.set(KEYS.PROVEEDORES, proveedores);
    return proveedores;
  }

  async deleteProveedor(id: string): Promise<Proveedor[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('proveedores').delete().eq('id', id);
      } catch (err) {
        console.error('Error borrando proveedor en Supabase:', err);
      }
    }
    const proveedores = await this.getProveedores();
    const filtrados = proveedores.filter(p => p.id !== id);
    this.set(KEYS.PROVEEDORES, filtrados);
    return filtrados;
  }

  // --- REGISTRO DE COMPRAS (FACTURAS) Y HISTORIAL ---
  async getFacturas(): Promise<FacturaCompra[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('facturas_compras').select('*').order('fecha_compra', { ascending: false });
        if (!error && data) {
          const list = data.map(mapFacturaFromDB);
          this.set(KEYS.FACTURAS, list);
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase facturas, usando fallback:', err);
      }
    }
    return this.get<FacturaCompra[]>(KEYS.FACTURAS, []);
  }

  async saveFactura(factura: FacturaCompra): Promise<FacturaCompra[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('facturas_compras').upsert(mapFacturaToDB(factura));
      } catch (err) {
        console.error('Error guardando factura en Supabase:', err);
      }
    }

    const facturas = await this.getFacturas();
    facturas.push(factura);
    this.set(KEYS.FACTURAS, facturas);

    // Actualizar precios de ingredientes e inyectar al historial
    const ingredientes = await this.getIngredientes();

    for (const item of factura.items) {
      // 1. Inyectar histórico
      const nuevoHistorico: RegistroHistoricoPrecio = {
        id: 'hist_' + Math.random().toString(36).substr(2, 9),
        timestamp: factura.fechaCompra,
        ingredienteId: item.ingredienteId,
        proveedorId: factura.proveedorId,
        precioUnitarioAP: item.precioCompraAP / item.cantidadComprada,
        cantidad: item.cantidadComprada
      };
      await this.saveHistoricoPrecio(nuevoHistorico);

      // 2. Actualizar precio activo en el catálogo y sumar stock
      const ingIndex = ingredientes.findIndex(i => i.id === item.ingredienteId);
      if (ingIndex >= 0) {
        ingredientes[ingIndex].precioActivo = item.precioCompraAP / item.cantidadComprada;
        ingredientes[ingIndex].stockActual = (ingredientes[ingIndex].stockActual || 0) + item.cantidadComprada;
        if (item.fechaVencimiento) {
          ingredientes[ingIndex].fechaVencimiento = item.fechaVencimiento;
        }
        ingredientes[ingIndex].ultimaActualizacion = new Date().toISOString();
        await this.saveIngrediente(ingredientes[ingIndex]);
      }
    }

    return facturas;
  }

  async getHistoricoPrecios(): Promise<RegistroHistoricoPrecio[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('historico_precios').select('*').order('timestamp', { ascending: false });
        if (!error && data) {
          const list = data.map(mapHistoricoFromDB);
          this.set(KEYS.HISTORICO_PRECIOS, list);
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase histórico precios, usando fallback:', err);
      }
    }
    return this.get<RegistroHistoricoPrecio[]>(KEYS.HISTORICO_PRECIOS, []);
  }

  private async saveHistoricoPrecio(h: RegistroHistoricoPrecio): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('historico_precios').upsert(mapHistoricoToDB(h));
      } catch (err) {
        console.error('Error guardando histórico de precio en Supabase:', err);
      }
    }
    const historicos = this.get<RegistroHistoricoPrecio[]>(KEYS.HISTORICO_PRECIOS, []);
    historicos.push(h);
    this.set(KEYS.HISTORICO_PRECIOS, historicos);
  }

  // --- REGISTRO DE MERMAS OPERATIVAS ---
  async getMermas(): Promise<RegistroMermaOperativa[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('mermas_operativas').select('*').order('fecha_merma', { ascending: false });
        if (!error && data) {
          const list = data.map(mapMermaFromDB);
          this.set(KEYS.MERMAS, list);
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase mermas, usando fallback:', err);
      }
    }
    return this.get<RegistroMermaOperativa[]>(KEYS.MERMAS, []);
  }

  async saveMerma(merma: RegistroMermaOperativa): Promise<RegistroMermaOperativa[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('mermas_operativas').upsert(mapMermaToDB(merma));
      } catch (err) {
        console.error('Error guardando merma en Supabase:', err);
      }
    }

    const mermas = await this.getMermas();
    mermas.push(merma);
    this.set(KEYS.MERMAS, mermas);

    // Deducir stock del ingrediente si es merma de materia prima, o de la receta si es merma de producto terminado
    if (merma.tipoOrigen === 'ingrediente') {
      const ingredientes = await this.getIngredientes();
      const ingIndex = ingredientes.findIndex(i => i.id === merma.referenciaId);
      if (ingIndex >= 0) {
        ingredientes[ingIndex].stockActual = Math.max(0, (ingredientes[ingIndex].stockActual || 0) - merma.cantidadPerdida);
        await this.saveIngrediente(ingredientes[ingIndex]);
      }
    } else if (merma.tipoOrigen === 'receta') {
      const recetas = await this.getRecetas();
      const recIndex = recetas.findIndex(r => r.id === merma.referenciaId);
      if (recIndex >= 0) {
        recetas[recIndex].stockActual = Math.max(0, (recetas[recIndex].stockActual || 0) - merma.cantidadPerdida);
        await this.saveReceta(recetas[recIndex]);
      }
    }
    return mermas;
  }

  async deleteMerma(id: string): Promise<RegistroMermaOperativa[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('mermas_operativas').delete().eq('id', id);
      } catch (err) {
        console.error('Error borrando merma en Supabase:', err);
      }
    }

    const mermas = await this.getMermas();
    const mermaToDelete = mermas.find(m => m.id === id);
    const filtradas = mermas.filter(m => m.id !== id);
    this.set(KEYS.MERMAS, filtradas);

    if (mermaToDelete) {
      if (mermaToDelete.tipoOrigen === 'ingrediente') {
        const ingredientes = await this.getIngredientes();
        const ingIndex = ingredientes.findIndex(i => i.id === mermaToDelete.referenciaId);
        if (ingIndex >= 0) {
          ingredientes[ingIndex].stockActual = (ingredientes[ingIndex].stockActual || 0) + mermaToDelete.cantidadPerdida;
          await this.saveIngrediente(ingredientes[ingIndex]);
        }
      } else if (mermaToDelete.tipoOrigen === 'receta') {
        const recetas = await this.getRecetas();
        const recIndex = recetas.findIndex(r => r.id === mermaToDelete.referenciaId);
        if (recIndex >= 0) {
          recetas[recIndex].stockActual = (recetas[recIndex].stockActual || 0) + mermaToDelete.cantidadPerdida;
          await this.saveReceta(recetas[recIndex]);
        }
      }
    }
    return filtradas;
  }

  // --- MÓDULO 5: LOTES DE PRODUCCIÓN REAL ---
  async getLotesProduccion(): Promise<LoteProduccion[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('lotes_produccion').select('*').order('fecha', { ascending: false });
        if (!error && data) {
          const list = data.map(mapLoteFromDB);
          this.set(KEYS.LOTES_PRODUCCION, list);
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase lotes producción, usando fallback:', err);
      }
    }
    return this.get<LoteProduccion[]>(KEYS.LOTES_PRODUCCION, []);
  }

  async saveLoteProduccion(lote: LoteProduccion): Promise<LoteProduccion[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('lotes_produccion').upsert(mapLoteToDB(lote));
      } catch (err) {
        console.error('Error guardando lote de producción en Supabase:', err);
      }
    }

    const lotes = await this.getLotesProduccion();
    const index = lotes.findIndex(l => l.id === lote.id);
    
    if (index >= 0) {
      lotes[index] = lote;
    } else {
      lotes.push(lote);

      // Deducir stock de insumos reales consumidos
      const ingredientes = await this.getIngredientes();
      for (const item of lote.insumos) {
        if (!item.esRecetaAnidada) {
          const ingIndex = ingredientes.findIndex(i => i.id === item.ingredienteId);
          if (ingIndex >= 0) {
            const ing = ingredientes[ingIndex];
            ing.stockActual = Math.max(0, (ing.stockActual || 0) - item.cantidadReal);
            await this.saveIngrediente(ing);
          }
        }
      }

      // Incrementar stock de la receta producida
      const recetas = await this.getRecetas();
      const recIndex = recetas.findIndex(r => r.id === lote.recetaId);
      if (recIndex >= 0) {
        const rec = recetas[recIndex];
        rec.stockActual = (rec.stockActual || 0) + lote.cantidadProducida;
        await this.saveReceta(rec);
      }
    }
    
    this.set(KEYS.LOTES_PRODUCCION, lotes);
    return lotes;
  }

  async deleteLoteProduccion(id: string): Promise<LoteProduccion[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('lotes_produccion').delete().eq('id', id);
      } catch (err) {
        console.error('Error borrando lote producción en Supabase:', err);
      }
    }

    const lotes = await this.getLotesProduccion();
    const loteToDelete = lotes.find(l => l.id === id);
    const filtrados = lotes.filter(l => l.id !== id);
    this.set(KEYS.LOTES_PRODUCCION, filtrados);

    if (loteToDelete) {
      const ingredientes = await this.getIngredientes();
      for (const item of loteToDelete.insumos) {
        if (!item.esRecetaAnidada) {
          const ingIndex = ingredientes.findIndex(i => i.id === item.ingredienteId);
          if (ingIndex >= 0) {
            const ing = ingredientes[ingIndex];
            ing.stockActual = (ing.stockActual || 0) + item.cantidadReal;
            await this.saveIngrediente(ing);
          }
        }
      }

      // Decrementar stock de la receta producida
      const recetas = await this.getRecetas();
      const recIndex = recetas.findIndex(r => r.id === loteToDelete.recetaId);
      if (recIndex >= 0) {
        const rec = recetas[recIndex];
        rec.stockActual = Math.max(0, (rec.stockActual || 0) - loteToDelete.cantidadProducida);
        await this.saveReceta(rec);
      }
    }
    return filtrados;
  }

  // --- MÓDULO DE VENTAS (REPORTES POS) ---
  async getVentas(): Promise<RegistroVentas[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('registros_ventas').select('*').order('fecha_inicio', { ascending: false });
        if (!error && data) {
          const list = data.map(mapVentaFromDB);
          this.set(KEYS.VENTAS, list);
          return list;
        }
      } catch (err) {
        console.warn('Fallo consulta Supabase ventas, usando fallback:', err);
      }
    }
    return this.get<RegistroVentas[]>(KEYS.VENTAS, []);
  }

  async saveVenta(venta: RegistroVentas): Promise<RegistroVentas[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('registros_ventas').upsert(mapVentaToDB(venta));
      } catch (err) {
        console.error('Error guardando venta en Supabase:', err);
      }
    }

    const ventas = await this.getVentas();
    ventas.push(venta);
    this.set(KEYS.VENTAS, ventas);

    // Deducir stock de ingredientes en cascada o de recetas producidas
    const recetas = await this.getRecetas();
    const ingredientes = await this.getIngredientes();
    
    const deducirIngredientes: { [id: string]: number } = {};
    const deducirRecetas: { [id: string]: number } = {};

    const explotarReceta = (recetaId: string, qty: number, visited = new Set<string>()) => {
      if (visited.has(recetaId)) return;
      visited.add(recetaId);

      const rec = recetas.find(r => r.id === recetaId);
      if (!rec) return;

      // Si la receta es una sub-receta o está configurada como producción previa, se descuenta de su stock de lote
      if (rec.esSubReceta || rec.modoDescuento === 'produccion_previa') {
        deducirRecetas[recetaId] = (deducirRecetas[recetaId] || 0) + qty;
        return;
      }

      const scaleFactor = qty / rec.cantidadRendimiento;

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

    // 1. Deducir ingredientes crudos
    for (const ingId of Object.keys(deducirIngredientes)) {
      const ingIdx = ingredientes.findIndex(i => i.id === ingId);
      if (ingIdx >= 0) {
        const ing = ingredientes[ingIdx];
        ing.stockActual = Math.max(0, (ing.stockActual || 0) - deducirIngredientes[ingId]);
        await this.saveIngrediente(ing);
      }
    }

    // 2. Deducir recetas preparadas
    for (const recId of Object.keys(deducirRecetas)) {
      const recIdx = recetas.findIndex(r => r.id === recId);
      if (recIdx >= 0) {
        const rec = recetas[recIdx];
        rec.stockActual = Math.max(0, (rec.stockActual || 0) - deducirRecetas[recId]);
        await this.saveReceta(rec);
      }
    }

    return ventas;
  }

  async deleteVenta(id: string): Promise<RegistroVentas[]> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('registros_ventas').delete().eq('id', id);
      } catch (err) {
        console.error('Error borrando venta en Supabase:', err);
      }
    }

    const ventas = await this.getVentas();
    const ventaToDelete = ventas.find(v => v.id === id);
    const filtradas = ventas.filter(v => v.id !== id);
    this.set(KEYS.VENTAS, filtradas);

    if (ventaToDelete) {
      const recetas = await this.getRecetas();
      const ingredientes = await this.getIngredientes();
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

        const scaleFactor = qty / rec.cantidadRendimiento;

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
          const ing = ingredientes[ingIdx];
          ing.stockActual = (ing.stockActual || 0) + resultDevolucion[ingId];
          await this.saveIngrediente(ing);
        }
      }

      // Devolver stock al catálogo de recetas
      for (const recId of Object.keys(devolucionRecetas)) {
        const recIdx = recetas.findIndex(r => r.id === recId);
        if (recIdx >= 0) {
          const rec = recetas[recIdx];
          rec.stockActual = (rec.stockActual || 0) + devolucionRecetas[recId];
          await this.saveReceta(rec);
        }
      }
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
   */
  async calcularCostoReceta(recetaId: string, recetasDisponibles?: Receta[]): Promise<number> {
    const recetas = recetasDisponibles || await this.getRecetas();
    const receta = recetas.find(r => r.id === recetaId);
    if (!receta) return 0;

    const ingredientes = await this.getIngredientes();
    let costoTotalLote = 0;

    for (const item of receta.ingredientes) {
      if (item.esRecetaAnidada) {
        const subReceta = recetas.find(r => r.id === item.ingredienteId);
        if (subReceta) {
          const costoSubLote = await this.calcularCostoReceta(subReceta.id, recetas);
          let cantidadLote = subReceta.cantidadRendimiento;
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
