// templates.js
document.addEventListener('DOMContentLoaded', () => {

    console.log("Script da página de templates carregado!");
    
    const LS_KEY = 'whatsapp_templates_saved';

    // --- ELEMENTOS DO DOM ---
    const elements = {
        templateSelector: document.getElementById('template-selector'),
        savedTemplateSelector: document.getElementById('saved-template-selector'),
        templateNameInput: document.getElementById('template-name-input'),
        templateCategorySelector: document.getElementById('template-category-selector'),
        headerType: document.getElementById('header-type'),
        headerContent: document.getElementById('header-content'),
        bodyContent: document.getElementById('body-content'),
        footerContent: document.getElementById('footer-content'),
        buttonsEditor: document.getElementById('buttons-editor'),
        addReplyBtn: document.getElementById('add-reply-btn'),
        addCtaBtn: document.getElementById('add-cta-btn'),
        jsonOutput: document.getElementById('json-output'),
        renderFromJsonBtn: document.getElementById('render-from-json-btn'),
        headerVariableActions: document.getElementById('header-variable-actions'),
        addHeaderVariableBtn: document.getElementById('add-header-variable-btn'),
        removeHeaderVariableBtn: document.getElementById('remove-header-variable-btn'),
        addBodyVariableBtn: document.getElementById('add-body-variable-btn'),
        removeBodyVariableBtn: document.getElementById('remove-body-variable-btn'),
        variablesEditor: document.getElementById('variables-editor'),
        saveTemplateBtn: document.getElementById('save-template-btn'),
        deleteTemplateBtn: document.getElementById('delete-template-btn'),
        preview: {
            /* ... (inalterado) ... */
            body: document.getElementById('preview-body'),
            header: document.getElementById('preview-header'),
            footer: document.getElementById('preview-footer'),
            buttons: document.getElementById('preview-buttons'),
        }
    };

    const templateExamples = {
        marketing_promo: {
            name: "marketing_promo",
            components: [{
                type: "HEADER",
                format: "IMAGE",
                example: {
                    header_handle: ["https://i.imgur.com/example.png"]
                }
            }, {
                type: "BODY",
                text: "Olá {{1}}!!!\nVimos que você não pode comparecer na avaliação com nosso especialista em aparelho dental... \nComo a vaga que vc reservou te oferece uma série de ítens para iniciar o tratamento, gostaríamos de saber se ainda tem interesse na vaga, ou se podemos oferece-la para outra pessoa.",
                example: {
                    body_text: [["Aparecida"]]
                }
            }, {
                type: "BUTTONS",
                buttons: [{
                    type: "QUICK_REPLY",
                    text: "QUERO A VAGA"
                }, {
                    type: "QUICK_REPLY",
                    text: "PASSAR PARA OUTRA PESSOA"
                }]
            }]
        },
        utility_status: {
            name: "utility_status",
            components: [{
                type: "HEADER",
                format: "TEXT",
                text: "Our {{1}} is on!",
                example: {
                    header_text: [["Aparecida"]]
                }
            }, {
                type: "BODY",
                text: "Olá {{1}}!!! Estamos passando pra te lembrar que HOJE vc tem consulta com seu DENTISTA aqui na ORTHODONTIC! Horário: {{2}}",
                example: {
                    body_text: [["Aparecida", "14:30h PM"]]
                }
            }, {
                type: "BUTTONS",
                buttons: [{
                    type: "QUICK_REPLY",
                    text: "CONFIRMADO"
                }, {
                    type: "QUICK_REPLY",
                    text: "REMARCAR"
                }]
            }]
        },
        auth_code: {
            name: "auth_code",
            components: [{
                type: "BODY",
                text: "Seu código de verificação é {{1}}. Para sua segurança, não o compartilhe.",
                example: {
                    body_text: [["831094"]]
                }
            }, {
                type: "BUTTONS",
                buttons: [{
                    type: "OTP",
                    text: "Copiar Código",
                    otp_type: "COPY_CODE"
                }]
            }]
        },
        utility_document: {
            name: "utility_document",
            components: [{
                type: "HEADER",
                format: "DOCUMENT",
                example: {
                    header_handle: ["https://www.suaempresa.com/fatura.pdf"]
                }
            }, {
                type: "BODY",
                text: "Olá {{1}}, segue em anexo a sua fatura com vencimento em {{2}}. Se precisar de ajuda, entre em contato.",
                example: {
                    body_text: [["Carlos", "15/12/2023"]]
                }
            }, {
                type: "FOOTER",
                text: "Atendimento de Seg a Sex, 9h às 18h."
            }]
        }
    };

    // --- FUNÇÕES DE LÓGICA DO LOCALSTORAGE ---

    function populateSavedTemplatesDropdown() {
        const templates = getSavedTemplates();
        elements.savedTemplateSelector.innerHTML = '<option value="">Selecione...</option>';
        Object.keys(templates).sort().forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            elements.savedTemplateSelector.appendChild(option);
        });
    }

    // Constrói um objeto de estado completo para salvar
    function buildStateForSaving() {
        const state = {
            name: elements.templateNameInput.value.trim(),
            category: elements.templateCategorySelector.value,
            header: {
                type: elements.headerType.value,
                content: elements.headerContent.value
            },
            body: elements.bodyContent.value,
            footer: elements.footerContent.value,
            buttons: [],
            variableExamples: {}
        };

        document.querySelectorAll('.button-editor-item').forEach(item => {
            const button = {
                type: item.dataset.type
            };
            if (button.type === 'QUICK_REPLY') {
                button.text = item.querySelector('input').value;
            } else {
                button.text = item.querySelector('.button-text-input').value;
                button.value = item.querySelector('.button-value-input').value;
            }
            state.buttons.push(button);
        });

        document.querySelectorAll('.variable-editor-item input').forEach(input => {
            const id = input.id.replace('variable-example-', '');
            state.variableExamples[id] = input.value;
        });

        return state;
    }

    function saveCurrentTemplate() {
        const state = buildStateForSaving();
        if (!state.name) {
            alert('Por favor, forneça um nome para o template antes de salvar.');
            return;
        }

        const templates = getSavedTemplates();
        templates[state.name] = state;
        localStorage.setItem(LS_KEY, JSON.stringify(templates));

        alert(`Template "${state.name}" salvo com sucesso!`);
        populateSavedTemplatesDropdown();
        elements.savedTemplateSelector.value = state.name;
    }

    function loadState(state) {
        // Resetar UI
        elements.templateNameInput.value = state.name || '';
        elements.templateCategorySelector.value = state.category || 'UTILITY';
        elements.headerType.value = state.header?.type || 'none';
        elements.headerContent.value = state.header?.content || '';
        elements.bodyContent.value = state.body || '';
        elements.footerContent.value = state.footer || '';
        elements.buttonsEditor.innerHTML = '';

        (state.buttons || []).forEach(btn => addButtonEditor(btn.type, btn.text, btn.value));

        syncAll();
        // Sincroniza para criar os campos de variáveis

        // Preenche os exemplos de variáveis
        Object.keys(state.variableExamples || {}).forEach(key => {
            const input = document.getElementById(`variable-example-${key}`);
            if (input)
                input.value = state.variableExamples[key];
        });

        syncAll();
        // Sincroniza novamente para refletir os exemplos no preview
    }

    function deleteSelectedTemplate() {
        const selectedName = elements.savedTemplateSelector.value;
        if (!selectedName) {
            alert('Por favor, selecione um template salvo para deletar.');
            return;
        }

        if (confirm(`Tem certeza que deseja deletar o template "${selectedName}"?`)) {
            const templates = getSavedTemplates();
            delete templates[selectedName];
            localStorage.setItem(LS_KEY, JSON.stringify(templates));
            alert('Template deletado.');
            populateSavedTemplatesDropdown();
            // Limpa o formulário
            elements.templateSelector.value = Object.keys(templateExamples)[0];
            loadFromPayload(templateExamples[elements.templateSelector.value]);
        }
    }

    // --- FUNÇÕES DE LÓGICA PRINCIPAL (Adaptadas) ---
    // Funções como getVariablesFromBody, updateVariableEditors, buildPayloadFromControls, renderPreview, etc.
    // permanecem praticamente as mesmas da versão anterior. As adaptações são feitas
    // nas funções de carga e nos event listeners.

    // Compila todas as variáveis únicas do Header e Body
    
    // --- FUNÇÕES DE LÓGICA (Adaptadas para Multi-local de Variáveis) ---

    // Helper genérico para extrair variáveis de qualquer string
    const getVariablesFromText = (text) => {
        const matches = text.match(/{{\s*(\d+)\s*}}/g) || [];
        return matches.map(v => parseInt(v.replace(/{{|}}/g, '')));
    };

    // Compila todas as variáveis únicas do Header e Body
    function getAllUniqueVariables() {
        let allVars = getVariablesFromText(elements.bodyContent.value);
        if (elements.headerType.value === 'text') {
            allVars = allVars.concat(getVariablesFromText(elements.headerContent.value));
        }
        return [...new Set(allVars)].sort((a, b) => a - b);
    }

    function updateVariableEditors() {
        const variableNumbers = getAllUniqueVariables();
        const existingValues = {};
        document.querySelectorAll('#variables-editor input').forEach(input => {
            existingValues[input.id] = input.value;
        });

        elements.variablesEditor.innerHTML = ''; 

        if (variableNumbers.length > 0) {
             const title = document.createElement('h4');
             title.textContent = "Valores de Exemplo para Visualização";
             elements.variablesEditor.appendChild(title);
        }

        // variableNumbers.forEach(num => { /* ... (lógica interna inalterada) ... */ });
        variableNumbers.forEach(num => { const id = `variable-example-${num}`; const item = document.createElement('div'); item.className = 'variable-editor-item'; item.innerHTML = `<label for="${id}">Exemplo para {{${num}}}:</label><input type="text" id="${id}" placeholder="Valor para {{${num}}}">`; const input = item.querySelector('input'); if (existingValues[id]) { input.value = existingValues[id]; } input.addEventListener('input', syncAll); elements.variablesEditor.appendChild(item); });
    }

    const getVariablesFromHeader = () => {
        /* ... (inalterado) ... */
        const text = elements.headerContent.value;
        const matches = text.match(/{{\s*(\d+)\s*}}/g) || [];
        const uniqueVars = [...new Set(matches)];
        return uniqueVars.map(v => parseInt(v.replace(/{{|}}/g, ''))).sort( (a, b) => a - b);
    };

    const getVariablesFromBody = () => {
        /* ... (inalterado) ... */
        const text = elements.bodyContent.value;
        const matches = text.match(/{{\s*(\d+)\s*}}/g) || [];
        const uniqueVars = [...new Set(matches)];
        return uniqueVars.map(v => parseInt(v.replace(/{{|}}/g, ''))).sort( (a, b) => a - b);
    };

    function buildPayloadFromControls() {
        const components = [];
        
        const variableHeaders = getVariablesFromHeader();
        const variableBody = getVariablesFromBody();
        // Header (agora inclui texto)
        const headerType = elements.headerType.value;
        if (headerType !== 'none') {
            const headerComponent = { type: 'HEADER', format: headerType.toUpperCase() };
            if (headerType === 'text') {
                headerComponent.text = elements.headerContent.value;
                if (variableHeaders.length > 0) {
                    // console.log(JSON.stringify(variableHeaders));
                    const headerValues = variableHeaders.map(num => document.getElementById(`variable-example-${num}`)?.value || '');
                    headerComponent.example = { header_text: [headerValues] };
                }

            }
            components.push(headerComponent);
        }

        // Body, Footer, Buttons (lógica inalterada)
        // components.push({ type: 'BODY', text: elements.bodyContent.value });
        const bodyComponent = { type: 'BODY', text: elements.bodyContent.value };

        if (variableBody.length > 0) {
            const bodyValues = variableBody.map(num => document.getElementById(`variable-example-${num}`)?.value || '');
            bodyComponent.example = { body_text: [bodyValues] };
        }

        components.push(bodyComponent);

        if (elements.footerContent.value) { components.push({ type: 'FOOTER', text: elements.footerContent.value }); }
        const buttons = [];
        document.querySelectorAll('.button-editor-item').forEach(item => { const btn = { type: item.dataset.type.toUpperCase() }; if(btn.type === 'QUICK_REPLY'){ btn.text = item.querySelector('input[type=text]').value; } else { btn.text = item.querySelector('.button-text-input').value; if(btn.type === 'URL') btn.url = item.querySelector('.button-value-input').value; else btn.phone_number = item.querySelector('.button-value-input').value; } buttons.push(btn); });
        if (buttons.length > 0) { components.push({ type: 'BUTTONS', buttons }); }

        return { name: elements.templateNameInput.value.trim() || 'sem_nome', language: "pt_BR", category: elements.templateCategorySelector.value, components };
    }

    function renderPreview(payload) {
        elements.preview.header.innerHTML = ''; elements.preview.body.innerHTML = ''; elements.preview.footer.innerHTML = ''; elements.preview.buttons.innerHTML = '';

        // Helper para substituir variáveis
        const substituteVariables = (text) => {
            const allVars = getAllUniqueVariables();
            let processedText = text;
            allVars.forEach(num => {
                const input = document.getElementById(`variable-example-${num}`);
                const exampleValue = input ? input.value : '';
                const varRegex = new RegExp(`{{\\s*${num}\\s*}}`, 'g');
                processedText = processedText.replace(varRegex, exampleValue || `{{${num}}}`);
            });
            return processedText;
        };
        
        payload.components.forEach(comp => {
            switch (comp.type) {
                case 'HEADER':
                    const headerFormat = comp.format.toLowerCase();
                    if (headerFormat === 'text') {
                        elements.preview.header.textContent = substituteVariables(comp.text);
                    } else if (headerFormat === 'image') { /* ... */ }
                    else { /* ... */ }
                    break;
                case 'BODY':
                    elements.preview.body.textContent = substituteVariables(comp.text);
                    break;
                case 'FOOTER': /* ... */
                    break;
                case 'BUTTONS': /* ... */
                    break;
            }
        });
        // Simplificado para focar nas mudanças, o código completo pode ser copiado da versão anterior
         payload.components.forEach(comp => { switch (comp.type) { case 'HEADER': const format = comp.format.toLowerCase(); if (format === 'text') { elements.preview.header.textContent = substituteVariables(comp.text); } else if (format === 'image') { elements.preview.header.innerHTML = `<img src="http://localhost:4000/assets/images/logo.png" alt="preview">`; } else { elements.preview.header.innerHTML = `<div class="placeholder">${comp.format}</div>`; } break; case 'BODY': elements.preview.body.textContent = substituteVariables(comp.text); break; case 'FOOTER': elements.preview.footer.textContent = comp.text || ""; break; case 'BUTTONS': comp.buttons.forEach(btn => { const btnEl = document.createElement('div'); btnEl.classList.add('wa-button'); if (btn.type === 'QUICK_REPLY') { btnEl.classList.add('reply'); btnEl.textContent = btn.text; } else { btnEl.classList.add('cta'); const icon = btn.type === 'URL' ? '🔗' : '📞'; btnEl.innerHTML = `${icon} ${btn.text}`; } elements.preview.buttons.appendChild(btnEl); }); break; } });
    }

    // Gerencia a visibilidade dos campos do Header
    function toggleHeaderControls() {
        const isText = elements.headerType.value === 'text';
        elements.headerContent.classList.toggle('hidden', !isText);
        elements.headerVariableActions.classList.toggle('hidden', !isText);
    }
    
    function syncAll() { updateVariableEditors(); const payload = buildPayloadFromControls(); renderJson(payload); renderPreview(payload); }
    
    // As funções de localStorage (buildStateForSaving, loadState, etc.) e as auxiliares (addButtonEditor, etc.) não precisam de grandes mudanças,
    // pois já salvam o estado dos inputs.
    const getSavedTemplates = () => JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    
    function populateSavedTemplatesDropdown() {
        const templates = getSavedTemplates();
        elements.savedTemplateSelector.innerHTML = '<option value="">Selecione...</option>';
        Object.keys(templates).sort().forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            elements.savedTemplateSelector.appendChild(option);
        });
    }

    // Constrói um objeto de estado completo para salvar
    function buildStateForSaving() {
        const state = {
            name: elements.templateNameInput.value.trim(),
            category: elements.templateCategorySelector.value,
            header: {
                type: elements.headerType.value,
                content: elements.headerContent.value
            },
            body: elements.bodyContent.value,
            footer: elements.footerContent.value,
            buttons: [],
            variableExamples: {}
        };

        document.querySelectorAll('.button-editor-item').forEach(item => {
            const button = {
                type: item.dataset.type
            };
            if (button.type === 'QUICK_REPLY') {
                button.text = item.querySelector('input').value;
            } else {
                button.text = item.querySelector('.button-text-input').value;
                button.value = item.querySelector('.button-value-input').value;
            }
            state.buttons.push(button);
        });

        document.querySelectorAll('.variable-editor-item input').forEach(input => {
            const id = input.id.replace('variable-example-', '');
            state.variableExamples[id] = input.value;
        });

        return state;
    }

    function saveCurrentTemplate() {
        const state = buildStateForSaving();
        if (!state.name) {
            alert('Por favor, forneça um nome para o template antes de salvar.');
            return;
        }

        const templates = getSavedTemplates();
        templates[state.name] = state;
        localStorage.setItem(LS_KEY, JSON.stringify(templates));

        alert(`Template "${state.name}" salvo com sucesso!`);
        populateSavedTemplatesDropdown();
        elements.savedTemplateSelector.value = state.name;
    }


    function loadState(state) {
        // Resetar UI
        elements.templateNameInput.value = state.name || '';
        elements.templateCategorySelector.value = state.category || 'UTILITY';
        elements.headerType.value = state.header?.type || 'none';
        elements.headerContent.value = state.header?.content || '';
        elements.bodyContent.value = state.body || '';
        elements.footerContent.value = state.footer || '';
        elements.buttonsEditor.innerHTML = '';

        (state.buttons || []).forEach(btn => addButtonEditor(btn.type, btn.text, btn.value));

        syncAll();
        // Sincroniza para criar os campos de variáveis

        // Preenche os exemplos de variáveis
        Object.keys(state.variableExamples || {}).forEach(key => {
            const input = document.getElementById(`variable-example-${key}`);
            if (input)
                input.value = state.variableExamples[key];
        });

        toggleHeaderControls(); 

        syncAll();
        // Sincroniza novamente para refletir os exemplos no preview
    }

    function renderJson(payload) { elements.jsonOutput.value = JSON.stringify(payload, null, 2); }

    function addButtonEditor(type, text='', value='') {
        /* ... (inalterado) ... */
        const item = document.createElement('div');
        item.className = 'button-editor-item';
        item.dataset.type = type;
        if (type === 'QUICK_REPLY') {
            item.innerHTML = `<input type="text" value="${text}" placeholder="Texto da Resposta Rápida"><button class="remove-btn">X</button>`;
        } else {
            const valueType = type === 'URL' ? 'URL' : 'Telefone';
            item.innerHTML = `<input type="text" class="button-text-input" value="${text}" placeholder="Texto do Botão (${valueType})"><input type="text" class="button-value-input" value="${value}" placeholder="${valueType}"><button class="remove-btn">X</button>`;
        }
        item.querySelector('.remove-btn').addEventListener('click', () => {
            item.remove();
            syncAll();
        });
        elements.buttonsEditor.appendChild(item);
        item.querySelectorAll('input').forEach(input => input.addEventListener('input', syncAll));
    }
    

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---

    // Listener para todos os inputs
    [elements.templateNameInput, elements.templateCategorySelector, elements.headerType, elements.headerContent, elements.bodyContent, elements.footerContent].forEach(el => el.addEventListener('input', syncAll));
    elements.headerType.addEventListener('change', () => {
        toggleHeaderControls();
        syncAll();
    });

    // Helper para adicionar/remover variáveis
    const manageVariables = (targetElement, add) => {
        const text = targetElement.value;
        if (add) {
            const allVars = getAllUniqueVariables();
            const nextVarNum = allVars.length > 0 ? Math.max(...allVars) + 1 : 1;
            targetElement.value += ` {{${nextVarNum}}}`;
        } else {
            const matches = getVariablesFromText(text);
            if (matches.length > 0) {
                const lastVarNum = matches[matches.length - 1];
                const lastVarStr = `{{${lastVarNum}}}`;
                const lastIndex = text.lastIndexOf(lastVarStr);
                targetElement.value = text.substring(0, lastIndex) + text.substring(lastIndex + lastVarStr.length);
            }
        }
        syncAll();
    };

    // Listeners dos botões de variáveis
    elements.addHeaderVariableBtn.addEventListener('click', () => manageVariables(elements.headerContent, true));
    elements.removeHeaderVariableBtn.addEventListener('click', () => manageVariables(elements.headerContent, false));
    elements.addBodyVariableBtn.addEventListener('click', () => manageVariables(elements.bodyContent, true));
    elements.removeBodyVariableBtn.addEventListener('click', () => manageVariables(elements.bodyContent, false));

    // Listeners de botões de ação e localStorage (praticamente inalterados)
    // ...
    // Para economizar espaço, o código completo dos listeners de botões e localStorage pode ser copiado da versão anterior.
    // O importante é que eles continuam chamando `syncAll()` e `loadState`/`buildStateForSaving` que já foram adaptados.
    
    // Carga Inicial
    // ...
    // Código de carga inicial e listeners restantes podem ser mantidos da versão anterior.
    // O código completo está abaixo para garantir a funcionalidade.

    // === CÓDIGO COMPLETO PARA GARANTIR FUNCIONALIDADE ===
    // (incluindo as partes marcadas como inalteradas)
    function loadFromPayload(payload) { elements.templateNameInput.value = payload.name || ''; elements.templateCategorySelector.value = payload.category || 'UTILITY'; elements.headerType.value = 'none'; elements.headerContent.value = ''; elements.bodyContent.value = ''; elements.footerContent.value = ''; elements.buttonsEditor.innerHTML = ''; payload.components.forEach(comp => { switch(comp.type) { case 'HEADER': elements.headerType.value = comp.format.toLowerCase(); if (comp.format === 'TEXT') { elements.headerContent.value = comp.text || ''; } else { elements.headerContent.value = comp.example?.header_handle?.[0] || ''; } break; case 'BODY': elements.bodyContent.value = comp.text; break; case 'FOOTER': elements.footerContent.value = comp.text; break; case 'BUTTONS': comp.buttons.forEach(btn => { if (btn.type === 'QUICK_REPLY') addButtonEditor('QUICK_REPLY', btn.text); else addButtonEditor(btn.type, btn.text, btn.type === 'URL' ? btn.url : btn.phone_number); }); break; } }); toggleHeaderControls(); syncAll(); const bodyExampleValues = payload.components.find(c => c.type === 'BODY')?.example?.body_text?.[0] || []; bodyExampleValues.forEach((value, index) => { const input = document.getElementById(`variable-example-${index + 1}`); if (input) input.value = value; }); syncAll(); }
    Object.keys(templateExamples).forEach(key => { const option = document.createElement('option'); option.value = key; option.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); elements.templateSelector.appendChild(option); });
    elements.templateSelector.addEventListener('change', (e) => { elements.savedTemplateSelector.value = ""; loadFromPayload(templateExamples[e.target.value]); });
    elements.savedTemplateSelector.addEventListener('change', (e) => { const selectedName = e.target.value; if (selectedName) { elements.templateSelector.value = Object.keys(templateExamples)[0]; const savedState = getSavedTemplates()[selectedName]; loadState(savedState); } });
    elements.saveTemplateBtn.addEventListener('click', saveCurrentTemplate);
    elements.deleteTemplateBtn.addEventListener('click', deleteSelectedTemplate);
    
    
    elements.addReplyBtn.addEventListener('click', () => {
        if (elements.buttonsEditor.childElementCount < 3) {
            addButtonEditor('QUICK_REPLY');
            syncAll();
        } else {
            alert('Máximo de 3 botões.');
        }
    });

    elements.addCtaBtn.addEventListener('click', () => {
        if (elements.buttonsEditor.childElementCount < 3) {
            const type = prompt("Tipo de CTA? 'URL' ou 'PHONE_NUMBER'?", "URL");
            if (type && (type.toUpperCase() === 'URL' || type.toUpperCase() === 'PHONE_NUMBER')) {
                addButtonEditor(type.toUpperCase());
                syncAll();
            } else if (type !== null) {
                alert('Tipo inválido.');
            }
        } else {
            alert('Máximo de 3 botões.');
        }
    });


    elements.renderFromJsonBtn.addEventListener('click', () => {
        try {
            const payload = JSON.parse(elements.jsonOutput.value);
            loadFromPayload(payload);
        } catch (error) {
            alert('JSON inválido!');
            console.error(error);
        }
    });

    populateSavedTemplatesDropdown();
    loadFromPayload(templateExamples.marketing_promo);
}
);
