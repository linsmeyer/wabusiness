// dashbiard-server.js

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
const PORT = 4000; // Usaremos uma porta diferente para a interface
const CSV_FILE_PATH = path.join(__dirname, 'data', 'messages.csv');
const CONTACTS_FILE_PATH = path.join(__dirname, 'data', 'contacts.json');

app.use(express.json());
// app.use(cors()); // Descomente se precisar
app.use(express.static('dashboard')); // Serve os arquivos da pasta 'dashboard'

// --- API PARA OBTER CONVERSAS ---
/*
app.get('/api/conversations', async (req, res) => {
    const conversations = {};

    if (!fs.existsSync(CSV_FILE_PATH)) {
        return res.json({}); // Retorna objeto vazio se o arquivo não existe
    }

    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
            const contactNumber = row.from;
            if (!conversations[contactNumber]) {
                conversations[contactNumber] = {
                    contact: contactNumber,
                    messages: []
                };
            }
            conversations[contactNumber].messages.push({
                id: row.message_id,
                text: row.content,
                timestamp: row.timestamp,
                direction: row.direction, // 'in' ou 'out'
            });
        })
        .on('end', () => {
            // Ordena as mensagens dentro de cada conversa por timestamp
            for (const contact in conversations) {
                conversations[contact].messages.sort((a, b) => a.timestamp - b.timestamp);
            }
            res.json(conversations);
        });
});
*/

// --- API PARA ENVIAR MENSAGEM ---
// Esta rota simula o envio e ATUALIZA nosso CSV para que a interface reflita a nova mensagem
/*
app.post('/api/send', (req, res) => {
    const { to, text } = req.body;
    if (!to || !text) {
        return res.status(400).json({ error: 'Número e texto são obrigatórios.' });
    }

    // 1. Simula a chamada para o Mock da API da Meta (que estaria em outra porta)
    console.log(`[SIMULAÇÃO] Enviando para o mock da API: to=${to}, text=${text}`);
    // fetch('http://localhost:8080/v18.0/YOUR_PHONE_ID/messages', { ... })

    // 2. Adiciona a mensagem enviada ao nosso "banco de dados" CSV
    const newRow = {
        timestamp: Math.floor(Date.now() / 1000),
        from: to, // Agrupamos pelo número do cliente
        type: 'text',
        content: text,
        message_id: `wamid.simulated.${Date.now()}`,
        direction: 'out' // Marcamos como enviada
    };

    const csvLine = `${newRow.timestamp},${newRow.from},${newRow.type},"${newRow.content}",${newRow.message_id},${newRow.direction}`;
    fs.appendFileSync(CSV_FILE_PATH, csvLine);

    res.status(200).json({ success: true, message: newRow });
});
*/


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

// --- Endpoint centralizado para registrar CADA mensagem no CSV ---
/*
app.post('/api/log-message', (req, res) => {
    const { from, text, direction } = req.body;
    if (!from || !text || !direction) {
        return res.status(400).send('Dados insuficientes para logar mensagem.');
    }

    const newRow = {
        timestamp: Math.floor(Date.now() / 1000),
        from: from,
        type: 'text',
        content: text, // Escapa aspas
        message_id: `wamid.simulated.${Date.now()}`,
        direction: direction
    };
    
    // const csvLine = `\n${Object.values(newRow).map(v => `${v}`).join(',')}`;
    const csvLine = `${newRow.timestamp},${newRow.from},${newRow.type},"${newRow.content}",${newRow.message_id},${newRow.direction}\n`;
    
    console.log('csvLine');
    console.log(csvLine);
    
    // Garante que o arquivo e o cabeçalho existam
    if (!fs.existsSync(CSV_FILE_PATH)) {
        fs.writeFileSync(CSV_FILE_PATH, 'timestamp,from,type,content,message_id,direction');
    }
    
    fs.appendFileSync(CSV_FILE_PATH, csvLine);
    console.log(`[CHAT-DB] Mensagem [${direction.toUpperCase()}] de/para ${from} registrada.`);
    res.status(200).json(newRow);
});
*/


// --- Rota para o HUMANO enviar uma mensagem pela interface ---
/*
app.post('/api/send', async (req, res) => {
    const { to, text } = req.body;
    
    // 1. Registra a mensagem que o humano enviou
    await fetch(`http://localhost:${PORT}/api/log-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: to, text, direction: 'out' })
    });
    
    // 2. Simula o usuário recebendo e aciona o webhook da IA
    // Em um cenário real, isso não seria necessário. A Meta faria isso.
    console.log(`[SIMULAÇÃO] Acionando Webhook da IA para a mensagem enviada...`);
    // Aqui não precisamos fazer nada, pois a resposta da IA é para a próxima mensagem do cliente.
    
    res.status(200).json({ success: true });
});
*/

const QR_FILE_PATH = path.join(__dirname, 'data', 'quick_replies.json');

// --- NOVAS ROTAS PARA MENSAGENS RÁPIDAS (QUICK REPLIES) ---

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

// --- NOVAS ROTAS PARA INFORMAÇÕES DE CONTATO ---

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


app.listen(PORT, () => console.log(`Servidor da Interface de Chat rodando em http://localhost:${PORT}`));