/**
 * Horde Manager - MTG (home.js)
 * Script de gerenciamento da interface de configuração e sincronização com o Parent
 */

(function () {
    // Atalho seguro para acessar o escopo global do container principal (index.html)
    const raiz = window.parent;

    // Verificar se o container pai está acessível com as variáveis estruturadas
    if (!raiz || !raiz.Deck || !raiz.gameState) {
        console.error("Erro crítico: O container pai index.html ou suas variáveis globais não foram encontrados.");
        return;
    }

    /* ==========================================================================
       MAPEAMENTO DOS ELEMENTOS DO DOM
       ========================================================================== */
    const dom = {
        // Coluna da Esquerda
        btnAnterior: document.getElementById('btn-deck-anterior'),
        btnProximo: document.getElementById('btn-deck-proximo'),
        lblTitulo: document.getElementById('lbl-titulo'),
        lblCreditos: document.getElementById('lbl-creditos'),
        lblRegras: document.getElementById('lbl-regras'),
        btnIniciar: document.getElementById('btn-iniciar-partida'),

        // Coluna da Direita
        cmbPreset: document.getElementById('cmb-preset'),
        grupoVida: document.getElementById('grupo-vida'),
        grupoTamanho: document.getElementById('grupo-tamanho'),
        chkRegular: document.getElementById('chk-regular'),
        gbRegulagem: document.getElementById('gb-regulagem'),
        grupoIntensidade: document.getElementById('grupo-intensidade'),
        grupoCompras: document.getElementById('grupo-compras'),
        grupoMarcos: document.getElementById('grupo-marcos'),
        grupoMultiplicador: document.getElementById('grupo-multiplicador'),

        // Checkboxes de Regras Opcionais
        chkRegraVida: document.getElementById('chk-regra-vida'),
        chkRegraZona: document.getElementById('chk-regra-zona'),
        chkRegraCompra: document.getElementById('chk-regra-compra'),
        chkRegraInicial: document.getElementById('chk-regra-inicial'),
        chkRegraMarcos: document.getElementById('chk-regra-marcos'),

        // Modal de Ajuda
        modalAjuda: document.getElementById('ajuda-modal'),
        modalTexto: document.getElementById('ajuda-texto-recipiente'),
        btnFecharAjuda: document.getElementById('btn-fechar-ajuda'),
    };

    /* ==========================================================================
       FUNÇÕES DE RENDERIZAÇÃO E NAVEGAÇÃO DOS DECKS
       ========================================================================== */
    
    // Atualiza as informações textuais e a imagem de fundo baseada no deck atual
    function renderizarDeck() {
        const indexAtual = raiz.gameState.currentDeckIndex;
        const deckAtual = raiz.Deck[indexAtual];

        if (!deckAtual) return;

        dom.lblTitulo.innerText = deckAtual.Titulo || "Sem Título";
        dom.lblCreditos.innerText = deckAtual.Creditos || "Créditos não informados.";
        dom.lblRegras.innerText = deckAtual.RegrasEspeciais || "Nenhuma regra especial cadastrada.";

        // Modifica dinamicamente o background da janela inteira
        if (deckAtual.Imagem) {
            document.body.style.backgroundImage = `url('${parent.deckPath() + deckAtual.Imagem}')`;
        } else {
            document.body.style.backgroundImage = "none";
        }
    }

    // Passa para o próximo ou anterior deck da lista (Formato circular)
    function navegarDecks(direcao) {
        let novoIndex = raiz.gameState.currentDeckIndex + direcao;

        if (novoIndex < 0) {
            novoIndex = raiz.Deck.length - 1;
        } else if (novoIndex >= raiz.Deck.length) {
            novoIndex = 0;
        }

        raiz.gameState.currentDeckIndex = novoIndex;
        renderizarDeck();
    }

    /* ==========================================================================
       FUNÇÕES DE MANIPULAÇÃO DE SELEÇÃO ÚNICA E MÚLTIPLA
       ========================================================================== */

    /**
     * Gerencia a seleção de botões/tags de escolha única
     * @param {string} grupo - Identificador do grupo visual
     * @param {string} valor - Valor da opção selecionada
     */
    function setOpcaoUnica(grupo, valor) {
        let containerElement, chaveConfig;

        // Mapeia o grupo visual à chave correspondente dentro do Parent (gameState.config)
        switch (grupo) {
            case 'vida':
                containerElement = dom.grupoVida;
                chaveConfig = 'pontosVida';
                break;
            case 'tamanho':
                containerElement = dom.grupoTamanho;
                chaveConfig = 'tamanhoDeck';
                break;
            case 'intensidade':
                containerElement = dom.grupoIntensidade;
                chaveConfig = 'tipoDistribuicao';
                break;
            case 'compras':
                containerElement = dom.grupoCompras;
                chaveConfig = 'compraTurno';
                break;
            case 'multiplicador':
                containerElement = dom.grupoMultiplicador;
                chaveConfig = 'multiplicadorFichas';
                break;
            default:
                return;
        }

        // Salva a alteração diretamente no estado global
        raiz.gameState.config[chaveConfig] = valor;

        // Atualiza as classes CSS na interface do tablet
        containerElement.querySelectorAll('.tag-botao').forEach(btn => {
            if (btn.getAttribute('data-val') === valor) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Gerencia a escolha múltipla dos marcos de permanentes (Permite desmarcar todas)
     * @param {string} valor - Valor da tag clicada (Ex: "25%")
     */
    function toggleOpcaoMultipla(valor) {
        let arrayMarcos = raiz.gameState.config.marcosPermanente;
        const index = arrayMarcos.indexOf(valor);

        if (index > -1) {
            arrayMarcos.splice(index, 1); // Remove caso já estivesse marcado
        } else {
            arrayMarcos.push(valor); // Adiciona caso esteja desmarcado
        }

        // Atualiza o estado visual das tags dos marcos
        dom.grupoMarcos.querySelectorAll('.tag-botao').forEach(btn => {
            const btnVal = btn.getAttribute('data-val');
            btn.classList.toggle('active', arrayMarcos.includes(btnVal));
        });
    }

    // Exibe ou oculta a Groupbox Condicional baseado no Checkbox
    function alternarDistribucaoDinamica(marcado) {
        raiz.gameState.config.distribuirUniforme = marcado;
        dom.gbRegulagem.style.display = marcado ? 'flex' : 'none';
    }

    /* ==========================================================================
       PRESETS / CONFIGURAÇÃO RÁPIDA
       ========================================================================== */
    
    // Executa as configurações automáticas com base na quantidade de jogadores selecionada
    function aplicarPresetRapido(preset) {
        raiz.gameState.config.configRapida = preset;

        if (preset === "Selecione uma opção predefinida") return;

        if (preset === "1 Jogador") {
            setOpcaoUnica('vida', '20');
            setOpcaoUnica('tamanho', '50%');
        } else if (preset === "2 Jogadores") {
            setOpcaoUnica('vida', '40');
            setOpcaoUnica('tamanho', '100%');
        } else if (preset === "3 Jogadores") {
            setOpcaoUnica('vida', '60');
            setOpcaoUnica('tamanho', '100%');
        } else if (preset === "4 Jogadores") {
            setOpcaoUnica('vida', '80');
            setOpcaoUnica('tamanho', '200%');
        }
    }

    /* ==========================================================================
       JANELA SUSPENSA DE AJUDA REUTILIZÁVEL (MODAL/SHOWMODAL)
       ========================================================================== */

    /**
     * Função reutilizável solicitada para preencher a janela suspensa com o texto e exibi-la
     * @param {string} textoAjuda - Mensagem descritiva que será inserida no modal
     */
    function exibirJanelaAjuda(textoAjuda) {
        dom.modalTexto.innerText = textoAjuda;
        dom.modalAjuda.style.display = 'flex';
    }

    function fecharJanelaAjuda() {
        dom.modalAjuda.style.display = 'none';
    }

    /* ==========================================================================
       EVENT LISTENERS E VÍNCULOS DE CLIQUES
       ========================================================================== */
    function inicializarEventos() {
        
        // Cliques para Passar os Decks
        dom.btnAnterior.addEventListener('click', () => navegarDecks(-1));
        dom.btnProximo.addEventListener('click', () => navegarDecks(1));

        // Evento da Combobox de Configuração Rápida
        dom.cmbPreset.addEventListener('change', (e) => aplicarPresetRapido(e.target.value));

        // Cliques para Seleção Única (Tags de Toque)
        dom.grupoVida.addEventListener('click', (e) => {
            const btn = e.target.closest('.tag-botao');
            if (btn) setOpcaoUnica('vida', btn.getAttribute('data-val'));
        });

        dom.grupoTamanho.addEventListener('click', (e) => {
            const btn = e.target.closest('.tag-botao');
            if (btn) setOpcaoUnica('tamanho', btn.getAttribute('data-val'));
        });

        dom.grupoIntensidade.addEventListener('click', (e) => {
            const btn = e.target.closest('.tag-botao');
            if (btn) setOpcaoUnica('intensidade', btn.getAttribute('data-val'));
        });

        dom.grupoCompras.addEventListener('click', (e) => {
            const btn = e.target.closest('.tag-botao');
            if (btn) setOpcaoUnica('compras', btn.getAttribute('data-val'));
        });

        dom.grupoMultiplicador.addEventListener('click', (e) => {
            const btn = e.target.closest('.tag-botao');
            if (btn) setOpcaoUnica('multiplicador', btn.getAttribute('data-val'));
        });

        // Clique para Seleção Múltipla (Marcos)
        dom.grupoMarcos.addEventListener('click', (e) => {
            const btn = e.target.closest('.tag-botao');
            if (btn) toggleOpcaoMultipla(btn.getAttribute('data-val'));
        });

        // Escutador do Checkbox de Distribuição Uniforme
        dom.chkRegular.addEventListener('change', (e) => alternarDistribucaoDinamica(e.target.checked));

        // Escutadores das Checkboxes de Regras Opcionais
        dom.chkRegraVida.addEventListener('change', (e) => {
            raiz.gameState.config.regrasOpcionais.hordaVida = e.target.checked;
        });
        dom.chkRegraZona.addEventListener('change', (e) => {
            raiz.gameState.config.regrasOpcionais.permitirMudarZona = e.target.checked;
        });
        dom.chkRegraCompra.addEventListener('change', (e) => {
            raiz.gameState.config.regrasOpcionais.compraAlternativa = e.target.checked;
        });
        dom.chkRegraInicial.addEventListener('change', (e) => {
            raiz.gameState.config.regrasOpcionais.comecaPermanenteAleatoria = e.target.checked;
        });
        dom.chkRegraMarcos.addEventListener('change', (e) => {
            raiz.gameState.config.regrasOpcionais.marcosSecundarios = e.target.checked;
        });

        // Ouvinte de clique dinâmico para varrer todos os botões de ajuda "?" da página
        document.body.addEventListener('click', (e) => {
            const btnAjuda = e.target.closest('.btn-ajuda');
            if (btnAjuda) {
                // Recupera a string de ajuda configurada no atributo 'data-ajuda' do HTML
                const mensagem = btnAjuda.getAttribute('data-ajuda');
                exibirJanelaAjuda(mensagem);
            }
        });

        // Fechar Modal de Ajuda
        dom.btnFecharAjuda.addEventListener('click', fecharJanelaAjuda);

        // Ação do Botão Iniciar Partida
        dom.btnIniciar.addEventListener('click', () => {
            //const deckSelecionado = raiz.Deck[raiz.gameState.currentDeckIndex].Titulo;            
            //alert(`Preparando Horda...\nIniciando partida com o deck: ${deckSelecionado}`);

            //parent.DefinirDeckSelecionado(   raiz.Deck[raiz.gameState.currentDeckIndex] );
            //parent.DefinirConfigSelecionada( raiz.gameState.config );
            
            window.parent.document.getElementById('game-frame').src = 'board.html';
            
            // Console log para verificação do desenvolvedor durante os testes no navegador
            //console.log("Configurações Finais prontas no Parent:", raiz.gameState.config);
        });
    }

    /* ==========================================================================
       INICIALIZAÇÃO DA JANELA
       ========================================================================== */
    window.onload = function () {
        renderizarDeck();
        inicializarEventos();
    };

    // Disponibiliza a função de exibição do modal no escopo global da janela caso precise chamar diretamente por código no futuro
    window.abrirModalAjudaEstrategico = exibirJanelaAjuda;

})();


/* ==========================================================================
    ROTINA VISUAL DE EXIBIÇÃO DE CARTAS E SISTEMA DE NAVEGAÇÃO / ZOOM
    ========================================================================== */
const listaContainer = document.getElementById('visual-lista-container');
const listaConteudo = document.getElementById('visual-lista-conteudo');
const zoomModal = document.getElementById('zoom-carta-modal');
const zoomImg = document.getElementById('zoom-carta-img');

let cartasAtuaisFiltradas = []; // Cache plano de todas as cartas em exibição para o controle do Zoom
let indiceCartaZoom = 0;
let pressTimer = null;
let touchStartX = 0;


// Gera a lista visual categorizada com fallback de imagem offline
function abrirListaVisualCartas() {
    const deckAtual = parent.Deck[parent.gameState.currentDeckIndex];
    if (!deckAtual) return;

    listaConteudo.innerHTML = "";
    cartasAtuaisFiltradas = [];

    // 1. Filtragem por Categorias e Isolamento de Regras
    
    // Criaturas do Deck Principal (Criature = true e Ficha = false)
    const criaturas = deckAtual.Carta.filter(c => c.Criatura && !c.Ficha);
    
    // Artefatos e Encantamentos do Deck Principal (Removendo duplicadas com Criaturas já listadas)
    const criaturaIds = new Set(criaturas);
    const artefatosEncantamentos = deckAtual.Carta.filter(c => (c.Artefato || c.Encantamento) && !criaturaIds.has(c));

    // Fichas do Deck Principal (Ficha = true na variável Carta)
    const fichasDeck = deckAtual.Carta.filter(c => c.Ficha);

    // Outras cartas (Tudo o que sobrou na lista principal e que NÃO seja Criatura, Artefato, Encantamento ou Ficha)
    const jaListadas = new Set([...criaturas, ...artefatosEncantamentos, ...fichasDeck]);
    const outras = deckAtual.Carta.filter(c => !jaListadas.has(c));

    // Linha de Criação Externa (Vinda estritamente da variável 'Criar')
    const linhaCriar = deckAtual.Criar || [];

    // 2. Renderização das Seções na Tela (Na ordem lógica correta)
    renderizarSecao(`Criaturas (${criaturas.length})`, criaturas);
    renderizarSecao(`Artefatos e Encantamentos (${artefatosEncantamentos.length})`, artefatosEncantamentos);
    renderizarSecao(`Instantâneas, Feitiços e Outras (${outras.length})`, outras);
    renderizarSecao(`Fichas do Deck (${fichasDeck.length})`, fichasDeck);    
    renderizarSecao(`Linha de Criação de Fichas (${linhaCriar.length})`, linhaCriar);

    listaContainer.style.display = "flex";
}

function renderizarSecao(tituloTexto, arrayCartas) {
    if (arrayCartas.length === 0) return;

    const titulo = document.createElement('div');
    titulo.className = "categoria-titulo";
    titulo.innerText = tituloTexto;
    listaConteudo.appendChild(titulo);

    const grid = document.createElement('div');
    grid.className = "cartas-grid";

    arrayCartas.forEach(carta => {
        // Guarda a referência no cache sequencial do zoom
        cartasAtuaisFiltradas.push(carta);
        const globalIndex = cartasAtuaisFiltradas.length - 1;

        const box = document.createElement('div');
        box.className = "carta-item";

        const img = document.createElement('img');
        // Define o caminho alternativo offline (se a URL online falhar)
        const caminhoLocal = parent.deckPath() + carta.Imagem;
        img.src = carta.Url;
        img.onerror = function() {
            if (this.src !== caminhoLocal) this.src = caminhoLocal;
        };

        // Eventos de Pressionar por muito tempo (Long Press) adaptados para o tablet
        box.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                abrirZoomCarta(globalIndex);
            }, 600); // 600ms segurando abre o zoom
        });

        box.addEventListener('touchend', () => clearTimeout(pressTimer));
        box.addEventListener('touchmove', () => clearTimeout(pressTimer));
        
        // Suporte para testes com o mouse no computador
        box.addEventListener('mousedown', () => {
            pressTimer = setTimeout(() => abrirZoomCarta(globalIndex), 600);
        });
        box.addEventListener('mouseup', () => clearTimeout(pressTimer));
        box.addEventListener('mouseleave', () => clearTimeout(pressTimer));

        box.appendChild(img);
        grid.appendChild(box);
    });

    listaConteudo.appendChild(grid);
}

/* LÓGICA DE NAVEGAÇÃO DO ZOOM (SWIPE / ARRUSTAR) */
function abrirZoomCarta(index) {
    indiceCartaZoom = index;
    atualizarImagemZoom();
    zoomModal.style.display = "flex";
}

function atualizarImagemZoom() {
    const carta = cartasAtuaisFiltradas[indiceCartaZoom];
    if (!carta) return;

    const caminhoLocal = parent.deckPath() + carta.Imagem;
    zoomImg.src = carta.Url;
    zoomImg.onerror = function() {
        if (this.src !== caminhoLocal) this.src = caminhoLocal;
    };
}

/* ==========================================================================
    EVENTOS UNIFICADOS DO MODAL DE ZOOM 
    ========================================================================== */

const carrosselModal = document.getElementById('carrossel-modal');
const carrosselLinha = document.getElementById('carrossel-linha');
const btnFecharCarrossel = document.getElementById('btn-fechar-carrossel');

function renderizarSecao(tituloTexto, arrayCartas) {
    if (arrayCartas.length === 0) return;
    
    const titulo = document.createElement('div');
    titulo.className = "categoria-titulo";
    titulo.innerText = tituloTexto;
    listaConteudo.appendChild(titulo);
    
    const grid = document.createElement('div');
    grid.className = "cartas-grid";
    arrayCartas.forEach(carta => {
        cartasAtuaisFiltradas.push(carta);
        const globalIndex = cartasAtuaisFiltradas.length - 1;
        
        const box = document.createElement('div');
        box.className = "carta-item";
        const img = document.createElement('img');
        const caminhoLocal = parent.deckPath() + carta.Imagem;
        img.src = carta.Url;
        
        img.onerror = function() {
            if (this.src !== caminhoLocal) this.src = caminhoLocal;
        };
        img.addEventListener('click', () => {
            abrirCarrosselNoIndex(globalIndex);
        });
        
        box.appendChild(img);
        grid.appendChild(box);
    });
    
    listaConteudo.appendChild(grid);
}

function abrirCarrosselNoIndex(indexInicial) {
    // 1. Limpa qualquer conteúdo residual anterior
    carrosselLinha.innerHTML = "";

    // 2. Monta dinamicamente a estrutura das cartas lado a lado
    cartasAtuaisFiltradas.forEach((carta) => {
        const itemBox = document.createElement('div');
        itemBox.className = "carrossel-item";

        const img = document.createElement('img');
        const caminhoLocal = parent.deckPath() + carta.Imagem;
        img.src = carta.Url;
        
        // Fallback caso a imagem online falhe no carregamento do tablet
        img.onerror = function() {
            if (this.src !== caminhoLocal) this.src = caminhoLocal;
        };

        itemBox.appendChild(img);
        carrosselLinha.appendChild(itemBox);
    });

    // 3. Exibe o modal na tela
    carrosselModal.style.display = "flex";

    // 4. Cálculo matemático para mover o scroll exatamente para a carta clicada
    // Largura de cada carta (524px) + margens se houver.
    //const larguraCard = 524; 
    //carrosselLinha.scrollLeft = indexInicial * larguraCard;
    const itemElement = carrosselLinha.querySelector('.carrossel-item');
    const larguraCard = itemElement ? itemElement.getBoundingClientRect().width : 0;
    const espacoGap = 40;         
    carrosselLinha.scrollLeft = indexInicial * (larguraCard + espacoGap);
}

function fecharCarrossel() {
    // Esconde o modal alterando o display para none
    carrosselModal.style.display = "none";
    
    // Limpa a linha interna para não acumular elementos HTML duplicados na próxima abertura
    carrosselLinha.innerHTML = "";
}

document.getElementById('btn-fechar-carrossel').addEventListener('click', fecharCarrossel);

/* ==========================================================================
    FIM: EVENTOS UNIFICADOS DO MODAL DE ZOOM 
    ========================================================================== */

/* ==========================================================================
    VÍNCULOS DE ATIVAÇÃO DOS BOTÕES DA LISTA VISUAL
   ========================================================================== */
// Ativa novamente o link para abrir a lista de cartas
document.getElementById('btn-ver-lista').addEventListener('click', abrirListaVisualCartas);

// Ativa o botão "Voltar" para fechar a tela cheia da lista
document.getElementById('btn-fechar-visual-lista').addEventListener('click', () => {
    listaContainer.style.display = "none";
});
/* ==========================================================================
    FIM: VÍNCULOS DE ATIVAÇÃO DOS BOTÕES DA LISTA VISUAL
   ========================================================================== */