-- La aplicación consulta esta función mediante la sesión autenticada. No se
-- concede lectura directa de perfiles, roles ni asignaciones a otros usuarios.
create or replace function public.obtener_identidad_actual()
returns table (
  id_usuario uuid,
  nombre_mostrado text,
  codigo_rol text,
  id_institucion uuid,
  nombre_institucion text
)
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select
    perfil.id_usuario,
    perfil.nombre_mostrado,
    rol.codigo,
    asignacion.id_institucion,
    institucion.nombre
  from public.perfiles_usuario perfil
  join public.asignaciones_roles_usuario asignacion
    on asignacion.id_usuario = perfil.id_usuario
    and asignacion.activa
  join public.roles rol
    on rol.id = asignacion.id_rol
    and rol.activo
  left join public.instituciones_educativas institucion
    on institucion.id = asignacion.id_institucion
    and institucion.activo
  where perfil.id_usuario = (select auth.uid())
    and perfil.activo
    and (asignacion.id_institucion is null or institucion.id is not null)
  order by case rol.codigo
    when 'ADMINISTRADOR_ARKA' then 1
    when 'ABOGADO_ARKA' then 2
    when 'RECTOR_IE' then 3
    when 'APOYO_IE' then 4
    when 'COMITE_EVALUADOR' then 5
    else 99
  end, asignacion.asignado_en
  limit 1;
$$;

revoke all on function public.obtener_identidad_actual() from public, anon;
grant execute on function public.obtener_identidad_actual() to authenticated;
