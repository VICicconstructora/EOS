-- ADPRO Datamart Schema Creation (25 tables)
-- Fecha: 2026-05-16
-- Fuente: ADPRO (Sinco) - Replicación desde SQL Server
-- Responsable: Andrés Arango (Construcción)
-- Notas: DDL only, sin datos históricos. RLS habilitado por area/rol.

-- ============================================================================
-- DIMENSIONES (DIMENSION TABLES) - 11 tablas
-- ============================================================================

-- DIM_Fecha (Calendario estándar)
CREATE TABLE IF NOT EXISTS adpro_dim_fecha (
  sk_id_fecha INT PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  año SMALLINT NOT NULL,
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  dia SMALLINT NOT NULL CHECK (dia BETWEEN 1 AND 31),
  dia_del_año SMALLINT NOT NULL CHECK (dia_del_año BETWEEN 1 AND 366),
  semana_del_año SMALLINT NOT NULL CHECK (semana_del_año BETWEEN 1 AND 53),
  trimestre SMALLINT NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  semestre SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 2),
  nombre_mes VARCHAR(20) NOT NULL,
  nombre_mes_corto CHAR(3) NOT NULL,
  nombre_dia VARCHAR(20) NOT NULL,
  nombre_dia_corto CHAR(3) NOT NULL,
  mes_año CHAR(8) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_dim_fecha_fecha ON adpro_dim_fecha(fecha);
CREATE INDEX idx_adpro_dim_fecha_año_mes ON adpro_dim_fecha(año, mes);

-- DIM_Empresa (Entidades legales)
CREATE TABLE IF NOT EXISTS adpro_dim_empresa (
  sk_id_empresa SMALLINT PRIMARY KEY,
  nombre_empresa VARCHAR(150) NOT NULL,
  nit VARCHAR(20) NOT NULL UNIQUE,
  direccion VARCHAR(255),
  ref_id_empresa SMALLINT,
  ref_bd_conf_servidor SMALLINT,
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_dim_empresa_nit ON adpro_dim_empresa(nit);

-- DIM_Proyecto (Proyectos y macroproyectos)
CREATE TABLE IF NOT EXISTS adpro_dim_proyecto (
  sk_id_proyecto INT PRIMARY KEY,
  nombre_proyecto VARCHAR(255) NOT NULL,
  clase_proyecto VARCHAR(100),
  tipo VARCHAR(50),
  estado VARCHAR(50),
  presupuesto_fijo CHAR(1),
  propietario VARCHAR(150),
  sucursal SMALLINT,
  sucursal_nombre VARCHAR(150),
  macroproyecto VARCHAR(100),
  macroproyecto_descripcion VARCHAR(255),
  centro_costo VARCHAR(100),
  centro_costo_descripcion VARCHAR(255),
  vis CHAR(1),
  sucursal_administrativa VARCHAR(150),
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  empresa VARCHAR(150),
  codigo_proyecto VARCHAR(50) NOT NULL,
  ciudad VARCHAR(100),
  fecha_inicio DATE,
  fecha_finalizacion DATE,
  porcentaje_administracion DECIMAL(5, 2),
  porcentaje_imprevistos DECIMAL(5, 2),
  porcentaje_utilidad DECIMAL(5, 2),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_dim_proyecto_empresa ON adpro_dim_proyecto(sk_id_empresa);
CREATE INDEX idx_adpro_dim_proyecto_codigo ON adpro_dim_proyecto(codigo_proyecto);
CREATE INDEX idx_adpro_dim_proyecto_macroproyecto ON adpro_dim_proyecto(macroproyecto);

-- DIM_Tercero (Proveedores, contratistas, clientes)
CREATE TABLE IF NOT EXISTS adpro_dim_tercero (
  sk_id_tercero INT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  nit VARCHAR(20) NOT NULL UNIQUE,
  contacto VARCHAR(150),
  email VARCHAR(150),
  direccion VARCHAR(255),
  telefono VARCHAR(50),
  tipo VARCHAR(1),
  naturaleza VARCHAR(1),
  estado VARCHAR(50),
  ciudad VARCHAR(100),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_dim_tercero_nit ON adpro_dim_tercero(nit);
CREATE INDEX idx_adpro_dim_tercero_tipo ON adpro_dim_tercero(tipo);

-- DIM_Empresa_para_CapituloPresupuesto (Helper para relación)
-- Este se maneja en CapituloPresupuesto directamente

-- DIM_CapituloPresupuesto (Capítulos del presupuesto)
CREATE TABLE IF NOT EXISTS adpro_dim_capitulo_presupuesto (
  sk_id_capitulo INT PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  codigo_proyecto VARCHAR(50) NOT NULL,
  capitulo_numero VARCHAR(10) NOT NULL,
  capitulo_descripcion VARCHAR(255),
  tipo_costo VARCHAR(100),
  tipo_costo_orden INT,
  empresa VARCHAR(150),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_dim_capitulo_empresa ON adpro_dim_capitulo_presupuesto(sk_id_empresa);
CREATE INDEX idx_adpro_dim_capitulo_proyecto ON adpro_dim_capitulo_presupuesto(codigo_proyecto, capitulo_numero);

-- DIM_ControlClaseOrigen (Clasificación de orígenes de control)
CREATE TABLE IF NOT EXISTS adpro_dim_control_clase_origen (
  sk_id_clase_origen SMALLINT PRIMARY KEY,
  clase CHAR(5) NOT NULL,
  clase_descripcion VARCHAR(100) NOT NULL,
  origen VARCHAR(100),
  origen_descripcion VARCHAR(255),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_dim_clase_origen_clase ON adpro_dim_control_clase_origen(clase);

-- DIM_EstadoPorDocumento (Estados por tipo de documento)
CREATE TABLE IF NOT EXISTS adpro_dim_estado_por_documento (
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_estado INT NOT NULL,
  descripcion_estado VARCHAR(100) NOT NULL,
  tipo_documento VARCHAR(100),
  empresa VARCHAR(150),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (sk_id_empresa, sk_id_estado)
);
CREATE INDEX idx_adpro_dim_estado_tipo_doc ON adpro_dim_estado_por_documento(tipo_documento);

-- DIM_TipoContrato (Tipos de contrato)
CREATE TABLE IF NOT EXISTS adpro_dim_tipo_contrato (
  sk_id_tipo_contrato INT PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  tipo_codigo VARCHAR(50) NOT NULL,
  tipo_descripcion VARCHAR(255),
  empresa VARCHAR(150),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_dim_tipo_contrato_empresa ON adpro_dim_tipo_contrato(sk_id_empresa);

-- DIM_Insumo (Catálogo de insumos/recursos)
CREATE TABLE IF NOT EXISTS adpro_dim_insumo (
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  empresa VARCHAR(150),
  sk_id_insumo INT NOT NULL,
  insumo_descripcion VARCHAR(255) NOT NULL,
  agrupacion VARCHAR(100),
  agrupacion_descripcion VARCHAR(255),
  tipo CHAR(5),
  tipo_descripcion VARCHAR(100),
  unidad VARCHAR(20),
  descripcion_unidad VARCHAR(100),
  estado VARCHAR(50),
  requiere_equipo VARCHAR(50),
  dias_reposicion INT,
  sub_analisis CHAR(1),
  devolutivo CHAR(1),
  stock_maximo INT,
  stock_minimo INT,
  valor_unitario DECIMAL(18, 2),
  porcentaje_iva FLOAT,
  valor_neto DECIMAL(18, 2),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (sk_id_empresa, sk_id_insumo)
);
CREATE INDEX idx_adpro_dim_insumo_descripcion ON adpro_dim_insumo(insumo_descripcion);
CREATE INDEX idx_adpro_dim_insumo_tipo ON adpro_dim_insumo(tipo_descripcion);

-- DIM_Items (Catálogo de ítems del presupuesto)
CREATE TABLE IF NOT EXISTS adpro_dim_items (
  sk_id_items INT PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_apu INT,
  empresa VARCHAR(150),
  item_no VARCHAR(50) NOT NULL,
  sub_capitulo VARCHAR(100),
  item_descripcion VARCHAR(500),
  cantidad NUMERIC(18, 4),
  valor_sin_iva NUMERIC(18, 2),
  precio_venta DECIMAL(18, 2),
  codigo_cliente VARCHAR(50),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_dim_items_empresa ON adpro_dim_items(sk_id_empresa);
CREATE INDEX idx_adpro_dim_items_item_no ON adpro_dim_items(item_no);

-- DIM_Usuario (Usuarios del sistema ADPRO)
CREATE TABLE IF NOT EXISTS adpro_dim_usuario (
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_usuario INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  cargo VARCHAR(100),
  nivel_acceso VARCHAR(50),
  estado VARCHAR(50),
  empresa VARCHAR(150),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (sk_id_empresa, sk_id_usuario)
);
CREATE INDEX idx_adpro_dim_usuario_nombre ON adpro_dim_usuario(nombre);

-- ============================================================================
-- TABLAS DE HECHOS (FACT TABLES) - 14 tablas
-- ============================================================================

-- FACT_ControlProyecto (Principal: presupuesto vs realizado)
CREATE TABLE IF NOT EXISTS adpro_fact_control_proyecto (
  sk_id_fact_control_proyecto BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  empresa VARCHAR(150),
  sk_id_proyecto INT NOT NULL,
  sk_id_fecha INT NOT NULL REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_clase_origen SMALLINT NOT NULL REFERENCES adpro_dim_control_clase_origen(sk_id_clase_origen),
  sk_id_insumo INT,
  sk_id_capitulo INT,
  sk_id_items INT,
  cantidad NUMERIC(18, 4),
  valor_total DECIMAL(18, 2) NOT NULL,
  origen_documento BIGINT,
  origen_documento_detalle INT,
  valor_sin_iva DECIMAL(18, 2),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_control_proyecto ON adpro_fact_control_proyecto(sk_id_proyecto, sk_id_fecha, sk_id_clase_origen);
CREATE INDEX idx_adpro_fact_control_proyecto_empresa ON adpro_fact_control_proyecto(sk_id_empresa);
CREATE INDEX idx_adpro_fact_control_proyecto_insumo ON adpro_fact_control_proyecto(sk_id_insumo);

-- FACT_Contratos (Compromisos contractuales)
CREATE TABLE IF NOT EXISTS adpro_fact_contratos (
  sk_id_fact_contrato BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  empresa VARCHAR(150),
  sk_id_proyecto INT NOT NULL,
  sk_id_tercero INT NOT NULL,
  sk_id_insumo INT,
  sk_id_items INT,
  sk_id_tipo_contrato INT,
  sk_id_estado INT,
  clase_contrato VARCHAR(100),
  no_contrato INT,
  cantidad_inicial NUMERIC(18, 4),
  cantidad NUMERIC(18, 4),
  valor_unitario NUMERIC(18, 4),
  valor_iva DECIMAL(18, 2),
  valor_total DECIMAL(18, 2),
  valor_contrato_sin_iva DECIMAL(18, 2),
  valor_contrato DECIMAL(18, 2),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_contratos_proyecto ON adpro_fact_contratos(sk_id_proyecto);
CREATE INDEX idx_adpro_fact_contratos_tercero ON adpro_fact_contratos(sk_id_tercero);
CREATE INDEX idx_adpro_fact_contratos_estado ON adpro_fact_contratos(sk_id_estado);

-- FACT_Compras (Órdenes de compra)
CREATE TABLE IF NOT EXISTS adpro_fact_compras (
  sk_id_fact_compra BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_proyecto INT NOT NULL,
  sk_id_tercero INT NOT NULL,
  sk_id_fecha_compra INT NOT NULL REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_fecha_entrega INT REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_fecha_cierre INT REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_estado INT,
  sk_id_insumo INT,
  sk_id_items INT,
  compra_no INT,
  cantidad_comprada DECIMAL(18, 4),
  valor_unitario NUMERIC(18, 4),
  iva DECIMAL(18, 2),
  descuento DECIMAL(18, 2),
  valor_neto NUMERIC(18, 4),
  valor_iva_total NUMERIC(18, 4),
  valor_total NUMERIC(18, 4),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_compras_proyecto ON adpro_fact_compras(sk_id_proyecto);
CREATE INDEX idx_adpro_fact_compras_tercero ON adpro_fact_compras(sk_id_tercero);
CREATE INDEX idx_adpro_fact_compras_fecha ON adpro_fact_compras(sk_id_fecha_compra);

-- FACT_Actas (Actas de cobro de contratistas)
CREATE TABLE IF NOT EXISTS adpro_fact_actas (
  sk_id_fact_acta BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_proyecto INT NOT NULL,
  sk_id_fecha INT NOT NULL REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_estado INT,
  sk_id_insumo INT,
  sk_id_items INT,
  porcentaje_anticipo SMALLINT,
  valor_anticipo DECIMAL(18, 2),
  porcentaje_retencion_anticipo SMALLINT,
  valor_retencion_anticipo DECIMAL(18, 2),
  porcentaje_retencion_garantia SMALLINT,
  valor_retencion_garantias DECIMAL(18, 2),
  valor_descuentos DECIMAL(18, 2),
  valor_total_neto DECIMAL(18, 2),
  valor_iva_total DECIMAL(18, 2),
  valor_total_acta DECIMAL(18, 2),
  no_factura VARCHAR(50),
  cantidad_acta NUMERIC(18, 4),
  valor_unitario NUMERIC(18, 4),
  valor_iva_unitario NUMERIC(18, 4),
  valor_total_linea NUMERIC(18, 4),
  no_contrato INT,
  tipo_acta VARCHAR(50),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_actas_proyecto ON adpro_fact_actas(sk_id_proyecto);
CREATE INDEX idx_adpro_fact_actas_fecha ON adpro_fact_actas(sk_id_fecha);

-- FACT_Anticipo (Anticipos a terceros)
CREATE TABLE IF NOT EXISTS adpro_fact_anticipo (
  sk_id_fact_anticipo BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_proyecto INT NOT NULL,
  sk_id_tercero INT NOT NULL,
  sk_id_fecha_anticipo INT NOT NULL REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_fecha_pago INT REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_usuario INT,
  sk_id_estado INT,
  anticipo_numero INT,
  porcentaje_amortizado FLOAT,
  valor_anticipo DECIMAL(18, 2),
  factura VARCHAR(50),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_anticipo_proyecto ON adpro_fact_anticipo(sk_id_proyecto);
CREATE INDEX idx_adpro_fact_anticipo_tercero ON adpro_fact_anticipo(sk_id_tercero);

-- FACT_Devoluciones (Devoluciones a proveedores)
CREATE TABLE IF NOT EXISTS adpro_fact_devoluciones (
  sk_id_fact_devolucion BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_proyecto INT NOT NULL,
  sk_id_tercero INT NOT NULL,
  sk_id_insumo INT,
  sk_id_fecha INT NOT NULL REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_estado INT,
  devolucion_numero INT,
  remision VARCHAR(50),
  salida_descuento VARCHAR(10),
  total DECIMAL(18, 2),
  devolucion_factura VARCHAR(50),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_devoluciones_proyecto ON adpro_fact_devoluciones(sk_id_proyecto);
CREATE INDEX idx_adpro_fact_devoluciones_tercero ON adpro_fact_devoluciones(sk_id_tercero);

-- FACT_EntradasAlmacen (Recepción de materiales)
CREATE TABLE IF NOT EXISTS adpro_fact_entradas_almacen (
  sk_id_fact_entrada BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_proyecto INT NOT NULL,
  sk_id_insumo INT,
  sk_id_fecha_compra INT REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_fecha_entrada INT NOT NULL REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_tercero INT,
  entrada_estado VARCHAR(50),
  total_entrada DECIMAL(18, 2),
  entrada_numero INT,
  remision VARCHAR(50),
  compra_numero INT,
  compra_total_pagar DECIMAL(18, 2),
  entrada_factura VARCHAR(50),
  entrada_cantidad NUMERIC(18, 4),
  entrada_valor_iva DECIMAL(18, 2),
  entrada_valor_sin_iva DECIMAL(18, 2),
  bodega_codigo VARCHAR(50),
  bodega_descripcion VARCHAR(150),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_entradas_proyecto ON adpro_fact_entradas_almacen(sk_id_proyecto);
CREATE INDEX idx_adpro_fact_entradas_fecha ON adpro_fact_entradas_almacen(sk_id_fecha_entrada);

-- FACT_InventarioResumido (Movimientos consolidados)
CREATE TABLE IF NOT EXISTS adpro_fact_inventario_resumido (
  sk_id_fact_inventario BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  empresa VARCHAR(150),
  sk_id_fecha INT NOT NULL REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_proyecto INT NOT NULL,
  sk_id_insumo INT,
  tipo VARCHAR(10),
  documento BIGINT,
  bodega INT,
  cantidad NUMERIC(18, 4),
  unitario_neto NUMERIC(18, 4),
  valor_iva NUMERIC(18, 4),
  unitario NUMERIC(18, 4),
  total NUMERIC(18, 4),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_inventario_proyecto ON adpro_fact_inventario_resumido(sk_id_proyecto);
CREATE INDEX idx_adpro_fact_inventario_insumo ON adpro_fact_inventario_resumido(sk_id_insumo);
CREATE INDEX idx_adpro_fact_inventario_tipo ON adpro_fact_inventario_resumido(tipo);

-- FACT_NotasEnValor (Ajustes en valor)
CREATE TABLE IF NOT EXISTS adpro_fact_notas_en_valor (
  sk_id_fact_nota BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_tercero INT,
  sk_id_proyecto INT NOT NULL,
  sk_id_fecha INT NOT NULL REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_insumo INT,
  sk_id_estado INT,
  nota_numero INT,
  total_devolucion DECIMAL(18, 2),
  empresa VARCHAR(150),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_notas_proyecto ON adpro_fact_notas_en_valor(sk_id_proyecto);

-- FACT_Pedidos (Solicitudes de compra)
CREATE TABLE IF NOT EXISTS adpro_fact_pedidos (
  sk_id_fact_pedido BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_proyecto INT NOT NULL,
  sk_id_items INT,
  sk_id_insumo INT,
  sk_id_fecha_pedido INT REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_fecha_requerido INT REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_estado INT,
  codigo_orden_de_compra INT,
  pedido_urgente CHAR(1),
  tipo_pedido VARCHAR(50),
  empresa VARCHAR(150),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_pedidos_proyecto ON adpro_fact_pedidos(sk_id_proyecto);

-- FACT_Proyeccion (Proyecciones y reformas)
CREATE TABLE IF NOT EXISTS adpro_fact_proyeccion (
  sk_id_fact_proyeccion BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_proyecto INT NOT NULL,
  sk_id_items INT,
  sk_id_insumo INT,
  sk_id_reforma INT,
  sk_id_usuario INT,
  sk_id_fecha INT REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_fecha_real INT REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_estado INT,
  cantidad NUMERIC(18, 4),
  valor_unitario DECIMAL(18, 2),
  valor_total DECIMAL(18, 2),
  origen VARCHAR(100),
  causa INT,
  cantidad_item NUMERIC(18, 4),
  descripcion_causa VARCHAR(500),
  ajuste_global SMALLINT,
  empresa VARCHAR(150),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_proyeccion_proyecto ON adpro_fact_proyeccion(sk_id_proyecto);
CREATE INDEX idx_adpro_fact_proyeccion_reforma ON adpro_fact_proyeccion(sk_id_reforma);

-- FACT_Reintegro (Devoluciones internas)
CREATE TABLE IF NOT EXISTS adpro_fact_reintegro (
  sk_id_fact_reintegro BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_proyecto INT NOT NULL,
  sk_id_tercero INT,
  sk_id_insumo INT,
  sk_id_fecha INT NOT NULL REFERENCES adpro_dim_fecha(sk_id_fecha),
  numero_reintegro INT,
  remision VARCHAR(50),
  cantidad DECIMAL(18, 4),
  valor_unitario DECIMAL(18, 2),
  valor_total DECIMAL(18, 2),
  empresa VARCHAR(150),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_reintegro_proyecto ON adpro_fact_reintegro(sk_id_proyecto);

-- FACT_SalidasAlmacen (Despachos de almacén)
CREATE TABLE IF NOT EXISTS adpro_fact_salidas_almacen (
  sk_id_fact_salida BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_proyecto INT NOT NULL,
  sk_id_fecha_salida INT NOT NULL REFERENCES adpro_dim_fecha(sk_id_fecha),
  sk_id_insumo INT,
  sk_id_tercero INT,
  salida_numero NUMERIC(18, 0),
  salida_remision VARCHAR(50),
  salida_usuario VARCHAR(150),
  bodega_codigo INT,
  bodega_descripcion VARCHAR(150),
  salida_descuento VARCHAR(10),
  salida_cantidad NUMERIC(18, 4),
  salida_valor_unitario NUMERIC(18, 4),
  salida_valor_total DECIMAL(18, 2),
  salida_item VARCHAR(50),
  descuentos_cantidad NUMERIC(18, 4),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_salidas_proyecto ON adpro_fact_salidas_almacen(sk_id_proyecto);
CREATE INDEX idx_adpro_fact_salidas_fecha ON adpro_fact_salidas_almacen(sk_id_fecha_salida);

-- FACT_Traslados (Movimientos entre proyectos)
CREATE TABLE IF NOT EXISTS adpro_fact_traslados (
  sk_id_fact_traslado BIGSERIAL PRIMARY KEY,
  sk_id_empresa SMALLINT NOT NULL REFERENCES adpro_dim_empresa(sk_id_empresa),
  sk_id_proyecto_traslado INT NOT NULL,
  sk_id_proyecto_entrada INT NOT NULL,
  sk_id_insumo INT,
  numero_traslado BIGINT,
  cantidad_traslado DECIMAL(18, 4),
  valor_unitario_traslado DECIMAL(18, 2),
  valor_total_traslado DECIMAL(18, 2),
  numero_entrada_traslado BIGINT,
  cantidad_entrada_traslado DECIMAL(18, 4),
  unitario_entrada_traslado DECIMAL(18, 2),
  total_entrada_traslado DECIMAL(18, 2),
  empresa VARCHAR(150),
  company_id VARCHAR(50) NOT NULL DEFAULT 'ic-constructora',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_adpro_fact_traslados_origen ON adpro_fact_traslados(sk_id_proyecto_traslado);
CREATE INDEX idx_adpro_fact_traslados_destino ON adpro_fact_traslados(sk_id_proyecto_entrada);

-- ============================================================================
-- VISTA PLANA (FLAT VIEW) - Para Power BI
-- ============================================================================

CREATE OR REPLACE VIEW adpro_vfact_control_proyecto AS
SELECT
  cp.sk_id_fact_control_proyecto,
  cp.sk_id_empresa,
  cp.empresa,
  cp.sk_id_proyecto,
  proy.nombre_proyecto,
  proy.codigo_proyecto,
  proy.macroproyecto_descripcion,
  proy.sucursal_nombre,
  proy.ciudad,
  cp.sk_id_fecha,
  f.fecha,
  f.año,
  f.mes,
  f.nombre_mes,
  f.trimestre,
  f.semestre,
  cp.sk_id_clase_origen,
  cco.clase,
  cco.clase_descripcion,
  cco.origen,
  cco.origen_descripcion,
  cp.sk_id_insumo,
  ins.insumo_descripcion,
  ins.tipo_descripcion AS tipo_insumo,
  ins.agrupacion_descripcion,
  cp.sk_id_capitulo,
  cap.capitulo_numero,
  cap.capitulo_descripcion,
  cp.sk_id_items,
  items.item_no,
  items.item_descripcion,
  cp.cantidad,
  cp.valor_total,
  cp.valor_sin_iva,
  cp.origen_documento,
  cp.origen_documento_detalle,
  cp.created_at,
  cp.updated_at
FROM adpro_fact_control_proyecto cp
LEFT JOIN adpro_dim_fecha f ON cp.sk_id_fecha = f.sk_id_fecha
LEFT JOIN adpro_dim_proyecto proy ON cp.sk_id_proyecto = proy.sk_id_proyecto
LEFT JOIN adpro_dim_control_clase_origen cco ON cp.sk_id_clase_origen = cco.sk_id_clase_origen
LEFT JOIN adpro_dim_insumo ins ON cp.sk_id_insumo = ins.sk_id_insumo AND cp.sk_id_empresa = ins.sk_id_empresa
LEFT JOIN adpro_dim_capitulo_presupuesto cap ON cp.sk_id_capitulo = cap.sk_id_capitulo
LEFT JOIN adpro_dim_items items ON cp.sk_id_items = items.sk_id_items
WHERE cp.company_id = 'ic-constructora';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Habilitar RLS en todas las tablas FACT
ALTER TABLE adpro_fact_control_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_actas ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_anticipo ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_devoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_entradas_almacen ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_inventario_resumido ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_notas_en_valor ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_proyeccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_reintegro ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_salidas_almacen ENABLE ROW LEVEL SECURITY;
ALTER TABLE adpro_fact_traslados ENABLE ROW LEVEL SECURITY;

-- Política: Lectura por company_id (todos los usuarios de IC Constructora)
CREATE POLICY adpro_fact_read_policy
  ON adpro_fact_control_proyecto
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_contratos_read_policy
  ON adpro_fact_contratos
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_compras_read_policy
  ON adpro_fact_compras
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_actas_read_policy
  ON adpro_fact_actas
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_anticipo_read_policy
  ON adpro_fact_anticipo
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_devoluciones_read_policy
  ON adpro_fact_devoluciones
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_entradas_read_policy
  ON adpro_fact_entradas_almacen
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_inventario_read_policy
  ON adpro_fact_inventario_resumido
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_notas_read_policy
  ON adpro_fact_notas_en_valor
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_pedidos_read_policy
  ON adpro_fact_pedidos
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_proyeccion_read_policy
  ON adpro_fact_proyeccion
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_reintegro_read_policy
  ON adpro_fact_reintegro
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_salidas_read_policy
  ON adpro_fact_salidas_almacen
  FOR SELECT
  USING (company_id = 'ic-constructora');

CREATE POLICY adpro_fact_traslados_read_policy
  ON adpro_fact_traslados
  FOR SELECT
  USING (company_id = 'ic-constructora');

-- ============================================================================
-- NOTAS FINALES
-- ============================================================================
-- - Todas las tablas incluyen company_id = 'ic-constructora' como tenant fijo
-- - created_at, updated_at para auditoría
-- - Índices estratégicos por llaves de relación y filtros comunes
-- - RLS habilitado para lectura por company_id (modelo multi-tenant-ready)
-- - Vista VFACT_ControlProyecto lista para BI (denormalizada)
-- - Tipos numéricos: DECIMAL(18,2) para dinero, NUMERIC para cantidades
-- - Fechas vinculadas via sk_id_fecha (INT format YYYYMMDD) para eficiencia
