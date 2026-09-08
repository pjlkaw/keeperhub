/**
 * KeeperHub — Módulo Medicamentos JavaScript (Landing Pública)
 * Padrão Arquitetural Oficial: /main/medicamentos/js/medicamentos.js
 *
 * Responsabilidade:
 * - Inicialização do tema compartilhado (Dark/Light)
 * - Navegação interna entre as 6 views do Mini App demonstrativo:
 *   1. Visão Geral (home)
 *   2. Medicações (medications)
 *   3. Rotina (rotina)
 *   4. Estoque (estoque)
 *   5. Scanner de Código de Barras (scanner)
 *   6. Detalhes / Recursos (placeholder)
 * - Controle dos chips de visualização e atributos de acessibilidade (aria-selected)
 * - Botão flutuante FAB (+ / Scanner)
 * - Botões de retorno à Visão Geral
 * - Simulação realista do scanner com animação de leitura e transição de stages
 * - Interações demonstrativas de doses tomadas, ausência de medicamento e reposição de estoque
 * - Reset automático de scroll ao trocar de view
 */

// Interações visuais isoladas da Demonstração Pública
(function initMedicamentosDemo() {
  // Conecta botão de tema interno da demo ao alternador principal
  const demoThemeBtns = document.querySelectorAll('.med-demo-theme-btn');
  demoThemeBtns.forEach((demoThemeBtn) => {
    demoThemeBtn.addEventListener('click', () => {
      const mainToggle = document.getElementById('theme-toggle');
      if (mainToggle) mainToggle.click();
    });
  });
        const scrollArea = document.getElementById('med-demo-scroll-area');
        const viewHome = document.getElementById('med-demo-view-home');
        const viewMeds = document.getElementById('med-demo-view-medications');
        const viewRotina = document.getElementById('med-demo-view-rotina');
        const viewEstoque = document.getElementById('med-demo-view-estoque');
        const viewScanner = document.getElementById('med-demo-view-scanner');
        const viewPlaceholder = document.getElementById('med-demo-view-placeholder');
        
        const tabButtons = document.querySelectorAll('.module-chips-list .module-chip');
        const btnOpenMeds = document.getElementById('btn-med-demo-open-medications');
        const btnOpenRotina = document.getElementById('btn-med-demo-open-rotina');
        const btnOpenEstoque = document.getElementById('btn-med-demo-open-estoque');
        const btnReporAttention = document.getElementById('btn-med-demo-repor');
        const btnReporStock = document.getElementById('btn-med-demo-repor-stock');

        const btnBackToHome = document.getElementById('btn-med-demo-back-to-home');
        const btnReturnHome = document.getElementById('btn-med-demo-return-home');
        const btnRotinaBack = document.getElementById('btn-med-demo-rotina-back');
        const btnRotinaReturn = document.getElementById('btn-med-demo-rotina-return');
        const btnEstoqueBack = document.getElementById('btn-med-demo-estoque-back');
        const btnEstoqueReturn = document.getElementById('btn-med-demo-estoque-return');
        const btnScannerBack = document.getElementById('btn-med-demo-scanner-back');
        const btnScannerReturn = document.getElementById('btn-med-demo-scanner-return');
        const btnPlaceholderBack = document.getElementById('btn-med-demo-placeholder-back');
        const btnPlaceholderReturn = document.getElementById('btn-med-demo-placeholder-return');

        const placeholderTitle = document.getElementById('med-demo-placeholder-title');
        const placeholderHeading = document.getElementById('med-demo-placeholder-heading');
        const placeholderText = document.getElementById('med-demo-placeholder-text');

        const placeholderDetails = {
          outros: {
            title: 'Recursos',
            heading: 'Demonstração de Recursos',
            text: 'Conheça outras facilidades do módulo Medicamentos integradas à sua rotina.'
          }
        };

        function switchDemoView(targetView) {
          // Atualiza abas / chips com destaque ativo (#70DE01)
          tabButtons.forEach(function (btn) {
            const isMatch = btn.getAttribute('data-target-view') === targetView;
            btn.classList.toggle('active', isMatch);
            btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
          });

          // Esconde todas as visualizações do frame
          if (viewHome) {
            viewHome.style.display = 'none';
            viewHome.classList.remove('active');
          }
          if (viewMeds) {
            viewMeds.style.display = 'none';
            viewMeds.classList.remove('active');
          }
          if (viewRotina) {
            viewRotina.style.display = 'none';
            viewRotina.classList.remove('active');
          }
          if (viewEstoque) {
            viewEstoque.style.display = 'none';
            viewEstoque.classList.remove('active');
          }
          if (viewScanner) {
            viewScanner.style.display = 'none';
            viewScanner.classList.remove('active');
          }
          if (viewPlaceholder) {
            viewPlaceholder.style.display = 'none';
            viewPlaceholder.classList.remove('active');
          }

          // Exibe apenas a visualização selecionada
          if (targetView === 'home' && viewHome) {
            viewHome.style.display = 'flex';
            viewHome.classList.add('active');
          } else if (targetView === 'medications' && viewMeds) {
            viewMeds.style.display = 'flex';
            viewMeds.classList.add('active');
          } else if (targetView === 'rotina' && viewRotina) {
            viewRotina.style.display = 'flex';
            viewRotina.classList.add('active');
          } else if (targetView === 'estoque' && viewEstoque) {
            viewEstoque.style.display = 'flex';
            viewEstoque.classList.add('active');
          } else if (targetView === 'scanner' && viewScanner) {
            viewScanner.style.display = 'flex';
            viewScanner.classList.add('active');
          } else if (viewPlaceholder) {
            const info = placeholderDetails[targetView] || {
              title: 'Funcionalidade',
              heading: 'Demonstração',
              text: 'Visualização da funcionalidade em preparação.'
            };
            if (placeholderTitle) placeholderTitle.textContent = info.title;
            if (placeholderHeading) placeholderHeading.textContent = info.heading;
            if (placeholderText) placeholderText.textContent = info.text;

            viewPlaceholder.style.display = 'flex';
            viewPlaceholder.classList.add('active');
          }

          if (scrollArea) scrollArea.scrollTop = 0;
        }

        // Cliques nos Botões Reais da Barra de Funcionalidades
        tabButtons.forEach(function (btn) {
          btn.addEventListener('click', function () {
            const target = btn.getAttribute('data-target-view') || 'home';
            switchDemoView(target);
          });
        });

        // Atalhos da Home: "MEDICAÇÕES", "ROTINA" e "ESTOQUE"
        if (btnOpenMeds) {
          btnOpenMeds.addEventListener('click', function () {
            switchDemoView('medications');
          });
        }

        if (btnOpenRotina) {
          btnOpenRotina.addEventListener('click', function () {
            switchDemoView('rotina');
          });
        }

        if (btnOpenEstoque) {
          btnOpenEstoque.addEventListener('click', function () {
            switchDemoView('estoque');
          });
        }

        if (btnReporAttention) {
          btnReporAttention.addEventListener('click', function () {
            switchDemoView('estoque');
          });
        }

        const btnFab = document.getElementById('btn-med-demo-fab');
        if (btnFab) {
          btnFab.addEventListener('click', function () {
            switchDemoView('scanner');
          });
        }

        // Interação demonstrativa do Scanner: [Simular leitura] -> [Lendo código...] -> [Medicamento encontrado]
        const stageScanning = document.getElementById('med-scanner-stage-scanning');
        const stageFound = document.getElementById('med-scanner-stage-found');
        const viewfinder = document.getElementById('med-scanner-viewfinder');
        const statusScannerText = document.getElementById('med-scanner-status-text');
        const btnSimulate = document.getElementById('btn-med-scanner-simulate');
        const btnSimulateText = document.getElementById('btn-med-scanner-simulate-text');
        const btnRetryScan = document.getElementById('btn-med-scanner-retry');
        const btnContinueCadastro = document.getElementById('btn-med-scanner-continue');
        const btnContinueText = document.getElementById('btn-med-scanner-continue-text');
        const btnManualCadastro = document.getElementById('btn-med-scanner-manual');

        let isScanningProcess = false;

        if (btnSimulate) {
          btnSimulate.addEventListener('click', function () {
            if (isScanningProcess) return;
            isScanningProcess = true;

            // Transição para ESTADO 2: LENDO CÓDIGO
            if (viewfinder) viewfinder.classList.add('is-reading');
            if (btnSimulate) btnSimulate.disabled = true;
            if (btnSimulateText) btnSimulateText.textContent = 'Lendo código...';
            if (statusScannerText) statusScannerText.textContent = 'Lendo código...';

            // Duração da simulação curta (~1000ms)
            setTimeout(function () {
              if (viewfinder) viewfinder.classList.remove('is-reading');
              if (btnSimulate) btnSimulate.disabled = false;
              if (btnSimulateText) btnSimulateText.textContent = 'Simular leitura';
              if (statusScannerText) statusScannerText.textContent = 'Posicione o código aqui';

              // Transição para ESTADO 3: MEDICAMENTO ENCONTRADO
              if (stageScanning) stageScanning.style.display = 'none';
              if (stageFound) stageFound.style.display = 'flex';
              isScanningProcess = false;

              if (scrollArea) scrollArea.scrollTop = 0;
            }, 1000);
          });
        }

        // Ação: [Tentar novamente] -> Retorna para ESTADO 1 (PRONTO PARA ESCANEAR)
        if (btnRetryScan) {
          btnRetryScan.addEventListener('click', function () {
            if (stageFound) stageFound.style.display = 'none';
            if (stageScanning) stageScanning.style.display = 'flex';
            if (btnContinueCadastro) btnContinueCadastro.classList.remove('is-confirmed');
            if (btnContinueText) btnContinueText.textContent = 'Continuar cadastro';
            if (scrollArea) scrollArea.scrollTop = 0;
          });
        }

        // Ação: [Continuar cadastro] -> Feedback puramente visual sem sair da demo
        let continueTimer = null;
        if (btnContinueCadastro) {
          btnContinueCadastro.addEventListener('click', function () {
            btnContinueCadastro.classList.add('is-confirmed');
            if (btnContinueText) btnContinueText.textContent = '✓ Pronto para cadastrar';

            if (continueTimer) clearTimeout(continueTimer);
            continueTimer = setTimeout(function () {
              btnContinueCadastro.classList.remove('is-confirmed');
              if (btnContinueText) btnContinueText.textContent = 'Continuar cadastro';
            }, 1800);
          });
        }

        // Ação: [Cadastrar manualmente] -> Feedback demonstrativo sutil
        if (btnManualCadastro) {
          btnManualCadastro.addEventListener('click', function () {
            switchDemoView('medications');
          });
        }

        // Interação demonstrativa da Rotina: [Marcar como tomada]
        const btnRotinaTake = document.getElementById('btn-rotina-take-metformina');
        const btnRotinaTakeText = document.getElementById('btn-rotina-take-text');
        const badgeRotinaMetformina = document.getElementById('badge-rotina-metformina');
        const statRotinaTomadas = document.getElementById('stat-rotina-tomadas');
        const statRotinaPendentes = document.getElementById('stat-rotina-pendentes');
        const statRotinaBadge = document.getElementById('med-demo-rotina-badge');
        let isMetforminaTaken = false;

        if (btnRotinaTake) {
          btnRotinaTake.addEventListener('click', function () {
            isMetforminaTaken = !isMetforminaTaken;
            if (isMetforminaTaken) {
              btnRotinaTake.classList.add('is-taken');
              if (btnRotinaTakeText) btnRotinaTakeText.textContent = 'Tomada registrada';
              if (badgeRotinaMetformina) {
                badgeRotinaMetformina.textContent = 'TOMADO';
                badgeRotinaMetformina.className = 'med-demo-routine-badge med-demo-routine-badge--taken';
              }
              if (statRotinaTomadas) statRotinaTomadas.textContent = '5';
              if (statRotinaPendentes) statRotinaPendentes.textContent = '0';
              if (statRotinaBadge) statRotinaBadge.textContent = '5 de 6 tomadas';
            } else {
              btnRotinaTake.classList.remove('is-taken');
              if (btnRotinaTakeText) btnRotinaTakeText.textContent = 'Marcar como tomada';
              if (badgeRotinaMetformina) {
                badgeRotinaMetformina.textContent = 'PENDENTE';
                badgeRotinaMetformina.className = 'med-demo-routine-badge med-demo-routine-badge--pending';
              }
              if (statRotinaTomadas) statRotinaTomadas.textContent = '4';
              if (statRotinaPendentes) statRotinaPendentes.textContent = '1';
              if (statRotinaBadge) statRotinaBadge.textContent = '6 doses hoje';
            }
          });
        }

        // Feedback puramente visual no botão Repor da tela de Estoque (sem modal, sem backend)
        if (btnReporStock) {
          btnReporStock.addEventListener('click', function () {
            btnReporStock.classList.toggle('is-repondo');
            if (btnReporStock.classList.contains('is-repondo')) {
              btnReporStock.textContent = 'Solicitado';
            } else {
              btnReporStock.textContent = 'Repor';
            }
          });
        }

        // Retornos para a Home Demonstrativa
        [btnBackToHome, btnReturnHome, btnRotinaBack, btnRotinaReturn, btnEstoqueBack, btnEstoqueReturn, btnScannerBack, btnScannerReturn, btnPlaceholderBack, btnPlaceholderReturn].forEach(function (btn) {
          if (btn) {
            btn.addEventListener('click', function () {
              switchDemoView('home');
            });
          }
        });

        // Interações da Home (Dose atrasada / Tomei / Estou sem)
        const btnTake = document.getElementById('btn-med-demo-take');
        const btnOut = document.getElementById('btn-med-demo-out');
        const takeText = document.getElementById('btn-med-take-text');
        const outText = document.getElementById('btn-med-out-text');
        const cardDelayed = document.getElementById('med-demo-delayed-card');
        const statusDelayed = document.getElementById('med-demo-delayed-status');
        const badgePending = document.getElementById('med-demo-badge');

        let isTaken = false;
        let isOut = false;

        if (btnTake) {
          btnTake.addEventListener('click', function () {
            isTaken = !isTaken;
            if (isTaken) {
              btnTake.classList.add('is-active-taken');
              if (takeText) takeText.textContent = 'Dose registrada';
              if (cardDelayed) cardDelayed.classList.add('is-taken-state');
              if (statusDelayed) statusDelayed.textContent = 'REGISTRADA (07:00)';
              if (badgePending) badgePending.textContent = '2 doses pendentes';
              
              if (isOut) {
                isOut = false;
                if (btnOut) btnOut.classList.remove('is-active-out');
                if (outText) outText.textContent = 'Estou sem';
              }
            } else {
              btnTake.classList.remove('is-active-taken');
              if (takeText) takeText.textContent = 'Tomei';
              if (cardDelayed) cardDelayed.classList.remove('is-taken-state');
              if (statusDelayed) statusDelayed.textContent = 'ATRASADA (07:00)';
              if (badgePending) badgePending.textContent = '3 doses pendentes';
            }
          });
        }

        if (btnOut) {
          btnOut.addEventListener('click', function () {
            isOut = !isOut;
            if (isOut) {
              btnOut.classList.add('is-active-out');
              if (outText) outText.textContent = 'Aviso registrado';
              
              if (isTaken) {
                isTaken = false;
                if (btnTake) btnTake.classList.remove('is-active-taken');
                if (takeText) takeText.textContent = 'Tomei';
                if (cardDelayed) cardDelayed.classList.remove('is-taken-state');
                if (statusDelayed) statusDelayed.textContent = 'ATRASADA (07:00)';
                if (badgePending) badgePending.textContent = '3 doses pendentes';
              }
            } else {
              btnOut.classList.remove('is-active-out');
              if (outText) outText.textContent = 'Estou sem';
            }
          });
        }
      })();
