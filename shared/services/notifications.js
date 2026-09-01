/**
 * ==================================================
 * KEEPERHUB — NOTIFICATIONS SERVICE (Base Estrutural)
 * Padrão Arquitetural Oficial: keeperhub-main / shared/services/
 * Responsabilidade: Gerenciador compartilhado para notificações do navegador e lembretes de módulos.
 * ==================================================
 */

/**
 * Verifica se a API de Notificações é suportada pelo navegador atual
 * @returns {boolean}
 */
export function isSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Retorna o status atual da permissão de notificações
 * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
 */
export function getPermissionStatus() {
  if (!isSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Solicita permissão explícita ao usuário (somente via ação voluntária de clique)
 * @returns {Promise<'granted' | 'denied' | 'default' | 'unsupported'>}
 */
export async function requestPermission() {
  if (!isSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[KeeperHub Notifications] Erro ao solicitar permissão:', err);
    return Notification.permission;
  }
}

/**
 * Dispara uma notificação local caso a permissão esteja concedida
 * @param {string} title 
 * @param {NotificationOptions} [options] 
 * @returns {Notification | null}
 */
export function sendNotification(title, options = {}) {
  if (!isSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const defaultOptions = {
      icon: '/assets/img/favicon-32x32.png',
      badge: '/assets/img/favicon-32x32.png',
      ...options
    };
    return new Notification(title, defaultOptions);
  } catch (err) {
    console.warn('[KeeperHub Notifications] Erro ao instanciar notificação:', err);
    return null;
  }
}

/**
 * Estrutura base para agendamento de lembretes (doses, estoque, validade, metas)
 * @param {{ id: string, title: string, time: string | number, module: string }} reminder 
 */
export function scheduleReminder(reminder) {
  // Preparação de contrato de interface para futura integração com Service Worker / Background Sync
  console.info('[KeeperHub Notifications] Lembrete registrado na base estrutural:', reminder);
  return { scheduled: true, id: reminder.id };
}

// Expõe no escopo global para consumo por controladores futuros
if (typeof window !== 'undefined') {
  window.KeeperHubNotifications = {
    isSupported,
    getPermissionStatus,
    requestPermission,
    sendNotification,
    scheduleReminder
  };
}
