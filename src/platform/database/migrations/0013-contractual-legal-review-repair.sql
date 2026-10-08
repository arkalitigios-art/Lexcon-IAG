-- Los expedientes creados antes de la revisión jurídica contractual llegaban a
-- ejecución al cargar el RP, aunque no existiera una decisión jurídica.
-- Se devuelven únicamente los que no tienen actuaciones posteriores de ejecución.
UPDATE generated_drafts
SET status = 'PENDING_LEGAL_REVIEW',
    title = CASE kind
      WHEN 'CONTRACT' THEN 'Contrato para revisión jurídica'
      WHEN 'START_ACT' THEN 'Acta de inicio para revisión jurídica'
      ELSE title
    END
WHERE kind IN ('CONTRACT', 'START_ACT')
  AND process_id IN (
    SELECT p.id
    FROM processes p
    WHERE p.phase = 'EXECUTION'
      AND p.status = 'PENDING_ACTION'
      AND EXISTS (
        SELECT 1 FROM generated_drafts d
        WHERE d.process_id = p.id AND d.kind IN ('CONTRACT', 'START_ACT')
      )
      AND NOT EXISTS (
        SELECT 1 FROM process_stage_actions a
        WHERE a.process_id = p.id AND a.action = 'CONTRACTUAL_APPROVED'
      )
      AND NOT EXISTS (
        SELECT 1 FROM process_stage_actions a
        WHERE a.process_id = p.id AND a.action = 'EXECUTION_RECORDED'
      )
  );

UPDATE processes
SET phase = 'CONTRACTUAL_REVIEW',
    status = 'PENDING_ACTION'
WHERE phase = 'EXECUTION'
  AND status = 'PENDING_ACTION'
  AND EXISTS (
    SELECT 1 FROM generated_drafts d
    WHERE d.process_id = processes.id AND d.kind IN ('CONTRACT', 'START_ACT')
  )
  AND NOT EXISTS (
    SELECT 1 FROM process_stage_actions a
    WHERE a.process_id = processes.id AND a.action = 'CONTRACTUAL_APPROVED'
  )
  AND NOT EXISTS (
    SELECT 1 FROM process_stage_actions a
    WHERE a.process_id = processes.id AND a.action = 'EXECUTION_RECORDED'
  );
