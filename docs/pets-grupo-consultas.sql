-- Guarda a relação entre uma consulta registrada para vários pets.
-- Aplicar uma única vez no banco do KeeperHub antes de publicar a API atualizada.
ALTER TABLE consulta
  ADD COLUMN grupo_id CHAR(36) NULL,
  ADD INDEX idx_consulta_grupo_id (grupo_id);
