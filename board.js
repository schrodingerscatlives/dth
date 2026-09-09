
// ==================================================
//                  RADIOBUTTONS
// (btn-bounce, btn-add-counter, btn-rem-counter)
// ==================================================

// Permite desmarcar um radio button clicando nele novamente
// radiobuttons: Voltar pra mao, add ou remover marcadores.
document.querySelectorAll('input[name="action-toggle"]').forEach(radio => {
    radio.addEventListener('click', function() {
        if (this.previousState) {
            this.checked = false;
        }
        
        // Atualiza a memória do estado de todos do grupo
        document.querySelectorAll('input[name="action-toggle"]').forEach(r => {
            r.previousState = r.checked;
        });
    });
});

// ==================================================
// FUNÇÕES DE VERIFICAÇÃO DE ESTADO DOS RADIOBUTTONS
// (btn-bounce, btn-add-counter, btn-rem-counter)
// ==================================================

// Retorna true se "Devolver para a mão" (M) estiver selecionado
function isBounceActive() {
    return document.getElementById('btn-bounce').checked;
}

// Retorna true se "Adicionar Marcador" (+) estiver selecionado
function isAddCounterActive() {
    return document.getElementById('btn-add-counter').checked;
}

// Retorna true se "Remover Marcador" (-) estiver selecionado
function isRemCounterActive() {
    return document.getElementById('btn-rem-counter').checked;
}

// =======================================================
// FIM: FUNÇÕES DE VERIFICAÇÃO DE ESTADO DOS RADIOBUTTONS
// =======================================================

//Evento do botão fechar
document.getElementById('btn-close').addEventListener('click', () => {    
    window.parent.document.getElementById('game-frame').src = 'home.html';
});