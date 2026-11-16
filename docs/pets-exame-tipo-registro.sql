-- Classifica os registros já existentes como exames e permite cadastrar laudos
-- sem criar outra tabela. Execute uma vez no mesmo banco usado pelo KeeperHub.
ALTER TABLE pet_exame
  ADD COLUMN tipo_registro VARCHAR(20) NOT NULL DEFAULT 'exame' AFTER nome;
