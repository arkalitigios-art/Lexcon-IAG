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
    execute format(
      'create policy acceso_directo_restringido on public.%I for select to authenticated using (false)',
      nombre_tabla
    );
  end loop;
end;
$$;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;