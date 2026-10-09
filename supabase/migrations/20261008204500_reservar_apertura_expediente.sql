-- Registra de manera atómica un expediente y sus cotizaciones ya cargadas en
-- Storage. Solo el servidor, mediante service_role y tras autorizar la sesión,
-- puede invocarla.
create or replace function public.abrir_expediente_desde_cotizaciones(
  p_id_proceso uuid,
  p_id_institucion uuid,
  p_id_actor uuid,
  p_archivos jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consecutivo integer;
  v_version_manual uuid;
  v_estado text;
  v_archivo jsonb;
  v_id_documento uuid;
  v_id_version uuid;
  v_id_archivo uuid;
  v_nombre text;
  v_ruta text;
  v_mime text;
  v_tamano bigint;
  v_hash text;
begin
  if jsonb_typeof(p_archivos) <> 'array' or jsonb_array_length(p_archivos) = 0 then
    raise exception 'Debe registrar al menos una cotización.';
  end if;

  -- El bloqueo de la IE evita que dos aperturas calculen el mismo consecutivo.
  perform 1
  from public.instituciones_educativas
  where id = p_id_institucion and activo
  for update;
  if not found then
    raise exception 'La Institución Educativa no está disponible.';
  end if;

  if not exists (
    select 1 from public.perfiles_usuario
    where id_usuario = p_id_actor and activo
  ) then
    raise exception 'El actor no está activo.';
  end if;

  if not exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    where asignacion.id_usuario = p_id_actor
      and asignacion.id_institucion = p_id_institucion
      and asignacion.activa
      and asignacion.retirado_en is null
      and rol.activo
      and rol.codigo in ('RECTOR_IE', 'APOYO_IE')
  ) then
    raise exception 'El actor no puede abrir expedientes para esta institución.';
  end if;

  -- Una repetición después de un fallo de red devuelve el mismo expediente y
  -- no duplica documentos ni eventos.
  if exists (
    select 1 from public.procesos_contratacion
    where id = p_id_proceso
      and id_institucion = p_id_institucion
      and abierto_por = p_id_actor
  ) then
    return p_id_proceso;
  end if;
  if exists (select 1 from public.procesos_contratacion where id = p_id_proceso) then
    raise exception 'El identificador del expediente ya está en uso.';
  end if;

  select version_manual.id
  into v_version_manual
  from public.manuales_contratacion manual
  join public.versiones_manual_contratacion version_manual on version_manual.id_manual = manual.id
  where manual.id_institucion = p_id_institucion
    and manual.estado = 'VIGENTE'
    and version_manual.estado = 'VIGENTE'
    and (version_manual.vigente_desde is null or version_manual.vigente_desde <= current_date)
    and (version_manual.vigente_hasta is null or version_manual.vigente_hasta >= current_date)
  order by version_manual.numero_version desc
  limit 1;

  select coalesce(max(consecutivo_institucional), 0) + 1
  into v_consecutivo
  from public.procesos_contratacion
  where id_institucion = p_id_institucion;

  v_estado := case when v_version_manual is null then 'BLOCKED_REGULATION' else 'RECEIVED' end;

  insert into public.procesos_contratacion (
    id, id_institucion, consecutivo_institucional, numero_proceso,
    id_version_manual_aplicable, fase_actual, estado_actual, abierto_por
  ) values (
    p_id_proceso, p_id_institucion, v_consecutivo,
    to_char(current_date, 'YYYY') || '-' || lpad(v_consecutivo::text, 4, '0'),
    v_version_manual, 'MERCADO', v_estado, p_id_actor
  );

  for v_archivo in select value from jsonb_array_elements(p_archivos)
  loop
    begin
      v_id_documento := (v_archivo ->> 'id_documento')::uuid;
      v_id_version := (v_archivo ->> 'id_version_documento')::uuid;
      v_id_archivo := (v_archivo ->> 'id_archivo')::uuid;
      v_nombre := nullif(btrim(v_archivo ->> 'nombre_original'), '');
      v_ruta := nullif(btrim(v_archivo ->> 'ruta_objeto'), '');
      v_mime := nullif(btrim(v_archivo ->> 'tipo_mime'), '');
      v_tamano := (v_archivo ->> 'tamano_bytes')::bigint;
      v_hash := lower(v_archivo ->> 'hash_sha256');
    exception when invalid_text_representation then
      raise exception 'Los identificadores y el tamaño de los archivos deben ser válidos.';
    end;

    if v_nombre is null or v_ruta is null or v_mime is null
      or v_tamano is null or v_tamano <= 0 or v_hash !~ '^[a-f0-9]{64}$'
      or v_mime not in (
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
      )
      or v_ruta not like format(
        'instituciones/%s/procesos/%s/documentos/%s/%%',
        p_id_institucion, p_id_proceso, v_id_version
      ) then
      raise exception 'Los metadatos del archivo no son válidos.';
    end if;

    -- La referencia de versión vigente se establece después de crear la
    -- versión para respetar las dos llaves foráneas no diferibles.
    insert into public.documentos_expediente (
      id, id_institucion, id_proceso, tipo_documento, titulo, creado_por
    ) values (
      v_id_documento, p_id_institucion, p_id_proceso,
      'COTIZACION_MERCADO', v_nombre, p_id_actor
    );

    insert into public.versiones_documento (
      id, id_documento, numero_version, origen, creado_por
    ) values (
      v_id_version, v_id_documento, 1, 'CARGA_IE', p_id_actor
    );

    update public.documentos_expediente
    set id_version_vigente = v_id_version, actualizado_en = now()
    where id = v_id_documento;

    insert into public.archivos_documento (
      id, id_version_documento, ruta_objeto, nombre_original, tipo_mime,
      tamano_bytes, hash_sha256, subido_por
    ) values (
      v_id_archivo, v_id_version, v_ruta, v_nombre, v_mime,
      v_tamano, v_hash, p_id_actor
    );

    insert into public.cotizaciones_mercado (id_proceso, id_version_documento)
    values (p_id_proceso, v_id_version);
  end loop;

  if v_version_manual is null then
    insert into public.bloqueos_proceso (id_proceso, alcance, motivo, abierto_por)
    values (p_id_proceso, 'MERCADO', 'No existe reglamento institucional aplicable.', p_id_actor);
  end if;

  insert into public.historial_fases_proceso (
    id_proceso, fase_destino, accion, estado_posterior, id_actor, observacion
  ) values (
    p_id_proceso, 'MERCADO', 'EXPEDIENTE_ABIERTO', v_estado, p_id_actor,
    'Expediente abierto con cotizaciones de mercado.'
  );

  insert into public.eventos_auditoria (
    id_institucion, id_proceso, id_actor, accion, tipo_entidad, id_entidad
  ) values (
    p_id_institucion, p_id_proceso, p_id_actor,
    'EXPEDIENTE_ABIERTO_DESDE_COTIZACIONES', 'PROCESO', p_id_proceso
  );

  return p_id_proceso;
end;
$$;

revoke all on function public.abrir_expediente_desde_cotizaciones(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.abrir_expediente_desde_cotizaciones(uuid, uuid, uuid, jsonb) to service_role;
