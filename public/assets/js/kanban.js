document.addEventListener('DOMContentLoaded', () => {

    const boardContainer = document.getElementById('kanban-board');
    const addColumnBtn = document.getElementById('add-column-btn');
    const searchInput = document.getElementById('kanban-search');
    const KANBAN_STATE_KEY = 'kanban-board-state';

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
                    { id: `col-${Date.now()}`, title: "Novos Leads", cards: [] },
                    { id: `col-${Date.now()+1}`, title: "Em Contato", cards: [] },
                    { id: `col-${Date.now()+2}`, title: "Convertidos", cards: [] },
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
        // Adicionamos a classe 'kanban-column' aqui, que será nosso identificador para o arraste
        columnEl.className = 'kanban-column'; 
        columnEl.dataset.columnId = column.id;
        
        // A estrutura do cabeçalho agora inclui o ícone de arrastar
        columnEl.innerHTML = `
            <div class="kanban-column-header">
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
                        <button class="column-dropdown-item" data-action="remove-column">Remover coluna</button>
                    </div>
                </div>
            </div>
            <div class="kanban-card-list custom-scrollbar"></div>
        `;

        // ... (resto da função que popula os cards inalterada)
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

    // --- Inicialização e Anexação de Listeners ---

    // Adiciona delegação de eventos ao container do quadro Kanban
    boardContainer.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        e.stopPropagation(); // Impede que o clique se propague para o listener do 'document'
        
        const action = target.dataset.action;
        
        if (action === 'toggle-column-menu') {
            toggleColumnMenu(target);
        }
        
        if (action === 'remove-column') {
            const columnId = target.closest('.kanban-column').dataset.columnId;
            removeColumn(columnId);
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
        cardEl.className = 'kanban-card';
        cardEl.dataset.cardId = card.id;

        // Reutilizando o estilo da lista de conversas do chat
        cardEl.innerHTML = `
            <div class="flex-grow flex items-center min-w-0">
                <div class="w-10 h-10 bg-gray-400 rounded-full mr-3 flex-shrink-0"></div>
                <div class="flex-grow overflow-hidden">
                    <h3 class="font-semibold truncate text-sm text-gray-800 dark:text-gray-200">${card.nome || card.telefone}</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${card.telefone}</p>
                </div>
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

    // --- Event Listeners ---

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
