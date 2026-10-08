-- Separates legal approval from the institutional signatures and contractual publication.
-- Only repair active legacy files that have approval but have not registered execution evidence.
UPDATE processes
SET phase = 'CONTRACTUAL_PUBLICATION', status = 'PENDING_ACTION'
WHERE phase = 'EXECUTION'
  AND EXISTS (
    SELECT 1 FROM process_stage_actions action
    WHERE action.process_id = processes.id AND action.action = 'CONTRACTUAL_APPROVED'
  )
  AND NOT EXISTS (
    SELECT 1 FROM process_stage_actions action
    WHERE action.process_id = processes.id
      AND action.action IN ('EXECUTION_RECORDED', 'EXECUTION_PARTIAL_RECEIPT_UPLOADED', 'EXECUTION_FINAL_RECEIPT_UPLOADED')
  )
  AND NOT EXISTS (
    SELECT 1 FROM documents document
    WHERE document.process_id = processes.id
      AND document.kind IN ('CONTRACT_SECOP_PUBLICATION', 'SATISFACTORY_RECEIPT_PARTIAL', 'SATISFACTORY_RECEIPT_FINAL')
  );
