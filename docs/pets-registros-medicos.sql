-- Estrutura usada pelo módulo Pets para exames/laudos e receitas veterinárias.
-- As tabelas já existem no banco compartilhado; este arquivo mantém o DDL versionado
-- para configuração de novos ambientes. CREATE IF NOT EXISTS não altera tabelas existentes.

CREATE TABLE IF NOT EXISTS pet_exame (
  id_exame INT NOT NULL AUTO_INCREMENT,
  pet_id INT NOT NULL,
  consulta_id INT DEFAULT NULL,
  nome VARCHAR(150) NOT NULL,
  data_exame DATE DEFAULT NULL,
  resultado TEXT,
  observacao TEXT,
  PRIMARY KEY (id_exame),
  KEY pet_id (pet_id),
  KEY consulta_id (consulta_id),
  CONSTRAINT pet_exame_ibfk_1 FOREIGN KEY (pet_id)
    REFERENCES pet (id_pet) ON DELETE CASCADE,
  CONSTRAINT pet_exame_ibfk_2 FOREIGN KEY (consulta_id)
    REFERENCES consulta (id_consulta) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pet_receita (
  id_receita INT NOT NULL AUTO_INCREMENT,
  pet_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  veterinario VARCHAR(150) DEFAULT NULL,
  data_emissao DATE DEFAULT NULL,
  data_validade DATE DEFAULT NULL,
  concluida_em DATE DEFAULT NULL,
  observacao TEXT,
  PRIMARY KEY (id_receita),
  KEY fk_pet_receita_pet (pet_id),
  CONSTRAINT fk_pet_receita_pet FOREIGN KEY (pet_id)
    REFERENCES pet (id_pet)
) ENGINE=InnoDB;
