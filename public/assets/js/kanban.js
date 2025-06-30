document.addEventListener('DOMContentLoaded', () => {

    const boardContainer = document.getElementById('kanban-board');
    const csvFileInput = document.getElementById('csv-file-input');
    const addColumnBtn = document.getElementById('add-column-btn');
    const searchInput = document.getElementById('kanban-search');
    const KANBAN_STATE_KEY = 'kanban-board-state';

    // --- Seleção de Elementos ---
    const editColumnModal = document.getElementById('edit-column-modal');
    const editColumnForm = document.getElementById('edit-column-form');
    const cancelEditColumnBtn = document.getElementById('cancel-edit-column-btn');
    const colorPalette = document.getElementById('color-palette');

    // ... (estado global boardState)

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


    let boardState = {
        columns: []
    };

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
                    { id: `col-${Date.now()+1}`, title: "Lembrete Vencimento", cards: [] },
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

        // Define as classes de cor com base no estado salvo
        const [headerColor, listColor] = column.color || [PALETTE[0][0], PALETTE[0][1]];
        const [darkHeaderColor, darkListColor] = column.color ? [PALETTE[PALETTE.indexOf(column.color)+1][0], PALETTE[PALETTE.indexOf(column.color)+1][1]] : [PALETTE[1][0], PALETTE[1][1]];
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
                        <button class="column-dropdown-item" data-action="load-contacts-csv">Carregar contatos</button>
                        <button class="column-dropdown-item" data-action="edit-column-name">Editar nome</button>
                        <button class="column-dropdown-item" data-action="remove-column">Remover coluna</button>
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

    function editColumnName(columnId) {
        const columnToEdit = boardState.columns.find(column => column.id === columnId);
        if (!columnToEdit) return;

        // Pede o novo nome ao usuário usando um prompt
        const newTitle = prompt("Digite o novo nome para a coluna:", columnToEdit.title);

        // Se o usuário digitou um nome e não clicou em "Cancelar"
        if (newTitle && newTitle.trim() !== "") {
            columnToEdit.title = newTitle.trim();
            saveState();
            renderBoard(); // Re-renderiza o quadro para mostrar o novo título
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
        const cardDetails = Object.entries(card.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
            
        alert(`Informações do Card:\n\n${cardDetails}`);
    }

    // --- Inicialização e Anexação de Listeners ---

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
            openEditModal(columnId);
            // Fecha o menu dropdown
            document.querySelectorAll('.column-dropdown-menu').forEach(menu => {
                menu.classList.add('hidden');
            });
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

    function createCardElement(card) {
        const cardEl = document.createElement('div');
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
                <button class="card-action-btn" title="Informações" data-action="show-card-info">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </button>
                <button class="card-action-btn delete" title="Remover Card" data-action="remove-card">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `;
        return cardEl;
    }

    // --- Lógica Principal ---

    function initializeDragAndDrop() {
        const cardLists = boardContainer.querySelectorAll('.kanban-card-list');
        cardLists.forEach(list => {
            new Sortable(list, {
                group: 'kanban-cards',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: (evt) => {
                    const cardId = evt.item.dataset.cardId;
                    const fromColumnId = evt.from.closest('.kanban-column').dataset.columnId;
                    const toColumnId = evt.to.closest('.kanban-column').dataset.columnId;
                    
                    // Encontra a coluna de origem e o card
                    const fromColumn = boardState.columns.find(c => c.id === fromColumnId);
                    const cardIndex = fromColumn.cards.findIndex(c => c.id === cardId);
                    const [movedCard] = fromColumn.cards.splice(cardIndex, 1);

                    // Adiciona o card à nova coluna na posição correta
                    const toColumn = boardState.columns.find(c => c.id === toColumnId);
                    toColumn.cards.splice(evt.newDraggableIndex, 0, movedCard);
                    
                    saveState();
                }
            });
        });
    }

    async function initializeBoard() {
        loadState();
        
        // Se a primeira coluna estiver vazia, busca os leads
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

        
    
    // funçãp para processar o arquivo CSV
    function processCsvFile(file, targetColumnId) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r\n|\n/);
            const headers = lines[0].split(',').map(h => h.trim());

            // Validação: verifica se a primeira coluna é 'telefone'
            if (headers[0].toLowerCase() !== 'telefone') {
                alert("Erro: O arquivo CSV deve ter 'telefone' como a primeira coluna.");
                return;
            }

            const newCards = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i]) continue; // Ignora linhas vazias

                const values = lines[i].split(',');
                const rowData = {};
                headers.forEach((header, index) => {
                    rowData[header] = values[index] ? values[index].trim() : '';
                });
                
                // Cria um novo card com os dados mapeados
                const newCard = {
                    id: `card-${rowData.telefone}-${Math.random().toString(36).substr(2, 9)}`,
                    telefone: rowData.telefone,
                    // O nome do card será a coluna '1' (antigo 'nome'), se existir.
                    nome: rowData['1'] || rowData.telefone, 
                    // Armazena todos os outros dados para referência futura, se necessário
                    data: rowData
                };
                newCards.push(newCard);
            }

            // Adiciona os novos cards à coluna de destino no estado da aplicação
            const targetColumn = boardState.columns.find(c => c.id === targetColumnId);
            if (targetColumn) {
                targetColumn.cards.push(...newCards);
                saveState();
                renderBoard();
                alert(`${newCards.length} contato(s) carregado(s) com sucesso na coluna "${targetColumn.title}"!`);
            }
        };

        reader.readAsText(file);
    }
        
    // --- Lógica do Modal e Event Listeners ---

    function openEditModal(columnId) {
        const column = boardState.columns.find(c => c.id === columnId);
        if (!column) return;
        
        // Preenche o formulário com os dados atuais da coluna
        editColumnForm.querySelector('#edit-column-id').value = column.id;
        editColumnForm.querySelector('#edit-column-name').value = column.title;
        
        // Renderiza a paleta de cores
        colorPalette.innerHTML = '';
        PALETTE.forEach((colorPair, index) => {
            if(index % 2 !== 0) return; // Pula as cores do modo dark
            
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = `color-swatch ${colorPair[0]} dark:${PALETTE[index+1][0]}`;
            swatch.dataset.colorIndex = index;
            
            // Marca a cor atual como selecionada
            if (column.color && column.color[0] === colorPair[0]) {
                swatch.classList.add('selected');
            }
            
            colorPalette.appendChild(swatch);
        });

        editColumnModal.classList.remove('hidden');
    }
    
    function closeEditModal() {
        editColumnModal.classList.add('hidden');
    }

    // --- Event Listeners ---


    // Listener para seleção de cor na paleta
    colorPalette.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-swatch')) {
            // Remove a seleção de qualquer outra cor
            colorPalette.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('selected'));
            // Adiciona a seleção à cor clicada
            e.target.classList.add('selected');
        }
    });

    // Listener para o formulário de edição
    editColumnForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const columnId = e.target.querySelector('#edit-column-id').value;
        const newTitle = e.target.querySelector('#edit-column-name').value;
        const selectedSwatch = e.target.querySelector('.color-swatch.selected');
        
        const column = boardState.columns.find(c => c.id === columnId);
        if (column) {
            column.title = newTitle.trim();
            if (selectedSwatch) {
                const colorIndex = parseInt(selectedSwatch.dataset.colorIndex);
                // Salva a cor do modo claro e o JS deduzirá a do modo escuro
                column.color = PALETTE[colorIndex];
            }
        }

        saveState();
        renderBoard();
        closeEditModal();
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
        const columnName = prompt("Digite o nome da nova coluna:");
        if (columnName && columnName.trim()) {
            boardState.columns.push({
                id: `col-${Date.now()}`,
                title: columnName.trim(),
                cards: []
            });
            saveState();
            renderBoard();
        }
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.kanban-card').forEach(card => {
            const cardText = card.textContent.toLowerCase();
            card.style.display = cardText.includes(query) ? '' : 'none';
        });
    });



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
    initializeBoard();
});
