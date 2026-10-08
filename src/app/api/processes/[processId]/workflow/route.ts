import { NextResponse } from 'next/server';
import { currentUser } from '@/platform/auth/current-user';
import { LocalPrivateStorage, type StoredFile } from '@/platform/storage/local-storage';
import { completeWorkflowAction, type WorkflowAction } from '@/modules/processes/workflow';
import { processMarketAnalysis } from '@/modules/automation/iag-drafts';

type StoredWorkflowFile = StoredFile & { documentKind?: 'OFFERS_RECEIVED' | 'OFFERS_RECEIPT' | 'CONTRACT_LEGAL_REVISED' | 'START_ACT_LEGAL_REVISED' | 'CONTRACT_SIGNED' | 'START_ACT_SIGNED' | 'CONTRACT_SECOP_PUBLICATION' | 'LIQUIDATION_LEGAL_REVISED' | 'LIQUIDATION_ACT_SIGNED' };

const actions = new Set<WorkflowAction>(['MARKET_STUDY_APPROVED', 'MARKET_STUDY_CORRECTIONS_REQUESTED', 'MARKET_STUDY_REOPENED', 'BUDGET_UPLOADED', 'PRECONTRACTUAL_APPROVED', 'PUBLICATION_CONFIRMED', 'OFFERS_UPLOADED', 'EVALUATION_CORRECTIONS_REQUESTED', 'EVALUATION_APPROVED', 'EVALUATION_NO_SELECTION_RECORDED', 'SELECTION_RECORDED', 'FORMALIZATION_UPLOADED', 'CONTRACTUAL_APPROVED', 'CONTRACTUAL_CORRECTIONS_REQUESTED', 'CONTRACT_PUBLICATION_RECORDED', 'EXECUTION_PARTIAL_RECEIPT_UPLOADED', 'EXECUTION_FINAL_RECEIPT_UPLOADED', 'LIQUIDATION_APPROVED', 'LIQUIDATION_CORRECTIONS_REQUESTED', 'LIQUIDATION_SIGNED_RECORDED', 'LIQUIDATION_SIGNED_UPLOADED', 'EXECUTION_RECORDED', 'CLOSURE_RECORDED']);

export async function POST(request: Request, context: { params: Promise<{ processId: string }> }) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Sesión requerida.' }, { status: 401 });
  const stored: StoredWorkflowFile[] = []; const storage = new LocalPrivateStorage();
  try {
    const form = await request.formData(); const action = form.get('action');
    if (typeof action !== 'string' || !actions.has(action as WorkflowAction)) throw new Error('Actuación no reconocida.');
    const uploads = form.getAll('documents').filter((value): value is File => value instanceof File);
    if (uploads.length > 20) throw new Error('La carga supera el número permitido de archivos.');
    for (const file of uploads) stored.push({ ...await storage.save({ name: file.name, mimeType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) }), documentKind: action === 'OFFERS_UPLOADED' ? 'OFFERS_RECEIVED' : undefined });
    const receipt = form.get('offerReceipt');
    if (receipt instanceof File && receipt.size > 0) stored.push({ ...await storage.save({ name: receipt.name, mimeType: receipt.type, bytes: new Uint8Array(await receipt.arrayBuffer()) }), documentKind: 'OFFERS_RECEIPT' });
    const correctedContract = form.get('correctedContract');
    if (correctedContract instanceof File && correctedContract.size > 0) stored.push({ ...await storage.save({ name: correctedContract.name, mimeType: correctedContract.type, bytes: new Uint8Array(await correctedContract.arrayBuffer()) }), documentKind: 'CONTRACT_LEGAL_REVISED' });
    const correctedStartAct = form.get('correctedStartAct');
    if (correctedStartAct instanceof File && correctedStartAct.size > 0) stored.push({ ...await storage.save({ name: correctedStartAct.name, mimeType: correctedStartAct.type, bytes: new Uint8Array(await correctedStartAct.arrayBuffer()) }), documentKind: 'START_ACT_LEGAL_REVISED' });
    const signedContract = form.get('signedContract');
    if (signedContract instanceof File && signedContract.size > 0) stored.push({ ...await storage.save({ name: signedContract.name, mimeType: signedContract.type, bytes: new Uint8Array(await signedContract.arrayBuffer()) }), documentKind: 'CONTRACT_SIGNED' });
    const signedStartAct = form.get('signedStartAct');
    if (signedStartAct instanceof File && signedStartAct.size > 0) stored.push({ ...await storage.save({ name: signedStartAct.name, mimeType: signedStartAct.type, bytes: new Uint8Array(await signedStartAct.arrayBuffer()) }), documentKind: 'START_ACT_SIGNED' });
    const secopPublicationEvidence = form.get('secopPublicationEvidence');
    if (secopPublicationEvidence instanceof File && secopPublicationEvidence.size > 0) stored.push({ ...await storage.save({ name: secopPublicationEvidence.name, mimeType: secopPublicationEvidence.type, bytes: new Uint8Array(await secopPublicationEvidence.arrayBuffer()) }), documentKind: 'CONTRACT_SECOP_PUBLICATION' });
    const correctedLiquidation = form.get('correctedLiquidation');
    if (correctedLiquidation instanceof File && correctedLiquidation.size > 0) stored.push({ ...await storage.save({ name: correctedLiquidation.name, mimeType: correctedLiquidation.type, bytes: new Uint8Array(await correctedLiquidation.arrayBuffer()) }), documentKind: 'LIQUIDATION_LEGAL_REVISED' });
    const signedLiquidation = form.get('signedLiquidation');
    if (signedLiquidation instanceof File && signedLiquidation.size > 0) stored.push({ ...await storage.save({ name: signedLiquidation.name, mimeType: signedLiquidation.type, bytes: new Uint8Array(await signedLiquidation.arrayBuffer()) }), documentKind: 'LIQUIDATION_ACT_SIGNED' });
    const processId = (await context.params).processId;
    const workflowAction = action as WorkflowAction;
    await completeWorkflowAction(user, processId, workflowAction, stored, typeof form.get('note') === 'string' ? String(form.get('note')) : undefined, typeof form.get('secopReference') === 'string' ? String(form.get('secopReference')) : undefined, typeof form.get('selectedSupplier') === 'string' ? String(form.get('selectedSupplier')) : undefined);
    if (workflowAction === 'MARKET_STUDY_CORRECTIONS_REQUESTED') await processMarketAnalysis(processId);
    return NextResponse.json({ ok: true });
  } catch (error) { await Promise.allSettled(stored.map((file) => storage.remove(file.key))); return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible registrar la actuación.' }, { status: 400 }); }
}
