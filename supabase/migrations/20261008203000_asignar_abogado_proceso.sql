create or replace function public.asignar_abogado_proceso(p_id_proceso uuid, p_id_abogado uuid, p_id_actor uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  id_ie uuid;
begin
  if not exists (
    select 1 from public.asignaciones_roles_usuario a join public.roles r on r.id = a.id_rol
    join public.perfiles_usuario p on p.id_usuario = a.id_usuario
    where a.id_usuario = p_id_actor and a.activa and p.activo and r.codigo = 'ADMINISTRADOR_ARKA'
  ) then raise exception 'Actor no autorizado'; end if;
  if not exists (
    select 1 from public.asignaciones_roles_usuario a join public.roles r on r.id = a.id_rol
    join public.perfiles_usuario p on p.id_usuario = a.id_usuario
    where a.id_usuario = p_id_abogado and a.activa and p.activo and r.codigo = 'ABOGADO_ARKA'
  ) then raise exception 'Abogado no válido'; end if;
  select id_institucion into id_ie from public.procesos_contratacion where id = p_id_proceso;
  if id_ie is null then raise exception 'Proceso no válido'; end if;
  update public.responsables_proceso set activo = false, retirado_en = now()
    where id_proceso = p_id_proceso and tipo_responsabilidad = 'ABOGADO' and activo;
  insert into public.responsables_proceso (id_proceso, id_usuario, tipo_responsabilidad, activo, asignado_por)
    values (p_id_proceso, p_id_abogado, 'ABOGADO', true, p_id_actor);
  insert into public.eventos_auditoria (id_institucion, id_proceso, id_actor, accion, tipo_entidad, id_entidad)
    values (id_ie, p_id_proceso, p_id_actor, 'ABOGADO_ASIGNADO', 'USUARIO', p_id_abogado);
end;
$$;
revoke all on function public.asignar_abogado_proceso(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.asignar_abogado_proceso(uuid, uuid, uuid) to service_role;
