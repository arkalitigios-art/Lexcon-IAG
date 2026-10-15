import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = join(__dirname, '../../src/app/login');
const formulario = readFileSync(join(raiz, 'login-form.tsx'), 'utf8');
const pagina = readFileSync(join(raiz, 'page.tsx'), 'utf8');

describe('pantalla de inicio de sesión', () => {
  // En un equipo compartido, mostrar a quién pertenece la sesión abierta y ofrecer "Continuar" facilita entrar a la cuenta de otra persona.
  it('no muestra el nombre ni ofrece continuar con una sesión que ya estuviera abierta en el navegador', () => {
    expect(formulario).not.toMatch(/activeSession|Sesión activa|Continuar en mi espacio/);
    expect(pagina).not.toMatch(/currentUser|activeSession/);
  });
});
