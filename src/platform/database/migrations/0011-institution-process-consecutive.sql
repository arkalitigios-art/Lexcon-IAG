ALTER TABLE processes ADD COLUMN institution_sequence INTEGER;

UPDATE processes
SET institution_sequence = (
  SELECT COUNT(*)
  FROM processes AS prior
  WHERE prior.institution_id = processes.institution_id
    AND (
      prior.created_at < processes.created_at
      OR (prior.created_at = processes.created_at AND prior.id <= processes.id)
    )
);

CREATE UNIQUE INDEX processes_institution_sequence_unique
  ON processes(institution_id, institution_sequence)
  WHERE institution_sequence IS NOT NULL;
