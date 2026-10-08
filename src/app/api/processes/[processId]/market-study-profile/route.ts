import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/platform/auth/current-user';
import { saveMarketStudyProfile } from '@/modules/processes/market-study-profile';

const profileSchema = z.object({
  objectDescription: z.string().max(8000),
  unspscCodes: z.string().max(8000),
  demandAnalysis: z.string().max(8000),
  supplyAnalysis: z.string().max(8000),
  taxBasis: z.string().max(8000),
});

export async function PUT(request: Request, context: { params: Promise<{ processId: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  try {
    const { processId } = await context.params;
    const input = profileSchema.parse(await request.json());
    saveMarketStudyProfile(user, processId, input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible guardar los datos del estudio.' }, { status: 400 });
  }
}
