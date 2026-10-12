import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function archivos(directorio: string): string[] {
  return readdirSync(directorio, { withFileTypes: true, recursive: true })
    .filter((entrada) => entrada.isFile() && /\.(ts|tsx)$/.test(entrada.name))
    .map((entrada) => join(entrada.parentPath, entrada.name));
}

const PROHIBIDOS = ['Arka Litigios', 'Administrador Arka', 'Administración Arka', 'administración Arka', 'Equipo jurídico Arka', 'ADMINISTRACIÓN ARKA', 'abogado Arka', 'Abogado Arka', 'abogados Arka', 'Abogada Arka'];

describe('textos visibles de la aplicación', () => {
  const origen = join(__dirname, '../../src');
  const contenido = archivos(origen).map((ruta) => ({ ruta, texto: readFileSync(ruta, 'utf8') }));
  it.each(PROHIBIDOS)('no contiene "%s"', (frase) => expect(contenido.filter(({ texto }) => texto.includes(frase)).map(({ ruta }) => ruta.replace(origen, 'src'))).toEqual([]));
});
