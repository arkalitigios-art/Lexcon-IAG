import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

export interface StoredFile { key: string; sha256: string; sizeBytes: number; originalName: string; mimeType: string }
export interface FileUpload { name: string; mimeType: string; bytes: Uint8Array }

const allowedMimeTypes = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']);
const maximumBytes = 25 * 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function hasExpectedSignature(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === 'application/pdf') return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (mimeType === 'image/jpeg') return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mimeType === 'image/png') return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
}

export class LocalPrivateStorage {
  constructor(private readonly root = resolve(process.cwd(), process.env.LEXCON_STORAGE_DIR ?? './storage')) {}

  async save(upload: FileUpload): Promise<StoredFile> {
    const originalName = basename(upload.name).replace(/[^\w.()-]/g, '_');
    if (!originalName || upload.bytes.byteLength === 0 || upload.bytes.byteLength > maximumBytes || !allowedMimeTypes.has(upload.mimeType) || !hasExpectedSignature(upload.mimeType, upload.bytes)) throw new Error('Archivo no permitido.');
    await mkdir(this.root, { recursive: true });
    const key = randomUUID(); const temporary = join(this.root, `${key}.uploading`); const finalPath = join(this.root, key);
    await writeFile(temporary, upload.bytes); const metadata = await stat(temporary);
    const sha256 = createHash('sha256').update(upload.bytes).digest('hex'); await rename(temporary, finalPath);
    return { key, sha256, sizeBytes: metadata.size, originalName, mimeType: upload.mimeType };
  }

  async remove(key: string): Promise<void> {
    await rm(join(this.root, key), { force: true });
  }

  async read(key: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(join(this.root, key)));
  }
}
