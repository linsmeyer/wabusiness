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
// Rota de conversas completa
app.get('/api/conversations', async (req, res) => {
    const conversations = {};
    if (!fs.existsSync(CSV_FILE_PATH)) {
        return res.json({});
    }
    fs.createReadStream(CSV_FILE_PATH).pipe(csv()).on('data', (row) => {
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
            direction: row.direction,
        });
    }
    ).on('end', () => {
        for (const contact in conversations) {
            conversations[contact].messages.sort( (a, b) => a.timestamp - b.timestamp);
        }
        res.json(conversations);
    }
    );
}
);

// --- Endpoint centralizado para registrar CADA mensagem no CSV ---
app.post('/api/log-message', (req, res) => {
    const { from, text, direction } = req.body;
    if (!from || !text || !direction) {
        return res.status(400).send('Dados insuficientes para logar mensagem.');
    }

    const newRow = {
        timestamp: Math.floor(Date.now() / 1000),
        from: from,
        type: 'text',
        content: text.replace(/"/g, '""'), // Escapa aspas
        message_id: `wamid.simulated.${Date.now()}`,
        direction: direction
    };
    
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


// --- Rota para o HUMANO enviar uma mensagem pela interface ---
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
        body: JSON.stringify({ from: to, text: logText, direction: 'out' })
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
app.post('/api/contacts/:contactId/observations', (req, res) => {
    const { contactId } = req.params;
    const { observations } = req.body;

    if (!fs.existsSync(CONTACTS_FILE_PATH)) {
        return res.status(404).json({ error: 'Arquivo de contatos não encontrado.' });
    }

    let allContacts = JSON.parse(fs.readFileSync(CONTACTS_FILE_PATH, 'utf-8'));

    if (allContacts[contactId]) {
        allContacts[contactId].observations = observations;
        fs.writeFileSync(CONTACTS_FILE_PATH, JSON.stringify(allContacts, null, 2));
        res.status(200).json(allContacts[contactId]);
    } else {
        res.status(404).json({ error: 'Contato não encontrado.' });
    }
});


app.listen(PORT, () => console.log(`Servidor da Interface de Chat rodando em http://localhost:${PORT}`));