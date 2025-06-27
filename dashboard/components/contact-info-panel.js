// public/components/contact-info-panel.js

function initializeContactInfoPanel(options) {
    const { panel, header, closeButton, body, onSaveObservations } = options;

    let currentContactId = null;
    let saveTimeout = null;

    // Mostra ou esconde o painel
    function togglePanel(visible) {
        panel.classList.toggle('visible', visible);
        panel.classList.toggle('hidden', !visible);
    }

    // Renderiza os dados do contato no painel
    function render(contactData) {
        currentContactId = contactData.wa_id;
        body.innerHTML = `
            <div class="info-group">
                <strong>Nome do Contato</strong>
                <span>${contactData.profile.name || 'Não fornecido'}</span>
            </div>
            <div class="info-group">
                <strong>Número (WA ID)</strong>
                <span>${contactData.wa_id}</span>
            </div>
            <div class="info-group">
                <strong>Observações</strong>
                <textarea id="observations-textarea">${contactData.observations || ''}</textarea>
            </div>
        `;

        const textarea = body.querySelector('#observations-textarea');
        textarea.addEventListener('input', () => {
            // Usa um debounce para não salvar a cada tecla pressionada
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                onSaveObservations(currentContactId, textarea.value);
            }, 1000); // Salva 1 segundo após o usuário parar de digitar
        });
    }
    
    // Listeners do componente
    header.addEventListener('click', () => {
        if (currentContactId) { // Só abre se um contato estiver ativo
            togglePanel(true);
        }
    });
    closeButton.addEventListener('click', () => togglePanel(false));
    
    // Interface pública do componente
    return {
        render,
        show: () => togglePanel(true),
        hide: () => togglePanel(false),
        setCurrentContactId: (id) => { currentContactId = id; }
    };
}
