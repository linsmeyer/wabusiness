document.addEventListener('DOMContentLoaded', () => {

    const boardContainer = document.getElementById('kanban-board');
    const csvFileInput = document.getElementById('csv-file-input');
    const searchInput = document.getElementById('kanban-search');
    const KANBAN_STATE_KEY = 'kanban-board-state';
    const cancelEditColumnBtn = document.getElementById('cancel-edit-column-btn');
    const colorPalette = document.getElementById('color-palette');


    const editVariablesModal = document.getElementById('edit-variables-modal');
    const editVariablesForm = document.getElementById('edit-variables-form');
    const cancelEditVariablesBtn = document.getElementById('cancel-edit-variables-btn');

    const addColumnBtn = document.getElementById('add-column-btn');
    const editColumnModal = document.getElementById('edit-column-modal');
    const editColumnForm = document.getElementById('edit-column-form');


    // --- Paleta de Cores e Configuração ---
    const PALETTE = [
        // [cor do header, cor do fundo da lista]
        ['bg-gray-300', 'bg-gray-200'], ['dark:bg-gray-700', 'dark:bg-gray-800'],
        ['bg-red-400', 'bg-red-100'], ['dark:bg-red-800', 'dark:bg-red-900'],
        ['bg-yellow-400', 'bg-yellow-100'], ['dark:bg-yellow-800', 'dark:bg-yellow-900'],
        ['bg-green-400', 'bg-green-100'], ['dark:bg-green-800', 'dark:bg-green-900'],
        ['bg-blue-400', 'bg-blue-100'], ['dark:bg-blue-800', 'dark:bg-blue-900'],
        ['bg-purple-400', 'bg-purple-100'], ['dark:bg-purple-800', 'dark:bg-purple-900'],
    ];

    // ... (estado global boardState)
    let boardState = {
        columns: []
    };

    const progressModal = document.getElementById('progress-modal');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressStatus = document.getElementById('progress-status');
    const cancelSendBtn = document.getElementById('cancel-send-btn');
    // ... (outros elementos)

    // --- Estado Global ---
    let isSendingActive = false; // Flag para controlar o processo de envio


    async function startSendingProcess(columnId) {
        const column = boardState.columns.find(c => c.id === columnId);
        if (!column) return;

        const cardsToSend = column.cards.filter(card => !card.processed);
        if (cardsToSend.length === 0) {
            alert("Todos os contatos nesta coluna já foram processados.");
            return;
        }

        isSendingActive = true;
        let processedCount = 0;
        const totalToSend = cardsToSend.length;

        // Abre e configura o modal de progresso
        progressModal.classList.remove('hidden');
        progressText.textContent = `0 / ${totalToSend}`;
        progressBar.style.width = '0%';
        progressStatus.textContent = `Preparando para enviar...`;

        // Loop de envio
        for (const card of cardsToSend) {
            // Se o usuário cancelou, para o loop
            if (!isSendingActive) {
                progressStatus.textContent = 'Envio cancelado pelo usuário.';
                break;
            }

            progressStatus.textContent = `Enviando para ${card.nome || card.telefone}...`;

            try {
                const response = await fetch('/api/kanban/send-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(card.data)
                });
                
                if (response.ok) {
                    processedCount++;
                    // Marca o card como processado no estado
                    card.processed = true;
                    // Atualiza a UI
                    progressText.textContent = `${processedCount} / ${totalToSend}`;
                    const percentage = (processedCount / totalToSend) * 100;
                    progressBar.style.width = `${percentage}%`;
                    
                    // Atualiza visualmente o card na lista (muda a cor do ícone)
                    const cardEl = document.querySelector(`[data-card-id="${card.id}"]`);
                    if (cardEl) {
                        cardEl.querySelector('[data-action="show-card-info"]')?.classList.add('text-green-500');
                    }
                } else {
                     progressStatus.textContent = `Erro ao enviar para ${card.telefone}. Pulando...`;
                }
            } catch (error) {
                console.error("Erro de rede:", error);
                progressStatus.textContent = `Erro de rede. Verifique a conexão.`;
            }
        }

        if (isSendingActive) {
            progressStatus.textContent = 'Envio concluído!';
        }
        
        saveState(); // Salva o estado final com os cards marcados como processados
        isSendingActive = false;
        
        // Mantém o modal aberto por alguns segundos para o usuário ver o resultado final
        setTimeout(() => {
            progressModal.classList.add('hidden');
        }, 2000);
    }


    // --- Funções de Estado e Persistência ---

    function saveState() {
        localStorage.setItem(KANBAN_STATE_KEY, JSON.stringify(boardState));
    }

    function loadState() {
        const savedState = localStorage.getItem(KANBAN_STATE_KEY);
        if (savedState) {
            boardState = JSON.parse(savedState);
        } else {
            // Estado inicial se não houver nada salvo
            boardState = {
                columns: [
                    { id: `col-${Date.now()}`, title: "Remarcação", cards: [] },
                    { id: `col-${Date.now()+1}`, title: "Vencimento", cards: [] },
                    { id: `col-${Date.now()+2}`, title: "Cobrança", cards: [] },,
                    { id: `col-${Date.now()+3}`, title: "Confirmação", cards: [] },
                ]
            };
        }
    }

    // --- Funções de Renderização ---

    function renderBoard() {
        boardContainer.innerHTML = '';
        boardState.columns.forEach(column => {
            const columnEl = createColumnElement(column);
            boardContainer.appendChild(columnEl);
        });
        initializeDragAndDrop();
    }

    function createColumnElement(column) {
        const columnEl = document.createElement('div');

        // Define as cores padrão (cinza) se nenhuma cor estiver definida para a coluna
        const defaultLightColors = ['bg-gray-300', 'bg-gray-200'];
        const defaultDarkColors = ['dark:bg-gray-700', 'dark:bg-gray-800'];

        // Pega a cor salva ou usa a padrão
        const [headerColor, listColor] = column.color || defaultLightColors;
        // Encontra o par correspondente para o modo escuro na paleta
        const paletteIndex = PALETTE.findIndex(p => p[0] === headerColor);
        const [darkHeaderColor, darkListColor] = (paletteIndex !== -1 && PALETTE[paletteIndex + 1]) 
            ? [PALETTE[paletteIndex + 1][0], PALETTE[paletteIndex + 1][1]] 
            : defaultDarkColors;


        columnEl.className = `kanban-column`;
        columnEl.dataset.columnId = column.id;
            
        // A estrutura do cabeçalho agora inclui o ícone de arrastar
        columnEl.innerHTML = `
            <div class="kanban-column-header p-3 font-semibold border-b border-black/10 dark:border-white/10 ${headerColor} ${darkHeaderColor}">
                <!-- NOVO: Ícone de Arrastar (handle) -->
                <div class="drag-handle cursor-move text-gray-400 mr-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </div>

                <span class="flex-grow">${column.title}</span>
                <div class="relative">
                    <button class="column-options-btn" data-action="toggle-column-menu">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
                    </button>
                    <div class="column-dropdown-menu hidden" data-role="column-menu">
                        <button class="column-dropdown-item" data-action="edit-variables">Editar variáveis</button>
                        <button class="column-dropdown-item" data-action="load-contacts-csv">Carregar contatos</button>
                        <button class="column-dropdown-item" data-action="edit-column-name">Editar nome</button>
                        <button class="column-dropdown-item" data-action="remove-column">Remover coluna</button>
                        <button class="column-dropdown-item" data-action="send-column-messages">Enviar mensagem</button>
                    </div>
                </div>
            </div>
            <div class="kanban-card-list custom-scrollbar p-2 flex-grow overflow-y-auto ${listColor} ${darkListColor}"></div>
        `;

        const cardListEl = columnEl.querySelector('.kanban-card-list');
        column.cards.forEach(card => {
            const cardEl = createCardElement(card);
            cardListEl.appendChild(cardEl);
        });

        return columnEl;
    }

    function removeColumn(columnId) {
        if (!confirm("Tem certeza que deseja remover esta coluna? Os cards nela serão perdidos.")) {
            return;
        }
        boardState.columns = boardState.columns.filter(column => column.id !== columnId);
        saveState();
        renderBoard();
    }

    function toggleColumnMenu(button) {
        // Encontra o menu relativo ao botão clicado
        const menu = button.nextElementSibling;
        const isHidden = menu.classList.contains('hidden');

        // Fecha todos os outros menus primeiro para garantir que apenas um esteja aberto
        document.querySelectorAll('.column-dropdown-menu').forEach(m => m.classList.add('hidden'));

        // Se o menu estava escondido, mostra-o. Se estava visível, ele já foi fechado pela linha acima.
        if (isHidden) {
            menu.classList.remove('hidden');
        }
    }

    // funçãp para remover um card
    function removeCard(cardId, columnId) {
        const column = boardState.columns.find(c => c.id === columnId);
        if (!column) return;

        // Filtra o card para fora do array de cards da coluna
        column.cards = column.cards.filter(card => card.id !== cardId);

        saveState();
        renderBoard(); // Re-renderiza para remover o card da UI
    }
    
    // funçãp para o botão de teste
    function showCardInfo(cardId, columnId) {
        
        const column = boardState.columns.find(c => c.id === columnId);
        if (!column) return;
        const card = column.cards.find(c => c.id === cardId);
        if (!card) return;

        // Monta uma string com todos os dados do card para o alert
        let cardDetails = Object.entries(card.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
        
        // Adiciona o status de processamento
        if (card.processed) {
            cardDetails += '\n\nStatus: Processado';
        }

        alert(`Informações do Card:\n\n${cardDetails}`);
    }

    function createCardElement(card) {
        const cardEl = document.createElement('div');

        // Verifica se o card já foi processado para mudar a cor do ícone
        const infoIconColor = card.processed ? 'text-green-500' : 'text-gray-400';

        // Adicionamos a classe 'group' para que o CSS ':hover' funcione nos filhos
        cardEl.className = 'kanban-card group'; 
        cardEl.dataset.cardId = card.id;

        // Estrutura HTML do card agora inclui a barra de ações
        cardEl.innerHTML = `
            <!-- Conteúdo principal do card -->
            <div class="card-content">
                <div class="flex items-center min-w-0">
                    <div class="w-10 h-10 bg-gray-400 rounded-full mr-3 flex-shrink-0"></div>
                    <div class="flex-grow overflow-hidden">
                        <h3 class="font-semibold truncate text-sm text-gray-800 dark:text-gray-200">${card.nome || card.telefone}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${card.telefone}</p>
                    </div>
                </div>
            </div>

            <!-- NOVO: Barra de Ações (Tool Action) no Rodapé -->
            <div class="card-tool-action">
                <button class="card-action-btn ${infoIconColor}" title="Informações" data-action="show-card-info">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </button>
                <button class="card-action-btn delete" title="Remover Card" data-action="remove-card">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `;
        return cardEl;
    }

    // FUNÇÃO processCsvFile

    function processCsvFile(file, targetColumnId) {
        if (!file) return;

        const targetColumn = boardState.columns.find(c => c.id === targetColumnId);
        if (!targetColumn) return;

        // 1. Cria um Set com todos os telefones que já existem APENAS na coluna de destino.
        const existingPhonesInColumn = new Set(targetColumn.cards.map(card => card.telefone));

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                alert("Arquivo CSV está vazio ou contém apenas o cabeçalho.");
                return;
            }

            const fileHeaders = lines[0].split(',').map(h => h.trim());
            const customHeaders = targetColumn.csvHeaders;
            const headersToUse = customHeaders ? customHeaders.split(',').map(h => h.trim()) : fileHeaders;
            
            if (customHeaders && fileHeaders.length !== headersToUse.length) {
                alert(`Erro: O arquivo CSV tem ${fileHeaders.length} colunas, mas você definiu ${headersToUse.length} variáveis.`);
                return;
            }
            
            if (headersToUse[0].toLowerCase() !== 'telefone') {
                alert("Erro: A primeira variável (cabeçalho) definida para esta coluna deve ser 'telefone'.");
                return;
            }
            
            const newCards = [];
            let skippedCount = 0;
            // Use um Set para desduplicar contatos DENTRO do próprio arquivo CSV
            const phonesInThisFile = new Set();

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const rowData = {};

                headersToUse.forEach((header, index) => {
                    rowData[header] = values[index] ? values[index].trim() : '';
                });

                const phone = rowData.telefone;

                // 2. Validação de Duplicatas:
                // O telefone é válido se:
                // a) Ele existe.
                // b) Ele NÃO existe na coluna de destino.
                // c) Ele ainda não foi adicionado a partir deste mesmo arquivo.
                if (phone && !existingPhonesInColumn.has(phone) && !phonesInThisFile.has(phone)) {
                    const newCard = {
                        id: `card-${phone}-${Math.random().toString(36).substr(2, 9)}`,
                        telefone: phone,
                        nome: rowData['1'] || phone,
                        data: rowData
                    };
                    newCards.push(newCard);
                    // Adiciona ao Set local para evitar duplicatas do mesmo arquivo.
                    phonesInThisFile.add(phone);
                } else {
                    skippedCount++;
                }
            }

            if (newCards.length > 0) {
                targetColumn.cards.push(...newCards);
                saveState();
                renderBoard();
            }

            let message = `${newCards.length} novo(s) contato(s) carregado(s) com sucesso na coluna "${targetColumn.title}"!`;
            if (skippedCount > 0) {
                message += `\n${skippedCount} contato(s) foram ignorados por serem duplicados no arquivo ou já existirem nesta coluna.`;
            }
            alert(message);
        };

        reader.readAsText(file);
    }

    
    // NOVAS FUNÇÕES para o modal de variáveis
    function openEditVariablesModal(columnId) {
        const column = boardState.columns.find(c => c.id === columnId);
        if (!column) return;
        
        editVariablesForm.querySelector('#edit-variables-column-id').value = column.id;
        // Preenche com as variáveis salvas ou com o padrão
        editVariablesForm.querySelector('#variables-textarea').value = column.csvHeaders || 'telefone,1,2,3,4';
        
        editVariablesModal.classList.remove('hidden');
    }

    function closeEditVariablesModal() {
        editVariablesModal.classList.add('hidden');
    }

        
    // Função openEditModal MODIFICADA para lidar com criação e edição
    function openEditModal(columnId = null) { // Agora aceita um columnId nulo para criar
        const form = editColumnForm;
        // const modal = modalAddColumn;
        form.reset();
        
        // Remove a seleção de cor anterior
        colorPalette.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('selected'));

        if (columnId) {
            // MODO DE EDIÇÃO
            const column = boardState.columns.find(c => c.id === columnId);
            if (!column) return;
            
            form.querySelector('#modal-title').textContent = 'Editar Coluna';
            form.querySelector('#edit-column-id').value = column.id;
            form.querySelector('#edit-column-name').value = column.title;
            
            // Marca a cor atual como selecionada, se existir
            if (column.color) {
                const colorIndex = PALETTE.findIndex(p => p[0] === column.color[0]);
                const swatch = colorPalette.querySelector(`[data-color-index="${colorIndex}"]`);
                if (swatch) swatch.classList.add('selected');
            }

        } else {
            // MODO DE CRIAÇÃO
            form.querySelector('#modal-title').textContent = 'Adicionar Nova Coluna';
            form.querySelector('#edit-column-id').value = ''; // Garante que o ID esteja vazio
            form.querySelector('#edit-column-name').value = ''; // Limpa o nome
        }
        
        editColumnModal.classList.remove('hidden');
    }

    function closeEditModal() {
        editColumnModal.classList.add('hidden');
    }

    function initializeDragAndDrop() {
        
        // --- 1. Lógica para arrastar COLUNAS ---
        new Sortable(boardContainer, {
            group: 'kanban-columns',
            animation: 150,
            handle: '.drag-handle', // Define que o arraste só começa ao segurar este elemento
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                // Pega a coluna movida
                const movedColumn = boardState.columns.splice(evt.oldIndex, 1)[0];
                // Insere na nova posição
                boardState.columns.splice(evt.newIndex, 0, movedColumn);
                // Salva a nova ordem das colunas
                saveState();
            }
        });


        // --- 2. Lógica para arrastar CARDS (inalterada, mas agora dentro desta função) ---
        const cardLists = boardContainer.querySelectorAll('.kanban-card-list');
        cardLists.forEach(list => {
            new Sortable(list, {
                group: 'kanban-cards', // Mesmo grupo para permitir mover cards entre colunas
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const cardId = evt.item.dataset.cardId;
                    const fromColumnId = evt.from.closest('.kanban-column').dataset.columnId;
                    const toColumnId = evt.to.closest('.kanban-column').dataset.columnId;
                    
                    const fromColumn = boardState.columns.find(c => c.id === fromColumnId);
                    const cardIndex = fromColumn.cards.findIndex(c => c.id === cardId);
                    const [movedCard] = fromColumn.cards.splice(cardIndex, 1);

                    const toColumn = boardState.columns.find(c => c.id === toColumnId);
                    toColumn.cards.splice(evt.newDraggableIndex, 0, movedCard);
                    
                    saveState();
                }
            });
        });
    }

    // --- Inicialização ---
    // A função initializeBoard precisa renderizar a paleta uma vez na carga
    async function initializeBoard() {
        // Renderiza a paleta de cores no modal uma vez
        PALETTE.forEach((colorPair, index) => {
            if(index % 2 === 0) { // Apenas cores do modo claro
                const swatch = document.createElement('button');
                swatch.type = 'button';
                swatch.className = `color-swatch ${colorPair[0]} dark:${PALETTE[index+1][0]}`;
                swatch.dataset.colorIndex = index;
                colorPalette.appendChild(swatch);
            }
        });
        
        loadState();
        
        if (boardState.columns.length > 0 && boardState.columns[0].cards.length === 0) {
            try {
                const response = await fetch('/api/kanban-leads');
                const leads = await response.json();
                boardState.columns[0].cards = leads;
                saveState();
            } catch (error) {
                console.error("Erro ao carregar leads iniciais:", error);
            }
        }
        
        renderBoard();
    }

    // --- Inicialização e Anexação de Listeners ---

    // Listener para o botão de cancelar no modal de progresso
    cancelSendBtn.addEventListener('click', () => {
        isSendingActive = false;
    });

    // Adiciona delegação de eventos ao container do quadro Kanban
    boardContainer.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        e.stopPropagation();
        
        const action = target.dataset.action;
        const columnId = target.closest('.kanban-column').dataset.columnId;
        const columnEl = target.closest('.kanban-column');
        const cardEl = target.closest('.kanban-card');

        if (action === 'toggle-column-menu') {
            toggleColumnMenu(target);
        }
        
        if (action === 'remove-column') {
            removeColumn(columnId);
        }

        // NOVO CASE para a ação de carregar CSV
        if (action === 'load-contacts-csv') {
            // Guarda o ID da coluna de destino no input e o aciona
            csvFileInput.dataset.targetColumnId = columnId;
            csvFileInput.click();
            // Fecha o menu
            document.querySelectorAll('.column-dropdown-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
        }

        // Ações de Card
        if (cardEl) {
            const cardId = cardEl.dataset.cardId;
            const columnId = columnEl.dataset.columnId;

            if (action === 'remove-card') {
                removeCard(cardId, columnId);
            }
            if (action === 'show-card-info') {
                showCardInfo(cardId, columnId);
            }
        }

        // Ações de edição de coluna
        if (action === 'edit-column-name') {
            // Chama a mesma função de modal, mas passando o ID para editar
            openEditModal(columnId);
            document.querySelectorAll('.column-dropdown-menu').forEach(menu => menu.classList.add('hidden'));
        }

        // NOVO CASE para a ação de editar variáveis
        if (action === 'edit-variables') {
            openEditVariablesModal(columnId);
            document.querySelectorAll('.column-dropdown-menu').forEach(menu => menu.classList.add('hidden'));
        }

        // NOVO CASE para a ação de enviar mensagens
        if (action === 'send-column-messages') {
            startSendingProcess(columnId);
            document.querySelectorAll('.column-dropdown-menu').forEach(menu => menu.classList.add('hidden'));
        }
    });

    // Listener global para fechar os menus ao clicar fora deles
    document.addEventListener('click', (e) => {
        // Se o clique não foi em um botão que abre um menu
        if (!e.target.closest('[data-action="toggle-column-menu"]')) {
            document.querySelectorAll('.column-dropdown-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
        }
    });


    // Listener para o novo formulário
    editVariablesForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const columnId = e.target.querySelector('#edit-variables-column-id').value;
        const headersText = e.target.querySelector('#variables-textarea').value.trim();
        
        const headers = headersText.split(',').map(h => h.trim());

        // Validação dos cabeçalhos customizados
        if (headers[0].toLowerCase() !== 'telefone') {
            alert("Erro: O primeiro campo deve ser 'telefone'.");
            return;
        }
        for (let i = 1; i < headers.length; i++) {
            if (isNaN(parseInt(headers[i], 10))) {
                alert(`Erro: O campo '${headers[i]}' não é um número inteiro. Apenas o primeiro campo pode ser texto ('telefone').`);
                return;
            }
        }

        const column = boardState.columns.find(c => c.id === columnId);
        if (column) {
            column.csvHeaders = headersText; // Salva o string de cabeçalhos no estado
        }
        
        saveState();
        closeEditVariablesModal();
        alert("Variáveis de importação salvas com sucesso!");
    });

    cancelEditVariablesBtn.addEventListener('click', closeEditVariablesModal);


    // Listener do formulário de edição MODIFICADO para lidar com criação e edição
    editColumnForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const columnId = e.target.querySelector('#edit-column-id').value;
        const newTitle = e.target.querySelector('#edit-column-name').value.trim();
        const selectedSwatch = e.target.querySelector('.color-swatch.selected');
        
        if (!newTitle) {
            alert("O nome da coluna não pode ser vazio.");
            return;
        }

        let selectedColor = null;
        if (selectedSwatch) {
            const colorIndex = parseInt(selectedSwatch.dataset.colorIndex);
            selectedColor = PALETTE[colorIndex];
        }

        if (columnId) {
            // Atualiza uma coluna existente
            const column = boardState.columns.find(c => c.id === columnId);
            if (column) {
                column.title = newTitle;
                column.color = selectedColor;
            }
        } else {
            // Cria uma nova coluna
            boardState.columns.push({
                id: `col-${Date.now()}`,
                title: newTitle,
                cards: [],
                color: selectedColor, // Salva a cor selecionada
                csvHeaders: 'telefone,1,2,3,4' // Define um padrão de variáveis
            });
        }

        saveState();
        renderBoard();
        closeEditModal();
    });

    // Listener para seleção de cor na paleta
    colorPalette.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-swatch')) {
            // Remove a seleção de qualquer outra cor
            colorPalette.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('selected'));
            // Adiciona a seleção à cor clicada
            e.target.classList.add('selected');
        }
    });

    cancelEditColumnBtn.addEventListener('click', closeEditModal);

    // Listener para o input de arquivo oculto
    csvFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const targetColumnId = csvFileInput.dataset.targetColumnId; // Pega o ID da coluna que acionou
        if (file && targetColumnId) {
            processCsvFile(file, targetColumnId);
        }
        // Reseta o input para permitir selecionar o mesmo arquivo novamente
        event.target.value = '';
    });

    addColumnBtn.addEventListener('click', () => {
        // Simplesmente abre o modal em modo de criação (sem passar um ID)
        openEditModal();
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.kanban-card').forEach(card => {
            const cardText = card.textContent.toLowerCase();
            card.style.display = cardText.includes(query) ? '' : 'none';
        });
    });

    initializeBoard();

});