import { randomUUID } from 'node:crypto';
import type { CurrentUser } from '../../platform/auth/current-user';
import { AlmacenamientoPrivadoSupabase } from '../../platform/storage/supabase-private-storage';
import type { FileUpload, StoredFile } from '../../platform/storage/local-storage';
import { crearClienteSupabaseServidor } from '../../platform/supabase/server';
import { hasCapability } from '../access/authorization';

interface ArchivoAperturaRemota {
  id_documento: string;
  id_version_documento: string;
  id_archivo: string;
  nombre_original: string;
  ruta_objeto: string;
  tipo_mime: string;
  tamano_bytes: number;
  hash_sha256: string;
}

function puedeAbrir(user: CurrentUser): boolean {
  return Boolean(
    user.institutionId
    && hasCapability({ userId: user.id, role: user.role, institutionId: user.institutionId, assignedProcessIds: new Set() }, 'PROCESS_OPEN'),
  );
}

/**
 * Sube los objetos al bucket privado y registra todos sus metadatos mediante
 * una sola función transaccional. Si la transacción falla de forma confirmada,
 * elimina los objetos recién cargados para no dejar archivos huérfanos.
 */
export async function abrirProcesoEnSupabase(user: CurrentUser, cargas: FileUpload[]): Promise<string> {
  if (!puedeAbrir(user) || !user.institutionId) throw new Error('No tienes autorización para abrir expedientes institucionales.');
  if (!cargas.length) throw new Error('Debes cargar al menos una cotización de mercado.');

  const idProceso = randomUUID();
  const supabase = crearClienteSupabaseServidor();
  const almacenamiento = new AlmacenamientoPrivadoSupabase(supabase);
  const guardados: StoredFile[] = [];
  const archivos: ArchivoAperturaRemota[] = [];
  let intentoRegistro = false;

  try {
    for (const carga of cargas) {
      const idDocumento = randomUUID();
      const idVersionDocumento = randomUUID();
      const archivo = await almacenamiento.guardar({
        idInstitucion: user.institutionId,
        idProceso,
        idVersionDocumento,
      }, carga);
      guardados.push(archivo);
      archivos.push({
        id_documento: idDocumento,
        id_version_documento: idVersionDocumento,
        id_archivo: randomUUID(),
        nombre_original: archivo.originalName,
        ruta_objeto: archivo.key,
        tipo_mime: archivo.mimeType,
        tamano_bytes: archivo.sizeBytes,
        hash_sha256: archivo.sha256,
      });
    }

    intentoRegistro = true;
    const { data, error } = await supabase.rpc('abrir_expediente_desde_cotizaciones', {
      p_id_proceso: idProceso,
      p_id_institucion: user.institutionId,
      p_id_actor: user.id,
      p_archivos: archivos,
    });
    if (error) throw new Error(`No fue posible registrar el expediente: ${error.message}`);
    if (data !== idProceso) throw new Error('La base de datos no confirmó el identificador del expediente.');
    return idProceso;
  } catch (error) {
    // Una respuesta de red puede perderse después de confirmar la transacción.
    // Solo borramos archivos cuando confirmamos que el proceso no fue creado.
    let procesoConfirmado = false;
    if (intentoRegistro) {
      const verificacion = await supabase
        .from('procesos_contratacion')
        .select('id')
        .eq('id', idProceso)
        .maybeSingle();
      procesoConfirmado = !verificacion.error && verificacion.data?.id === idProceso;
    }
    if (!procesoConfirmado) await Promise.allSettled(guardados.map((archivo) => almacenamiento.eliminar(archivo.key)));
    throw error;
  }
}
