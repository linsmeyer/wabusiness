// script.js

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
    
    
    let allConversations = {};
    let allContacts = {}; // NOVO
    let activeConversationId = null;
    let contactInfoPanel; // NOVO

    // =======================================================================
    // == INICIALIZAÇÃO DE COMPONENTES                                      ==
    // =======================================================================
    
    // Inicializa o painel de informações de contato IMEDIATAMENTE
    // Ele começa escondido e será preenchido com dados depois.
    contactInfoPanel = initializeContactInfoPanel({
        panel: contactInfoPanelElement,
        header: chatHeader, // O cabeçalho do chat é o gatilho para abrir
        closeButton: document.getElementById('close-info-panel-btn'),
        body: contactInfoPanelElement.querySelector('.info-panel-body'),
        onSaveObservations: async (contactId, observations) => {
            console.log(`[SAVE] Salvando observações para ${contactId}...`);
            await fetch(`/api/contacts/${contactId}/observations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ observations })
            });
            // Atualiza o estado local para evitar uma recarga completa
            if (allContacts[contactId]) {
                allContacts[contactId].observations = observations;
            }
        }
    });
    
    // Inicializa outros componentes...
    // initializeEmojiPicker(...);
    // initializeQuickReplies(...);


    // =======================================================================
    // == FUNÇÕES DE DADOS E RENDERIZAÇÃO                                   ==
    // =======================================================================
    
    async function fetchAllData() {
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
                console.log("[DATA] Dados atualizados, renderizando UI");
                allConversations = newConversations;
                allContacts = newContacts;
                renderConversationList();
                // Se uma conversa estava ativa, atualiza seus dados na tela
                if (activeConversationId && allConversations[activeConversationId]) {
                    renderMessagesFor(activeConversationId);
                    // Atualiza o painel de info se estiver aberto
                    const contactDetails = allContacts[activeConversationId];
                    if (contactDetails) {
                        contactInfoPanel.render(contactDetails);
                    }
                }
            }
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
        }
    }

    function renderConversationList() {
        const lastActiveId = activeConversationId; // Guarda o ID ativo antes de limpar a lista
        conversationList.innerHTML = '';
        
        Object.values(allConversations)
            .filter(c => c.messages.length > 0) // Garante que só conversas com mensagens apareçam
            .sort((a,b) => b.messages.slice(-1)[0].timestamp - a.messages.slice(-1)[0].timestamp)
            .forEach(convo => {
                const contactId = convo.contact;
                const contactDetails = allContacts[contactId];
                const displayName = contactDetails?.profile?.name || contactId;

                const li = document.createElement('li');
                li.className = 'conversation-item';
                li.dataset.contactId = contactId;
                li.innerHTML = `
                    <span class="contact-id">${displayName}</span>
                    <span class="last-message">${convo.messages.slice(-1)[0]?.text || ''}</span>
                `;
                li.addEventListener('click', () => selectConversation(contactId));
                conversationList.appendChild(li);
            });
            
        // Restaura a seleção se ainda existir
        if (lastActiveId && allConversations[lastActiveId]) {
            document.querySelector(`.conversation-item[data-contact-id="${lastActiveId}"]`)?.classList.add('active');
        }
    }
    
    function selectConversation(contactId) {
        if (activeConversationId === contactId) return; // Não faz nada se já está selecionado
        
        console.log(`[UI] Selecionando conversa: ${contactId}`);
        activeConversationId = contactId;
        
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
    }

    function renderMessagesFor(contactId) {
        const conversation = allConversations[contactId];
        messageList.innerHTML = ''; 
        if (!conversation) return;

        conversation.messages.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.className = `message-bubble ${msg.direction}`;
            bubble.textContent = msg.text;
            messageList.appendChild(bubble);
        });
        
        // Rola para a mensagem mais recente
        messageList.scrollTop = messageList.scrollHeight;
    }

    // --- LÓGICA DE POLLING ---
    // Verifica por novas mensagens a cada 3 segundos
    setInterval(fetchAllData, 3000); // Agora busca tudo

    // setInterval(fetchAndRenderConversations, 3000);

    
    async function sendMessage() {
         const text = messageInput.value.trim(); if (!text || !activeConversationId) return; await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: activeConversationId, text: text }) }); messageInput.value = ''; await fetchAndRenderConversations();
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => e.key === 'Enter' && sendMessage());

    // NOVO
    const emojiButton = document.getElementById('emoji-button');
    const emojiPickerContainer = document.getElementById('emoji-picker-container');

    
    // =======================================================================
    // == INICIALIZAÇÃO DE COMPONENTES                                      ==
    // =======================================================================
    // Chamamos a função do nosso novo script para ativar o seletor de emojis
    initializeEmojiPicker({
        triggerButton: emojiButton,
        inputField: messageInput,
        pickerContainer: emojiPickerContainer
    });
    // Aqui você poderia adicionar: initializeAttachmentPicker(...), etc.
    // =======================================================================

    const quickReplyButton = document.getElementById('quick-reply-button');
    const quickReplyPicker = document.getElementById('quick-reply-picker');
    const quickReplyModal = document.getElementById('quick-reply-modal');
    
    
    initializeQuickReplies({
        triggerButton: quickReplyButton,
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


    // --- FUNÇÃO DE ENVIO MODIFICADA ---
    async function sendMessageFast(messageData = null) {
        let payload;

        if (messageData) {
            // Veio de uma mensagem rápida
            payload = {
                to: activeConversationId,
                text: messageData.text,
                imageUrl: messageData.imageUrl,
                templateName: messageData.templateName
            };
        } else {
            // Veio do input manual
            const text = messageInput.value.trim();
            if (!text || !activeConversationId) return;
            payload = { to: activeConversationId, text: text };
        }
        
        await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        messageInput.value = '';
        await fetchAndRenderConversations();
    }


    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Adicionado !e.shiftKey para permitir quebra de linha
            e.preventDefault();
            sendMessage();
        }
    });
    
    fetchAllData();// Carga inicial
});