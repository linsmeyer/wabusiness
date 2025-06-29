// nome do arquivo public/assets/js/dashboard.js
document.addEventListener('DOMContentLoaded', () => {

    /* inicio da seção das constants */

    // --- Seleção dos Elementos do DOM ---
    // Armazena referências aos elementos HTML para acesso rápido.
    const conversationList = document.getElementById('conversation-list');
    const contactName = document.getElementById('contact-name');
    const messageList = document.getElementById('message-list');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatComposer = document.getElementById('chat-composer');
    const chatHeader = document.getElementById('chat-header');
    const contactInfoPanelElement = document.getElementById('contact-info-panel');
    const bodyElement = document.body;
    const searchInput = document.getElementById('conversation-search');
    const filterBtnAll = document.getElementById('filter-btn-all');
    const filterBtnUnread = document.getElementById('filter-btn-unread');
    const emojiButton = document.getElementById('emoji-button');
    const emojiPickerContainer = document.getElementById('emoji-picker-container');
    const quickReplyButton = document.getElementById('quick-reply-button');
    const quickReplyPicker = document.getElementById('quick-reply-picker');
    const quickReplyModal = document.getElementById('quick-reply-modal');
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const themeIconSun = document.getElementById('theme-icon-sun');
    const themeIconMoon = document.getElementById('theme-icon-moon');
    const templateManagerBtn = document.getElementById('template-manager-btn');
    const savedTheme = localStorage.getItem('whatsapp-theme') || 'light';

    // --- Estado Global da Aplicação ---
    // Variáveis que guardam o estado atual da interface e dos dados.
    const state = {
        allConversations: {},
        allContacts: {},
        activeConversationId: null,
        currentFilter: 'all',
        searchTerm: '',
        openDropdownContactId: null,
    };

    // Gerenciador para painéis que se sobrepõem (Emojis, Quick Replies).
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

    /* final da seção das constants, futuras constants devem sempre ser insridas no topo */

    /* inicio da seção dos métodos */

    /**
     * Envia uma requisição para marcar a última mensagem de uma conversa como não lida.
     * @param {string} contactId - O ID do contato a ser atualizado.
     */
    async function markConversationAsUnread(contactId) {
        try {
            await fetch(`/api/conversations/${contactId}/mark-as-unread`, { method: 'POST' });
            await fetchAllData(); // Renomeado para 'fetchAllData' para consistência.
        } catch (error) {
            console.error("Erro ao marcar como não lida:", error);
        }
    }

    /**
     * Envia uma requisição para marcar todas as mensagens de uma conversa como lidas.
     * @param {string} contactId - O ID do contato a ser atualizado.
     */
    async function markConversationAsRead(contactId) {
        console.log(`Marcando conversa ${contactId} como lida...`);
        try {
            await fetch(`/api/conversations/${contactId}/mark-as-read`, { method: 'POST' });
            await fetchAllData(); // Renomeado para 'fetchAllData' para consistência.
        } catch (error) {
            console.error("Erro ao marcar como não lida:", error);
        }
    }

    /**
     * Envia uma mensagem pré-formatada (Quick Reply).
     * @param {object} [messageData=null] - Dados da mensagem rápida.
     */
    async function sendMessageFast(messageData = null) {
        if (!state.activeConversationId) {
            console.error("[SEND] Erro: Nenhuma conversa ativa selecionada.");
            alert("Selecione uma conversa para enviar!");
            return;
        }

        let payload;

        if (messageData) {
            payload = {
                to: state.activeConversationId,
                text: messageData.text || '',
                imageUrl: messageData.imageUrl || '',
                templateName: messageData.templateName || ''
            };
        } else {
            const text = messageInput.value.trim();
            if (!text || !state.activeConversationId) return;
            payload = { to: state.activeConversationId, text: text };
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

            if (!messageData) {
                messageInput.value = '';
            }

            // A atualização da UI será feita pelo polling de 'fetchAllData'.
            if (state.activeConversationId && state.allConversations[state.activeConversationId]) {
                renderActiveChat();
            }

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        }
    }

    /**
     * Envia uma mensagem digitada manualmente no input principal.
     */
    async function sendMessage() {
        if (!state.activeConversationId) {
            console.error("[SEND] Erro: Nenhuma conversa ativa selecionada.");
            alert("Selecione uma conversa para enviar!");
            return;
        }

        const text = messageInput.value.trim();
        if (!text || !state.activeConversationId)
            return;

        try {
            await fetch('/api/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: state.activeConversationId,
                    text: text
                })
            });
            messageInput.value = '';
        
            if (state.activeConversationId && state.allConversations[state.activeConversationId]) {
                // Força uma atualização imediata para o usuário ver a mensagem enviada
                renderActiveChat();
            }
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            // Opcional: Mostrar um alerta de erro para o usuário
            alert("Não foi possível enviar a mensagem. Verifique sua conexão ou tente novamente.");
        }
    }

    /**
     * Função central que redesenha a lista de conversas com base no estado global.
     * Esta função está duplicada no código original (também como renderConversationList).
     */
    function renderConversationList() {
        console.log("[UI] Filtra e renderiza a lista de conversas (função 1)...");
        let conversationsToRender = Object.values(state.allConversations);

        if (state.currentFilter === 'unread') {
            conversationsToRender = conversationsToRender.filter(c => c.unreadCount > 0);
        }
        if (state.searchTerm) {
            const lowerCaseSearch = state.searchTerm.toLowerCase();
            conversationsToRender = conversationsToRender.filter(c => {
                const displayName = state.allContacts[c.contact]?.profile?.name || c.contact;
                return displayName.toLowerCase().includes(lowerCaseSearch);
            });
        }

        conversationList.innerHTML = '';
        conversationsToRender.forEach(convo => {
            const contactId = convo.contact;
            const displayName = state.allContacts[contactId]?.profile?.name || contactId;
            const lastMessage = convo.messages.slice(-1)[0] || {};
            const li = document.createElement('li');
            const timestamp = lastMessage.timestamp ? new Date(lastMessage.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
            const isActiveClass = contactId === state.activeConversationId ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800';
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
                        <div class="convo-timestamp">${timestamp}</div>
                    </div>
                </div>
                <button class="dropdown-button" data-action="toggle-dropdown">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
                </button>
                <div class="dropdown-menu" data-role="dropdown-menu">
                    <button class="dropdown-item" data-action="mark-unread">Marcar como não lida</button>
                </div>`;
            conversationList.appendChild(li); 
        });

        if (state.openDropdownContactId) {
            const activeLi = conversationList.querySelector(`[data-contact-id="${state.openDropdownContactId}"]`);
            if (activeLi) {
                activeLi.querySelector('[data-role="dropdown-menu"]')?.classList.remove('hidden');
                activeLi.querySelector('[data-action="toggle-dropdown"]')?.classList.add('active');
            }
        }
    }

    /**
     * Renderiza as mensagens da conversa ativa no painel de chat.
     * @param {string} contactId - O ID da conversa a ser exibida.
     * @param {boolean} [isUpdate=false] - Se true, evita rolar para o final.
     */
    function renderActiveChat() {
        if (!state.activeConversationId) {
            chatHeader.classList.add('hidden');
            chatComposer.classList.add('hidden');
            return;
        }
        chatHeader.classList.remove('hidden');
        chatComposer.classList.remove('hidden');
        const contactId = state.activeConversationId;
        const displayName = state.allContacts[contactId]?.profile?.name || contactId;
        contactName.textContent = displayName;
        messageList.innerHTML = '';
        const conversation = state.allConversations[contactId];
        if (conversation) {
            conversation.messages.forEach(msg => {
                const wrapper = document.createElement('div');
                wrapper.className = `flex mb-2 ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`;
                wrapper.innerHTML = `<div class="rounded-lg p-3 max-w-lg ${msg.direction === 'out' ? 'bg-wa-green-light dark:bg-wa-green-dark' : 'bg-wa-panel-light dark:bg-wa-panel-dark'}">${msg.text}</div>`;
                messageList.appendChild(wrapper);
            });
            messageList.scrollTop = messageList.scrollHeight;
        }
    }

    /**
     * Busca todos os dados do servidor. É a função principal do polling.
     * Preserva o estado do dropdown aberto durante as atualizações.
     */
    async function fetchAllData() {

        const openMenuContactIdBeforeFetch = state.openDropdownContactId;
        
        // Lógica para restaurar o estado do dropdown após a busca.
        if (openMenuContactIdBeforeFetch) {
            const newLi = conversationList.querySelector(`[data-contact-id="${openMenuContactIdBeforeFetch}"]`);
            if (newLi) {
                const menuToReopen = newLi.querySelector('[data-role="dropdown-menu"]');
                const buttonToReactivate = newLi.querySelector('[data-action="toggle-dropdown"]');
                if (menuToReopen && buttonToReactivate) {
                    menuToReopen.classList.remove('hidden');
                    buttonToReactivate.classList.add('active');
                    state.openDropdownContactId = openMenuContactIdBeforeFetch;
                }
            } else {
                state.openDropdownContactId = null;
            }
        }

        try {
            const [convosRes, contactsRes] = await Promise.all([
                fetch('/api/conversations'),
                fetch('/api/contacts')
            ]);
            const newConversations = await convosRes.json();
            const newContacts = await contactsRes.json();
            const hasChanged = JSON.stringify(state.allConversations) !== JSON.stringify(newConversations) ||
                               JSON.stringify(state.allContacts) !== JSON.stringify(newContacts);
            if (hasChanged) {
                console.log("[DATA] Dados atualizados, renderizando UI");
                state.allConversations = newConversations;
                state.allContacts = newContacts;      
                renderConversationList();
                if (state.activeConversationId && state.allConversations[state.activeConversationId]) {
                    renderActiveChat();
                }
            } else {
                console.log("[DATA] Dados atualizados, renderizando UI");
                state.allConversations = newConversations;
                state.allContacts = newContacts;
            }
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
        }
    }

    /**
     * Função de conveniência para renderizar todas as partes dinâmicas da UI.
     */
    function renderAll() {
        renderConversationList();
        renderActiveChat();
    }

    /**
     * Define uma conversa como ativa, atualizando o estado e a UI.
     * @param {string} contactId - O ID do contato selecionado.
     */
    function handleConversationSelect(contactId) {
        if (state.activeConversationId === contactId) return;
        
        state.activeConversationId = contactId;
        state.openDropdownContactId = null; 

        chatHeader.classList.remove('hidden');
        const displayName = state.allContacts[contactId]?.profile?.name || contactId;
        contactName.textContent = displayName;
        chatComposer.classList.remove('hidden');
        
        if (state.allContacts[contactId]) {
            contactInfoPanel.render(state.allContacts[contactId]);
        } else {
            contactInfoPanel.render({ wa_id: contactId, profile: {} });
        }
        contactInfoPanel.hide();

        renderAll();

        if (state.allConversations[contactId]?.unreadCount > 0) {
            markConversationAsRead(contactId);
        }
    }

    /**
     * Alterna o estado de visibilidade de um dropdown.
     * @param {string} contactId - O ID do contato do dropdown.
     */
    function handleDropdownToggle(contactId) {
        state.openDropdownContactId = (state.openDropdownContactId === contactId) ? null : contactId;
        renderConversationList();
    }
   
    /**
     * Aplica o tema visual (dark/light) e salva a preferência.
     * @param {string} theme - O nome do tema.
     */
    function applyTheme(theme) {
        if (theme === 'dark') {
            bodyElement.classList.add('dark-theme');
            // Os ícones são controlados pelo HTML/CSS
        } else {
            bodyElement.classList.remove('dark-theme');
            // Os ícones são controlados pelo HTML/CSS
        }
    }

    /**
     * Alterna entre os temas dark e light.
     */
    function toggleTheme() {
        const currentTheme = bodyElement.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('whatsapp-theme', newTheme);
        applyTheme(newTheme);
    }
    
    /**
     * Fecha todos os menus dropdown que estiverem abertos.
     */
    function closeAllDropdowns() {
        document.querySelectorAll('[data-role="dropdown-menu"]:not(.hidden)').forEach(menu => {
            menu.classList.add('hidden');
        });
        document.querySelectorAll('.dropdown-button.active').forEach(button => {
            button.classList.remove('active');
        });
    }

    // --- Inicialização de Componentes Modulares ---
    contactInfoPanel = initializeContactInfoPanel({
        panel: contactInfoPanelElement,
        header: chatHeader,
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

                state.allContacts[contactId] = updatedContact;
                
                const li = conversationList.querySelector(`[data-contact-id="${contactId}"] .font-semibold`);
                if (li) li.textContent = updatedContact.profile.name || contactId;
                
                if (state.activeConversationId === contactId) {
                    document.getElementById('contact-name').textContent = updatedContact.profile.name || contactId;
                }

            } catch (error) {
                console.error("Erro ao salvar dados do contato:", error);
            }
        }
    });
    
    initializeEmojiPicker({
        inputField: messageInput,
        pickerContainer: emojiPickerContainer
    });

    quickRepliesComponent = initializeQuickReplies({
        pickerContainer: quickReplyPicker,
        searchInput: document.getElementById('quick-reply-search'),
        addButton: document.getElementById('add-quick-reply-btn'),
        listContainer: document.getElementById('quick-reply-list'),
        modal: quickReplyModal,
        onSend: (replyData) => {
            sendMessageFast({
                text: replyData.text,
                imageUrl: replyData.imageUrl,
                templateName: replyData.templateName
            });
        }
    });
    
    PanelManager.register(emojiPickerContainer);
    PanelManager.register(quickReplyPicker);

    // --- Anexação de Listeners de Evento ---
    
    // Delegação de eventos para a lista de conversas.
    conversationList.addEventListener('click', (e) => {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const conversationItem = e.target.closest('.conversation-item');
        const contactId = conversationItem.dataset.contactId;
        const action = actionTarget.dataset.action;
        
        e.stopPropagation();

        switch (action) {
            case 'select-convo':
                if (state.openDropdownContactId) {
                    state.openDropdownContactId = null;
                }
                handleConversationSelect(contactId);
                break;
            case 'toggle-dropdown':
                handleDropdownToggle(contactId);
                break;
            case 'mark-unread':
                state.openDropdownContactId = null;
                markConversationAsUnread(contactId);
                break;
        }
    });

    // Listeners para os painéis (emoji, quick reply).
    quickReplyButton.addEventListener('click', (event) => {
        event.stopPropagation();
        contactInfoPanel.hide();
        quickRepliesComponent.load();
        PanelManager.open(quickReplyPicker);
    });
    emojiButton.addEventListener('click', (event) => {
        event.stopPropagation();
        contactInfoPanel.hide();
        PanelManager.open(emojiPickerContainer);
    });

    // Listeners para os filtros.
    searchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value;
        renderConversationList();
    });
    filterBtnAll.addEventListener('click', () => {
        state.currentFilter = 'all';
        filterBtnAll.classList.add('active');
        filterBtnUnread.classList.remove('active');
        renderConversationList();
    });
    filterBtnUnread.addEventListener('click', () => {
        state.currentFilter = 'unread';
        filterBtnUnread.classList.add('active');
        filterBtnAll.classList.remove('active');
        renderConversationList();
    });

    // Listeners do composer e navegação.
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    templateManagerBtn.addEventListener('click', () => {
        window.location.href = '/templates.html';
    });
    themeToggleButton.addEventListener('click', toggleTheme);

    // Listener global para fechar painéis e dropdowns.
    document.addEventListener('click', (e) => {
        const target = e.target;
        const infoPanel = document.getElementById('contact-info-panel');
        const chatHeaderTrigger = document.getElementById('chat-header');
        if (!infoPanel.classList.contains('hidden') && !infoPanel.contains(target) && !chatHeaderTrigger.contains(target)) {
            contactInfoPanel.hide();
        }
        if (!e.target.closest('.conversation-item')) {
            if (state.openDropdownContactId) {
                state.openDropdownContactId = null;
            }
            closeAllDropdowns();
        }
        if (!e.target.closest('.picker-panel, .composer-button')) {
             PanelManager.closeAll();
        }
    });
    
    // --- Carga Inicial da Aplicação ---
    applyTheme(savedTheme);
    setInterval(fetchAllData, 3000);
    fetchAllData();
});
