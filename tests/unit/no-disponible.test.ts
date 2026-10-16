import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '../../src/platform/auth/current-user';

const mocks = vi.hoisted(() => ({ configurado: vi.fn() }));

vi.mock('@/platform/supabase/server', () => ({ supabaseConfigurado: () => mocks.configurado() }));
vi.mock('next/link', () => ({ default: () => null }));
vi.mock('../../src/app/dashboard/_components/workspace-shell', () => ({ WorkspaceShell: ({ children }: { children: unknown }) => children }));
vi.mock('../../src/app/dashboard/require-workspace-user', () => ({ workspacePath: () => '/dashboard/institution' }));

import { exigirFuncion, NoDisponible } from '../../src/app/dashboard/_components/no-disponible';

const RECTOR: CurrentUser = { id: 'r-1', name: 'Rosa', role: 'IE_RECTOR', institutionId: 'ie-1', institutionName: 'IE Uno' };

describe('exigirFuncion', () => {
  beforeEach(() => {
    mocks.configurado.mockReset();
  });

  it('devuelve null cuando la función está disponible (modo local)', () => {
    mocks.configurado.mockReturnValue(false);
    expect(exigirFuncion('REGLAMENTOS', RECTOR, '/dashboard/regulations')).toBeNull();
  });

  it('con Supabase devuelve la página uniforme con la etiqueta de la función', () => {
    mocks.configurado.mockReturnValue(true);
    const elemento = exigirFuncion('REGLAMENTOS', RECTOR, '/dashboard/regulations');
    expect(elemento?.type).toBe(NoDisponible);
    expect(elemento?.props).toEqual({ user: RECTOR, activePath: '/dashboard/regulations', etiqueta: 'Manual de contratación IE' });
  });
});
