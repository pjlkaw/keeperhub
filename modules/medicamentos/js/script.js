/**
 * ==================================================
 * KEEPERHUB — MEDICAMENTOS MODULE SCRIPT
 * Padrão Arquitetural Oficial: keeperhub-main / modules/medicamentos/js/script.js
 * Responsabilidade: Lógica exclusiva do Módulo Medicamentos
 * ==================================================
 */

import { initTheme } from '/shared/services/theme.js';

// Inicialização do tema compartilhado
initTheme();

/**
 * ==================================================
 * CONTROLADOR: FORMULÁRIO ADICIONAR MEDICAMENTO
 * ==================================================
 */
function initAddMedicationForm() {
  const form = document.getElementById('form-add-medication');
  if (!form) return;

  const btnSubmit = document.getElementById('btn-submit-medication');
  const feedbackMsg = document.getElementById('form-feedback-msg');

  const inputName = document.getElementById('input-med-name');
  const selectPresentation = document.getElementById('select-med-presentation');
  const usageRadios = form.querySelectorAll('input[name="usageType"]');
  const usageOptions = form.querySelectorAll('.meds-usage-option');

  const dateStartField = document.getElementById('field-start-date');
  const dateEndField = document.getElementById('field-end-date');
  const msgEventual = document.getElementById('msg-eventual-use');
  const sectionRoutine = document.getElementById('section-routine');
  const sectionReminders = document.getElementById('section-reminders');

  const selectFrequency = document.getElementById('select-med-frequency');
  const fieldInterval = document.getElementById('field-frequency-interval');
  const fieldDays = document.getElementById('field-frequency-days');
  const sectionTimes = document.getElementById('section-times');

  const weekdayChips = form.querySelectorAll('.meds-weekday-chip');

  const timesList = document.getElementById('times-list');
  const btnAddTime = document.getElementById('btn-add-time');

  const checkboxStockAlert = document.getElementById('checkbox-stock-alert');
  const fieldStockThreshold = document.getElementById('field-stock-alert-threshold');

  // 1. Alternância de Tipo de Uso
  function handleUsageTypeChange() {
    let selectedType = null;
    usageRadios.forEach((radio) => {
      const optionLabel = radio.closest('.meds-usage-option');
      if (radio.checked) {
        selectedType = radio.value;
        optionLabel?.classList.add('active');
      } else {
        optionLabel?.classList.remove('active');
      }
    });

    if (selectedType === 'continuo') {
      if (dateStartField) dateStartField.style.display = 'flex';
      if (dateEndField) dateEndField.style.display = 'none';
      if (msgEventual) msgEventual.style.display = 'none';
      if (sectionRoutine) sectionRoutine.style.display = 'flex';
      if (sectionReminders) sectionReminders.style.display = 'flex';
    } else if (selectedType === 'temporario') {
      if (dateStartField) dateStartField.style.display = 'flex';
      if (dateEndField) dateEndField.style.display = 'flex';
      if (msgEventual) msgEventual.style.display = 'none';
      if (sectionRoutine) sectionRoutine.style.display = 'flex';
      if (sectionReminders) sectionReminders.style.display = 'flex';
    } else if (selectedType === 'eventual') {
      if (dateStartField) dateStartField.style.display = 'none';
      if (dateEndField) dateEndField.style.display = 'none';
      if (msgEventual) msgEventual.style.display = 'block';
      if (sectionRoutine) sectionRoutine.style.display = 'none';
      if (sectionReminders) sectionReminders.style.display = 'none';
    }

    validateForm();
  }

  usageRadios.forEach((radio) => {
    radio.addEventListener('change', handleUsageTypeChange);
  });

  // 2. Alternância de Frequência
  function handleFrequencyChange() {
    if (!selectFrequency) return;
    const freq = selectFrequency.value;

    if (freq === 'intervalo') {
      if (fieldInterval) fieldInterval.style.display = 'flex';
      if (fieldDays) fieldDays.style.display = 'none';
      if (sectionTimes) sectionTimes.style.display = 'none';
    } else if (freq === 'especifico') {
      if (fieldInterval) fieldInterval.style.display = 'none';
      if (fieldDays) fieldDays.style.display = 'flex';
      if (sectionTimes) sectionTimes.style.display = 'flex';
    } else {
      // Todos os dias
      if (fieldInterval) fieldInterval.style.display = 'none';
      if (fieldDays) fieldDays.style.display = 'none';
      if (sectionTimes) sectionTimes.style.display = 'flex';
    }
  }

  if (selectFrequency) {
    selectFrequency.addEventListener('change', handleFrequencyChange);
  }

  // 3. Chips de Dias Específicos
  weekdayChips.forEach((chip) => {
    const input = chip.querySelector('input[type="checkbox"]');
    if (!input) return;

    chip.addEventListener('click', () => {
      chip.classList.toggle('active', input.checked);
    });
  });

  // 4. Gestão de Horários Dinâmicos
  if (btnAddTime && timesList) {
    btnAddTime.addEventListener('click', () => {
      const timeCount = timesList.querySelectorAll('.meds-time-row').length + 1;
      const row = document.createElement('div');
      row.className = 'meds-time-row';
      row.innerHTML = `
        <input
          type="time"
          class="meds-form-input"
          aria-label="Horário ${timeCount}"
        />
        <button
          type="button"
          class="btn-meds-remove-time"
          aria-label="Remover horário ${timeCount}"
          title="Remover horário"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      const btnRemove = row.querySelector('.btn-meds-remove-time');
      btnRemove?.addEventListener('click', () => {
        row.remove();
        updateTimeRemoveButtons();
      });

      timesList.appendChild(row);
      updateTimeRemoveButtons();
    });

    function updateTimeRemoveButtons() {
      const rows = timesList.querySelectorAll('.meds-time-row');
      rows.forEach((r, idx) => {
        const removeBtn = r.querySelector('.btn-meds-remove-time');
        if (removeBtn) {
          // Permite remover se houver mais de 1 linha ou se o usuário quiser limpar
          removeBtn.style.display = rows.length > 1 ? 'inline-flex' : 'none';
        }
      });
    }

    // Liga os botões existentes
    timesList.querySelectorAll('.btn-meds-remove-time').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('.meds-time-row');
        row?.remove();
        updateTimeRemoveButtons();
      });
    });

    updateTimeRemoveButtons();
  }

  // 5. Alerta de Estoque Condicional
  if (checkboxStockAlert && fieldStockThreshold) {
    checkboxStockAlert.addEventListener('change', () => {
      fieldStockThreshold.style.display = checkboxStockAlert.checked ? 'flex' : 'none';
    });
  }

  // 6. Validação de Campos Mínimos
  function validateForm() {
    if (!btnSubmit) return;

    const hasName = Boolean(inputName && inputName.value.trim().length > 0);
    const hasPresentation = Boolean(selectPresentation && selectPresentation.value.trim().length > 0);
    let hasUsageType = false;

    usageRadios.forEach((r) => {
      if (r.checked) hasUsageType = true;
    });

    const isValid = hasName && hasPresentation && hasUsageType;
    btnSubmit.disabled = !isValid;
  }

  form.addEventListener('input', validateForm);
  form.addEventListener('change', validateForm);

  // 7. Submissão (Sem persistência — Validação e mensagem de desenvolvimento)
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (feedbackMsg) {
      feedbackMsg.textContent = 'Cadastro preparado para integração de dados.';
      feedbackMsg.classList.add('show');

      feedbackMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      setTimeout(() => {
        feedbackMsg.classList.remove('show');
      }, 5000);
    }
  });

  // Executa estados iniciais
  handleUsageTypeChange();
  handleFrequencyChange();
  validateForm();
}

// Inicializa no carregamento do DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAddMedicationForm);
} else {
  initAddMedicationForm();
}

