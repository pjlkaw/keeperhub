-- Estrutura inicial do módulo Finanças.
-- Execute depois de confirmar os nomes e tipos existentes na tabela usuario.

CREATE TABLE conta_financeira (
    id_conta INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_conta),
    INDEX idx_conta_usuario (id_usuario),
    CONSTRAINT fk_conta_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON DELETE CASCADE
);

CREATE TABLE transacao_financeira (
    id_transacao INT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_conta INT UNSIGNED NOT NULL,
    tipo ENUM('receita', 'despesa') NOT NULL,
    valor DECIMAL(12, 2) NOT NULL,
    descricao VARCHAR(160) NOT NULL,
    categoria VARCHAR(60) NOT NULL,
    data_transacao DATE NOT NULL,
    data_vencimento DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    observacoes TEXT NULL,
    criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_transacao),
    INDEX idx_transacao_usuario_data (id_usuario, data_transacao),
    INDEX idx_transacao_vencimento (id_usuario, data_vencimento, status),
    CONSTRAINT fk_transacao_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
        ON DELETE CASCADE,
    CONSTRAINT fk_transacao_conta
        FOREIGN KEY (id_conta) REFERENCES conta_financeira (id_conta)
        ON DELETE RESTRICT
);
