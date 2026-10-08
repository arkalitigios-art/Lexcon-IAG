import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalPrivateStorage } from '../../src/platform/storage/local-storage';

const directories: string[] = [];

afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe('almacenamiento local privado', () => {
  it('acepta una cotización PDF con firma válida y rechaza un tipo declarado sin esa firma', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lexcon-storage-')); directories.push(directory);
    const storage = new LocalPrivateStorage(directory);
    const saved = await storage.save({ name: 'cotizacion.pdf', mimeType: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.4\ncontenido ficticio') });
    expect(saved.sha256).toHaveLength(64);
    await expect(storage.save({ name: 'invalido.pdf', mimeType: 'application/pdf', bytes: new TextEncoder().encode('contenido plano') })).rejects.toThrow('Archivo no permitido.');
    await storage.remove(saved.key);
  });
});
