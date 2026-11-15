-- Persiste o vínculo entre registros criados para mais de um pet.
-- Consultas usam grupo_id em consulta (docs/pets-grupo-consultas.sql).
-- Aplicar uma única vez no banco antes de publicar a API atualizada.

ALTER TABLE vacina
  ADD COLUMN grupo_id CHAR(36) NULL,
  ADD INDEX idx_vacina_grupo_id (grupo_id);

ALTER TABLE pet_medicacao
  ADD COLUMN grupo_id CHAR(36) NULL,
  ADD INDEX idx_pet_medicacao_grupo_id (grupo_id);

ALTER TABLE pet_rotina
  ADD COLUMN grupo_id CHAR(36) NULL,
  ADD INDEX idx_pet_rotina_grupo_id (grupo_id);

ALTER TABLE pet_refeicao
  ADD COLUMN grupo_id CHAR(36) NULL,
  ADD INDEX idx_pet_refeicao_grupo_id (grupo_id);

ALTER TABLE pet_despesa
  ADD COLUMN grupo_id CHAR(36) NULL,
  ADD INDEX idx_pet_despesa_grupo_id (grupo_id);
