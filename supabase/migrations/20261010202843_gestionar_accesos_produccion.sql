-- Administración de identidades creada únicamente desde el servidor de LEXCON.
-- Auth administra la contraseña; esta migración vincula la identidad con el
-- perfil, el rol, la Institución Educativa y la auditoría de negocio.

create or replace function public.registrar_acceso_usuario(
  p_id_usuario uuid,
  p_nombre text,
  p_correo text,
  p_codigo_rol text,
  p_id_institucion uuid,
  p_id_actor uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id_rol uuid;
  v_es_institucional boolean;
begin
  if p_id_usuario is null or btrim(p_nombre) = '' or btrim(p_correo) = '' then
    raise exception 'La identidad, el nombre y el correo son obligatorios.';
  end if;

  if p_codigo_rol not in ('ADMINISTRADOR_ARKA', 'ABOGADO_ARKA', 'RECTOR_IE', 'APOYO_IE') then
    raise exception 'El rol indicado no puede iniciar sesión en LEXCON.';
  end if;

  v_es_institucional := p_codigo_rol in ('RECTOR_IE', 'APOYO_IE');
  if v_es_institucional and p_id_institucion is null then
    raise exception 'Rectoría y Apoyo requieren una Institución Educativa.';
  end if;
  if not v_es_institucional and p_id_institucion is not null then
    raise exception 'Administrador y Abogado no se asignan a una única Institución Educativa.';
  end if;
  if p_id_institucion is not null and not exists (
    select 1 from public.instituciones_educativas where id = p_id_institucion and activo
  ) then
    raise exception 'La Institución Educativa seleccionada no está activa.';
  end if;

  if p_id_actor is null and exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    join public.perfiles_usuario perfil on perfil.id_usuario = asignacion.id_usuario
    where asignacion.activa and perfil.activo and rol.codigo = 'ADMINISTRADOR_ARKA'
  ) then
    raise exception 'La inicialización solo se permite cuando no existe un Administrador activo.';
  end if;

  select id into v_id_rol from public.roles where codigo = p_codigo_rol and activo;
  if v_id_rol is null then raise exception 'El rol solicitado no está disponible.'; end if;

  insert into public.perfiles_usuario (id_usuario, nombre_mostrado, correo_electronico, activo)
  values (p_id_usuario, btrim(p_nombre), lower(btrim(p_correo)), true);

  insert into public.asignaciones_roles_usuario (id_usuario, id_rol, id_institucion, activa, asignado_por)
  values (p_id_usuario, v_id_rol, p_id_institucion, true, p_id_actor);

  insert into public.eventos_auditoria (
    id_institucion, id_actor, accion, tipo_entidad, id_entidad, datos_despues
  ) values (
    p_id_institucion, p_id_actor, 'ACCESS_CREATED', 'perfil_usuario', p_id_usuario,
    jsonb_build_object('rol', p_codigo_rol, 'correo', lower(btrim(p_correo)))
  );
end;
$$;

create or replace function public.cambiar_estado_acceso_usuario(
  p_id_usuario uuid,
  p_activo boolean,
  p_id_actor uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_es_administrador boolean;
begin
  if p_id_usuario is null or p_id_actor is null then
    raise exception 'La persona y quien realiza la acción son obligatorios.';
  end if;
  if p_id_usuario = p_id_actor and not p_activo then
    raise exception 'No puedes desactivar tu propio acceso administrativo.';
  end if;
  if not exists (select 1 from public.perfiles_usuario where id_usuario = p_id_usuario) then
    raise exception 'La cuenta solicitada no existe.';
  end if;

  select exists (
    select 1 from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    where asignacion.id_usuario = p_id_usuario and asignacion.activa and rol.codigo = 'ADMINISTRADOR_ARKA'
  ) into v_es_administrador;

  if not p_activo and v_es_administrador and not exists (
    select 1
    from public.asignaciones_roles_usuario asignacion
    join public.roles rol on rol.id = asignacion.id_rol
    join public.perfiles_usuario perfil on perfil.id_usuario = asignacion.id_usuario
    where asignacion.id_usuario <> p_id_usuario and asignacion.activa and perfil.activo
      and rol.codigo = 'ADMINISTRADOR_ARKA'
  ) then
    raise exception 'Debe permanecer al menos un Administrador activo.';
  end if;

  update public.perfiles_usuario set activo = p_activo where id_usuario = p_id_usuario;
  update public.asignaciones_roles_usuario
    set activa = p_activo, retirado_en = case when p_activo then null else now() end
    where id_usuario = p_id_usuario;

  insert into public.eventos_auditoria (id_actor, accion, tipo_entidad, id_entidad, datos_despues)
  values (p_id_actor, case when p_activo then 'ACCESS_ACTIVATED' else 'ACCESS_DEACTIVATED' end,
    'perfil_usuario', p_id_usuario, jsonb_build_object('activo', p_activo));
end;
$$;

revoke all on function public.registrar_acceso_usuario(uuid, text, text, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.cambiar_estado_acceso_usuario(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.registrar_acceso_usuario(uuid, text, text, text, uuid, uuid) to service_role;
grant execute on function public.cambiar_estado_acceso_usuario(uuid, boolean, uuid) to service_role;
