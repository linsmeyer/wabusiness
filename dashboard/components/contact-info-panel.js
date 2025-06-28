// public/components/contact-info-panel.js

function initializeContactInfoPanel(options) {
    const { panel, header, closeButton, onSave } = options;

    let currentContactId = null;
    let saveTimeout = null;

    // Mostra ou esconde o painel
    function togglePanel(visible) {
        panel.classList.toggle('visible', visible);
        panel.classList.toggle('hidden', !visible);
    }

    const savePanelData = () => {
        if (!currentContactId) return;

        const nameInput = panel.querySelector('#contact-name-input');
        const observationsInput = panel.querySelector('#observations-textarea');

        // Cria o objeto com os novos dados
        const dataToSave = {
            name: nameInput.value,
            observations: observationsInput.value
        };

        // Chama o callback de salvamento, passando o ID e os dados
        onSave(currentContactId, dataToSave);
    };

    // Renderiza os dados do contato no painel
    function render(contactData) {
        currentContactId = contactData.wa_id;
        const body = panel.querySelector('.info-panel-body');
        body.innerHTML = `
        <div class="info-group">
                <strong>Nome do Contato</strong>
                <input type="text" id="contact-name-input" class="info-input" value="${contactData.profile.name || 'Não fornecido'}" placeholder="Adicionar nome...">
            </div>
            <div class="info-group">
                <strong>Número (WA ID)</strong>
                <span class="text-gray-500">${contactData.wa_id}</span>
            </div>
            <div class="info-group">
                <strong>Observações</strong>
                <textarea id="observations-textarea" class="info-textarea" placeholder="Adicionar observação...">${contactData.observations || ''}</textarea>
            </div>
        `;

        body.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(savePanelData, 1000);
            });
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
