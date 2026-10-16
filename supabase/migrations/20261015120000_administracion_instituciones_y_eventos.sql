-- Administración de Instituciones Educativas sobre Supabase.
-- registrar_evento_administrativo deja en eventos_auditoria las actuaciones del
-- Administrador; el disparador eventos_auditoria_encadenados calcula la cadena.
-- guardar_institucion crea o actualiza una IE, cierra y abre su periodo de
-- servicio cuando cambia el estado y registra la auditoría en una sola
-- transacción. Ambas se ejecutan solo desde el servidor de LEXCON (service_role).

create or replace function public.registrar_evento_administrativo(
  p_id_actor uuid,
  p_id_institucion uuid,
  p_id_proceso uuid,
  p_accion text,
  p_tipo_entidad text,
  p_id_entidad uuid,
  p_datos jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_accion not in (
    'INSTITUCION_CREADA',
    'INSTITUCION_ACTUALIZADA',
    'INSTITUCION_SERVICIO_SUSPENDIDO',
    'INSTITUCION_SERVICIO_FINALIZADO',
    'INSTITUCION_SERVICIO_REACTIVADO'
  ) then
    raise exception 'ACCION_NO_VALIDA' using errcode = '22023';
  end if;
  if p_id_entidad is null or btrim(coalesce(p_tipo_entidad, '')) = '' then
    raise exception 'ENTIDAD_NO_VALIDA' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    join public.perfiles_usuario perfil on perfil.id_usuario = asignacion.id_usuario
    where asignacion.id_usuario = p_id_actor
      and asignacion.activa
      and perfil.activo
      and rol.codigo = 'ADMINISTRADOR_ARKA'
  ) then
    raise exception 'ACTOR_NO_AUTORIZADO' using errcode = '42501';
  end if;

  insert into public.eventos_auditoria (
    id_institucion, id_proceso, id_actor, accion, tipo_entidad, id_entidad, datos_despues
  ) values (
    p_id_institucion, p_id_proceso, p_id_actor, p_accion, p_tipo_entidad, p_id_entidad, coalesce(p_datos, '{}'::jsonb)
  );
end;
$$;

create or replace function public.guardar_institucion(
  p_id_actor uuid,
  p_id uuid,
  p_nombre text,
  p_ciudad text,
  p_departamento text,
  p_nit text,
  p_codigo_dane text,
  p_estado text,
  p_observacion text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_estado_anterior text;
  v_accion text;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_ciudad text := btrim(coalesce(p_ciudad, ''));
  v_departamento text := btrim(coalesce(p_departamento, ''));
  v_nit text := nullif(btrim(p_nit), '');
  v_codigo_dane text := nullif(btrim(p_codigo_dane), '');
  v_observacion text := nullif(btrim(p_observacion), '');
  v_hoy date := (now() at time zone 'America/Bogota')::date;
begin
  if not exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    join public.perfiles_usuario perfil on perfil.id_usuario = asignacion.id_usuario
    where asignacion.id_usuario = p_id_actor
      and asignacion.activa
      and perfil.activo
      and rol.codigo = 'ADMINISTRADOR_ARKA'
  ) then
    raise exception 'ACTOR_NO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_estado is null
    or p_estado not in ('ACTIVO', 'SUSPENDIDO', 'FINALIZADO')
    or char_length(v_nombre) not between 3 and 120
    or char_length(v_ciudad) not between 2 and 100
    or char_length(v_departamento) not between 2 and 100 then
    raise exception 'DATOS_INVALIDOS' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.instituciones_educativas (
      nombre, ciudad, departamento, nit, codigo_dane, estado_servicio, observacion_servicio, activo
    ) values (
      v_nombre, v_ciudad, v_departamento, v_nit, v_codigo_dane, p_estado, v_observacion, p_estado = 'ACTIVO'
    )
    returning id into v_id;
    insert into public.periodos_servicio_ie (id_institucion, inicia_en, estado, motivo, registrado_por)
    values (v_id, v_hoy, p_estado, v_observacion, p_id_actor);
    v_accion := 'INSTITUCION_CREADA';
  else
    select estado_servicio into v_estado_anterior
    from public.instituciones_educativas
    where id = p_id
    for update;
    if not found then
      raise exception 'INSTITUCION_NO_EXISTE' using errcode = 'P0002';
    end if;
    v_id := p_id;
    update public.instituciones_educativas
       set nombre = v_nombre,
           ciudad = v_ciudad,
           departamento = v_departamento,
           nit = v_nit,
           codigo_dane = v_codigo_dane,
           estado_servicio = p_estado,
           observacion_servicio = v_observacion,
           activo = (p_estado = 'ACTIVO')
     where id = v_id;
    if v_estado_anterior is distinct from p_estado then
      -- greatest evita violar finaliza_en >= inicia_en si el periodo vigente
      -- empezó en una fecha futura (p. ej. cargado manualmente).
      update public.periodos_servicio_ie
         set finaliza_en = greatest(v_hoy, inicia_en)
       where id_institucion = v_id and finaliza_en is null;
      insert into public.periodos_servicio_ie (id_institucion, inicia_en, estado, motivo, registrado_por)
      values (v_id, v_hoy, p_estado, v_observacion, p_id_actor);
      v_accion := case p_estado
        when 'SUSPENDIDO' then 'INSTITUCION_SERVICIO_SUSPENDIDO'
        when 'FINALIZADO' then 'INSTITUCION_SERVICIO_FINALIZADO'
        else 'INSTITUCION_SERVICIO_REACTIVADO'
      end;
    else
      v_accion := 'INSTITUCION_ACTUALIZADA';
    end if;
  end if;

  perform public.registrar_evento_administrativo(
    p_id_actor, v_id, null, v_accion, 'INSTITUCION', v_id,
    jsonb_build_object(
      'nombre', v_nombre,
      'ciudad', v_ciudad,
      'departamento', v_departamento,
      'estado_servicio', p_estado,
      'estado_anterior', v_estado_anterior
    )
  );
  return v_id;
end;
$$;

revoke all on function public.registrar_evento_administrativo(uuid, uuid, uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.guardar_institucion(uuid, uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_evento_administrativo(uuid, uuid, uuid, text, text, uuid, jsonb) to service_role;
grant execute on function public.guardar_institucion(uuid, uuid, text, text, text, text, text, text, text) to service_role;
