import { createHash, randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FileUpload, StoredFile } from './local-storage';

const bucketPrivado = 'expediente-privado';
const tiposPermitidos = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);
const tamanoMaximoBytes = 25 * 1024 * 1024;

export interface UbicacionArchivoProceso {
  idInstitucion: string;
  idProceso: string;
  idVersionDocumento: string;
}

function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

function iniciaCon(bytes: Uint8Array, firma: readonly number[]): boolean {
  return firma.every((valor, indice) => bytes[indice] === valor);
}

function firmaValida(tipoMime: string, bytes: Uint8Array): boolean {
  if (tipoMime === 'application/pdf') return iniciaCon(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (tipoMime === 'image/jpeg') return iniciaCon(bytes, [0xff, 0xd8, 0xff]);
  if (tipoMime === 'image/png') return iniciaCon(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return iniciaCon(bytes, [0x50, 0x4b, 0x03, 0x04]);
}

function nombreSeguro(nombre: string): string {
  return basename(nombre).replace(/[^\w.()-]/g, '_');
}

function esRutaPrivadaDeProceso(ruta: string): boolean {
  return /^instituciones\/[0-9a-f-]{36}\/procesos\/[0-9a-f-]{36}\/documentos\/[0-9a-f-]{36}\/[\w.()-]+$/i.test(ruta);
}

function validarCarga(ubicacion: UbicacionArchivoProceso, carga: FileUpload): string {
  if (!esUuid(ubicacion.idInstitucion) || !esUuid(ubicacion.idProceso) || !esUuid(ubicacion.idVersionDocumento)) throw new Error('La ubicación privada del archivo no es válida.');
  const nombre = nombreSeguro(carga.name);
  if (!nombre || carga.bytes.byteLength === 0 || carga.bytes.byteLength > tamanoMaximoBytes || !tiposPermitidos.has(carga.mimeType) || !firmaValida(carga.mimeType, carga.bytes)) throw new Error('Archivo no permitido.');
  return nombre;
}

export function rutaArchivoPrivado(ubicacion: UbicacionArchivoProceso, nombreOriginal: string): string {
  if (!esUuid(ubicacion.idInstitucion) || !esUuid(ubicacion.idProceso) || !esUuid(ubicacion.idVersionDocumento)) throw new Error('La ubicación privada del archivo no es válida.');
  const nombre = nombreSeguro(nombreOriginal);
  if (!nombre) throw new Error('El nombre del archivo no es válido.');
  return `instituciones/${ubicacion.idInstitucion}/procesos/${ubicacion.idProceso}/documentos/${ubicacion.idVersionDocumento}/${nombre}`;
}

/** Almacenamiento privado: el llamador debe autorizar el proceso antes de usarlo. */
export class AlmacenamientoPrivadoSupabase {
  constructor(private readonly cliente: SupabaseClient) {}

  async guardar(ubicacion: UbicacionArchivoProceso, carga: FileUpload): Promise<StoredFile> {
    const nombreOriginal = validarCarga(ubicacion, carga);
    const ruta = rutaArchivoPrivado(ubicacion, `${randomUUID()}-${nombreOriginal}`);
    const resultado = await this.cliente.storage.from(bucketPrivado).upload(ruta, carga.bytes, {
      contentType: carga.mimeType,
      upsert: false,
      cacheControl: 'private, no-store',
    });
    if (resultado.error) throw new Error(`No fue posible guardar el archivo privado: ${resultado.error.message}`);
    return {
      key: ruta,
      sha256: createHash('sha256').update(carga.bytes).digest('hex'),
      sizeBytes: carga.bytes.byteLength,
      originalName: nombreOriginal,
      mimeType: carga.mimeType,
    };
  }

  async leer(ruta: string): Promise<Uint8Array> {
    const resultado = await this.cliente.storage.from(bucketPrivado).download(ruta);
    if (resultado.error) throw new Error(`No fue posible leer el archivo privado: ${resultado.error.message}`);
    return new Uint8Array(await resultado.data.arrayBuffer());
  }

  /** Compensación ante una apertura que no logró registrar sus metadatos. */
  async eliminar(ruta: string): Promise<void> {
    if (!esRutaPrivadaDeProceso(ruta)) throw new Error('La ruta privada del archivo no es válida.');
    const resultado = await this.cliente.storage.from(bucketPrivado).remove([ruta]);
    if (resultado.error) throw new Error(`No fue posible eliminar el archivo privado: ${resultado.error.message}`);
  }

  async crearUrlDescargaTemporal(ruta: string, segundos = 60): Promise<string> {
    if (!Number.isInteger(segundos) || segundos < 1 || segundos > 300) throw new Error('La vigencia de la URL temporal debe estar entre 1 y 300 segundos.');
    const resultado = await this.cliente.storage.from(bucketPrivado).createSignedUrl(ruta, segundos);
    if (resultado.error) throw new Error(`No fue posible crear la URL temporal: ${resultado.error.message}`);
    return resultado.data.signedUrl;
  }
}
