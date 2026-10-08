-- LEXCON IAG · Piloto real INEM de Montería
-- Esquema relacional en español. Los datos y los archivos reales se cargan
-- únicamente después de crear el proyecto Supabase y completar la validación
-- de aislamiento, copias de seguridad y restauración.

create extension if not exists pgcrypto;
create schema if not exists privado;

-- ---------------------------------------------------------------------------
-- Identidad, Instituciones Educativas, roles y permisos
-- ---------------------------------------------------------------------------

create table public.perfiles_usuario (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  nombre_mostrado text not null,
  correo_electronico text not null,
  telefono_alertas text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.instituciones_educativas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nit text,
  codigo_dane text,
  ciudad text not null,
  departamento text not null,
  correo_institucional text,
  telefono text,
  direccion text,
  estado_servicio text not null default 'ACTIVO'
    check (estado_servicio in ('ACTIVO', 'SUSPENDIDO', 'FINALIZADO')),
  observacion_servicio text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (nit),
  unique (codigo_dane)
);

create table public.periodos_servicio_ie (
  id uuid primary key default gen_random_uuid(),
  id_institucion uuid not null references public.instituciones_educativas(id),
  inicia_en date not null,
  finaliza_en date,
  estado text not null default 'ACTIVO'
    check (estado in ('ACTIVO', 'SUSPENDIDO', 'FINALIZADO')),
  motivo text,
  registrado_por uuid references public.perfiles_usuario(id_usuario),
  creado_en timestamptz not null default now(),
  check (finaliza_en is null or finaliza_en >= inicia_en)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo in (
    'ADMINISTRADOR_ARKA', 'ABOGADO_ARKA', 'RECTOR_IE', 'APOYO_IE', 'COMITE_EVALUADOR'
  )),
  nombre text not null,
  descripcion text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.permisos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  descripcion text not null,
  creado_en timestamptz not null default now()
);

create table public.permisos_roles (
  id_rol uuid not null references public.roles(id) on delete cascade,
  id_permiso uuid not null references public.permisos(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (id_rol, id_permiso)
);

create table public.asignaciones_roles_usuario (
  id uuid primary key default gen_random_uuid(),
  id_usuario uuid not null references public.perfiles_usuario(id_usuario),
  id_rol uuid not null references public.roles(id),
  id_institucion uuid references public.instituciones_educativas(id),
  activa boolean not null default true,
  asignado_por uuid references public.perfiles_usuario(id_usuario),
  asignado_en timestamptz not null default now(),
  retirado_en timestamptz,
  check (retirado_en is null or retirado_en >= asignado_en)
);

create unique index asignaciones_roles_usuario_activas_unicas
  on public.asignaciones_roles_usuario(id_usuario, id_rol, coalesce(id_institucion, '00000000-0000-0000-0000-000000000000'::uuid))
  where activa;
create index asignaciones_roles_usuario_usuario_idx on public.asignaciones_roles_usuario(id_usuario) where activa;
create index asignaciones_roles_usuario_institucion_idx on public.asignaciones_roles_usuario(id_institucion) where activa;

-- ---------------------------------------------------------------------------
-- Manual de contratación y reglas institucionales
-- ---------------------------------------------------------------------------

create table public.manuales_contratacion (
  id uuid primary key default gen_random_uuid(),
  id_institucion uuid not null unique references public.instituciones_educativas(id),
  estado text not null default 'VIGENTE' check (estado in ('VIGENTE', 'SUSTITUIDO', 'INACTIVO')),
  creado_por uuid not null references public.perfiles_usuario(id_usuario),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.versiones_manual_contratacion (
  id uuid primary key default gen_random_uuid(),
  id_manual uuid not null references public.manuales_contratacion(id),
  numero_version integer not null check (numero_version > 0),
  estado text not null default 'VIGENTE' check (estado in ('BORRADOR', 'VIGENTE', 'SUSTITUIDA')),
  id_version_documento uuid,
  vigente_desde date,
  vigente_hasta date,
  creado_por uuid not null references public.perfiles_usuario(id_usuario),
  creado_en timestamptz not null default now(),
  unique (id_manual, numero_version),
  check (vigente_hasta is null or vigente_desde is null or vigente_hasta >= vigente_desde)
);

create table public.reglas_manual_contratacion (
  id uuid primary key default gen_random_uuid(),
  id_version_manual uuid not null references public.versiones_manual_contratacion(id),
  codigo_regla text not null,
  categoria text not null,
  descripcion text not null,
  valor_estructurado jsonb not null default '{}'::jsonb,
  obligatoria boolean not null default true,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (id_version_manual, codigo_regla)
);

create table public.hallazgos_reglas_manual (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid,
  id_regla_manual uuid not null references public.reglas_manual_contratacion(id),
  resultado text not null check (resultado in ('CUMPLE', 'NO_CUMPLE', 'PENDIENTE_VERIFICACION')),
  detalle text not null,
  id_ejecucion_ia uuid,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Procesos, flujo, responsables y cronograma
-- ---------------------------------------------------------------------------

create table public.procesos_contratacion (
  id uuid primary key default gen_random_uuid(),
  id_institucion uuid not null references public.instituciones_educativas(id),
  consecutivo_institucional integer not null check (consecutivo_institucional > 0),
  numero_proceso text not null,
  tipo_contrato text,
  objeto_contractual text,
  id_version_manual_aplicable uuid references public.versiones_manual_contratacion(id),
  fase_actual text not null default 'MERCADO',
  estado_actual text not null default 'PENDIENTE_ACTUACION',
  abierto_por uuid not null references public.perfiles_usuario(id_usuario),
  abierto_en timestamptz not null default now(),
  cerrado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (id_institucion, consecutivo_institucional),
  unique (id_institucion, numero_proceso),
  check (cerrado_en is null or cerrado_en >= abierto_en)
);
create index procesos_contratacion_institucion_idx on public.procesos_contratacion(id_institucion, abierto_en desc);
create index procesos_contratacion_fase_idx on public.procesos_contratacion(fase_actual, estado_actual);

alter table public.hallazgos_reglas_manual
  add constraint hallazgos_reglas_manual_proceso_fk
  foreign key (id_proceso) references public.procesos_contratacion(id);

create table public.responsables_proceso (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  id_usuario uuid references public.perfiles_usuario(id_usuario),
  nombre_externo text,
  tipo_responsabilidad text not null check (tipo_responsabilidad in (
    'ABOGADO', 'RECTOR', 'APOYO', 'EVALUADOR', 'SUPERVISOR'
  )),
  activo boolean not null default true,
  asignado_por uuid references public.perfiles_usuario(id_usuario),
  asignado_en timestamptz not null default now(),
  retirado_en timestamptz,
  check (id_usuario is not null or nombre_externo is not null),
  check (retirado_en is null or retirado_en >= asignado_en)
);
create index responsables_proceso_usuario_idx on public.responsables_proceso(id_usuario) where activo;
create index responsables_proceso_proceso_idx on public.responsables_proceso(id_proceso) where activo;
create unique index responsable_abogado_activo_unico on public.responsables_proceso(id_proceso)
  where activo and tipo_responsabilidad = 'ABOGADO';

create table public.historial_fases_proceso (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  fase_origen text,
  fase_destino text not null,
  accion text not null,
  estado_anterior text,
  estado_posterior text not null,
  id_actor uuid references public.perfiles_usuario(id_usuario),
  observacion text,
  creado_en timestamptz not null default now()
);
create index historial_fases_proceso_idx on public.historial_fases_proceso(id_proceso, creado_en desc);

create table public.bloqueos_proceso (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  alcance text not null,
  motivo text not null,
  gravedad text not null default 'ALTA' check (gravedad in ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  activo boolean not null default true,
  abierto_por uuid references public.perfiles_usuario(id_usuario),
  resuelto_por uuid references public.perfiles_usuario(id_usuario),
  resuelto_en timestamptz,
  creado_en timestamptz not null default now()
);
create index bloqueos_proceso_activos_idx on public.bloqueos_proceso(id_proceso) where activo;

create table public.tareas_proceso (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  titulo text not null,
  descripcion text,
  tipo_tarea text not null,
  id_usuario_asignado uuid references public.perfiles_usuario(id_usuario),
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'CANCELADA')),
  vencimiento_en timestamptz,
  completado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index tareas_proceso_pendientes_idx on public.tareas_proceso(id_usuario_asignado, vencimiento_en) where estado in ('PENDIENTE', 'EN_CURSO');

create table public.eventos_cronograma_proceso (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  tipo_evento text not null,
  titulo text not null,
  inicia_en timestamptz not null,
  finaliza_en timestamptz,
  regla_dia_habil text,
  estado text not null default 'PROGRAMADO' check (estado in ('PROGRAMADO', 'EN_CURSO', 'CUMPLIDO', 'VENCIDO', 'CANCELADO')),
  creado_en timestamptz not null default now(),
  check (finaliza_en is null or finaliza_en >= inicia_en)
);
create index eventos_cronograma_proceso_idx on public.eventos_cronograma_proceso(id_proceso, inicia_en);

create table public.transiciones_flujo (
  id uuid primary key default gen_random_uuid(),
  fase_origen text not null,
  accion text not null,
  fase_destino text not null,
  rol_requerido text not null,
  tipo_evidencia_requerida text,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (fase_origen, accion)
);

-- ---------------------------------------------------------------------------
-- Documento lógico, versiones, archivos privados y publicaciones
-- ---------------------------------------------------------------------------

create table public.documentos_expediente (
  id uuid primary key default gen_random_uuid(),
  id_institucion uuid not null references public.instituciones_educativas(id),
  id_proceso uuid references public.procesos_contratacion(id),
  tipo_documento text not null,
  titulo text not null,
  estado text not null default 'VIGENTE',
  id_version_vigente uuid,
  creado_por uuid references public.perfiles_usuario(id_usuario),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index documentos_expediente_proceso_idx on public.documentos_expediente(id_proceso, tipo_documento);
create index documentos_expediente_institucion_idx on public.documentos_expediente(id_institucion, creado_en desc);

create table public.versiones_documento (
  id uuid primary key default gen_random_uuid(),
  id_documento uuid not null references public.documentos_expediente(id),
  numero_version integer not null check (numero_version > 0),
  origen text not null check (origen in ('CARGA_IE', 'GENERADO_IA', 'CORRECCION_JURIDICA', 'DECISION_INSTITUCIONAL', 'SISTEMA')),
  contenido_texto text,
  contenido_estructurado jsonb not null default '{}'::jsonb,
  id_version_reemplazada uuid references public.versiones_documento(id),
  creado_por uuid references public.perfiles_usuario(id_usuario),
  creado_en timestamptz not null default now(),
  unique (id_documento, numero_version)
);

alter table public.documentos_expediente
  add constraint documentos_expediente_version_vigente_fk
  foreign key (id_version_vigente) references public.versiones_documento(id);

create table public.archivos_documento (
  id uuid primary key default gen_random_uuid(),
  id_version_documento uuid not null references public.versiones_documento(id),
  id_bucket text not null default 'expediente-privado',
  ruta_objeto text not null unique,
  nombre_original text not null,
  tipo_mime text not null,
  tamano_bytes bigint not null check (tamano_bytes > 0),
  hash_sha256 text not null check (hash_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  subido_por uuid references public.perfiles_usuario(id_usuario),
  estado_archivo text not null default 'DISPONIBLE' check (estado_archivo in ('DISPONIBLE', 'RETIRADO', 'CUARENTENA')),
  creado_en timestamptz not null default now(),
  unique (id_version_documento, hash_sha256)
);
create index archivos_documento_version_idx on public.archivos_documento(id_version_documento);

create table public.revisiones_documento (
  id uuid primary key default gen_random_uuid(),
  id_version_documento uuid not null references public.versiones_documento(id),
  etapa_revision text not null,
  decision text not null check (decision in ('APROBADO', 'CORRECCIONES_SOLICITADAS', 'RECHAZADO')),
  id_revisor uuid not null references public.perfiles_usuario(id_usuario),
  observacion text,
  revisado_en timestamptz not null default now()
);
create index revisiones_documento_version_idx on public.revisiones_documento(id_version_documento, revisado_en desc);

create table public.firmas_documento (
  id uuid primary key default gen_random_uuid(),
  id_version_documento uuid not null references public.versiones_documento(id),
  nombre_firmante text not null,
  calidad_firmante text not null,
  estado_firma text not null check (estado_firma in ('PENDIENTE', 'FIRMADO', 'DECLARADO_FIRMADO')),
  firmado_en timestamptz,
  id_archivo_evidencia uuid references public.archivos_documento(id),
  creado_en timestamptz not null default now()
);

create table public.relaciones_documento (
  id uuid primary key default gen_random_uuid(),
  id_version_documento_origen uuid not null references public.versiones_documento(id),
  id_version_documento_destino uuid not null references public.versiones_documento(id),
  tipo_relacion text not null check (tipo_relacion in ('ANEXO', 'SOPORTE', 'CORRECCION', 'REEMPLAZO', 'FUENTE')),
  creado_en timestamptz not null default now(),
  check (id_version_documento_origen <> id_version_documento_destino),
  unique (id_version_documento_origen, id_version_documento_destino, tipo_relacion)
);

create table public.publicaciones_secop (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  id_version_documento uuid not null references public.versiones_documento(id),
  referencia_secop text,
  publicado_en timestamptz,
  declarado_por uuid not null references public.perfiles_usuario(id_usuario),
  id_archivo_evidencia uuid references public.archivos_documento(id),
  creado_en timestamptz not null default now()
);
create index publicaciones_secop_proceso_idx on public.publicaciones_secop(id_proceso, creado_en desc);

create table public.ejecuciones_ia (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid references public.procesos_contratacion(id),
  id_version_documento uuid references public.versiones_documento(id),
  operacion text not null,
  proveedor text,
  modelo text,
  version_instruccion text,
  hash_entrada text,
  estado text not null check (estado in ('PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'FALLIDA')),
  iniciado_en timestamptz not null default now(),
  finalizado_en timestamptz,
  detalle_error text
);
create index ejecuciones_ia_proceso_idx on public.ejecuciones_ia(id_proceso, iniciado_en desc);

create table public.ejecuciones_generacion_documento (
  id uuid primary key default gen_random_uuid(),
  id_version_documento uuid not null references public.versiones_documento(id),
  tipo_generador text not null,
  version_plantilla text not null,
  id_ejecucion_ia uuid references public.ejecuciones_ia(id),
  hash_entrada text not null,
  estado text not null check (estado in ('PENDIENTE', 'COMPLETADA', 'FALLIDA')),
  creado_en timestamptz not null default now()
);

alter table public.versiones_manual_contratacion
  add constraint versiones_manual_contratacion_documento_fk
  foreign key (id_version_documento) references public.versiones_documento(id);

alter table public.hallazgos_reglas_manual
  add constraint hallazgos_reglas_manual_ejecucion_ia_fk
  foreign key (id_ejecucion_ia) references public.ejecuciones_ia(id);

-- ---------------------------------------------------------------------------
-- Cotizaciones, extracción y análisis de mercado
-- ---------------------------------------------------------------------------

create table public.cotizaciones_mercado (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  id_version_documento uuid references public.versiones_documento(id),
  nombre_proveedor text,
  identificacion_proveedor text,
  fecha_cotizacion date,
  vigencia_hasta date,
  moneda char(3) not null default 'COP',
  subtotal numeric(18,2),
  valor_iva numeric(18,2),
  valor_total numeric(18,2),
  estado text not null default 'RECIBIDA' check (estado in ('RECIBIDA', 'LEGIBLE', 'NO_LEGIBLE', 'EXCLUIDA')),
  creado_en timestamptz not null default now(),
  check (vigencia_hasta is null or fecha_cotizacion is null or vigencia_hasta >= fecha_cotizacion)
);
create index cotizaciones_mercado_proceso_idx on public.cotizaciones_mercado(id_proceso, creado_en);

create table public.items_cotizacion_mercado (
  id uuid primary key default gen_random_uuid(),
  id_cotizacion uuid not null references public.cotizaciones_mercado(id),
  numero_linea integer not null check (numero_linea > 0),
  descripcion text not null,
  descripcion_normalizada text not null,
  codigo_unspsc text,
  cantidad numeric(18,4) not null check (cantidad > 0),
  unidad text,
  valor_unitario numeric(18,2),
  subtotal numeric(18,2),
  tarifa_iva numeric(5,2),
  valor_iva numeric(18,2),
  valor_total numeric(18,2),
  motivo_exclusion text,
  creado_en timestamptz not null default now(),
  unique (id_cotizacion, numero_linea)
);

create table public.ejecuciones_extraccion (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  id_version_documento uuid not null unique references public.versiones_documento(id),
  tipo_origen text not null,
  analizador text not null,
  modelo_ia text,
  estado text not null check (estado in ('PENDIENTE', 'COMPLETADA', 'FALLIDA', 'NO_LEGIBLE')),
  texto_extraido text not null default '',
  incidencias jsonb not null default '[]'::jsonb,
  iniciado_en timestamptz not null default now(),
  finalizado_en timestamptz
);
create index ejecuciones_extraccion_proceso_idx on public.ejecuciones_extraccion(id_proceso, iniciado_en desc);

create table public.campos_extraidos (
  id uuid primary key default gen_random_uuid(),
  id_ejecucion_extraccion uuid not null references public.ejecuciones_extraccion(id),
  codigo_campo text not null,
  valor_original text,
  valor_normalizado text,
  confianza numeric(5,4) check (confianza is null or confianza between 0 and 1),
  pagina_origen integer check (pagina_origen is null or pagina_origen > 0),
  fragmento_origen text,
  estado_verificacion text not null default 'PENDIENTE_VERIFICACION',
  creado_en timestamptz not null default now()
);
create index campos_extraidos_ejecucion_idx on public.campos_extraidos(id_ejecucion_extraccion, codigo_campo);

create table public.ejecuciones_comparacion_mercado (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  version_metodologia text not null,
  estado text not null check (estado in ('PENDIENTE', 'COMPLETADA', 'FALLIDA')),
  creado_por uuid references public.perfiles_usuario(id_usuario),
  creado_en timestamptz not null default now()
);

create table public.items_comparacion_mercado (
  id uuid primary key default gen_random_uuid(),
  id_ejecucion_comparacion uuid not null references public.ejecuciones_comparacion_mercado(id),
  descripcion_normalizada text not null,
  cantidad numeric(18,4) not null check (cantidad > 0),
  unidad text,
  valor_unitario_minimo numeric(18,2),
  valor_unitario_maximo numeric(18,2),
  valor_unitario_promedio numeric(18,2),
  creado_en timestamptz not null default now()
);

create table public.valores_comparacion_mercado (
  id uuid primary key default gen_random_uuid(),
  id_item_comparacion uuid not null references public.items_comparacion_mercado(id),
  id_item_cotizacion uuid not null references public.items_cotizacion_mercado(id),
  nombre_fuente text not null,
  valor_unitario numeric(18,2),
  tratamiento_iva text,
  incluido_en_promedio boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (id_item_comparacion, id_item_cotizacion)
);

create table public.perfiles_estudio_mercado (
  id_proceso uuid primary key references public.procesos_contratacion(id),
  objeto_descripcion text not null default '',
  codigos_unspsc text not null default '',
  analisis_demanda text not null default '',
  analisis_oferta text not null default '',
  fundamento_tributario text not null default '',
  actualizado_por uuid not null references public.perfiles_usuario(id_usuario),
  actualizado_en timestamptz not null default now()
);

create table public.certificados_disponibilidad_presupuestal (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null unique references public.procesos_contratacion(id),
  numero_cdp text not null,
  expedido_en date,
  valor numeric(18,2),
  rubro_presupuestal text,
  id_version_documento uuid references public.versiones_documento(id),
  estado text not null default 'CARGADO',
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Ofertas, evaluación y selección humana
-- ---------------------------------------------------------------------------

create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null,
  identificacion_tributaria text not null unique,
  tipo_persona text not null check (tipo_persona in ('NATURAL', 'JURIDICA')),
  direccion text,
  correo_electronico text,
  telefono text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.representantes_proveedor (
  id uuid primary key default gen_random_uuid(),
  id_proveedor uuid not null references public.proveedores(id),
  nombre_completo text not null,
  tipo_documento text,
  numero_documento text,
  correo_electronico text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.actas_recibo_ofertas (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null unique references public.procesos_contratacion(id),
  recibido_en timestamptz not null,
  recibido_por uuid not null references public.perfiles_usuario(id_usuario),
  id_version_documento uuid references public.versiones_documento(id),
  estado text not null default 'CARGADA',
  creado_en timestamptz not null default now()
);

create table public.ofertas_proponentes (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  id_proveedor uuid not null references public.proveedores(id),
  id_representante uuid references public.representantes_proveedor(id),
  numero_oferta text,
  presentado_en timestamptz not null,
  medio_recepcion text,
  subtotal numeric(18,2),
  valor_iva numeric(18,2),
  valor_total numeric(18,2),
  vigencia_dias integer check (vigencia_dias is null or vigencia_dias > 0),
  estado text not null default 'RECIBIDA',
  creado_en timestamptz not null default now(),
  unique (id_proceso, id_proveedor, numero_oferta)
);
create index ofertas_proponentes_proceso_idx on public.ofertas_proponentes(id_proceso, valor_total);

create table public.anexos_oferta (
  id uuid primary key default gen_random_uuid(),
  id_oferta uuid not null references public.ofertas_proponentes(id),
  id_version_documento uuid not null references public.versiones_documento(id),
  tipo_anexo text not null,
  obligatorio boolean not null default true,
  recibido_en timestamptz not null default now(),
  estado_verificacion text not null default 'PENDIENTE_VERIFICACION',
  creado_en timestamptz not null default now(),
  unique (id_oferta, id_version_documento)
);

create table public.items_oferta (
  id uuid primary key default gen_random_uuid(),
  id_oferta uuid not null references public.ofertas_proponentes(id),
  numero_linea integer not null check (numero_linea > 0),
  descripcion text not null,
  codigo_unspsc text,
  cantidad numeric(18,4) not null check (cantidad > 0),
  valor_unitario numeric(18,2),
  tarifa_iva numeric(5,2),
  valor_iva numeric(18,2),
  valor_total numeric(18,2),
  creado_en timestamptz not null default now(),
  unique (id_oferta, numero_linea)
);

create table public.integrantes_comite_evaluador (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  tipo_integrante text not null check (tipo_integrante in ('EVALUADOR', 'SUPERVISOR')),
  nombre_completo text not null,
  cargo text not null,
  id_usuario uuid references public.perfiles_usuario(id_usuario),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index integrante_supervisor_proceso_unico on public.integrantes_comite_evaluador(id_proceso)
  where activo and tipo_integrante = 'SUPERVISOR';

create table public.ejecuciones_evaluacion (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null references public.procesos_contratacion(id),
  numero_version integer not null check (numero_version > 0),
  estado text not null check (estado in ('BORRADOR', 'CORRECCIONES_SOLICITADAS', 'APROBADA', 'CERRADA_SIN_SELECCION')),
  id_version_acta_generada uuid references public.versiones_documento(id),
  creado_en timestamptz not null default now(),
  unique (id_proceso, numero_version)
);

create table public.evaluaciones_oferta (
  id uuid primary key default gen_random_uuid(),
  id_ejecucion_evaluacion uuid not null references public.ejecuciones_evaluacion(id),
  id_oferta uuid not null references public.ofertas_proponentes(id),
  resultado_juridico text not null,
  resultado_tecnico text not null,
  resultado_financiero text not null,
  resultado_economico text not null,
  resultado_global text not null,
  valor_evaluado numeric(18,2),
  orden_elegibilidad integer,
  creado_en timestamptz not null default now(),
  unique (id_ejecucion_evaluacion, id_oferta)
);

create table public.resultados_requisitos_oferta (
  id uuid primary key default gen_random_uuid(),
  id_evaluacion_oferta uuid not null references public.evaluaciones_oferta(id),
  codigo_requisito text not null,
  categoria text not null check (categoria in ('JURIDICO', 'TECNICO', 'FINANCIERO', 'ECONOMICO')),
  resultado text not null check (resultado in ('CUMPLE', 'NO_CUMPLE', 'PENDIENTE_VERIFICACION')),
  id_version_evidencia uuid references public.versiones_documento(id),
  hallazgo text,
  verificado_por uuid references public.perfiles_usuario(id_usuario),
  verificado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (id_evaluacion_oferta, codigo_requisito)
);

create table public.observaciones_evaluacion (
  id uuid primary key default gen_random_uuid(),
  id_ejecucion_evaluacion uuid not null references public.ejecuciones_evaluacion(id),
  id_actor uuid not null references public.perfiles_usuario(id_usuario),
  observacion text not null,
  estado text not null default 'ABIERTA' check (estado in ('ABIERTA', 'RESUELTA')),
  resuelto_por uuid references public.perfiles_usuario(id_usuario),
  resuelto_en timestamptz,
  creado_en timestamptz not null default now()
);

create table public.decisiones_seleccion_oferente (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null unique references public.procesos_contratacion(id),
  id_oferta_seleccionada uuid not null references public.ofertas_proponentes(id),
  motivacion text not null,
  estado text not null check (estado in ('PENDIENTE_FIRMA', 'FIRMADA_CARGADA')),
  creado_por uuid not null references public.perfiles_usuario(id_usuario),
  id_version_acta_firmada uuid references public.versiones_documento(id),
  creado_en timestamptz not null default now(),
  firmado_en timestamptz
);

-- ---------------------------------------------------------------------------
-- Formalización, ejecución y liquidación
-- ---------------------------------------------------------------------------

create table public.registros_presupuestales (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null unique references public.procesos_contratacion(id),
  numero_rp text not null,
  expedido_en date,
  valor numeric(18,2),
  id_version_documento uuid references public.versiones_documento(id),
  estado text not null default 'CARGADO',
  creado_en timestamptz not null default now()
);

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null unique references public.procesos_contratacion(id),
  numero_contrato text not null,
  tipo_contrato text not null,
  id_proveedor_contratista uuid not null references public.proveedores(id),
  id_supervisor uuid references public.integrantes_comite_evaluador(id),
  objeto_contractual text not null,
  valor numeric(18,2) not null check (valor >= 0),
  moneda char(3) not null default 'COP',
  plazo_dias integer check (plazo_dias is null or plazo_dias > 0),
  fecha_inicio date,
  fecha_fin date,
  estado text not null default 'PENDIENTE_REVISION_JURIDICA',
  id_version_documento uuid references public.versiones_documento(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (id_proceso, numero_contrato),
  check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio)
);

create table public.publicaciones_contractuales (
  id uuid primary key default gen_random_uuid(),
  id_contrato uuid not null unique references public.contratos(id),
  id_version_contrato uuid references public.versiones_documento(id),
  id_version_acta_inicio uuid references public.versiones_documento(id),
  referencia_secop text,
  declarado_por uuid not null references public.perfiles_usuario(id_usuario),
  publicado_en timestamptz,
  id_archivo_evidencia uuid references public.archivos_documento(id),
  creado_en timestamptz not null default now()
);

create table public.condiciones_pago_contrato (
  id uuid primary key default gen_random_uuid(),
  id_contrato uuid not null references public.contratos(id),
  consecutivo integer not null check (consecutivo > 0),
  descripcion text not null,
  porcentaje numeric(5,2) check (porcentaje is null or porcentaje > 0 and porcentaje <= 100),
  valor_programado numeric(18,2) check (valor_programado is null or valor_programado >= 0),
  condicion_pago text,
  creado_en timestamptz not null default now(),
  unique (id_contrato, consecutivo)
);

create table public.recibidos_satisfaccion (
  id uuid primary key default gen_random_uuid(),
  id_contrato uuid not null references public.contratos(id),
  id_condicion_pago uuid references public.condiciones_pago_contrato(id),
  tipo_recibido text not null check (tipo_recibido in ('PARCIAL', 'FINAL')),
  recibido_en date not null,
  valor numeric(18,2),
  id_supervisor uuid references public.integrantes_comite_evaluador(id),
  id_version_documento uuid not null references public.versiones_documento(id),
  estado text not null default 'CARGADO',
  creado_en timestamptz not null default now()
);
create unique index recibido_final_unico_por_contrato on public.recibidos_satisfaccion(id_contrato)
  where tipo_recibido = 'FINAL';

create table public.liquidaciones_contrato (
  id uuid primary key default gen_random_uuid(),
  id_contrato uuid not null unique references public.contratos(id),
  estado text not null check (estado in ('PENDIENTE_REVISION_JURIDICA', 'CORRECCIONES_SOLICITADAS', 'APROBADA', 'FIRMADA')),
  saldo_final numeric(18,2),
  liquidado_en date,
  id_version_documento uuid references public.versiones_documento(id),
  aprobado_por uuid references public.perfiles_usuario(id_usuario),
  id_version_firmada uuid references public.versiones_documento(id),
  creado_en timestamptz not null default now()
);

create table public.declaratorias_desierto (
  id uuid primary key default gen_random_uuid(),
  id_proceso uuid not null unique references public.procesos_contratacion(id),
  motivo text not null,
  declarado_en timestamptz not null default now(),
  id_version_documento uuid references public.versiones_documento(id),
  creado_por uuid not null references public.perfiles_usuario(id_usuario),
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Alertas, cola, salida y auditoría
-- ---------------------------------------------------------------------------

create table public.alertas (
  id uuid primary key default gen_random_uuid(),
  id_institucion uuid not null references public.instituciones_educativas(id),
  id_proceso uuid references public.procesos_contratacion(id),
  id_usuario_destinatario uuid not null references public.perfiles_usuario(id_usuario),
  tipo_evento text not null,
  titulo text not null,
  mensaje text not null,
  prioridad text not null default 'NORMAL' check (prioridad in ('BAJA', 'NORMAL', 'ALTA', 'CRITICA')),
  estado text not null default 'ABIERTA' check (estado in ('ABIERTA', 'LEIDA', 'CERRADA')),
  leido_en timestamptz,
  creado_en timestamptz not null default now()
);
create index alertas_usuario_idx on public.alertas(id_usuario_destinatario, creado_en desc) where estado = 'ABIERTA';

create table public.entregas_notificacion (
  id uuid primary key default gen_random_uuid(),
  id_alerta uuid not null references public.alertas(id),
  canal text not null check (canal in ('INTERNA', 'CORREO', 'PUSH_WEB')),
  estado text not null check (estado in ('PENDIENTE', 'ENVIADA', 'ENTREGADA', 'FALLIDA')),
  identificador_proveedor text,
  intentos integer not null default 0 check (intentos >= 0),
  enviado_en timestamptz,
  entregado_en timestamptz,
  detalle_error text,
  creado_en timestamptz not null default now()
);

create table public.suscripciones_notificacion_dispositivo (
  id uuid primary key default gen_random_uuid(),
  id_usuario uuid not null references public.perfiles_usuario(id_usuario),
  endpoint text not null unique,
  clave_publica text not null,
  clave_autenticacion text not null,
  agente_usuario text,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.trabajos_segundo_plano (
  id uuid primary key default gen_random_uuid(),
  tipo_trabajo text not null,
  carga_util jsonb not null,
  clave_idempotencia text not null unique,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'FALLIDO')),
  intentos integer not null default 0 check (intentos >= 0),
  disponible_en timestamptz not null default now(),
  finalizado_en timestamptz,
  resultado jsonb,
  creado_en timestamptz not null default now()
);
create index trabajos_segundo_plano_pendientes_idx on public.trabajos_segundo_plano(disponible_en)
  where estado = 'PENDIENTE';

create table public.eventos_salida (
  id uuid primary key default gen_random_uuid(),
  tipo_agregado text not null,
  id_agregado uuid not null,
  tipo_evento text not null,
  carga_util jsonb not null,
  publicado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index eventos_salida_pendientes_idx on public.eventos_salida(creado_en) where publicado_en is null;

create table public.eventos_auditoria (
  id uuid primary key default gen_random_uuid(),
  id_institucion uuid references public.instituciones_educativas(id),
  id_proceso uuid references public.procesos_contratacion(id),
  id_actor uuid references public.perfiles_usuario(id_usuario),
  accion text not null,
  tipo_entidad text not null,
  id_entidad uuid not null,
  datos_antes jsonb,
  datos_despues jsonb,
  hash_ip text,
  creado_en timestamptz not null default now(),
  hash_anterior text,
  hash_evento text not null
);
create index eventos_auditoria_proceso_idx on public.eventos_auditoria(id_proceso, creado_en desc);
create index eventos_auditoria_institucion_idx on public.eventos_auditoria(id_institucion, creado_en desc);

-- ---------------------------------------------------------------------------
-- Funciones de control. Están en esquema no expuesto y solo devuelven booleanos
-- calculados a partir del usuario autenticado.
-- ---------------------------------------------------------------------------

create or replace function privado.es_administrador_arka()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    join public.perfiles_usuario perfil on perfil.id_usuario = asignacion.id_usuario
    where asignacion.id_usuario = auth.uid()
      and asignacion.activa
      and perfil.activo
      and rol.codigo = 'ADMINISTRADOR_ARKA'
  );
$$;

create or replace function privado.pertenece_a_institucion(p_id_institucion uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    join public.perfiles_usuario perfil on perfil.id_usuario = asignacion.id_usuario
    where asignacion.id_usuario = auth.uid()
      and asignacion.id_institucion = p_id_institucion
      and asignacion.activa
      and perfil.activo
      and rol.codigo in ('RECTOR_IE', 'APOYO_IE')
  );
$$;

create or replace function privado.es_abogado_asignado(p_id_proceso uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.responsables_proceso responsable
    join public.perfiles_usuario perfil on perfil.id_usuario = responsable.id_usuario
    where responsable.id_proceso = p_id_proceso
      and responsable.id_usuario = auth.uid()
      and responsable.tipo_responsabilidad = 'ABOGADO'
      and responsable.activo
      and perfil.activo
  );
$$;

create or replace function privado.es_comite_asignado(p_id_proceso uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    join public.procesos_contratacion proceso on proceso.id = p_id_proceso
    where asignacion.id_usuario = auth.uid()
      and asignacion.id_institucion = proceso.id_institucion
      and asignacion.activa
      and rol.codigo = 'COMITE_EVALUADOR'
      and proceso.fase_actual = 'EVALUACION'
  );
$$;

create or replace function privado.puede_leer_proceso(p_id_proceso uuid, p_id_institucion uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select privado.es_administrador_arka()
      or privado.pertenece_a_institucion(p_id_institucion)
      or privado.es_abogado_asignado(p_id_proceso)
      or privado.es_comite_asignado(p_id_proceso);
$$;

create or replace function privado.puede_leer_documento(p_id_documento uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.documentos_expediente documento
    where documento.id = p_id_documento
      and (
        privado.es_administrador_arka()
        or privado.pertenece_a_institucion(documento.id_institucion)
        or (documento.id_proceso is not null and privado.es_abogado_asignado(documento.id_proceso))
        or (documento.id_proceso is not null and privado.es_comite_asignado(documento.id_proceso))
      )
  );
$$;

create or replace function privado.puede_leer_ruta_archivo(p_ruta text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  partes text[] := string_to_array(p_ruta, '/');
  id_institucion_ruta uuid;
  id_proceso_ruta uuid;
begin
  if coalesce(array_length(partes, 1), 0) <> 7
     or partes[1] <> 'instituciones'
     or partes[3] <> 'procesos'
     or partes[5] <> 'documentos'
     or partes[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or partes[4] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  id_institucion_ruta := partes[2]::uuid;
  id_proceso_ruta := partes[4]::uuid;
  return exists (
    select 1
    from public.procesos_contratacion proceso
    where proceso.id = id_proceso_ruta
      and proceso.id_institucion = id_institucion_ruta
      and privado.puede_leer_proceso(proceso.id, proceso.id_institucion)
  );
end;
$$;

create or replace function privado.puede_leer_institucion(p_id_institucion uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select privado.es_administrador_arka()
      or privado.pertenece_a_institucion(p_id_institucion)
      or exists (
        select 1
        from public.responsables_proceso responsable
        join public.procesos_contratacion proceso on proceso.id = responsable.id_proceso
        where responsable.id_usuario = auth.uid()
          and responsable.activo
          and proceso.id_institucion = p_id_institucion
      );
$$;

create or replace function privado.actualizar_marca_tiempo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create or replace function privado.validar_asignacion_roles_usuario()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  codigo_rol text;
begin
  select codigo into codigo_rol from public.roles where id = new.id_rol;

  if codigo_rol in ('RECTOR_IE', 'APOYO_IE', 'COMITE_EVALUADOR') and new.id_institucion is null then
    raise exception 'El rol institucional requiere una Institución Educativa.';
  end if;

  if codigo_rol in ('ADMINISTRADOR_ARKA', 'ABOGADO_ARKA') and new.id_institucion is not null then
    raise exception 'Los roles Arka no pertenecen a una única Institución Educativa.';
  end if;

  if new.activa and codigo_rol in ('RECTOR_IE', 'APOYO_IE') and exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    where asignacion.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and asignacion.id_institucion = new.id_institucion
      and asignacion.activa
      and rol.codigo = codigo_rol
  ) then
    raise exception 'Cada Institución Educativa puede tener un único usuario activo con el rol %.', codigo_rol;
  end if;

  return new;
end;
$$;

create or replace function privado.bloquear_mutacion_auditoria()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Los eventos de auditoría son inmutables.';
end;
$$;

create trigger perfiles_usuario_actualizado
before update on public.perfiles_usuario
for each row execute function privado.actualizar_marca_tiempo();
create trigger instituciones_educativas_actualizado
before update on public.instituciones_educativas
for each row execute function privado.actualizar_marca_tiempo();
create trigger manuales_contratacion_actualizado
before update on public.manuales_contratacion
for each row execute function privado.actualizar_marca_tiempo();
create trigger procesos_contratacion_actualizado
before update on public.procesos_contratacion
for each row execute function privado.actualizar_marca_tiempo();
create trigger documentos_expediente_actualizado
before update on public.documentos_expediente
for each row execute function privado.actualizar_marca_tiempo();
create trigger proveedores_actualizado
before update on public.proveedores
for each row execute function privado.actualizar_marca_tiempo();
create trigger integrantes_comite_evaluador_actualizado
before update on public.integrantes_comite_evaluador
for each row execute function privado.actualizar_marca_tiempo();
create trigger contratos_actualizado
before update on public.contratos
for each row execute function privado.actualizar_marca_tiempo();
create trigger suscripciones_notificacion_dispositivo_actualizado
before update on public.suscripciones_notificacion_dispositivo
for each row execute function privado.actualizar_marca_tiempo();
create trigger eventos_auditoria_inmutables
before update or delete on public.eventos_auditoria
for each row execute function privado.bloquear_mutacion_auditoria();
create trigger asignaciones_roles_usuario_validas
before insert or update of id_rol, id_institucion, activa on public.asignaciones_roles_usuario
for each row execute function privado.validar_asignacion_roles_usuario();

-- ---------------------------------------------------------------------------
-- RLS y privilegios. El navegador recibe cero privilegios de escritura;
-- el servidor valida la sesión y usa la clave de servicio fuera del navegador.
-- ---------------------------------------------------------------------------

do $$
declare
  nombre_tabla text;
begin
  foreach nombre_tabla in array array[
    'perfiles_usuario', 'instituciones_educativas', 'periodos_servicio_ie',
    'roles', 'permisos', 'permisos_roles', 'asignaciones_roles_usuario',
    'manuales_contratacion', 'versiones_manual_contratacion', 'reglas_manual_contratacion', 'hallazgos_reglas_manual',
    'procesos_contratacion', 'responsables_proceso', 'historial_fases_proceso', 'bloqueos_proceso', 'tareas_proceso', 'eventos_cronograma_proceso', 'transiciones_flujo',
    'documentos_expediente', 'versiones_documento', 'archivos_documento', 'revisiones_documento', 'firmas_documento', 'relaciones_documento', 'publicaciones_secop', 'ejecuciones_ia', 'ejecuciones_generacion_documento',
    'cotizaciones_mercado', 'items_cotizacion_mercado', 'ejecuciones_extraccion', 'campos_extraidos', 'ejecuciones_comparacion_mercado', 'items_comparacion_mercado', 'valores_comparacion_mercado', 'perfiles_estudio_mercado', 'certificados_disponibilidad_presupuestal',
    'proveedores', 'representantes_proveedor', 'actas_recibo_ofertas', 'ofertas_proponentes', 'anexos_oferta', 'items_oferta', 'integrantes_comite_evaluador', 'ejecuciones_evaluacion', 'evaluaciones_oferta', 'resultados_requisitos_oferta', 'observaciones_evaluacion', 'decisiones_seleccion_oferente',
    'registros_presupuestales', 'contratos', 'publicaciones_contractuales', 'condiciones_pago_contrato', 'recibidos_satisfaccion', 'liquidaciones_contrato', 'declaratorias_desierto',
    'alertas', 'entregas_notificacion', 'suscripciones_notificacion_dispositivo', 'trabajos_segundo_plano', 'eventos_salida', 'eventos_auditoria'
  ] loop
    execute format('alter table public.%I enable row level security', nombre_tabla);
    execute format('revoke all on table public.%I from anon, authenticated', nombre_tabla);
    execute format('grant all on table public.%I to service_role', nombre_tabla);
  end loop;
end;
$$;

revoke all on schema privado from public, anon, authenticated;
grant usage on schema privado to authenticated;
revoke all on function privado.es_administrador_arka() from public, anon;
revoke all on function privado.pertenece_a_institucion(uuid) from public, anon;
revoke all on function privado.es_abogado_asignado(uuid) from public, anon;
revoke all on function privado.es_comite_asignado(uuid) from public, anon;
revoke all on function privado.puede_leer_proceso(uuid, uuid) from public, anon;
revoke all on function privado.puede_leer_documento(uuid) from public, anon;
revoke all on function privado.puede_leer_ruta_archivo(text) from public, anon;
revoke all on function privado.puede_leer_institucion(uuid) from public, anon;
grant execute on function privado.es_administrador_arka() to authenticated;
grant execute on function privado.pertenece_a_institucion(uuid) to authenticated;
grant execute on function privado.es_abogado_asignado(uuid) to authenticated;
grant execute on function privado.es_comite_asignado(uuid) to authenticated;
grant execute on function privado.puede_leer_proceso(uuid, uuid) to authenticated;
grant execute on function privado.puede_leer_documento(uuid) to authenticated;
grant execute on function privado.puede_leer_ruta_archivo(text) to authenticated;
grant execute on function privado.puede_leer_institucion(uuid) to authenticated;

create policy perfiles_usuario_lectura_propia on public.perfiles_usuario
for select to authenticated using (id_usuario = (select auth.uid()) or privado.es_administrador_arka());

create policy instituciones_educativas_lectura_autorizada on public.instituciones_educativas
for select to authenticated using (
  privado.puede_leer_institucion(id)
);

create policy procesos_contratacion_lectura_autorizada on public.procesos_contratacion
for select to authenticated using (privado.puede_leer_proceso(id, id_institucion));

create policy documentos_expediente_lectura_autorizada on public.documentos_expediente
for select to authenticated using (privado.puede_leer_documento(id));

create policy versiones_documento_lectura_autorizada on public.versiones_documento
for select to authenticated using (privado.puede_leer_documento(id_documento));

create policy archivos_documento_lectura_autorizada on public.archivos_documento
for select to authenticated using (
  exists (select 1 from public.versiones_documento version_documento where version_documento.id = id_version_documento and privado.puede_leer_documento(version_documento.id_documento))
);

create policy alertas_lectura_propia on public.alertas
for select to authenticated using (id_usuario_destinatario = (select auth.uid()) or privado.es_administrador_arka());

create policy suscripciones_notificacion_dispositivo_lectura_propia on public.suscripciones_notificacion_dispositivo
for select to authenticated using (id_usuario = (select auth.uid()));

-- Storage nunca es público. Las cargas y URL firmadas se expiden por el servidor
-- después de autorizar al usuario; la política también protege la descarga directa.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expediente-privado',
  'expediente-privado',
  false,
  26214400,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy objetos_expediente_lectura_autorizada on storage.objects
for select to authenticated
using (
  bucket_id = 'expediente-privado'
  and privado.puede_leer_ruta_archivo(name)
);

-- Datos de referencia. La semilla no crea usuarios ni Instituciones Educativas.
insert into public.roles (codigo, nombre, descripcion) values
  ('ADMINISTRADOR_ARKA', 'Administrador Arka', 'Administración global de LEXCON IAG.'),
  ('ABOGADO_ARKA', 'Abogado Arka', 'Revisión jurídica de procesos asignados.'),
  ('RECTOR_IE', 'Rector u ordenador del gasto', 'Responsable institucional del proceso.'),
  ('APOYO_IE', 'Funcionario autorizado IE', 'Apoyo institucional autorizado.'),
  ('COMITE_EVALUADOR', 'Comité evaluador', 'Consulta de evidencia durante la evaluación.')
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;

insert into public.permisos (codigo, nombre, descripcion) values
  ('LEER_PROCESO', 'Leer proceso', 'Consulta procesos, documentos y trazabilidad autorizados.'),
  ('ABRIR_PROCESO', 'Abrir proceso', 'Registra un nuevo proceso contractual.'),
  ('REVISAR_JURIDICAMENTE', 'Revisar jurídicamente', 'Aprueba o solicita correcciones jurídicas.'),
  ('DECIDIR_INSTITUCIONALMENTE', 'Decidir institucionalmente', 'Registra decisiones de la IE.'),
  ('GESTIONAR_ACCESOS', 'Gestionar accesos', 'Administra usuarios, roles y asignaciones.')
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;
