-- Mantiene coherente el correo del perfil con Auth y registra los cambios de acceso.
-- El correo de inicio de sesión vive en auth.users; el perfil es una copia para
-- mostrarlo y consultarlo. Un trigger evita que ambos se separen cuando una
-- persona confirma un cambio de correo o cuando el Administrador lo corrige.

create or replace function public.sincronizar_correo_perfil()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.email is not null and new.email is distinct from old.email then
    update public.perfiles_usuario
       set correo_electronico = lower(btrim(new.email)),
           actualizado_en = now()
     where id_usuario = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sincronizar_correo_perfil on auth.users;
create trigger sincronizar_correo_perfil
  after update of email on auth.users
  for each row execute function public.sincronizar_correo_perfil();

revoke all on function public.sincronizar_correo_perfil() from public, anon, authenticated;

create or replace function public.registrar_evento_acceso(
  p_id_actor uuid,
  p_id_usuario uuid,
  p_accion text,
  p_datos jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_accion not in ('ADMIN_RECOVERED', 'EMAIL_CORRECTED', 'EMAIL_CHANGE_REQUESTED', 'PASSWORD_CHANGED') then
    raise exception 'La acción de acceso indicada no es válida.';
  end if;
  if not exists (select 1 from public.perfiles_usuario where id_usuario = p_id_usuario) then
    raise exception 'La cuenta indicada no existe.';
  end if;

  insert into public.eventos_auditoria (id_actor, accion, tipo_entidad, id_entidad, datos_despues)
  values (p_id_actor, p_accion, 'perfil_usuario', p_id_usuario, coalesce(p_datos, '{}'::jsonb));
end;
$$;

revoke all on function public.registrar_evento_acceso(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_evento_acceso(uuid, uuid, text, jsonb) to service_role;
