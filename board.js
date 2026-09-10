//TODO: Texto no centro da carta que estao no campo: aumentar
//TODO: Verificar como estão os marcadores e o texto "Defensor"
const Zona = {
    Baralho   : null,
    Campo     : null,
    Mao       : null,
    Exilio    : null, 
    Cemiterio : null,
    Pilha     : null    
};
let LinhaCriarFichas = [];
let pontosVida = 60;
let compraTurno = "1";
let multiplicadorFichas = "1";
let comecaPermanenteAleatoria = false;

//estrutura para undo e redo
const historicoEstados = [];
let indiceHistorico = -1;

// Variável para acumular o número de cartas enviadas ao cemitério
let contadorTrituradas = 0;

let contadorTurnos = 0;

// ==========================================
// INICIALIZAÇÃO DO JOGO
// ==========================================

window.addEventListener('load', function() {  
  const configuracoes = parent.LerConfigSelecionada();
  //console.log(configuracoes);

  const BaralhoCorrente = parent.LerDeck(configuracoes.currentDeckIndex);

  // Copia o array original para evitar mutação direta na variável global do parent
  let baralhoProcessado = [...BaralhoCorrente.Carta];

  // Ajusta o tamanho do deck removendo apenas fichas
  const tamanhoDeck = configuracoes.config.tamanhoDeck;
  baralhoProcessado = aplicarTamanhoDeck(baralhoProcessado, tamanhoDeck);

  // Aplica o embaralhamento e regras de distribuição
  const distribuirUniforme = configuracoes.config.distribuirUniforme;
  const tipoDistribuicao = configuracoes.config.tipoDistribuicao;  
  if (distribuirUniforme) {
    baralhoProcessado = aplicarDistribuicaoUniforme(baralhoProcessado, tipoDistribuicao);
  } else {
    baralhoProcessado = embaralharArray(baralhoProcessado);
  }  

// Inicializa a estrutura das zonas
  Zona.Baralho = baralhoProcessado;
  Zona.Campo = [];
  Zona.Mao = [];
  Zona.Exilio = []; 
  Zona.Cemiterio = [];  

  LinhaCriarFichas = BaralhoCorrente.Criar;
  pontosVida = configuracoes.config.pontosVida;
  compraTurno = configuracoes.config.compraTurno;
  multiplicadorFichas = configuracoes.config.multiplicadorFichas;
  comecaPermanenteAleatoria = configuracoes.config.regrasOpcionais.comecaPermanenteAleatoria;
  
  // Regra Opcional: Começa com uma permanente aleatória em campo
  if (comecaPermanenteAleatoria) {
    // Encontra os índices de cartas com ComecarEmCampo === true no baralho
    const indicesElegiveis = [];
    Zona.Baralho.forEach((carta, index) => {
      if (carta.ComecarEmCampo === true) {
        indicesElegiveis.push(index);
      }
    });

    if (indicesElegiveis.length > 0) {
      // Escolha aleatória de um dos índices válidos
      const indiceSorteado = indicesElegiveis[Math.floor(Math.random() * indicesElegiveis.length)];

      // Remove do Baralho e insere no Campo
      const cartaSorteada = Zona.Baralho.splice(indiceSorteado, 1)[0];
      Zona.Campo.push(cartaSorteada);
      //console.log("Permanente inicial colocada em campo:", cartaSorteada);
    }
  }  

  const lblVida = document.getElementById('lbl-pontos-vida'); 
  if (lblVida) {
    lblVida.innerText = pontosVida;
  }
  atualizarContadorBaralho();
  renderizarCemiterio();
  renderizarCampo();
  atualizarLabelTurno();
  atualizaTextoBotaoMao();
  atualizaTextoBotaoExilio();  
  renderizarBotoesFichas();

  historicoEstados.length = 0;
  indiceHistorico = -1;  
  salvarEstado();
});
// ==========================================
// FIM: INICIALIZAÇÃO DO JOGO
// ==========================================

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




// ==========================================
// FUNÇÕES AUXILIARES DE EMBARALHAMENTO E REGRAS
// ==========================================

// Algoritmo Fisher-Yates para embaralhar um array de forma aleatória
function embaralharArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Reduz o deck removendo apenas cartas do tipo Ficha (Ficha === true) aleatoriamente
function aplicarTamanhoDeck(baralho, porcentagemStr) {
    if (porcentagemStr === "100%") return baralho;

    const porcentagem = parseInt(porcentagemStr, 10) / 100;
    const tamanhoAlvo = Math.round(baralho.length * porcentagem);
    let cartasParaRemover = baralho.length - tamanhoAlvo;

    if (cartasParaRemover <= 0) return baralho;

    // Mapeia índices de todas as cartas que são fichas
    let indicesFichas = [];
    baralho.forEach((carta, index) => {
        if (carta.Ficha === true) {
            indicesFichas.push(index);
        }
    });

    // Embaralha os índices das fichas para remoção aleatória
    indicesFichas = embaralharArray(indicesFichas);

    // Seleciona os índices a serem removidos (limitado ao total de fichas disponíveis)
    const indicesRemover = new Set(indicesFichas.slice(0, cartasParaRemover));

    // Filtra o baralho mantendo apenas as cartas não marcadas para remoção
    return baralho.filter((_, index) => !indicesRemover.has(index));
}

// Distribui fichas uniformemente e move cartas LateGame para a segunda metade do deck
function aplicarDistribuicaoUniforme(baralho, tipoDistribuicao) {
    let fichas = [];
    let naoFichasNormais = [];
    let naoFichasFortes = [];

    // Separa as cartas por categoria
    baralho.forEach(carta => {
        if (carta.Ficha === true) {
            fichas.push(carta);
        } else if (carta.LateGame === true) {
            naoFichasFortes.push(carta);
        } else {
            naoFichasNormais.push(carta);
        }
    });

    // Embaralha cada grupo separadamente para manter aleatoriedade interna
    fichas = embaralharArray(fichas);
    naoFichasNormais = embaralharArray(naoFichasNormais);
    naoFichasFortes = embaralharArray(naoFichasFortes);

    const metade = Math.floor(baralho.length / 2);
    
    // Na intensidade "Padrão", impede cartas fortes nos primeiros 50%.
    // Na intensidade "Reduzida", permite mover até metade das cartas fortes para a segunda metade.
    let fortesParaSegundaMetade = [];
    if (tipoDistribuicao === "Padrão") {
        fortesParaSegundaMetade = naoFichasFortes;
        naoFichasFortes = [];
    } else if (tipoDistribuicao === "Reduzida") {
        const qtdMover = Math.ceil(naoFichasFortes.length / 2);
        fortesParaSegundaMetade = naoFichasFortes.splice(0, qtdMover);
    }

    // Cartas elegíveis para os primeiros 50% (Apenas Fichas e Não-Fichas Normais)
    let poolPrimeiraMetade = [...fichas.splice(0, Math.floor(fichas.length / 2)), ...naoFichasNormais];
    poolPrimeiraMetade = embaralharArray(poolPrimeiraMetade);

    const primeiraMetade = poolPrimeiraMetade.slice(0, metade);
    const sobrasPrimeiraMetade = poolPrimeiraMetade.slice(metade);

    // A segunda metade recebe as cartas restantes + cartas LateGame (fortes)
    let segundaMetade = [...fichas, ...sobrasPrimeiraMetade, ...naoFichasFortes, ...fortesParaSegundaMetade];
    segundaMetade = embaralharArray(segundaMetade);

    // Retorna o baralho unificado (Topo = índice 0)
    return [...primeiraMetade, ...segundaMetade];
}
// ==========================================
// FIM: FUNÇÕES AUXILIARES DE EMBARALHAMENTO E REGRAS
// ==========================================


// ==========================================
// ESTRUTURA PARA SISTEMA DE UNDO / REDO
// ==========================================
/**
 * Salva um 'snapshot' (fotografia) do estado atual das zonas e do contador.
 * Deve ser chamado antes de qualquer ação que modifique o estado do jogo.
 */
function salvarEstado() {
    // Se estivéssemos em um ponto intermediário do histórico e fizermos uma nova ação,
    // descarta-se a linha do tempo "futura" (para onde o redo iria).
    if (indiceHistorico < historicoEstados.length - 1) {
        historicoEstados.splice(indiceHistorico + 1);
    }

    // Faz cópias profundas dos arrays para evitar mutação por referência
    const estadoSnapshot = {
        Zona: {
            Baralho: JSON.parse(JSON.stringify(Zona.Baralho)),
            Campo: JSON.parse(JSON.stringify(Zona.Campo)),
            Mao: JSON.parse(JSON.stringify(Zona.Mao)),
            Exilio: JSON.parse(JSON.stringify(Zona.Exilio)),
            Cemiterio: JSON.parse(JSON.stringify(Zona.Cemiterio))
        },
        contadorTrituradas: contadorTrituradas,
        contadorTurnos: contadorTurnos
    };

    historicoEstados.push(estadoSnapshot);
    indiceHistorico++;
    atualizarBotoesUndoRedo();
}

/**
 * Restaura o estado salvo no índice indicado.
 */
function restaurarEstado(index) {
    const estado = historicoEstados[index];
    
    // Restaura referências de dados
    Zona.Baralho = JSON.parse(JSON.stringify(estado.Zona.Baralho));
    Zona.Campo = JSON.parse(JSON.stringify(estado.Zona.Campo));
    Zona.Mao = JSON.parse(JSON.stringify(estado.Zona.Mao));
    Zona.Exilio = JSON.parse(JSON.stringify(estado.Zona.Exilio));
    Zona.Cemiterio = JSON.parse(JSON.stringify(estado.Zona.Cemiterio));
    
    contadorTrituradas = estado.contadorTrituradas;
    contadorTurnos = estado.contadorTurnos;

    // Atualiza a interface da caixa de trituração se ela estiver visível
    const caixaVisual = document.getElementById('caixa-trituradas');
    if (caixaVisual) {
        if (contadorTrituradas > 0) {
            caixaVisual.style.display = 'flex';
            document.getElementById('lbl-trituradas-texto').innerText = `Trituradas: ${contadorTrituradas}`;
        } else {
            caixaVisual.style.display = 'none';
        }
    }

    atualizarBotoesUndoRedo();
    renderizarCemiterio();
    atualizarContadorBaralho();
    atualizaTextoBotaoMao();
    atualizaTextoBotaoExilio();
    atualizarLabelTurno();
    renderizarCampo();
    
}

function desfazer() {
    if (indiceHistorico > 0) {
        indiceHistorico--;
        restaurarEstado(indiceHistorico);
    }
}

function refazer() {
    if (indiceHistorico < historicoEstados.length - 1) {
        indiceHistorico++;
        restaurarEstado(indiceHistorico);
    }
}

function atualizarBotoesUndoRedo() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');

    // Condição para saber se existe estado para voltar ou avançar
    const podeDesfazer = indiceHistorico > 0;
    const podeRefazer = indiceHistorico < historicoEstados.length - 1;    

    // Se NÃO puder desfazer, esconde mantendo o espaço reserved no layout
    if (btnUndo) {
        btnUndo.style.visibility = podeDesfazer ? 'visible' : 'hidden';
    }

    // Se NÃO puder refazer, esconde mantendo o espaço reserved no layout
    if (btnRedo) {
        btnRedo.style.visibility = podeRefazer ? 'visible' : 'hidden';
    }    

    //if (btnUndo) btnUndo.disabled = (indiceHistorico <= 0);
    //if (btnRedo) btnRedo.disabled = (indiceHistorico >= historicoEstados.length - 1);
}
// ==========================================
// FIM: ESTRUTURA PARA SISTEMA DE UNDO / REDO
// ==========================================

// ==========================================
// CRIAÇÃO E GERENCIAMENTO DA JANELA TRITURADAS
// ==========================================
function obterOuCriarJanelaTrituradas(imgDeck) {
    let container = document.getElementById('caixa-trituradas');

    if (!container) {
        container = document.createElement('div');
        container.id = 'caixa-trituradas';
        
        // Estilização fixa para evitar ser cortada por overflow: hidden
        Object.assign(container.style, {
            position: 'fixed',
            backgroundColor: 'rgba(15, 8, 25, 0.95)',
            border: '2px solid #8a4fd6',
            borderRadius: '8px',
            padding: '8px 16px',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 'bold',
            display: 'none',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
            zIndex: '999999', // Força ficar acima de qualquer elemento do tabuleiro
            whiteSpace: 'nowrap',
            pointerEvents: 'auto'
        });

        const spanTexto = document.createElement('span');
        spanTexto.id = 'lbl-trituradas-texto';
        spanTexto.innerText = `Trituradas: 0`;

        const btnFechar = document.createElement('span');
        btnFechar.innerText = '✕';
        Object.assign(btnFechar.style, {
            cursor: 'pointer',
            color: '#cbb4e6',
            fontWeight: 'bold',
            fontSize: '16px',
            marginLeft: '8px',
            padding: '0 4px'
        });

        // Fechar zera n e esconde a janela
        btnFechar.addEventListener('click', function(e) {
            e.stopPropagation();
            salvarEstado();
            contadorTrituradas = 0;
            container.style.display = 'none';
        });

        container.appendChild(spanTexto);
        container.appendChild(btnFechar);
        
        // Anexa ao body principal para ignorar regimentos de overflow dos painéis
        document.body.appendChild(container);
    }

    // Recalcula a posição exata acima do deck em tempo de execução
    const rect = imgDeck.getBoundingClientRect();
    container.style.left = `${rect.left + (rect.width / 2)}px`;
    container.style.top = `${rect.top - 45}px`; // Exibe 45px acima da imagem
    container.style.transform = 'translateX(-50%)';

    return container;
}
// ==========================================
// EVENTOS E LÓGICA DE CLIQUE
// ==========================================
function triturarCartaDoDeck(imgDeck) {
    if (!Zona.Baralho || Zona.Baralho.length === 0) {
        //console.warn("O baralho está vazio!");
        return;
    }

    // Salva o estado atual ANTES de modificar para permitir o Undo
    salvarEstado();

    // 1. Remove a carta do topo (índice 0)
    const cartaRemovida = Zona.Baralho.shift();

    // 2. Se não era ficha, adiciona ao cemitério
    if (cartaRemovida ) {
        if (cartaRemovida.Ficha === true) {
            // Se for ficha: Toca a animação de fade out e NÃO adiciona ao Cemitério
            animarFichaSaindo(cartaRemovida);
        } else {
            if (!Zona.Cemiterio) Zona.Cemiterio = [];
            Zona.Cemiterio.push(cartaRemovida);            
        }
        contadorTrituradas++;
    }

    // Atualiza e exibe a janela flutuante
    const caixaVisual = obterOuCriarJanelaTrituradas(imgDeck);
    const spanTexto = document.getElementById('lbl-trituradas-texto');
    
    if (spanTexto) {
        spanTexto.innerText = `Trituradas: ${contadorTrituradas}`;
    }
    caixaVisual.style.display = 'flex';

    atualizarContadorBaralho();
    renderizarCemiterio();
}

//atualizar contador de cartas no Baralho
function atualizarContadorBaralho() {
  const lblCurDeckSize = document.getElementById('current-deck-size'); 
  if (lblCurDeckSize) {
    lblCurDeckSize.innerText = Zona.Baralho ? Zona.Baralho.length : 0;
  }    
}

// Vincula os escutadores assim que o DOM/Janela carregar
window.addEventListener('DOMContentLoaded', function() {
    // Configura botões de Undo/Redo
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');

    if (btnUndo) btnUndo.addEventListener('click', desfazer);
    if (btnRedo) btnRedo.addEventListener('click', refazer);

    // Localiza a imagem do verso do deck pelo alt
    const imgDeck = document.getElementById('img-deck');
    //const imgDeck = document.querySelector('img[alt="Verso da Carta - Deck"]');
    if (imgDeck) {
        imgDeck.style.cursor = 'pointer';
        imgDeck.addEventListener('click', function() {
            triturarCartaDoDeck(imgDeck);
        });
    }
    
});


//CONTADOR DE VIDA
document.addEventListener('DOMContentLoaded', function() {
    const boxVida = document.getElementById('box-pontos-vida');
    const lblVida = document.getElementById('lbl-pontos-vida'); 

    if (boxVida) {
        boxVida.addEventListener('click', function(event) {
            // Obtém as dimensões e posição da div na tela
            const rect = boxVida.getBoundingClientRect();
            
            // Calcula a posição Y do clique dentro do elemento (0 a altura_total)
            const cliqueY = event.clientY - rect.top;
            const metadeAltura = rect.height / 2;

            // Se o clique for na metade superior (< metadeAltura), incrementa
            // Caso contrário, decrementa
            if (cliqueY < metadeAltura) {
                pontosVida++;
            } else {
                pontosVida--;
            }

            // Atualiza a interface
            if (lblVida) {
                lblVida.innerText = pontosVida;
            }
            
            //console.log("Pontos de vida atualizados:", pontosVida);
        });
    }
});


// ==========================================
// RENDERIZAÇÃO DA ZONA CEMITÉRIO
// ==========================================

/**
 * Toca uma animação de fade out da ficha por cima da carta do cemitério
 * Isso dará um retorno visual pro usuário ja que fichas nao vao para o cemitério
 * (nas regras até tocam o cemitério mas não permanecem lá - deixam de existir).
 */
function animarFichaSaindo(cartaFicha) {
    const container = document.getElementById('container-cemiterio');
    if (!container) return;

    // Assegura posicionamento relativo no container para alinhar a imagem fantasma
    container.style.position = 'relative';

    // Cria elemento de imagem fantasma para a ficha
    const imgFantasma = document.createElement('img');
    imgFantasma.classList.add('ficha-fade-out');

    // Define estilos para cobrir exatamente o slot do cemitério
    Object.assign(imgFantasma.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        borderRadius: 'inherit',
        zIndex: '10'
    });

    // Fallback de imagem local / remota
    imgFantasma.onerror = function() {
        const caminhoBase = (typeof parent.deckPath === 'function') ? parent.deckPath() : './decks/';
        this.src = caminhoBase + cartaFicha.Imagem;
        this.onerror = null;
    };
    imgFantasma.src = cartaFicha.Url || (parent.deckPath() + cartaFicha.Imagem);

    // Remove o elemento da DOM ao fim da animação (600ms)
    imgFantasma.addEventListener('animationend', function() {
        imgFantasma.remove();
    });

    container.appendChild(imgFantasma);
}

/**
 * Atualiza o componente visual do cemitério com a última carta inserida
 * e o total de cartas presentes no array.
 */
function renderizarCemiterio() {
    const imgElemento = document.getElementById('img-cemiterio');
    const lblTotal = document.getElementById('lbl-total-cemiterio');
    
    if (!imgElemento || !lblTotal) return;

    const totalCartas = Zona.Cemiterio ? Zona.Cemiterio.length : 0;
    
    // Atualiza a contagem total
    lblTotal.innerText = totalCartas;

    if (totalCartas > 0) {
        // Obtém a última carta inserida (índice: tamanho - 1)
        const ultimaCarta = Zona.Cemiterio[totalCartas - 1];

        // Reseta o manipulador de erro antes de atribuir nova fonte
        imgElemento.onerror = function() {
            // Se falhar o carregamento remoto (Url), busca o caminho local
            const caminhoBase = (typeof parent.deckPath === 'function') ? parent.deckPath() : './decks/';
            this.src = caminhoBase + ultimaCarta.Imagem;
            
            // Cancela o evento onerror para evitar loops infinitos caso o arquivo local também falhe
            this.onerror = null; 
        };

        // Tenta carregar a imagem via URL remota primeiro
        imgElemento.src = ultimaCarta.Url || (parent.deckPath() + ultimaCarta.Imagem);
        imgElemento.style.visibility = 'visible';
    } else {
        // Quando o array está vazio, oculta a imagem mas preserva o espaço ocupado no layout
        imgElemento.removeAttribute('src');
        imgElemento.style.visibility = 'hidden';
    }
}

// ==========================================
// EVENTOS E VINCUÇÃO NO DOM
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    const containerCemiterio = document.getElementById('container-cemiterio');

    if (containerCemiterio) {
        containerCemiterio.addEventListener('click', function() {
            alert(`Acessando o Cemitério. Total de cartas: ${Zona.Cemiterio ? Zona.Cemiterio.length : 0}`);
        });
    }

    // Renderiza o estado inicial do cemitério
    renderizarCemiterio();
});
// ==========================================
// FIM: RENDERIZAÇÃO DA ZONA CEMITÉRIO
// ==========================================



// ==========================================
// RENDERIZAÇÃO E INTERAÇÃO DA ZONA CAMPO
// ==========================================
/*
function renderizarCampo() {
    const sectionCriaturas = document.querySelector('.creatures-row');
    const colNaoCriaturas = document.querySelector('.non-creatures-column');

    if (!sectionCriaturas || !colNaoCriaturas) return;

    // Busca ou garante a existência dos elementos do título e das áreas de scroll
    let titleCriaturas = sectionCriaturas.querySelector('.section-title');
    let scrollCriaturas = sectionCriaturas.querySelector('.cards-scroll-area');

    if (!scrollCriaturas) {
        scrollCriaturas = document.createElement('div');
        scrollCriaturas.className = 'cards-scroll-area';
        sectionCriaturas.appendChild(scrollCriaturas);
    }

    let titleNaoCriaturas = colNaoCriaturas.querySelector('.section-title');
    let scrollNaoCriaturas = colNaoCriaturas.querySelector('.cards-scroll-area');

    if (!scrollNaoCriaturas) {
        scrollNaoCriaturas = document.createElement('div');
        scrollNaoCriaturas.className = 'cards-scroll-area';
        colNaoCriaturas.appendChild(scrollNaoCriaturas);
    }

    // Limpa apenas a área interna dos cards (preservando o título da seção)
    scrollCriaturas.innerHTML = '';
    scrollNaoCriaturas.innerHTML = '';

    // Inicializa contadores totais para os títulos
    let totalCriaturas = 0;
    let totalNaoCriaturas = 0;

    if (!Zona.Campo || Zona.Campo.length === 0) {
        if (titleCriaturas) titleCriaturas.innerText = 'Criaturas (0)';
        if (titleNaoCriaturas) titleNaoCriaturas.innerText = 'Não criaturas (0)';
        return;
    }

    // 1. Agrupa cartas idênticas
    const grupos = {};

    Zona.Campo.forEach(carta => {
        const chaveImagem = carta.Url || carta.Imagem;
                
        if (!grupos[chaveImagem]) {
            grupos[chaveImagem] = {
                cartaBase: carta,
                quantidade: 0,
                totalContadores: 0
            };
        }

        grupos[chaveImagem].quantidade += 1;

        if (typeof carta.Contadores === 'number' && carta.Contadores > 0) {
            grupos[chaveImagem].totalContadores += carta.Contadores;
        }

        // Soma para a contagem dos títulos da seção
        if (carta.Criatura === true) {
            totalCriaturas++;
        } else {
            totalNaoCriaturas++;
        }               
    });

    // Atualiza o texto dos títulos dinamicamente
    if (titleCriaturas) titleCriaturas.innerText = `Criaturas (${totalCriaturas})`;
    if (titleNaoCriaturas) titleNaoCriaturas.innerText = `Não criaturas (${totalNaoCriaturas})`;

    // 2. Renderiza cada grupo de cartas dentro da classe .card-item
    Object.keys(grupos).forEach(chave => {
        const grupo = grupos[chave];
        const carta = grupo.cartaBase;

        // Container externo exigido pelo seu HTML/CSS original
        const cardItem = document.createElement('div');
        cardItem.className = 'card-item';
        cardItem.style.position = 'relative'; // Assegura o alinhamento dos overlays
        cardItem.style.cursor = 'pointer';

        // Elemento de Imagem
        const img = document.createElement('img');
        img.onerror = function() {
            const caminhoBase = (typeof parent.deckPath === 'function') ? parent.deckPath() : './decks/';
            this.src = caminhoBase + carta.Imagem;
            this.onerror = null;
        };
        img.src = carta.Url || (parent.deckPath() + carta.Imagem);
        img.alt = carta.Criatura ? "Criatura em Campo" : "Não Criatura em Campo";

        // Overlay centralizador para métricas/textos
        const overlay = document.createElement('div');
        overlay.className = 'card-overlay-info';

        // Defensor (NaoAtaca === true)        
        if (carta.NaoAtaca === true) {
            const lblDefensor = document.createElement('span');
            lblDefensor.className = 'lbl-defensor';
            lblDefensor.innerText = 'Defensor';
            overlay.appendChild(lblDefensor);
        }

        // Quantidade (n)        
        const lblCount = document.createElement('span');
        lblCount.className = 'lbl-copias-count';
        lblCount.innerText = (grupo.quantidade > 1)? grupo.quantidade : "";
        overlay.appendChild(lblCount);        
        
        // Círculo Cinza (Contadores)
        if (grupo.totalContadores > 0) {
            const circleContadores = document.createElement('div');
            circleContadores.className = 'circle-contadores';
            circleContadores.innerText = grupo.totalContadores;
            overlay.appendChild(circleContadores);
        }

        cardItem.appendChild(img);
        cardItem.appendChild(overlay);

        // ==========================================
        // EVENTOS: CLIQUE SIMPLES, LONG PRESS E SCROLL SAFE
        // ==========================================
        let timerPressionado = null;
        let ehLongPress = false;

        // Variáveis para rastrear a posição inicial do ponteiro
        let startX = 0;
        let startY = 0;
        let moveuParaScroll = false;
        const limiarScrollPX = 6; // Tolerância em pixels para diferenciar clique de scroll

        function iniciarPressionar(e) {
            ehLongPress = false;
            moveuParaScroll = false;

            // Captura as coordenadas iniciais do clique/toque
            const cliente = e.touches ? e.touches[0] : e;
            startX = cliente.clientX;
            startY = cliente.clientY;

            timerPressionado = setTimeout(() => {
                // Se o usuário moveu o dedo para rolar a tela, não dispara o zoom
                if (!moveuParaScroll) {
                    ehLongPress = true;
                    alert(`Zoom da carta: ${carta.Nome || carta.Imagem}`);
                }
            }, 500);
        }

        function monitorarMovimento(e) {
            // Se o ponteiro se mover além do limiar, marca como ação de scroll
            const cliente = e.touches ? e.touches[0] : e;
            const deltaX = Math.abs(cliente.clientX - startX);
            const deltaY = Math.abs(cliente.clientY - startY);

            if (deltaX > limiarScrollPX || deltaY > limiarScrollPX) {
                moveuParaScroll = true;
                cancelarPressionar(); // Cancela o timer do Zoom
            }
        }

        function cancelarPressionar() {
            if (timerPressionado) {
                clearTimeout(timerPressionado);
                timerPressionado = null;
            }
        }

        function executarCliqueRemocao() {
            // Cancela o timer do Long Press se ainda estiver ativo
            cancelarPressionar();

            // Se o usuário estava arrastando a tela (scroll) OU ativou o zoom, NÃO joga no cemitério
            if (ehLongPress || moveuParaScroll) return;

            salvarEstado();

            const indexCarta = Zona.Campo.findIndex(c => (c.Url || c.Imagem) === chave);

            if (indexCarta !== -1) {
                const cartaAlvo = Zona.Campo[indexCarta];

                // 1. REGRA: BOUNCE (Mover para a Mão)
                if (typeof isBounceActive === 'function' && isBounceActive()) {
                    Zona.Campo.splice(indexCarta, 1);

                    // Se NÃO for ficha, move para a Mão
                    if (cartaAlvo.Ficha !== true) {
                        if (!Zona.Mao) Zona.Mao = [];
                        Zona.Mao.push(cartaAlvo);
                    }
                    atualizaTextoBotaoMao();

                // 2. REGRA: ADICIONAR CONTADOR
                } else if (typeof isAddCounterActive === 'function' && isAddCounterActive()) {
                    if (typeof cartaAlvo.Contadores !== 'number') {
                        cartaAlvo.Contadores = 0;
                    }
                    cartaAlvo.Contadores += 1;

                // 3. REGRA: REMOVER CONTADOR
                } else if (typeof isRemCounterActive === 'function' && isRemCounterActive()) {
                    if (typeof cartaAlvo.Contadores !== 'number') {
                        cartaAlvo.Contadores = 0;
                    }
                    if (cartaAlvo.Contadores > 0) {
                        cartaAlvo.Contadores -= 1;
                    }

                // 4. REGRA PADRÃO (Mover para o Cemitério)
                } else {
                    const [cartaRemovida] = Zona.Campo.splice(indexCarta, 1);

                    // Se NÃO for ficha, envia para o Cemitério
                    if (cartaRemovida && cartaRemovida.Ficha !== true) {
                        if (!Zona.Cemiterio) Zona.Cemiterio = [];
                        Zona.Cemiterio.push(cartaRemovida);
                    }
                    renderizarCemiterio();
                }

                renderizarCampo();
                renderizarCemiterio();
            }
        }

        // Suporte para Mouse (Desktop)
        cardItem.addEventListener('mousedown', iniciarPressionar);
        cardItem.addEventListener('mousemove', monitorarMovimento);
        cardItem.addEventListener('mouseup', executarCliqueRemocao);
        cardItem.addEventListener('mouseleave', cancelarPressionar);

        // Suporte para Toque (Mobile / Tablet)
        cardItem.addEventListener('touchstart', iniciarPressionar, { passive: true });
        cardItem.addEventListener('touchmove', monitorarMovimento, { passive: true });
        cardItem.addEventListener('touchend', executarCliqueRemocao);

        // Insere a carta na área de scroll correta
        if (carta.Criatura === true) {
            scrollCriaturas.appendChild(cardItem);
        } else {
            scrollNaoCriaturas.appendChild(cardItem);
        }
    });
}
*/

function renderizarCampo() {
    const sectionCriaturas = document.querySelector('.creatures-row');
    const colNaoCriaturas = document.querySelector('.non-creatures-column');

    if (!sectionCriaturas || !colNaoCriaturas) return;

    // Busca ou garante a existência dos elementos do título e das áreas de scroll
    let titleCriaturas = sectionCriaturas.querySelector('.section-title');
    let scrollCriaturas = sectionCriaturas.querySelector('.cards-scroll-area');

    if (!scrollCriaturas) {
        scrollCriaturas = document.createElement('div');
        scrollCriaturas.className = 'cards-scroll-area';
        sectionCriaturas.appendChild(scrollCriaturas);
    }

    let titleNaoCriaturas = colNaoCriaturas.querySelector('.section-title');
    let scrollNaoCriaturas = colNaoCriaturas.querySelector('.cards-scroll-area');

    if (!scrollNaoCriaturas) {
        scrollNaoCriaturas = document.createElement('div');
        scrollNaoCriaturas.className = 'cards-scroll-area';
        colNaoCriaturas.appendChild(scrollNaoCriaturas);
    }

    // Limpa apenas a área interna dos cards (preservando o título da seção)
    scrollCriaturas.innerHTML = '';
    scrollNaoCriaturas.innerHTML = '';

    // Inicializa contadores totais para os títulos
    let totalCriaturas = 0;
    let totalNaoCriaturas = 0;

    if (!Zona.Campo || Zona.Campo.length === 0) {
        if (titleCriaturas) titleCriaturas.innerText = 'Criaturas (0)';
        if (titleNaoCriaturas) titleNaoCriaturas.innerText = 'Não criaturas (0)';
        return;
    }

    // 1. Agrupa cartas idênticas SOMENTE SE tiverem a mesma quantidade de contadores
    const grupos = {};

    Zona.Campo.forEach(carta => {
        const chaveImagem = carta.Url || carta.Imagem;
        const contadores = (typeof carta.Contadores === 'number' && carta.Contadores > 0) ? carta.Contadores : 0;
        
        // Chave Composta: Desagrupa se a quantidade de contadores for diferente
        const chaveGrupo = `${chaveImagem}_cnt_${contadores}`;
                
        if (!grupos[chaveGrupo]) {
            grupos[chaveGrupo] = {
                cartaBase: carta,
                chaveImagem: chaveImagem,
                quantidade: 0,
                totalContadores: contadores
            };
        }

        grupos[chaveGrupo].quantidade += 1;

        // Soma para a contagem dos títulos da seção
        if (carta.Criatura === true) {
            totalCriaturas++;
        } else {
            totalNaoCriaturas++;
        }               
    });

    // Atualiza o texto dos títulos dinamente
    if (titleCriaturas) titleCriaturas.innerText = `Criaturas (${totalCriaturas})`;
    if (titleNaoCriaturas) titleNaoCriaturas.innerText = `Não criaturas (${totalNaoCriaturas})`;

    // 2. Renderiza cada grupo de cartas dentro da classe .card-item
    Object.keys(grupos).forEach(chave => {
        const grupo = grupos[chave];
        const carta = grupo.cartaBase;

        // Container externo
        const cardItem = document.createElement('div');
        cardItem.className = 'card-item';
        cardItem.style.position = 'relative'; 
        cardItem.style.cursor = 'pointer';

        // Elemento de Imagem
        const img = document.createElement('img');
        img.onerror = function() {
            const caminhoBase = (typeof parent.deckPath === 'function') ? parent.deckPath() : './decks/';
            this.src = caminhoBase + carta.Imagem;
            this.onerror = null;
        };
        img.src = carta.Url || (parent.deckPath() + carta.Imagem);
        img.alt = carta.Criatura ? "Criatura em Campo" : "Não Criatura em Campo";

        // Overlay centralizador para métricas/textos
        const overlay = document.createElement('div');
        overlay.className = 'card-overlay-info';

        // Defensor (NaoAtaca === true)        
        if (carta.NaoAtaca === true) {
            const lblDefensor = document.createElement('span');
            lblDefensor.className = 'lbl-defensor';
            lblDefensor.innerText = 'Defensor';
            overlay.appendChild(lblDefensor);
        }

        // Quantidade (n)        
        const lblCount = document.createElement('span');
        lblCount.className = 'lbl-copias-count';
        lblCount.innerText = (grupo.quantidade > 1) ? grupo.quantidade : "";
        overlay.appendChild(lblCount);        
        
        // Círculo Cinza (Contadores com span para alinhamento centralizado)
        if (grupo.totalContadores > 0) {
            const circleContadores = document.createElement('div');
            circleContadores.className = 'circle-contadores';
            
            const spanNumero = document.createElement('span');
            spanNumero.innerText = grupo.totalContadores;
            
            circleContadores.appendChild(spanNumero);
            overlay.appendChild(circleContadores);
        }

        cardItem.appendChild(img);
        cardItem.appendChild(overlay);

        // ==========================================
        // EVENTOS: CLIQUE SIMPLES, LONG PRESS E SCROLL SAFE
        // ==========================================
        /*
        let timerPressionado = null;
        let ehLongPress = false;

        let startX = 0;
        let startY = 0;
        let moveuParaScroll = false;
        let processouTouch = false; // Trava para evitar disparo duplo (Touch + Mouse)
        const limiarScrollPX = 6; 

        function iniciarPressionar(e) {
            ehLongPress = false;
            moveuParaScroll = false;

            const cliente = e.touches ? e.touches[0] : e;
            startX = cliente.clientX;
            startY = cliente.clientY;

            timerPressionado = setTimeout(() => {
                if (!moveuParaScroll) {
                    ehLongPress = true;
                    alert(`Zoom da carta: ${carta.Nome || carta.Imagem}`);
                }
            }, 500);
        }

        function monitorarMovimento(e) {
            const cliente = e.touches ? e.touches[0] : e;
            const deltaX = Math.abs(cliente.clientX - startX);
            const deltaY = Math.abs(cliente.clientY - startY);

            if (deltaX > limiarScrollPX || deltaY > limiarScrollPX) {
                moveuParaScroll = true;
                cancelarPressionar(); 
            }
        }

        function cancelarPressionar() {
            if (timerPressionado) {
                clearTimeout(timerPressionado);
                timerPressionado = null;
            }
        }

        function executarCliqueRemocao(e) {
            // Se for um evento de Mouse emulado logo após um Touch, ignora
            if (e.type === 'mouseup' && processouTouch) {
                processouTouch = false;
                return;
            }            
            if (e.type === 'touchend') {
                processouTouch = true;
            }            
            cancelarPressionar();

            if (ehLongPress || moveuParaScroll) return;

            // Localiza no array original a carta correspondente a ESTE grupo específico
            const indexCarta = Zona.Campo.findIndex(c => {
                const imgMatch = (c.Url || c.Imagem) === grupo.chaveImagem;
                const cnt = (typeof c.Contadores === 'number' && c.Contadores > 0) ? c.Contadores : 0;
                return imgMatch && cnt === grupo.totalContadores;
            });

            if (indexCarta !== -1) {
                salvarEstado();
                const cartaAlvo = Zona.Campo[indexCarta];

                // 1. REGRA: BOUNCE (Mover para a Mão)
                if (typeof isBounceActive === 'function' && isBounceActive()) {
                    Zona.Campo.splice(indexCarta, 1);

                    if (cartaAlvo.Ficha !== true) {
                        if (!Zona.Mao) Zona.Mao = [];
                        Zona.Mao.push(cartaAlvo);
                    }
                    atualizaTextoBotaoMao();

                // 2. REGRA: ADICIONAR CONTADOR
                } else if (typeof isAddCounterActive === 'function' && isAddCounterActive()) {
                    if (typeof cartaAlvo.Contadores !== 'number') {
                        cartaAlvo.Contadores = 0;
                    }
                    cartaAlvo.Contadores += 1;

                // 3. REGRA: REMOVER CONTADOR
                } else if (typeof isRemCounterActive === 'function' && isRemCounterActive()) {
                    if (typeof cartaAlvo.Contadores !== 'number') {
                        cartaAlvo.Contadores = 0;
                    }
                    if (cartaAlvo.Contadores > 0) {
                        cartaAlvo.Contadores -= 1;
                    }

                // 4. REGRA PADRÃO (Mover para o Cemitério)
                } else {
                    const [cartaRemovida] = Zona.Campo.splice(indexCarta, 1);

                    if (cartaRemovida && cartaRemovida.Ficha !== true) {
                        if (!Zona.Cemiterio) Zona.Cemiterio = [];
                        Zona.Cemiterio.push(cartaRemovida);
                    }
                }

                renderizarCampo();
                if (typeof renderizarCemiterio === 'function') renderizarCemiterio();
            }
        }

        // Suporte para Mouse (Desktop)
        cardItem.addEventListener('mousedown', iniciarPressionar);
        cardItem.addEventListener('mousemove', monitorarMovimento);
        cardItem.addEventListener('mouseup', executarCliqueRemocao);
        cardItem.addEventListener('mouseleave', cancelarPressionar);

        // Suporte para Toque (Mobile / Tablet)
        cardItem.addEventListener('touchstart', iniciarPressionar, { passive: true });
        cardItem.addEventListener('touchmove', monitorarMovimento, { passive: true });
        cardItem.addEventListener('touchend', executarCliqueRemocao);
        */        
        let timerPressionado = null;
        let ehLongPress = false;

        let startX = 0;
        let startY = 0;
        let moveuParaScroll = false;
        const limiarScrollPX = 6; 

        function iniciarPressionar(e) {
            ehLongPress = false;
            moveuParaScroll = false;

            const cliente = e.touches ? e.touches[0] : e;
            startX = cliente.clientX;
            startY = cliente.clientY;

            timerPressionado = setTimeout(() => {
                if (!moveuParaScroll) {
                    ehLongPress = true;
                    alert(`Zoom da carta: ${carta.Nome || carta.Imagem}`);
                }
            }, 500);
        }

        function monitorarMovimento(e) {
            const cliente = e.touches ? e.touches[0] : e;
            const deltaX = Math.abs(cliente.clientX - startX);
            const deltaY = Math.abs(cliente.clientY - startY);

            if (deltaX > limiarScrollPX || deltaY > limiarScrollPX) {
                moveuParaScroll = true;
                cancelarPressionar(); 
            }
        }

        function cancelarPressionar() {
            if (timerPressionado) {
                clearTimeout(timerPressionado);
                timerPressionado = null;
            }
        }

        function executarCliqueRemocao(e) {
            // Se o evento foi disparado via toque em tela, previne que o navegador
            // gere eventos sintéticos de mouse (mousedown / mouseup / click) emulados
            if (e.type === 'touchend') {
                if (e.cancelable) e.preventDefault();
            }

            cancelarPressionar();

            if (ehLongPress || moveuParaScroll) return;

            // Localiza no array original a carta correspondente a ESTE grupo específico
            const indexCarta = Zona.Campo.findIndex(c => {
                const imgMatch = (c.Url || c.Imagem) === grupo.chaveImagem;
                const cnt = (typeof c.Contadores === 'number' && c.Contadores > 0) ? c.Contadores : 0;
                return imgMatch && cnt === grupo.totalContadores;
            });

            if (indexCarta !== -1) {
                salvarEstado();
                const cartaAlvo = Zona.Campo[indexCarta];

                // 1. REGRA: BOUNCE (Mover para a Mão)
                if (typeof isBounceActive === 'function' && isBounceActive()) {
                    Zona.Campo.splice(indexCarta, 1);

                    if (cartaAlvo.Ficha !== true) {
                        if (!Zona.Mao) Zona.Mao = [];
                        Zona.Mao.push(cartaAlvo);
                    }
                    atualizaTextoBotaoMao();

                // 2. REGRA: ADICIONAR CONTADOR
                } else if (typeof isAddCounterActive === 'function' && isAddCounterActive()) {
                    if (typeof cartaAlvo.Contadores !== 'number') {
                        cartaAlvo.Contadores = 0;
                    }
                    cartaAlvo.Contadores += 1;

                // 3. REGRA: REMOVER CONTADOR
                } else if (typeof isRemCounterActive === 'function' && isRemCounterActive()) {
                    if (typeof cartaAlvo.Contadores !== 'number') {
                        cartaAlvo.Contadores = 0;
                    }
                    if (cartaAlvo.Contadores > 0) {
                        cartaAlvo.Contadores -= 1;
                    }

                // 4. REGRA PADRÃO (Mover para o Cemitério)
                } else {
                    const [cartaRemovida] = Zona.Campo.splice(indexCarta, 1);

                    if (cartaRemovida && cartaRemovida.Ficha !== true) {
                        if (!Zona.Cemiterio) Zona.Cemiterio = [];
                        Zona.Cemiterio.push(cartaRemovida);
                    }
                }

                renderizarCampo();
                if (typeof renderizarCemiterio === 'function') renderizarCemiterio();
            }
        }

        // Suporte para Mouse (Desktop)
        cardItem.addEventListener('mousedown', iniciarPressionar);
        cardItem.addEventListener('mousemove', monitorarMovimento);
        cardItem.addEventListener('mouseup', executarCliqueRemocao);
        cardItem.addEventListener('mouseleave', cancelarPressionar);

        // Suporte para Toque (Mobile / Tablet / Emulador)
        // passive: false é necessário para podermos usar e.preventDefault() no touchend
        cardItem.addEventListener('touchstart', iniciarPressionar, { passive: true });
        cardItem.addEventListener('touchmove', monitorarMovimento, { passive: true });
        cardItem.addEventListener('touchend', executarCliqueRemocao, { passive: false });       

        // Insere a carta na área de scroll correta
        if (carta.Criatura === true) {
            scrollCriaturas.appendChild(cardItem);
        } else {
            scrollNaoCriaturas.appendChild(cardItem);
        }
    });
}
// ==========================================
// FIM: RENDERIZAÇÃO E INTERAÇÃO DA ZONA CAMPO
// ==========================================



// ==========================================
// RESOLUÇÃO DE NOVO TURNO E PILHA
// ==========================================

/**
 * Atualiza o label do contador de turnos na interface
 */
function atualizarLabelTurno() {
    const lblTurno = document.querySelector('.turn-label');
    if (lblTurno) {
        lblTurno.innerText = `Turno ${contadorTurnos}`;
    }
}

/**
 * Processa a transição de um novo turno e alimenta a Pilha
 */
function iniciarNovoTurno() {
    // 1. Salva o estado atual para permitir Undo
    salvarEstado();

    // 2. Incremente contador e atualiza label
    contadorTurnos++;
    atualizarLabelTurno();

    if (!Zona.Pilha) Zona.Pilha = [];

    // A) Mover cartas do topo do Baralho até vir uma não-Ficha (ou baralho acabar)
    if (Zona.Baralho && Zona.Baralho.length > 0) {
        let continuarRetirando = true;

        while (continuarRetirando && Zona.Baralho.length > 0) {
            const cartaTopo = Zona.Baralho.shift();
            cartaTopo.Origem = "Baralho";
            Zona.Pilha.push(cartaTopo);

            // Se for Ficha !== true, interrompe o loop
            if (cartaTopo.Ficha !== true) {
                continuarRetirando = false;
            }
        }
    }

    // B) Mover qualquer carta de Zona.Mao para Zona.Pilha
    if (Zona.Mao && Zona.Mao.length > 0) {
        while (Zona.Mao.length > 0) {
            const cartaMao = Zona.Mao.shift();
            cartaMao.Origem = "Mão";
            Zona.Pilha.push(cartaMao);
        }
    }

    // C) Mover cartas elegíveis do Cemitério para a Pilha (ConjurarDoCemiterio === true)
    if (Zona.Cemiterio && Zona.Cemiterio.length > 0) {
        for (let i = Zona.Cemiterio.length - 1; i >= 0; i--) {
            if (Zona.Cemiterio[i].ConjurarDoCemiterio === true) {
                const [cartaCemiterio] = Zona.Cemiterio.splice(i, 1);
                cartaCemiterio.Origem = "Cemitério";
                Zona.Pilha.push(cartaCemiterio);
            }
        }
    }

    // Atualiza o cemitério caso tenhamos removido cartas dele
    renderizarCemiterio();
    // TODO: É necessário atualizar o contador da mão aqui tambem.
    atualizarContadorBaralho();

    // 3. Exibe a tela modal com as cartas na Pilha
    abrirModalPilha();
}

/**
 * Cria e abre a tela modal com o conteúdo de Zona.Pilha
 */
function abrirModalPilha() {
    // Cria os elementos do Modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-pilha-overlay';

    const content = document.createElement('div');
    content.className = 'modal-pilha-content';

    const btnFechar = document.createElement('span');
    btnFechar.className = 'modal-pilha-close';
    btnFechar.innerText = '✕';

    const titulo = document.createElement('div');
    titulo.className = 'modal-pilha-title';
    titulo.innerText = `Pilha de Mágicas (${Zona.Pilha ? Zona.Pilha.length : 0})`;

    const containerCartas = document.createElement('div');
    containerCartas.className = 'container-pilha-cartas';

    // Renderiza cada carta presente na Pilha
    if (Zona.Pilha && Zona.Pilha.length > 0) {
        Zona.Pilha.forEach(carta => {
            const item = document.createElement('div');
            item.className = 'card-pilha-item';

            const tagOrigem = document.createElement('span');
            tagOrigem.className = 'tag-origem';
            tagOrigem.innerText = carta.Origem || 'Desconhecido';

            const img = document.createElement('img');
            img.onerror = function() {
                const caminhoBase = (typeof parent.deckPath === 'function') ? parent.deckPath() : './decks/';
                this.src = caminhoBase + carta.Imagem;
                this.onerror = null;
            };
            img.src = carta.Url || (parent.deckPath() + carta.Imagem);

            item.appendChild(tagOrigem);
            item.appendChild(img);
            containerCartas.appendChild(item);
        });
    }

    // Fecha a modal e esvazia Zona.Pilha processando seus destinos
    btnFechar.addEventListener('click', function() {
        resolucionarPilha();
        overlay.remove();
    });

    content.appendChild(btnFechar);
    content.appendChild(titulo);
    content.appendChild(containerCartas);
    overlay.appendChild(content);

    document.body.appendChild(overlay);
}

/**
 * Esvazia Zona.Pilha enviando cada carta para seu destino final (Campo, Cemitério ou Exílio)
 */
function resolucionarPilha() {
    if (!Zona.Pilha || Zona.Pilha.length === 0) return;

    if (!Zona.Campo) Zona.Campo = [];
    if (!Zona.Cemiterio) Zona.Cemiterio = [];
    if (!Zona.Exilio) Zona.Exilio = [];

    while (Zona.Pilha.length > 0) {
        const carta = Zona.Pilha.shift();

        if (carta.Permanente === true) {
            // Permanentes vão para o Campo
            Zona.Campo.push(carta);
        } else {
            // Não-Permanentes: Exílio (se veio do cemitério e tem a regra) OU Cemitério
            if (carta.Origem === "Cemitério" && carta.ExilarAposConjurarDoCemiterio === true) {
                Zona.Exilio.push(carta);
            } else {
                Zona.Cemiterio.push(carta);
            }
        }
    }

    // Atualiza a interface gráfica do jogo
    renderizarCampo();
    renderizarCemiterio();
    atualizaTextoBotaoMao();
    atualizaTextoBotaoExilio();     
}

// Vincula o botão de Novo Turno
document.addEventListener('DOMContentLoaded', function() {
    const btnNewTurn = document.getElementById('btn-new-turn');
    if (btnNewTurn) {
        btnNewTurn.addEventListener('click', iniciarNovoTurno);
    }
});
// ==========================================
// FIM: RESOLUÇÃO DE NOVO TURNO E PILHA
// ==========================================

// ==========================================
// ATUALIZAÇÃO DOS BOTÕES DE ZONAS (EXÍLIO E MÃO)
// ==========================================
/**
 * Atualiza o badge sobreposto do botão do Exílio
 */
function atualizaTextoBotaoExilio() {
    const btnExilio = document.getElementById('btn-show-exile');
    if (!btnExilio) return;

    const total = Zona.Exilio ? Zona.Exilio.length : 0;
    
    // Reseta o estilo nativo do botão HTML
    Object.assign(btnExilio.style, {
        position: 'relative',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        padding: '0',
        cursor: 'pointer'
    });

    btnExilio.innerHTML = `
        <span class="btn-icon">🌌</span>
        <span class="overlay-text-btns">${total}</span>
    `;
}

/**
 * Atualiza o badge sobreposto do botão da Mão
 */
function atualizaTextoBotaoMao() {
    const btnMao = document.getElementById('btn-show-hand');
    if (!btnMao) return;

    const total = Zona.Mao ? Zona.Mao.length : 0;

    // Reseta o estilo nativo do botão HTML
    Object.assign(btnMao.style, {
        position: 'relative',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        padding: '0',
        cursor: 'pointer'
    });

    btnMao.innerHTML = `
        <span class="btn-icon">🖐️</span>
        <span class="overlay-text-btns">${total}</span>
    `;
}
// ==========================================
// FIM: ATUALIZAÇÃO DOS BOTÕES DE ZONAS (EXÍLIO E MÃO)
// ==========================================

// ==========================================
// AÇÃO DO BOTÃO DRAW (COMPRAR CARTA)
// ==========================================
function comprarCarta() {
    // 1. Verifica se há cartas disponíveis no Baralho
    if (!Zona.Baralho || Zona.Baralho.length === 0) {
        return;
    }

    // 2. Salva o estado atual para permitir Undo
    salvarEstado();

    // 3. Garante que a Zona.Mao esteja inicializada
    if (!Zona.Mao) {
        Zona.Mao = [];
    }

    // 4. Remove a carta do topo do Baralho (índice 0) e envia para a Mão
    const cartaComprada = Zona.Baralho.shift();
    Zona.Mao.push(cartaComprada);

    // Atualiza os contadores visuais
    atualizaTextoBotaoMao();
    atualizarContadorBaralho();
}

// Vincula o evento ao carregar o documento
document.addEventListener('DOMContentLoaded', function() {
    const btnDraw = document.getElementById('btn-draw');
    if (btnDraw) {
        btnDraw.addEventListener('click', comprarCarta);
    }
});
// ==========================================
// FIM: AÇÃO DO BOTÃO DRAW (COMPRAR CARTA)
// ==========================================


// ==========================================
// AÇÃO DO BOTÃO DE MÃO (DESCARTO DO TOPO)
// ==========================================
function descartarCartaDaMao() {
    // 1. Verifica se existem cartas na Mão
    if (!Zona.Mao || Zona.Mao.length === 0) {
        return;
    }

    // 2. Salva o estado atual antes da alteração para permitir Undo
    salvarEstado();

    // 3. Remove a carta do topo/fim do array da Mão (pop)
    const cartaRemovida = Zona.Mao.pop();

    // 4. Se NÃO for ficha, envia para o Cemitério
    if (cartaRemovida && cartaRemovida.Ficha !== true) {
        if (!Zona.Cemiterio) Zona.Cemiterio = [];
        Zona.Cemiterio.push(cartaRemovida);
    }

    // 5. Atualiza a interface gráfica e os contadores
    atualizaTextoBotaoMao();
    renderizarCemiterio();
}

// Vincula o evento ao carregar o DOM
document.addEventListener('DOMContentLoaded', function() {
    const btnShowHand = document.getElementById('btn-show-hand');
    if (btnShowHand) {
        btnShowHand.addEventListener('click', descartarCartaDaMao);
    }
});
// ==========================================
// FIM: AÇÃO DO BOTÃO DE MÃO (DESCARTO DO TOPO)
// ==========================================


// ==========================================
// AÇÃO DO BOTÃO BOARD WIPE (DESTRUIR TODAS AS CRIATURAS)
// ==========================================
function executarBoardWipe() {
    if (!Zona.Campo || Zona.Campo.length === 0) return;

    // 1. Filtra para saber se há pelo menos uma criatura em campo
    const possuiCriaturas = Zona.Campo.some(carta => carta.Criatura === true);
    if (!possuiCriaturas) return;

    // 2. Salva o estado atual antes do desastre para permitir Undo
    salvarEstado();

    if (!Zona.Cemiterio) Zona.Cemiterio = [];

    // 3. Separa o campo: o que é criatura vai pro cemitério/destruído, o que não é permanece
    const campoAtualizado = [];

    Zona.Campo.forEach(carta => {
        if (carta.Criatura === true) {
            // Se NÃO for ficha, envia para o cemitério
            if (carta.Ficha !== true) {
                Zona.Cemiterio.push(carta);
            }
            // Se for Ficha (Ficha === true), simplesmente ignora e não adiciona a lugar nenhum
        } else {
            // Não-criaturas continuam em Zona.Campo
            campoAtualizado.push(carta);
        }
    });

    // 4. Atualiza o array do campo apenas com as não-criaturas restantes
    Zona.Campo = campoAtualizado;

    // 5. Atualiza a interface gráfica do jogo
    renderizarCampo();
    renderizarCemiterio();
}

// Vincula o evento ao carregar o DOM
document.addEventListener('DOMContentLoaded', function() {
    const btnBoardWipe = document.getElementById('btn-board-wipe');
    if (btnBoardWipe) {
        btnBoardWipe.addEventListener('click', executarBoardWipe);
    }
});
// ==========================================
// FIM: AÇÃO DO BOTÃO BOARD WIPE (DESTRUIR TODAS AS CRIATURAS)
// ==========================================


/*
  responsável por renderizar a área de criação de fichas
*/
function renderizarBotoesFichas() {
    const containerFichas = document.getElementById('container-fichas');
    if (!containerFichas) return;

    // Limpa o container antes de renderizar
    containerFichas.innerHTML = '';

    // Verifica se a lista LinhaCriarFichas existe e possui itens
    if (!Array.isArray(LinhaCriarFichas) || LinhaCriarFichas.length === 0) {
        return;
    }

    LinhaCriarFichas.forEach((ficha, index) => {
        // Cria o botão da ficha
        const btnFicha = document.createElement('button');
        btnFicha.type = 'button';
        btnFicha.className = 'header-card-btn';

        // Cria a imagem da ficha
        const img = document.createElement('img');
        
        // Caminho fallback local (caso URL dê erro ou esteja sem internet)
        img.onerror = function() {
            const caminhoBase = (typeof parent.deckPath === 'function') ? parent.deckPath() : './decks/';
            if (ficha.Imagem) {
                this.src = caminhoBase + ficha.Imagem;
            }
            this.onerror = null; // Evita loop infinito caso a imagem local também falhe
        };

        // Prioriza a URL; se não existir, usa o caminho local direto
        const caminhoLocal = (typeof parent.deckPath === 'function') ? parent.deckPath() : './decks/';
        img.src = ficha.Url || (caminhoLocal + (ficha.Imagem || ''));
        img.alt = ficha.Nome || `Ficha ${index + 1}`;

        btnFicha.appendChild(img);

        // Ação de clique para criar a ficha no campo
        btnFicha.addEventListener('click', () => {
            criarFichaNoCampo(ficha);
        });

        containerFichas.appendChild(btnFicha);
    });
}

// Função auxiliar para adicionar a ficha criada à Zona.Campo
function criarFichaNoCampo(fichaDados) {
    if (typeof salvarEstado === 'function') salvarEstado();

    // Cria uma cópia do objeto ficha para evitar referências compartilhadas
    const novaFicha = {
        ...fichaDados,
        Ficha: true, // Marca explicitamente como Ficha/Token
        Permanente: true,
        Criatura: true,
        Contadores: 0
    };

    if (!Zona.Campo) Zona.Campo = [];
    Zona.Campo.push(novaFicha);

    // Atualiza a renderização do campo
    if (typeof renderizarCampo === 'function') {
        renderizarCampo();
    }
}
/*
  FIM: responsável por renderizar a área de criação de fichas
*/