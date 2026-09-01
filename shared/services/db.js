/**
 * ==================================================
 * KEEPERHUB — DB & STORAGE SERVICE (Base Estrutural)
 * Padrão Arquitetural Oficial: keeperhub-main / shared/services/
 * Responsabilidade: Camada base unificada de persistência e armazenamento de dados.
 * 
 * ==================================================
 * TEMPORARY STORAGE ABSTRACTION
 * ==================================================
 * Mecanismo Atual: Abstração sobre localStorage com namespace isolado ('keeperhub-db:').
 * Classificação: PROVISÓRIO (não é o banco definitivo do KeeperHub).
 * Regra: Nenhum dado mockado (medicamentos, usuários, estoques, etc.) deve ser inserido neste arquivo.
 * ==================================================
 */

const DB_PREFIX = 'keeperhub-db:';

/**
 * Recupera um item persistido sob o namespace do KeeperHub
 * @param {string} key 
 * @param {any} defaultValue 
 * @returns {any}
 */
export function getItem(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(`${DB_PREFIX}${key}`);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[KeeperHub DB] Erro ao ler chave "${key}":`, err);
    return defaultValue;
  }
}

/**
 * Salva um item sob o namespace do KeeperHub
 * @param {string} key 
 * @param {any} value 
 * @returns {boolean}
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(`${DB_PREFIX}${key}`, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[KeeperHub DB] Erro ao salvar chave "${key}":`, err);
    return false;
  }
}

/**
 * Remove um item sob o namespace do KeeperHub
 * @param {string} key 
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(`${DB_PREFIX}${key}`);
  } catch (err) {
    console.warn(`[KeeperHub DB] Erro ao remover chave "${key}":`, err);
  }
}

/**
 * Retorna uma coleção inteira de registros de um módulo
 * @param {string} collectionName 
 * @returns {Array<any>}
 */
export function getCollection(collectionName) {
  return getItem(`collection:${collectionName}`, []);
}

/**
 * Persiste uma coleção inteira de registros de um módulo
 * @param {string} collectionName 
 * @param {Array<any>} items 
 * @returns {boolean}
 */
export function setCollection(collectionName, items) {
  return setItem(`collection:${collectionName}`, Array.isArray(items) ? items : []);
}

// Expõe no escopo global para consumo por controladores futuros
if (typeof window !== 'undefined') {
  window.KeeperHubDB = {
    getItem,
    setItem,
    removeItem,
    getCollection,
    setCollection
  };
}
