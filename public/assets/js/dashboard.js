// arquivo public/assets/js/dashboard.js
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
    const templateManagerBtn = document.getElementById('template-manager-btn');

    let allConversations = {};
    let allContacts = {};
    let activeConversationId = null;
    let currentFilter = 'all';
    let searchTerm = '';

    conversationList.addEventListener('click', (e) => {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const conversationItem = e.target.closest('.conversation-item');
        const contactId = conversationItem.dataset.contactId;
        const action = actionTarget.dataset.action;
        
        e.stopPropagation();

        switch (action) {
            case 'select-convo':
                if (uiState.openDropdownContactId) {
                    uiState.openDropdownContactId = null;
                }
                selectConversation(contactId, false);
                break;
            case 'toggle-dropdown':
                uiState.openDropdownContactId = (uiState.openDropdownContactId === contactId) ? null : contactId;
                break;
            case 'mark-unread':
                uiState.openDropdownContactId = null;
                markConversationAsUnread(contactId);
                break;
        }

        applyFiltersAndRender();
    });

    async function markConversationAsUnread(contactId) {
        console.log(`Marcando conversa ${contactId} como não lida...`);
        
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
        
        activeConversationId = contactId;
        uiState.openDropdownContactId = null;

        // applyFiltersAndRender();
        
        chatHeader.classList.remove('hidden');

        const contactDetails = allContacts[contactId];
        const displayName = contactDetails?.profile?.name || contactId;
        
        contactName.textContent = displayName;
        chatComposer.classList.remove('hidden');
        
        if (contactDetails) {
            contactInfoPanel.render(contactDetails);
        } else {
            contactInfoPanel.render({ wa_id: contactId, profile: {} });
        }
        
        contactInfoPanel.hide();

        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', item.dataset.contactId === contactId);
        });
        
        renderMessagesFor(contactId);
        
        if (allConversations[contactId]?.unreadCount > 0) {
            console.log(`Marcando conversa ${contactId} como lida...`);
            await fetch(`/api/conversations/${contactId}/mark-as-read`, { method: 'POST' });
            await fetchAll();
        }
    }
    
    function renderMessagesFor(contactId, isUpdate = false) {
        const conversation = allConversations[contactId];

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
        
        if (!isUpdate) {
            messageList.scrollTop = messageList.scrollHeight;
        }
    }

    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        applyFiltersAndRender();
    });

    filterBtnAll.addEventListener('click', () => {
        currentFilter = 'all';
        filterBtnAll.classList.add('active');
        filterBtnUnread.classList.remove('active');
        applyFiltersAndRender();
    });

    filterBtnUnread.addEventListener('click', () => {
        currentFilter = 'unread';
        filterBtnUnread.classList.add('active');
        filterBtnAll.classList.remove('active');
        applyFiltersAndRender();
    });
   
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

    const savedTheme = localStorage.getItem('whatsapp-theme') || 'light';
    applyTheme(savedTheme);

    themeToggleButton.addEventListener('click', toggleTheme);

    let contactInfoPanel;
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

                allContacts[contactId] = updatedContact;
                
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

    initializeEmojiPicker({
        inputField: messageInput,
        pickerContainer: emojiPickerContainer
    });

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
            sendMessageFast({
                text: replyData.text,
                imageUrl: replyData.imageUrl,
                templateName: replyData.templateName
            });
        }
    });
    
    let uiState = {
        openDropdownContactId: null
    };

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

    function applyFiltersAndRender() {

        console.log("[UI] Filtra e renderiza a lista de conversas applyFiltersAndRender...");

        let conversationsToRender = Object.values(allConversations);

        if (currentFilter === 'unread') {
            conversationsToRender = conversationsToRender.filter(c => c.unreadCount > 0);
        }

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
            const timestamp = lastMessage.timestamp ? new Date(lastMessage.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
            
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
                            <div class="convo-timestamp">${timestamp}</div>
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

        if (uiState.openDropdownContactId) {
            const activeLi = conversationList.querySelector(`[data-contact-id="${uiState.openDropdownContactId}"]`);
            if (activeLi) {
                activeLi.querySelector('[data-role="dropdown-menu"]')?.classList.remove('hidden');
                activeLi.querySelector('[data-action="toggle-dropdown"]')?.classList.add('active');
            }
        }
    }

    const state = {
        allConversations: {},
        allContacts: {},
        activeConversationId: null,
        currentFilter: 'all',
        searchTerm: '',
        openDropdownContactId: null,
    };

    function renderAll() {
        applyFiltersAndRender();
        renderActiveChat();
    }

    async function fetchAllData() {
        try {
            const [convosRes, contactsRes] = await Promise.all([
                fetch('/api/conversations'),
                fetch('/api/contacts')
            ]);
            state.allConversations = await convosRes.json();
            state.allContacts = await contactsRes.json();
            renderAll();
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
        }
    }

    async function fetchAll() {

        const openMenuContactIdBeforeFetch = uiState.openDropdownContactId;

        if (openMenuContactIdBeforeFetch) {
            const newLi = conversationList.querySelector(`[data-contact-id="${openMenuContactIdBeforeFetch}"]`);
            if (newLi) {
                const menuToReopen = newLi.querySelector('[data-role="dropdown-menu"]');
                const buttonToReactivate = newLi.querySelector('[data-action="toggle-dropdown"]');
                if (menuToReopen && buttonToReactivate) {
                    menuToReopen.classList.remove('hidden');
                    buttonToReactivate.classList.add('active');
                    uiState.openDropdownContactId = openMenuContactIdBeforeFetch;
                }
            } else {
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

            const hasChanged = JSON.stringify(allConversations) !== JSON.stringify(newConversations) ||
                               JSON.stringify(allContacts) !== JSON.stringify(newContacts);

            if (hasChanged) {
                console.log("[DATA] Dados atualizados, renderizando UI...");
                allConversations = newConversations;
                allContacts = newContacts;                
                // applyFiltersAndRender();
                applyFiltersAndRender();
                if (activeConversationId && allConversations[activeConversationId]) {
                    renderMessagesFor(activeConversationId, true);
                }
            }
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
        }
    }
    
    PanelManager.register(quickReplyPicker);

    quickReplyButton.addEventListener('click', (event) => {
        event.stopPropagation();
        contactInfoPanel.hide();
        quickRepliesComponent.load();
        PanelManager.open(quickReplyPicker);
    });


    PanelManager.register(emojiPickerContainer);

    emojiButton.addEventListener('click', (event) => {
        event.stopPropagation();
        contactInfoPanel.hide();
        PanelManager.open(emojiPickerContainer);
    });


    function closeAllDropdowns() {
        document.querySelectorAll('[data-role="dropdown-menu"]:not(.hidden)').forEach(menu => {
            menu.classList.add('hidden');
        });
        
        document.querySelectorAll('.dropdown-button.active').forEach(button => {
            button.classList.remove('active');
        });
    }


    document.addEventListener('click', (e) => {
        
        const target = e.target;

        const infoPanel = document.getElementById('contact-info-panel');
        const chatHeaderTrigger = document.getElementById('chat-header');

        if (!infoPanel.classList.contains('hidden') && !infoPanel.contains(target) && !chatHeaderTrigger.contains(target)) {
            contactInfoPanel.hide();
        }

        if (!e.target.closest('.conversation-item')) {
            if (uiState.openDropdownContactId) {
                uiState.openDropdownContactId = null;
            }
            closeAllDropdowns();
        }

        if (!e.target.closest('.picker-panel, .composer-button')) {
             PanelManager.closeAll();
        }
    });

    async function sendMessageFast(messageData = null) {
        
        if (!activeConversationId) {
            console.error("[SEND] Erro: Nenhuma conversa ativa selecionada.");
            alert("Selecione uma conversa para enviar!");
            return;
        }

        let payload;

        if (messageData) {
            if (!activeConversationId) return;
            payload = {
                to: activeConversationId,
                text: messageData.text || '',
                imageUrl: messageData.imageUrl || '',
                templateName: messageData.templateName || ''
            };
        } else {
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

            if (!messageData) {
                messageInput.value = '';
            }

            // applyFiltersAndRender();

            if (activeConversationId && allConversations[activeConversationId]) {
                renderMessagesFor(activeConversationId, false);
            }

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
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

        // applyFiltersAndRender();
    
        if (activeConversationId && allConversations[activeConversationId]) {
            renderMessagesFor(activeConversationId, false);
        }
    }

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

    setInterval(fetchAll, 3000);
    fetchAll();
    
});
