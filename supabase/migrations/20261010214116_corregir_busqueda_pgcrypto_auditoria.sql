-- En los proyectos alojados de Supabase, pgcrypto vive en el esquema
-- extensions. La función de encadenamiento se ejecuta con una ruta de
-- búsqueda restringida y debe calificar digest explícitamente.
create or replace function privado.encadenar_evento_auditoria()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  hash_previo text;
begin
  select evento.hash_evento
    into hash_previo
  from public.eventos_auditoria evento
  where evento.id_institucion is not distinct from new.id_institucion
  order by evento.creado_en desc, evento.id desc
  limit 1;

  new.hash_anterior := hash_previo;
  new.hash_evento := encode(extensions.digest(concat_ws('|',
    new.id::text,
    coalesce(new.id_institucion::text, ''),
    coalesce(new.id_proceso::text, ''),
    coalesce(new.id_actor::text, ''),
    new.accion,
    new.tipo_entidad,
    new.id_entidad::text,
    coalesce(new.datos_antes::text, ''),
    coalesce(new.datos_despues::text, ''),
    coalesce(new.hash_ip, ''),
    new.creado_en::text,
    coalesce(hash_previo, '')
  ), 'sha256'), 'hex');
  return new;
end;
$$;
