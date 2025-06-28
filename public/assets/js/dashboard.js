// dashboard.js
document.addEventListener('DOMContentLoaded', () => {

    const conversationList = document.getElementById('conversation-list');
    const contactName = document.getElementById('contact-name');
    const messageList = document.getElementById('message-list');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatComposer = document.getElementById('chat-composer');
    const chatHeader = document.getElementById('chat-header');
    const contactInfoPanelElement = document.getElementById('contact-info-panel');

    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const themeIconSun = document.getElementById('theme-icon-sun');
    const themeIconMoon = document.getElementById('theme-icon-moon');
    const bodyElement = document.body;
    const searchInput = document.getElementById('conversation-search');
    const filterBtnAll = document.getElementById('filter-btn-all');
    const filterBtnUnread = document.getElementById('filter-btn-unread');
    // ... (outros elementos do DOM que você já tem)

    // --- ESTADO GLOBAL ---
    let allConversations = {};
    let allContacts = {};
    // Supondo que você use isso para nomes
    let activeConversationId = null;
    let currentFilter = 'all';
    // Estado inicial
    let searchTerm = '';
    // Estado inicial

    // ======================================================================
    // ==  NOVA LÓGICA DE EVENTOS PARA A LISTA DE CONVERSAS                ==
    // ======================================================================

    /**
     * Alterna a visibilidade de um menu dropdown específico.
     * PAUSA o polling se um menu for aberto.
     */

    conversationList.addEventListener('click', (e) => {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const conversationItem = e.target.closest('.conversation-item');
        const contactId = conversationItem.dataset.contactId;
        const action = actionTarget.dataset.action;
        
        e.stopPropagation();

        switch (action) {
            case 'select-convo':
                // Se um menu está aberto, o primeiro clique apenas o fecha.
                if (uiState.openDropdownContactId) {
                    uiState.openDropdownContactId = null;
                }
                selectConversation(contactId, false);
                // renderConversationList();
                break;
            case 'toggle-dropdown':
                // Alterna o estado: se o menu clicado já é o aberto, fecha-o (null). Senão, abre-o.
                uiState.openDropdownContactId = (uiState.openDropdownContactId === contactId) ? null : contactId;
                break;
            case 'mark-unread':
                uiState.openDropdownContactId = null; // Fecha o menu antes da ação
                markConversationAsUnread(contactId);
                // renderConversationList();
                break;
        }

        // Após qualquer ação, re-renderiza para refletir a mudança de estado
        applyFiltersAndRender();
        // renderConversationList();
    });

    /**
     * Ação de marcar como não lida.
     * Fecha os menus e retoma o polling.
     */

     async function markConversationAsUnread(contactId) {
        console.log(`Marcando conversa ${contactId} como não lida...`);
        
        // Mantemos o estado de qual menu estava aberto para fechá-lo
        uiState.openDropdownContactId = null; 

        try {
            await fetch(`/api/conversations/${contactId}/mark-as-unread`, { method: 'POST' });
            await fetchAll();

        } catch (error) {
            console.error("Erro ao marcar como não lida:", error);
        }
    }


    async function selectConversation(contactId) {
        if (activeConversationId === contactId) return;
        
        // 1. Define o novo estado
        activeConversationId = contactId;
        uiState.openDropdownContactId = null; // Garante que qualquer dropdown seja fechado

        // 2. Chama a renderização para que a UI reflita a nova seleção (destaque)
        applyFiltersAndRender();
        
        // 3. Atualiza o painel de chat
        chatHeader.classList.remove('hidden');
        // chatComposer.classList.remove('hidden');
        // contactName.textContent = allContacts[contactId]?.profile?.name || contactId;

        const contactDetails = allContacts[contactId];
        const displayName = contactDetails?.profile?.name || contactId;
        
        // Atualiza o cabeçalho do chat
        contactName.textContent = displayName;
        chatComposer.classList.remove('hidden');
        
        // Passa os dados do contato para o painel de informações
        if (contactDetails) {
            contactInfoPanel.render(contactDetails);
        } else {
            // Se não houver detalhes, limpa e esconde o painel
            contactInfoPanel.render({ wa_id: contactId, profile: {} }); // Limpa o painel com dados mínimos
        }
        
        contactInfoPanel.hide(); // Garante que o painel comece fechado

        // Destaca a conversa na lista
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', item.dataset.contactId === contactId);
        });
        
        renderMessagesFor(contactId);
        
        // 4. Se a conversa tinha mensagens não lidas, marca como lida e atualiza os dados
        if (allConversations[contactId]?.unreadCount > 0) {
            console.log(`Marcando conversa ${contactId} como lida...`);
            await fetch(`/api/conversations/${contactId}/mark-as-read`, { method: 'POST' });
            // Força uma nova busca e re-renderização para atualizar o badge
            await fetchAll();
        }
    }
    
    function renderMessagesFor(contactId, isUpdate = false) {
        const conversation = allConversations[contactId];

        // Atualiza o painel de info se estiver aberto
        const contactDetails = allContacts[contactId];
        if (contactDetails) {
            contactInfoPanel.render(contactDetails);
        }

        messageList.innerHTML = ''; 

        if (!conversation) return;
        conversation.messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `message-bubble ${msg.direction}`;
            bubble.textContent = msg.text;
            messageList.appendChild(bubble);
        });
        
        // Só rola para o final se não for uma simples atualização de polling
        if (!isUpdate) {
            messageList.scrollTop = messageList.scrollHeight;
            // fetchAll();
        }
    }

    // --- EVENT LISTENERS PARA OS FILTROS (SIMPLIFICADOS) ---
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        applyFiltersAndRender();
        // Apenas muda o estado e re-renderiza
    }
    );

    filterBtnAll.addEventListener('click', () => {
        currentFilter = 'all';
        filterBtnAll.classList.add('active');
        filterBtnUnread.classList.remove('active');
        applyFiltersAndRender();
        // Apenas muda o estado e re-renderiza
    }
    );

    filterBtnUnread.addEventListener('click', () => {
        currentFilter = 'unread';
        filterBtnUnread.classList.add('active');
        filterBtnAll.classList.remove('active');
        applyFiltersAndRender();
        // Apenas muda o estado e re-renderiza
    }
    );

    // =======================================================================
    // == LÓGICA DE GERENCIAMENTO DE TEMA                                   ==
    // =======================================================================

    function applyTheme(theme) {
        if (theme === 'dark') {
            bodyElement.classList.add('dark-theme');
            themeIconSun.classList.remove('hidden');
            themeIconMoon.classList.add('hidden');
            themeToggleButton.title = "Mudar para modo claro";
        } else {
            bodyElement.classList.remove('dark-theme');
            themeIconSun.classList.add('hidden');
            themeIconMoon.classList.remove('hidden');
            themeToggleButton.title = "Mudar para modo escuro";
        }
    }

    function toggleTheme() {
        const currentTheme = bodyElement.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        localStorage.setItem('whatsapp-theme', newTheme);
        applyTheme(newTheme);
    }

    // Carrega o tema salvo ao iniciar
    const savedTheme = localStorage.getItem('whatsapp-theme') || 'light';
    applyTheme(savedTheme);

    // Adiciona o listener ao botão
    themeToggleButton.addEventListener('click', toggleTheme);

    let contactInfoPanel;
    // NOVO

    // =======================================================================
    // == INICIALIZAÇÃO DE COMPONENTES                                      ==
    // =======================================================================

    // Inicializa o painel de informações de contato IMEDIATAMENTE
    // Ele começa escondido e será preenchido com dados depois.
    contactInfoPanel = initializeContactInfoPanel({
        panel: contactInfoPanelElement,
        header: chatHeader,
        // O cabeçalho do chat é o gatilho para abrir
        closeButton: document.getElementById('close-info-panel-btn'),
        body: contactInfoPanelElement.querySelector('.info-panel-body'),
        onSave: async (contactId, dataToSave) => {
            console.log(`[SAVE] Salvando dados para ${contactId}:`, dataToSave);

            try {
                const response = await fetch(`/api/contacts/${contactId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSave)
                });
                const updatedContact = await response.json();

                // Atualiza o estado local para reatividade instantânea
                allContacts[contactId] = updatedContact;
                
                // ATUALIZA A UI SEM UMA RE-RENDERIZAÇÃO COMPLETA
                // Isso evita que o usuário perca o foco do input
                const li = conversationList.querySelector(`[data-contact-id="${contactId}"] .font-semibold`);
                if (li) li.textContent = updatedContact.profile.name || contactId;
                
                if (activeConversationId === contactId) {
                    document.getElementById('contact-name').textContent = updatedContact.profile.name || contactId;
                }

            } catch (error) {
                console.error("Erro ao salvar dados do contato:", error);
            }
        }
    });

    const emojiButton = document.getElementById('emoji-button');
    const emojiPickerContainer = document.getElementById('emoji-picker-container');

    // =======================================================================
    // == INICIALIZAÇÃO DE COMPONENTES                                      ==
    // =======================================================================
    // Chamamos a função do nosso novo script para ativar o seletor de emojis
    initializeEmojiPicker({
        inputField: messageInput,
        pickerContainer: emojiPickerContainer
    });
    // Aqui você poderia adicionar: initializeAttachmentPicker(...), etc.
    // =======================================================================

    const quickReplyButton = document.getElementById('quick-reply-button');
    const quickReplyPicker = document.getElementById('quick-reply-picker');
    const quickReplyModal = document.getElementById('quick-reply-modal');

    let quickRepliesComponent = initializeQuickReplies({
        pickerContainer: quickReplyPicker,
        searchInput: document.getElementById('quick-reply-search'),
        addButton: document.getElementById('add-quick-reply-btn'),
        listContainer: document.getElementById('quick-reply-list'),
        modal: quickReplyModal,
        onSend: (replyData) => {
            // Quando um item é clicado, chama a função de envio principal
            sendMessageFast({
                text: replyData.text,
                imageUrl: replyData.imageUrl,
                templateName: replyData.templateName
            });
        }
    });
    
    // ======================================================================
    // ==  ESTADO CENTRALIZADO E GERENCIADOR DE PAINÉIS                    ==
    // ======================================================================

    
    // Nossa única fonte da verdade para o estado da UI
    let uiState = {
        openDropdownContactId: null
    };

    // Gerenciador para painéis como Emoji e Quick Reply
    const PanelManager = {
        panels: [],
        register: function(panelElement) { this.panels.push(panelElement); },
        open: function(panelToOpen) {
            this.panels.forEach(panel => {
                panel.classList.toggle('hidden', panel !== panelToOpen || !panel.classList.contains('hidden'));
            });
        },
        closeAll: function() { this.panels.forEach(panel => panel.classList.add('hidden')); }
    };

    // ======================================================================
    // ==  LÓGICA PRINCIPAL DE RENDERIZAÇÃO E DADOS                        ==
    // ======================================================================

    /**
     * Função central que filtra e renderiza a lista de conversas
     * com base no estado global.
     */
    function applyFiltersAndRender() {

        console.log("[UI] Filtra e renderiza a lista de conversas applyFiltersAndRender...");

        // ... (A lógica interna desta função para filtrar e gerar o HTML permanece a mesma)
        let conversationsToRender = Object.values(allConversations);

        // 2. Aplica o filtro de "Não lidas" se estiver ativo
        if (currentFilter === 'unread') {
            conversationsToRender = conversationsToRender.filter(c => c.unreadCount > 0);
        }

        // 3. Aplica o filtro de busca por texto se houver um termo
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            conversationsToRender = conversationsToRender.filter(c => {
                const contactDetails = allContacts[c.contact];
                const displayName = contactDetails?.profile?.name || c.contact;
                return displayName.toLowerCase().includes(lowerCaseSearch);
            }
            );
        }

        conversationList.innerHTML = '';
        conversationsToRender.forEach(convo => {
            const contactId = convo.contact;
            const contactDetails = allContacts[contactId];
            const displayName = contactDetails?.profile?.name || contactId;
            const lastMessage = convo.messages.slice(-1)[0] || {};
            const li = document.createElement('li');
            
            // **AQUI ESTÁ A CORREÇÃO**
            // Aplica a classe 'active' se o ID da conversa for o mesmo que está no nosso estado global
            const isActiveClass = contactId === activeConversationId ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800';
            li.className = `group conversation-item ${isActiveClass}`;
            li.dataset.contactId = contactId;
            li.innerHTML = `
                    <div class="flex-grow flex items-center overflow-hidden" data-action="select-convo">
                        <div class="w-12 h-12 bg-gray-300 rounded-full mr-4 flex-shrink-0"></div>
                        <div class="flex-grow overflow-hidden">
                            <div class="flex items-center">
                                <h3 class="font-semibold truncate">${displayName}</h3>
                                ${convo.unreadCount > 0 ? `<span class="bg-wa-green-dark text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2"  style="margin-right:20px;margin-top:0px;">${convo.unreadCount}</span>` : ''}
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${lastMessage.text || ''}</p>
                        </div>
                    </div>

                    <!-- Botão do Dropdown (fora da área clicável principal) -->
                    <button class="dropdown-button" data-action="toggle-dropdown">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>

                    <!-- Menu Dropdown -->
                    <div class="dropdown-menu" data-role="dropdown-menu">
                        <button class="dropdown-item" data-action="mark-unread">Marcar como não lida</button>
                    </div>
                `;
            conversationList.appendChild(li); 
        });

        // **A MÁGICA ACONTECE AQUI**
        // Após redesenhar tudo, restaura o estado do dropdown que deveria estar aberto.
        if (uiState.openDropdownContactId) {
            const activeLi = conversationList.querySelector(`[data-contact-id="${uiState.openDropdownContactId}"]`);
            if (activeLi) {
                activeLi.querySelector('[data-role="dropdown-menu"]')?.classList.remove('hidden');
                activeLi.querySelector('[data-action="toggle-dropdown"]')?.classList.add('active');
            }
        }
    }

    /**
     * Busca todos os dados da API. O polling agora é contínuo.
     */    
    async function fetchAll() {

        const openMenuContactIdBeforeFetch = uiState.openDropdownContactId;

        // 3. Restaura o estado do dropdown que estava aberto
        if (openMenuContactIdBeforeFetch) {
            const newLi = conversationList.querySelector(`[data-contact-id="${openMenuContactIdBeforeFetch}"]`);
            if (newLi) {
                const menuToReopen = newLi.querySelector('[data-role="dropdown-menu"]');
                const buttonToReactivate = newLi.querySelector('[data-action="toggle-dropdown"]');
                if (menuToReopen && buttonToReactivate) {
                    menuToReopen.classList.remove('hidden');
                    buttonToReactivate.classList.add('active');
                    // Garante que o estado global ainda esteja correto
                    uiState.openDropdownContactId = openMenuContactIdBeforeFetch;
                }
            } else {
                // Se o item da lista não existe mais (ex: foi filtrado), limpa o estado
                uiState.openDropdownContactId = null;
            }
        }

        try {
            const [convosRes, contactsRes] = await Promise.all([
                fetch('/api/conversations'),
                fetch('/api/contacts')
            ]);
            const newConversations = await convosRes.json();
            const newContacts = await contactsRes.json();

            // Verifica se houve alguma mudança para evitar re-renderizações desnecessárias
            const hasChanged = JSON.stringify(allConversations) !== JSON.stringify(newConversations) ||
                               JSON.stringify(allContacts) !== JSON.stringify(newContacts);

            if (hasChanged) {
                console.log("[DATA] Dados atualizados, renderizando UI...");
                allConversations = newConversations;
                allContacts = newContacts;
                renderConversationList();
                // Se uma conversa estava ativa, atualiza seus dados na tela
                if (activeConversationId && allConversations[activeConversationId]) {
                    renderMessagesFor(activeConversationId, false);
                }
            }
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
        }
    }

    function renderConversationList() {
        const lastActiveId = activeConversationId; // Guarda o ID ativo antes de limpar a lista
        conversationList.innerHTML = '';

        let conversationsToRender = Object.values(allConversations);

        // 2. Aplica o filtro de "Não lidas" se estiver ativo
        if (currentFilter === 'unread') {
            conversationsToRender = conversationsToRender.filter(c => c.unreadCount > 0);
        }
        
        conversationsToRender.forEach(convo => {
            const contactId = convo.contact;
            const contactDetails = allContacts[contactId];
            const displayName = contactDetails?.profile?.name || contactId;
            const lastMessage = convo.messages.slice(-1)[0] || {};

            const li = document.createElement('li');
            // Aplica a classe 'active' se for a conversa selecionada
            const isActiveClass = contactId === activeConversationId ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800';
            li.className = `conversation-item  ${isActiveClass}`;
            li.dataset.contactId = contactId;
            li.innerHTML = `
                    <div class="flex-grow flex items-center overflow-hidden" data-action="select-convo">
                        <div class="w-12 h-12 bg-gray-300 rounded-full mr-4 flex-shrink-0"></div>
                        <div class="flex-grow overflow-hidden">
                            <div class="flex items-center">
                                <h3 class="font-semibold truncate">${displayName}</h3>
                                ${convo.unreadCount > 0 ? `<span class="bg-wa-green-dark text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2"  style="margin-right:20px;margin-top:0px;">${convo.unreadCount}</span>` : ''}
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${lastMessage.text || ''}</p>
                        </div>
                    </div>

                    <!-- Botão do Dropdown (fora da área clicável principal) -->
                    <button class="dropdown-button" data-action="toggle-dropdown">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                    </button>

                    <!-- Menu Dropdown -->
                    <div class="dropdown-menu" data-role="dropdown-menu">
                        <button class="dropdown-item" data-action="mark-unread">Marcar como não lida</button>
                    </div>
                `;

                // li.addEventListener('click', () => selectConversation(contactId, true));
                conversationList.appendChild(li); 
        });
            
        // Restaura a seleção se ainda existir
        if (lastActiveId && allConversations[lastActiveId]) {
            document.querySelector(`.conversation-item[data-contact-id="${lastActiveId}"]`)?.classList.add('active');
        }
    }
    
    // Inicializa componentes e registra os painéis
    PanelManager.register(quickReplyPicker);
    // ... (inicialização do emoji picker e registro)

    // CORREÇÃO DO BUG DO QUICK REPLY
    quickReplyButton.addEventListener('click', (event) => {
        event.stopPropagation();
        quickRepliesComponent.load();
        PanelManager.open(quickReplyPicker);
    });


    PanelManager.register(emojiPickerContainer);
    // PanelManager.register(quickReplyPicker);

    // 2. Modifica os listeners dos botões para usar o PanelManager
    emojiButton.addEventListener('click', (event) => {
        event.stopPropagation();
        // Impede que o clique se propague para o document
        PanelManager.open(emojiPickerContainer);
    }
    );


    // 3. Adiciona um listener global para fechar todos os painéis ao clicar fora
    document.addEventListener('click', (e) => {
        
        // Verifica se o clique não foi em um dos botões que abre um painel
        // const isTriggerButton = e.target.closest('#emoji-button') || e.target.closest('#quick-reply-button');

        // Verifica se o clique não foi dentro de um dos painéis abertos
        // const isInsidePanel = PanelManager.panels.some(panel => !panel.classList.contains('hidden') && panel.contains(e.target));

        // if (!isTriggerButton && !isInsidePanel) {
        //    PanelManager.closeAll();
        // }

        /*
        if (!conversationList.contains(event.target)) {
            closeAllDropdowns();
        }*/

        // closeAllDropdowns();

        // Fecha dropdowns se clicar fora da lista, e fecha painéis se clicar fora de tudo
        if (!e.target.closest('.conversation-item')) {
            if (uiState.openDropdownContactId) {
                uiState.openDropdownContactId = null;
                // applyFiltersAndRender();
            }
        }

        if (!e.target.closest('.picker-panel, .composer-button')) {
             PanelManager.closeAll();
        }
    }
    );



     /**
     * Função assíncrona para enviar uma mensagem.
     * Ela é chamada tanto pelo clique no botão "Enviar" quanto por uma Mensagem Rápida.
     * @param {object} [messageData=null] - Um objeto com os dados da mensagem.
     * Se for nulo, pega os dados do input manual.
     */
    async function sendMessageFast(messageData = null) {
        
        if (!activeConversationId) {
            console.error("[SEND] Erro: Nenhuma conversa ativa selecionada.");
            alert("Selecione uma conversa para enviar!");
            return;
        }

        let payload;

        if (messageData) {
            // Se os dados foram passados (ex: de uma mensagem rápida)
            if (!activeConversationId) return; // Segurança: não envia se nenhuma conversa estiver ativa
            payload = {
                to: activeConversationId,
                text: messageData.text || '',
                imageUrl: messageData.imageUrl || '',
                templateName: messageData.templateName || ''
            };
        } else {
            // Pega os dados do input manual
            const text = messageInput.value.trim();
            if (!text || !activeConversationId) return;
            payload = { to: activeConversationId, text: text };
        }
        
        console.log('[sendMessage] Enviando payload para o backend:', payload);

        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Falha na API de envio.');
            }

            // Limpa o input apenas se o envio foi manual e bem-sucedido
            if (!messageData) {
                messageInput.value = '';
                // updateSendButtonIcon(); // Atualiza o ícone para microfone
            }

            // Força uma busca imediata para uma experiência de usuário mais rápida,
            // em vez de esperar pelo próximo ciclo de polling.
            renderConversationList();
            // Se uma conversa estava ativa, atualiza seus dados na tela
            if (activeConversationId && allConversations[activeConversationId]) {
                renderMessagesFor(activeConversationId, false);
            }

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            // Aqui você poderia mostrar um erro para o usuário na UI
        }
    }

    async function sendMessage() {

        if (!activeConversationId) {
            console.error("[SEND] Erro: Nenhuma conversa ativa selecionada.");
            alert("Selecione uma conversa para enviar!");
            return;
        }

        const text = messageInput.value.trim();
        if (!text || !activeConversationId)
            return;
        await fetch('/api/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: activeConversationId,
                text: text
            })
        });
        messageInput.value = '';
        renderConversationList();
    
        // Se uma conversa estava ativa, atualiza seus dados na tela
        if (activeConversationId && allConversations[activeConversationId]) {
            renderMessagesFor(activeConversationId, false);
        }
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Adicionado !e.shiftKey para permitir quebra de linha
            e.preventDefault();
            sendMessage();
        }
    }
    );

    // startPolling();
    setInterval(fetchAll, 3000);
    fetchAll();
    // fetchAll();
    /*
    fetchAll();
    fetchAll();
    fetchAndRenderConversations();
    */
    // Carga inicial
}
);
