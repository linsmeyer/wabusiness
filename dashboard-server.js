// dashboard-server.js

/* INFORMAÇÕES DA ARQUITETURA DO PROJETO

OBJETIVO: Servidor do dashboard de mensagens.
STATUS: IMPLANTADO
*/

const express = require('express');
// const cors = 'cors'; // Descomente se precisar
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const app = express();
const PORT = 4000;

const PUBLIC_PATH = path.join(__dirname, 'public');
const DATA_PATH = path.join(__dirname, 'data');
const CSV_FILE_PATH = path.join(DATA_PATH, 'messages.csv');
const CONTACTS_FILE_PATH = path.join(DATA_PATH, 'contacts.json');
const QR_FILE_PATH = path.join(DATA_PATH, 'quick_replies.json');
const KANBAN_LEADS_CSV_PATH = path.join(DATA_PATH, 'contatos.csv');


app.use(express.json());
// app.use(cors()); // Descomente se precisar
app.use(express.static(PUBLIC_PATH));


app.post('/api/kanban/send-message', (req, res) => {
    const cardData = req.body;

    // Validação básica
    if (!cardData || !cardData.telefone) {
        return res.status(400).json({ success: false, error: 'Dados do card inválidos.' });
    }
    
    // console.log(JSON.stringify(cardData));

    // Monta uma string com todos os dados do card para o alert
    // 1. Filtra as chaves do objeto para pegar apenas as que são números inteiros.
    const paramKeys = Object.keys(cardData)
        .filter(key => !isNaN(parseInt(key, 10))) // Checa se a chave é um número
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10)); // Ordena as chaves numericamente (1, 2, 3...)

    // 2. Cria o array de parâmetros na ordem correta.
    const params = paramKeys.map(key => cardData[key]);

    // 3. Monta o novo JSON formatado.
    const formattedJson = {
        telefone: cardData.telefone,
        template_id: cardData.template_id,
        params: params
    };
    // --- Fim da Lógica de Transformação ---

    console.log(`[KANBAN-SEND] Recebido card para: ${cardData.telefone}`);
    console.log(`[KANBAN-SEND] JSON Formatado para envio:`, JSON.stringify(formattedJson, null, 2));
        
    // Simula um tempo de processamento/envio de rede (entre 200ms e 700ms)
    const delay = Math.random() * 500 + 200; 

    setTimeout(() => {
        console.log(`[KANBAN-SEND] Processado com sucesso: ${cardData.telefone}`);
        res.status(200).json({ success: true, message: `Mensagem enviada para ${cardData.telefone}` });
    }, delay);
});


app.get('/api/kanban-leads', (req, res) => {
    
    if (!fs.existsSync(KANBAN_LEADS_CSV_PATH)) {
        console.error(`[KANBAN-API] Erro: Arquivo não encontrado em ${KANBAN_LEADS_CSV_PATH}`);
        return res.json([]);
    }

    const leads = [];

    fs.createReadStream(KANBAN_LEADS_CSV_PATH)
        .pipe(csv())
        .on('data', (row) => {
            // Validação básica para garantir que a linha tem os dados esperados.
            if (!row.telefone) {
                return; // Pula linhas vazias ou malformadas
            }
            
            // Cria um novo objeto "lead" com os campos mapeados para nomes descritivos.
            const newLead = {
                // ID único para o card, essencial para o drag-and-drop
                id: `card-${row.telefone}-${Math.random().toString(36).substr(2, 9)}`,
                
                // Mapeamento dos campos
                telefone: row.telefone,
                nome: row['1'] || '', // Pega o valor da coluna "1" e mapeia para "nome"
                valor: row['2'] || '', // Pega o valor da coluna "2" e mapeia para "valor"
                vencimento: row['3'] || '', // Pega o valor da coluna "3" e mapeia para "vencimento"

                // Mantemos o objeto 'data' original para a funcionalidade "show-card-info"
                data: row 
            };
            
            leads.push(newLead);
        })
        .on('end', () => {
            console.log(`[KANBAN-API] Leitura concluída. Encontrados ${leads.length} leads.`);
            res.status(200).json(leads);
        })
        .on('error', (error) => {
            console.error("Erro ao ler o arquivo CSV para o Kanban:", error);
            res.status(500).json({ error: "Erro interno ao processar os dados dos leads." });
        });
});


// Rota de conversas completa
app.get('/api/conversations', async (req, res) => {
    const conversations = {};
    if (!fs.existsSync(CSV_FILE_PATH)) return res.json({});

    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {

            const contactNumber = row.from;
            if (!conversations[contactNumber]) {
                conversations[contactNumber] = {
                    contact: contactNumber,
                    messages: [],
                    unreadCount: 0 // Novo campo
                };
            }
            
            const message = {
                id: row.message_id,
                text: row.content,
                timestamp: row.timestamp,
                direction: row.direction,
                is_read: row.is_read === 'true'
            };
            conversations[contactNumber].messages.push(message);

            // Incrementa a contagem se a mensagem for recebida e não lida
            if (row.direction === 'in' && row.is_read === 'false') {
                // console.log(JSON.stringify(row));
                conversations[contactNumber].unreadCount++;
                // console.log(conversations[contactNumber].unreadCount);
            }
            
        })
        .on('end', () => {
            for (const contact in conversations) {
                conversations[contact].messages.sort( (a, b) => a.timestamp - b.timestamp);
            }
            res.json(conversations);
        });
});

// ==============================================================================
// ==  FUNÇÃO AUXILIAR PARA FORMATAÇÃO DE LINHA CSV                            ==
// ==============================================================================

/**
 * Formata um objeto de dados em uma linha de CSV, adicionando aspas
 * apenas ao campo 'content'.
 * @param {object} rowObject - O objeto a ser formatado.
 * @param {string[]} headers - Um array com os nomes das colunas na ordem correta.
 * @returns {string} - A linha formatada para o CSV.
 */
function formatCsvRow(rowObject, headers) {
    return headers.map(header => {
        const value = rowObject[header] || '';
        if (header === 'content') {
            // Escapa aspas existentes dentro do conteúdo e envolve com novas aspas
            return `"${String(value).replace(/"/g, '""')}"`;
        }
        return String(value);
    }).join(',');
}


// ==============================================================================
// ==  ENDPOINT /log-message (CORRIGIDO)                                       ==
// ==============================================================================
app.post('/api/log-message', (req, res) => {
    const { from, text, direction } = req.body;
    if (!from || !text || !direction) return res.status(400).send('Dados insuficientes.');

    const headers = ['timestamp', 'from', 'type', 'content', 'message_id', 'direction', 'is_read'];
    
    const newRowObject = {
        timestamp: Math.floor(Date.now() / 1000),
        from: from,
        type: 'text',
        content: text,
        message_id: `wamid.simulated.${Date.now()}`,
        direction: direction,
        is_read: direction === 'out' ? 'true' : 'false'
    };

    const csvLine = formatCsvRow(newRowObject, headers) + '\n';
     
    const logLine = `${newRowObject.timestamp},${newRowObject.from},${newRowObject.type},"${newRowObject.content}",${newRowObject.message_id},${newRowObject.direction},${newRowObject.is_read}\n`;
    
    console.log('csvLine');
    console.log(csvLine);
    
    // Se o arquivo não existe, cria com o cabeçalho (sem aspas)
    if (!fs.existsSync(CSV_FILE_PATH)) {
        fs.writeFileSync(CSV_FILE_PATH, headers.join(',') + '\n');
    }
    
    // Adiciona a nova linha formatada
    fs.appendFileSync(CSV_FILE_PATH, csvLine);
    console.log(`[CSV-WRITER] Nova mensagem para ${from} registrada.`);
    res.status(200).json(newRowObject);
});


// ==============================================================================
// ==  ROTAS mark-as-read E mark-as-unread (CORRIGIDAS)                        ==
// ==============================================================================
function updateReadStatus(req, res, markAs) {
    const { contactId } = req.params;
    if (!fs.existsSync(CSV_FILE_PATH)) return res.status(404).send('Arquivo não encontrado.');

    const rows = [];
    let headers = [];

    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('headers', (h) => { headers = h; })
        .on('data', (row) => rows.push(row))
        .on('end', () => {
            let updated = false;
            let lastIncomingIndex = -1;

            if (markAs === 'unread') {
                for (let i = rows.length - 1; i >= 0; i--) {
                    if (rows[i].from === contactId && rows[i].direction === 'in') {
                        lastIncomingIndex = i;
                        break;
                    }
                }
                if (lastIncomingIndex !== -1) {
                    rows[lastIncomingIndex].is_read = 'false';
                    updated = true;
                }
            } else { // markAs === 'read'
                rows.forEach(row => {
                    if (row.from === contactId && row.direction === 'in' && row.is_read === 'false') {
                        row.is_read = 'true';
                        updated = true;
                    }
                });
            }

            if (updated) {
                // Reescreve o arquivo inteiro
                const headerLine = headers.join(',') + '\n';
                const dataLines = rows.map(row => formatCsvRow(row, headers)).join('\n');
                
                // =========================================================
                // ==  A CORREÇÃO ESTÁ AQUI                               ==
                // =========================================================
                // Adiciona uma quebra de linha no final do conteúdo completo
                const fileContent = headerLine + dataLines + '\n'; 
                // =========================================================

                fs.writeFileSync(CSV_FILE_PATH, fileContent);
                console.log(`[CSV-WRITER] Arquivo reescrito para ${contactId} (status: ${markAs}).`);
            }
            
            res.status(200).json({ success: true });
        });
}


app.post('/api/conversations/:contactId/mark-as-read', (req, res) => {
    updateReadStatus(req, res, 'read');
});

app.post('/api/conversations/:contactId/mark-as-unread', (req, res) => {
    updateReadStatus(req, res, 'unread');
});

// GET /api/quick-replies - Lê todas as mensagens rápidas
app.get('/api/quick-replies', (req, res) => {
    if (!fs.existsSync(QR_FILE_PATH)) {
        return res.json([]); // Retorna array vazio se o arquivo não existe
    }
    const data = fs.readFileSync(QR_FILE_PATH, 'utf-8');
    res.json(JSON.parse(data));
});

// POST /api/quick-replies - Salva (cria ou atualiza) mensagens rápidas
app.post('/api/quick-replies', (req, res) => {
    const newOrUpdatedReply = req.body;
    let replies = [];

    if (fs.existsSync(QR_FILE_PATH)) {
        replies = JSON.parse(fs.readFileSync(QR_FILE_PATH, 'utf-8'));
    }

    const existingIndex = replies.findIndex(r => r.id === newOrUpdatedReply.id);

    if (existingIndex !== -1) {
        // Atualiza
        replies[existingIndex] = newOrUpdatedReply;
    } else {
        // Cria novo
        newOrUpdatedReply.id = `qr_${Date.now()}`;
        replies.push(newOrUpdatedReply);
    }

    fs.writeFileSync(QR_FILE_PATH, JSON.stringify(replies, null, 2));
    res.status(200).json(newOrUpdatedReply);
});


// --- Rota /api/send MODIFICADA ---
// Agora ela precisa ser mais flexível para lidar com texto, imagem ou template
app.post('/api/send', async (req, res) => {
    const { to, text, imageUrl, templateName } = req.body;
    
    // Lógica para registrar no CSV (pode ser aprimorada para registrar o tipo de envio)
    const logText = templateName ? `[Template: ${templateName}] ${text}` : text;
    
    // Aqui você faria a chamada real para o seu mock da API da Meta,
    // construindo o payload correto com base nos dados recebidos.
    console.log(`[SIMULAÇÃO] Enviando para a API Meta: to=${to}, text="${text}", image="${imageUrl}", template="${templateName}"`);

    // A lógica de log no CSV continua a mesma por simplicidade
    await fetch(`http://localhost:${PORT}/api/log-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: to, text: text, direction: 'out' })
    });
    
    res.status(200).json({ success: true });
});

// GET /api/contacts - Lê todos os contatos
app.get('/api/contacts', (req, res) => {
    if (!fs.existsSync(CONTACTS_FILE_PATH)) {
        return res.json({});
    }
    const data = fs.readFileSync(CONTACTS_FILE_PATH, 'utf-8');
    res.json(JSON.parse(data));
});

// POST /api/contacts/:contactId/observations - Salva as observações de um contato
app.post('/api/contacts/:contactId', (req, res) => {
    const { contactId } = req.params;
    const { name, observations } = req.body;

    let allContacts = {};
    // Lê o arquivo existente ou começa com um objeto vazio se não existir
    if (fs.existsSync(CONTACTS_FILE_PATH)) {
        allContacts = JSON.parse(fs.readFileSync(CONTACTS_FILE_PATH, 'utf-8'));
    }

    // Se o contato não existe, cria a estrutura base
    if (!allContacts[contactId]) {
        allContacts[contactId] = {
            profile: { name: '' },
            wa_id: contactId,
            observations: ''
        };
        console.log(`[CONTACTS] Criando novo registro para o contato: ${contactId}`);
    }

    // Atualiza os dados com as informações recebidas
    // Apenas atualiza se o dado foi enviado no corpo da requisição
    if (name !== undefined) {
        allContacts[contactId].profile.name = name;
    }
    if (observations !== undefined) {
        allContacts[contactId].observations = observations;
    }

    // Salva o arquivo completo de volta no disco
    fs.writeFileSync(CONTACTS_FILE_PATH, JSON.stringify(allContacts, null, 2));
    
    console.log(`[CONTACTS] Dados atualizados para o contato: ${contactId}`);
    res.status(200).json(allContacts[contactId]);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor Unificado rodando em http://localhost:${PORT}`);
    console.log(`   -> Interface de Chat: http://localhost:${PORT}`);
    console.log(`   -> Interface de Templates: http://localhost:${PORT}/templates`);
});
