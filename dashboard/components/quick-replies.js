// public/components/quick-replies.js

function initializeQuickReplies(options) {
    const { triggerButton, pickerContainer, searchInput, addButton, listContainer, modal, onSend } = options;
    
    let allReplies = [];

    // Busca os dados da API
    async function fetchData() {
        const response = await fetch('/api/quick-replies');
        allReplies = await response.json();
        renderList(allReplies);
    }

    // Renderiza a lista de mensagens rápidas no painel
    function renderList(replies) {
        listContainer.innerHTML = '';
        const repliesToShow = replies.slice(0, 5); // Mostra apenas as 5 primeiras
        
        repliesToShow.forEach(reply => {
            const li = document.createElement('li');
            li.className = 'qr-list-item';
            li.innerHTML = `
                <div class="qr-content" data-id="${reply.id}">
                    <div class="qr-name">${reply.name}</div>
                    <div class="qr-text">${reply.text.substring(0, 40)}...</div>
                </div>
                <div class="qr-actions">
                    <button class="edit-btn" data-id="${reply.id}">Editar</button>
                </div>
            `;
            listContainer.appendChild(li);
        });
    }

    // Filtra a lista com base na busca
    function handleSearch() {
        const query = searchInput.value.toLowerCase();
        const filtered = allReplies.filter(r => r.name.toLowerCase().includes(query) || r.text.toLowerCase().includes(query));
        renderList(filtered);
    }

    // Abre o modal para adicionar ou editar
    function showModal(replyId = null) {
        const form = modal.querySelector('form');
        form.reset();
        modal.querySelector('#modal-title').textContent = replyId ? 'Editar Mensagem Rápida' : 'Adicionar Mensagem Rápida';
        
        if (replyId) {
            const reply = allReplies.find(r => r.id === replyId);
            form.querySelector('#reply-id').value = reply.id;
            form.querySelector('#reply-name').value = reply.name;
            form.querySelector('#reply-text').value = reply.text;
            form.querySelector('#reply-image').value = reply.imageUrl;
            form.querySelector('#reply-template').value = reply.templateName;
        }
        
        modal.classList.remove('hidden');
    }

    // Salva os dados do modal
    async function saveReply(event) {
        event.preventDefault();
        const form = event.target;
        const replyData = {
            id: form.querySelector('#reply-id').value || null,
            name: form.querySelector('#reply-name').value,
            text: form.querySelector('#reply-text').value,
            imageUrl: form.querySelector('#reply-image').value,
            templateName: form.querySelector('#reply-template').value,
        };
        
        await fetch('/api/quick-replies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(replyData)
        });

        modal.classList.add('hidden');
        await fetchData(); // Recarrega os dados
    }

    // --- Event Listeners ---
    triggerButton.addEventListener('click', (e) => {
        e.stopPropagation();
        pickerContainer.classList.toggle('hidden');
        if (!pickerContainer.classList.contains('hidden')) {
            fetchData();
        }
    });

    searchInput.addEventListener('input', handleSearch);
    addButton.addEventListener('click', () => showModal());
    modal.querySelector('#cancel-modal-btn').addEventListener('click', () => modal.classList.add('hidden'));
    modal.querySelector('form').addEventListener('submit', saveReply);
    
    // Delegação de eventos para os botões da lista
    listContainer.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const contentDiv = e.target.closest('.qr-content');
        
        if (editBtn) {
            showModal(editBtn.dataset.id);
        } else if (contentDiv) {
            const reply = allReplies.find(r => r.id === contentDiv.dataset.id);
            onSend(reply); // Chama o callback de envio passado na inicialização
            pickerContainer.classList.add('hidden');
        }
    });

    // Fecha se clicar fora
    document.addEventListener('click', (e) => {
        if (!pickerContainer.contains(e.target) && e.target !== triggerButton) {
            pickerContainer.classList.add('hidden');
        }
    });
}
