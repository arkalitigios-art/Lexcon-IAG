-- A liquidation act is a legal-review document before its institutional signatures.
UPDATE generated_drafts
SET status = 'PENDING_LEGAL_REVIEW',
    title = 'Acta de liquidación para revisión jurídica'
WHERE kind = 'LIQUIDATION_ACT'
  AND status = 'PENDING_SIGNATURE';

UPDATE processes
SET phase = 'LIQUIDATION_REVIEW',
    status = 'PENDING_ACTION'
WHERE phase = 'POSTCONTRACTUAL'
  AND EXISTS (
    SELECT 1
    FROM generated_drafts draft
    WHERE draft.process_id = processes.id
      AND draft.kind = 'LIQUIDATION_ACT'
      AND draft.status IN ('PENDING_LEGAL_REVIEW', 'CORRECTIONS_REQUESTED')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM process_stage_actions action
    WHERE action.process_id = processes.id
      AND action.action IN ('LIQUIDATION_APPROVED', 'LIQUIDATION_SIGNED_RECORDED', 'LIQUIDATION_SIGNED_UPLOADED')
  );
