import mammoth from 'mammoth';
import { describe, expect, it } from 'vitest';
import { createAcceptanceCommunicationDocx, createContractDocx, createLiquidationActDocx, createSelectionActDocx, createStartActDocx } from '../../src/modules/automation/selection-and-contractual-docx';
import type { ProcessDetail } from '../../src/modules/processes/process-queries';

const process = {
  id: 'selection-process', institutionSequence: 4, phase: 'DECISION', status: 'PENDING_ACTION', createdAt: '2026-10-03T12:00:00.000Z', institutionName: 'IE de prueba', institutionCity: 'Bogotá, D. C.', attorneyName: 'Abogada', responsibleName: 'Rectoría de prueba', blockReason: null,
  quotations: [], quotationTotals: [], approvalDelivery: null, documents: [], evaluationTeam: { evaluators: [{ id: 'one', name: 'Evaluadora uno', role: 'Integrante del comité' }], supervisor: { id: 'two', name: 'Supervisor uno', role: 'Supervisor' } }, selectionDecision: { selectedSupplier: 'Proveedor habilitado S.A.S.', rationale: 'El comité adopta la selección conforme al acta de evaluación.', status: 'PENDING_SIGNATURE', createdAt: '2026-10-03T12:00:00.000Z', signedAt: null }, actions: [{ phase: 'EVALUATION', action: 'EVALUATION_APPROVED', actorName: 'Rectoría de prueba', note: null, createdAt: '2026-10-03T12:00:00.000Z' }], drafts: [],
  marketStudy: { regulationName: 'Manual de prueba', regulationVersion: 1, profile: { objectDescription: 'Suministro de papelería', unspscCodes: '', demandAnalysis: 'Necesidad institucional.', supplyAnalysis: 'Oferta observada.', taxBasis: 'Sin inferencias.' }, comparisons: [] },
} satisfies ProcessDetail;

describe('documentos posteriores a la evaluación', () => {
  it('genera el acta de selección para firma exclusiva del comité evaluador', async () => {
    const document = await createSelectionActDocx(process); const text = (await mammoth.extractRawText({ buffer: document })).value;
    expect(text).toContain('ACTA DE SELECCIÓN DE OFERENTE');
    expect(text).toContain('Proveedor habilitado S.A.S.');
    expect(text).toContain('Evaluadora uno');
    expect(text).not.toContain('Rectoría de prueba');
    expect(text).not.toContain('Supervisor uno');
    expect(text).not.toContain('LEXCON IAG');
  });

  it('genera comunicación, contrato y acta de inicio desde la decisión firmada', async () => {
    const signed = { ...process, selectionDecision: { ...process.selectionDecision, status: 'SIGNED_UPLOADED' as const, signedAt: '2026-10-03T13:00:00.000Z' } };
    for (const create of [createAcceptanceCommunicationDocx, createContractDocx, createStartActDocx]) {
      const document = await create(signed); const text = (await mammoth.extractRawText({ buffer: document })).value;
      expect(document.subarray(0, 2).toString()).toBe('PK');
      expect(text).toContain('Proveedor habilitado S.A.S.');
      expect(text).toContain('2026-0004');
    }
    const contractText = (await mammoth.extractRawText({ buffer: await createContractDocx(signed) })).value;
    expect(contractText).toContain('CONTRATO DE SUMINISTRO No. 004 DE 2026');
    expect(contractText).toContain('CONSIDERACIONES');
    expect(contractText).toContain('CLÁUSULA DÉCIMA CUARTA. GARANTÍAS.');
    expect(contractText).toContain('CLÁUSULA TRIGÉSIMA. DOMICILIO CONTRACTUAL.');
    expect(contractText).toContain('Supervisor uno');
    const startActText = (await mammoth.extractRawText({ buffer: await createStartActDocx(signed) })).value;
    expect(startActText).toContain('CONTRATO DE SUMINISTRO No. 004 DE 2026');
    expect(startActText).toContain('Requisitos de ejecución cumplidos');
    expect(startActText).toContain('Compromisos para la ejecución');
    expect(startActText).toContain('CUMPLIDO');
    expect(startActText).not.toContain('Verificar antes de la firma');
    expect(startActText).not.toContain('Pendiente de designación');
  });

  it('genera la liquidación solo sobre el recibido final y conserva los recibidos parciales', async () => {
    const signed = { ...process, phase: 'POSTCONTRACTUAL', selectionDecision: { ...process.selectionDecision, status: 'SIGNED_UPLOADED' as const, signedAt: '2026-10-03T13:00:00.000Z' }, documents: [
      { fileId: 'partial', kind: 'SATISFACTORY_RECEIPT_PARTIAL', originalName: 'Recibido_parcial_1.pdf', mimeType: 'application/pdf', sizeBytes: 1, createdAt: '2026-10-04T12:00:00.000Z' },
      { fileId: 'final', kind: 'SATISFACTORY_RECEIPT_FINAL', originalName: 'Recibido_final.pdf', mimeType: 'application/pdf', sizeBytes: 1, createdAt: '2026-10-10T12:00:00.000Z' },
    ] } satisfies ProcessDetail;
    const text = (await mammoth.extractRawText({ buffer: await createLiquidationActDocx(signed) })).value;
    expect(text).toContain('ACTA DE LIQUIDACIÓN DEL CONTRATO');
    expect(text).toContain('Recibido_parcial_1.pdf');
    expect(text).toContain('Recibido_final.pdf');
    expect(text).toContain('Ley 715 de 2001');
    expect(text).not.toContain('LEXCON IAG');
  });
});
