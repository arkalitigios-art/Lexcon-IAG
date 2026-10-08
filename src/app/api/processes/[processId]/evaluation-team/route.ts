import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/platform/auth/current-user';
import { saveEvaluationTeam } from '@/modules/processes/evaluation-team';

const memberSchema = z.object({ name: z.string().max(180), role: z.string().max(180) });
const teamSchema = z.object({ evaluators: z.array(memberSchema).min(1).max(8), supervisor: memberSchema });

export async function PUT(request: Request, context: { params: Promise<{ processId: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  try {
    const { processId } = await context.params;
    saveEvaluationTeam(user, processId, teamSchema.parse(await request.json()));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible guardar el comité evaluador.' }, { status: 400 });
  }
}
