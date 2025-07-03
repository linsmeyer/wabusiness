// require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const VERIFY_TOKEN = "MEU_TOKEN_SECRETO_PARA_O_WHATSAPP_12345";

const CSV_FILE_PATH = path.join('messages.csv');

// Middleware para parsing de JSON
app.use(express.json());

// ==============================================================================
// ==  FUNÇÃO AUXILIAR PARA SALVAR EM CSV                                      ==
// ==============================================================================

/**
 * Adiciona uma linha de dados a um arquivo CSV.
 * Cria o arquivo e o cabeçalho se não existirem.
 * @param {string} fileName - O nome do arquivo CSV (ex: 'messages.csv').
 * @param {object} dataObject - Um objeto simples (chave/valor) para ser salvo.
 */
function appendToCsv(fileName, dataObject) {
    const filePath = path.join(__dirname, fileName);
    const headers = Object.keys(dataObject).join(',') + '\n';
    const row = Object.values(dataObject).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';

    // Se o arquivo não existe, escreve o cabeçalho primeiro
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, headers, 'utf8');
    }

    // Adiciona a nova linha
    fs.appendFileSync(filePath, row, 'utf8');
    console.log(`[CSV] Dados salvos em ${fileName}`);
}

// ==============================================================================
// ==  PROCESSADORES DE ENDPOINT ESPECIALIZADOS (/process/...)                 ==
// ==============================================================================

const processRouter = express.Router();

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
    const { from, text, message_id, direction } = req.body;
    if (!from || !text || !direction) return res.status(400).send('Dados insuficientes.');

    const headers = ['timestamp', 'from', 'type', 'content', 'message_id', 'direction', 'is_read'];
    
    const newRowObject = {
        timestamp: Math.floor(Date.now() / 1000),
        from: from,
        type: 'text',
        content: text,
        message_id: message_id,
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

/**
 * Extrai os dados essenciais de uma mensagem de um payload de webhook do WhatsApp.
 * Utiliza optional chaining (?.) para navegar com segurança pelo objeto, evitando erros
 * se alguma propriedade não existir.
 * 
 * @param {object} webhookPayload - O objeto JSON completo recebido da Meta.
 * @returns {object|null} - Um objeto contendo os dados extraídos, ou null se nenhuma mensagem válida for encontrada.
 *                          O objeto retornado terá a forma:
 *                          {
 *                              from: string,      // Número de quem enviou (ex: "16315551234")
 *                              id: string,        // ID da mensagem (wamid)
 *                              timestamp: string, // Timestamp da mensagem
 *                              type: string,      // Tipo da mensagem (ex: "text")
 *                              body: string       // O conteúdo da mensagem de texto
 *                          }
 */
function extractMessageData(webhookPayload) {
    // Navega de forma segura pela estrutura do payload
    const message = webhookPayload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    // Se não encontrou um objeto de mensagem, retorna nulo
    if (!message) {
        return null;
    }

    // Extrai os campos principais
    const from = message.from;
    const id = message.id;
    const timestamp = message.timestamp;
    const type = message.type;

    // Extrai o corpo do texto apenas se o tipo for 'text'
    const body = type === 'text' ? message.text?.body : null;

    // Retorna o objeto simplificado, garantindo que todos os campos obrigatórios existam
    if (from && id && timestamp && type) {
        return {
            from,
            id,
            timestamp,
            type,
            body // Será null se o tipo não for 'text'
        };
    }

    // Retorna nulo se algum dos campos essenciais estiver faltando
    return null;
}

// 1. Processador para 'messages'
processRouter.post('/messages', (req, res) => {

    console.log(req.body);

    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        const extractedData = extractMessageData(body);

        if (extractedData && extractedData.type === 'text') {
            console.log("--- Dados da Mensagem Extraídos ---");
            console.log(`De: ${extractedData.from}`);
            console.log(`ID (wamid): ${extractedData.id}`);
            console.log(`Timestamp: ${extractedData.timestamp}`);
            console.log(`Tipo: ${extractedData.type}`);
            console.log(`Corpo do Texto: ${extractedData.body}`);

            const direction = "in";
            const headers = ['timestamp', 'from', 'type', 'content', 'message_id', 'direction', 'is_read'];
    
            const newRowObject = {
                timestamp: extractedData.timestamp,
                from: extractedData.from,
                type: 'text',
                content: extractedData.body,
                message_id: extractedData.id,
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
            console.log(`[CSV-WRITER] Nova mensagem para ${extractedData.from} registrada.`);
            

            // A partir daqui, você pode usar o objeto 'extractedData' para
            // passar para seu agente de IA, salvar no banco de dados, etc.
            // Ex: const intent = interpretIntent(extractedData.body);

        } else if (extractedData) {
            console.log(`Recebida uma mensagem do tipo '${extractedData.type}', que não é texto.`);
        }
        
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// 2. Processador para 'account_update'
processRouter.post('/account_update', (req, res) => {
    const { event, ban_info, phone_number } = req.body;
    appendToCsv('account_update.csv', { timestamp: Date.now(), event, phone_number, reason: ban_info?.reason || 'N/A' });
    res.sendStatus(200);
});

// 3. Processador para 'phone_number_quality_update'
processRouter.post('/phone_number_quality_update', (req, res) => {
    const { event, current_limit, quality_score } = req.body;
    appendToCsv('phone_number_quality_update.csv', { timestamp: Date.now(), event, current_limit, quality_score: quality_score?.score || 'N/A' });
    res.sendStatus(200);
});

// 4. Processador para 'message_template_status_update'
processRouter.post('/message_template_status_update', (req, res) => {
    const { event, message_template_name, message_template_language, reason } = req.body;
    appendToCsv('message_template_status_update.csv', { timestamp: Date.now(), event, message_template_name, message_template_language, reason: reason || 'N/A' });
    res.sendStatus(200);
});

// 5. Processador para 'message_template_quality_update'
processRouter.post('/message_template_quality_update', (req, res) => {
    const { message_template_name, new_quality_score, previous_quality_score } = req.body;
    appendToCsv('message_template_quality_update.csv', { timestamp: Date.now(), message_template_name, new_quality_score, previous_quality_score });
    res.sendStatus(200);
});

// 6. Processador para 'phone_number_name_update'
processRouter.post('/phone_number_name_update', (req, res) => {
    const { event, display_phone_number, new_display_name } = req.body;
    appendToCsv('phone_number_name_update.csv', { timestamp: Date.now(), event, display_phone_number, new_display_name });
    res.sendStatus(200);
});

// 7. Processador para 'account_review_update'
processRouter.post('/account_review_update', (req, res) => {
    const { event, decision } = req.body;
    appendToCsv('account_review_update.csv', { timestamp: Date.now(), event, decision });
    res.sendStatus(200);
});

// 8. Processador para 'business_capability_update'
processRouter.post('/business_capability_update', (req, res) => {
    const { new_capability_status } = req.body;
    appendToCsv('business_capability_update.csv', { timestamp: Date.now(), new_capability_status });
    res.sendStatus(200);
});


// Monta o roteador especializado no caminho /process
app.use('/process', processRouter);


// ==============================================================================
// ==  ROTEADOR PRINCIPAL DO WEBHOOK (/whatsapp)                               ==
// ==============================================================================

// Rota de Verificação (GET)
app.get('/whatsapp', (req, res) => {
    console.log("Recebida requisição de verificação de Webhook...");
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("Webhook verificado com sucesso!");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Rota de Notificações (POST)
app.post('/whatsapp', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0];
        const field = change?.field;
        const value = change?.value;
        
        if (field && value) {
            console.log(`\n[ROUTER] Recebida notificação para o campo: '${field}'`);

            let payload = JSON.stringify(value);

            if(field == "messages")
                payload = JSON.stringify(body);
            
            // Aqui está a mágica: redirecionamos internamente a requisição.
            // Usamos uma chamada `fetch` para o nosso próprio servidor.
            // Isso mantém o código limpo e desacoplado.
            try {
                // await fetch(`https://www.campanhadoaparelho.com.br/process/${field}`, {
                await fetch(`http://localhost:5000/process/${field}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                });
            } catch (error) {
                console.error(`[ROUTER] Erro ao redirecionar para /process/${field}:`, error);
            }
        }
        
        res.sendStatus(200); // Responde 200 para a Meta imediatamente
    } else {
        res.sendStatus(404);
    }
});

// Rota raiz para teste
app.get('/', (req, res) => res.send('Servidor Webhook Router está online!'));

app.listen(PORT, () => {
    console.log(`Servidor escutando na porta ${PORT}`);
    console.log(`Configure a URL de callback na Meta para: https://www.campanhadoaparelho.com.br/whatsapp`);
});
