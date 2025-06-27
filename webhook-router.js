// webhook-router.js

/* INFORMAÇÕES DA ARQUITETURA DO PROJETO

OBJETIVO: Webhook para escutar Payloads recebidos pela API da Meta.
STATUS: AGUARDANDO IMPLANTAÇÃO
TESTES VIA cURL:

    Teste 1: Simular uma Mensagem Recebida (messages)
    Comando cURL:
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{ "object": "whatsapp_business_account", "entry": [ { "changes": [ { "value": { "messages": [ { "from": "5511987654321", "text": { "body": "Olá, tudo bem?" }, "type": "text", "id": "wamid.123" } ] }, "field": "messages" } ] } ] }' \
    http://localhost:3000/whatsapp
    
    Resultado: Um arquivo messages.csv será criado (ou atualizado) com a linha correspondente.
    
    Teste 2: Simular uma Mudança na Qualidade do Número (phone_number_quality_update)
    Comando cURL:
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{ "object": "whatsapp_business_account", "entry": [ { "changes": [ { "value": { "event": "FLAGGED", "current_limit": "TIER_10K", "quality_score": { "score": "YELLOW" } }, "field": "phone_number_quality_update" } ] } ] }' \
    http://localhost:3000/whatsapp
    
    Resultado: Um arquivo phone_number_quality_update.csv será criado.
    
    Teste 3: Simular a Aprovação de um Template (message_template_status_update)
    Comando cURL:
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{ "object": "whatsapp_business_account", "entry": [ { "changes": [ { "value": { "event": "APPROVED", "message_template_name": "cupom_desconto", "message_template_language": "pt_BR" }, "field": "message_template_status_update" } ] } ] }' \
    http://localhost:3000/whatsapp
    
    Resultado: Um arquivo message_template_status_update.csv será criado.

    Teste 4: Simula uma notificação sobre a mudança na classificação de qualidade de um template específico, com base no feedback dos usuários.
    Comando cURL:
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{
    "object": "whatsapp_business_account",
    "entry": [
        {
        "changes": [
            {
            "value": {
                "event": "QUALITY_SCORE_UPDATE",
                "message_template_name": "oferta_relampago",
                "message_template_language": "pt_BR",
                "previous_quality_score": "GREEN",
                "new_quality_score": "YELLOW"
            },
            "field": "message_template_quality_update"
            }
        ]
        }
    ]
    }' \
    http://localhost:3000/whatsapp
    
    Ação: Simula que o template oferta_relampago teve uma queda na qualidade, provavelmente porque alguns usuários o bloquearam ou denunciaram.
    Resultado Esperado: Criação/atualização do arquivo message_template_quality_update.csv.
    
    Teste 5: Simula uma notificação sobre a aprovação ou rejeição de uma solicitação para alterar o nome de exibição do seu número.
    Comando cURL:
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{
    "object": "whatsapp_business_account",
    "entry": [
        {
        "changes": [
            {
            "value": {
                "event": "APPROVED",
                "display_phone_number": "+1 555-123-4567",
                "new_display_name": "Sua Empresa Global Inc."
            },
            "field": "phone_number_name_update"
            }
        ]
        }
    ]
    }' \
    http://localhost:3000/whatsapp
    
    Ação: Simula que seu pedido para alterar o nome de exibição para "Sua Empresa Global Inc." foi aprovado pela Meta.
    Resultado Esperado: Criação/atualização do arquivo phone_number_name_update.csv.
    
    Teste 6: Simula uma notificação de que sua conta passou por uma revisão de política.
    Comando cURL:
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{
    "object": "whatsapp_business_account",
    "entry": [
        {
        "changes": [
            {
            "value": {
                "event": "ACCOUNT_REVIEW_UPDATE",
                "decision": "APPROVED",
                "reasons": []
            },
            "field": "account_review_update"
            }
        ]
        }
    ]
    }' \
    http://localhost:3000/whatsapp
    
    Ação: Simula que a Meta revisou sua conta e concluiu que ela está em conformidade com as políticas.
    Resultado Esperado: Criação/atualização do arquivo account_review_update.csv.
    
    Teste 7: Simula uma notificação de que um recurso importante da sua conta foi atualizado, como a ativação de uma conta de faturamento.
    Comando cURL:
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{
    "object": "whatsapp_business_account",
    "entry": [
        {
        "changes": [
            {
            "value": {
                "event": "BUSINESS_CAPABILITY_UPDATE",
                "business_capability": {
                "id": "123456789_capability_id",
                "type": "PHONE_NUMBER_MESSAGING",
                "status": "ACTIVE"
                },
                "new_capability_status": "ACTIVE"
            },
            "field": "business_capability_update"
            }
        ]
        }
    ]
    }' \
    http://localhost:3000/whatsapp
    
    Ação: Simula que a capacidade de envio de mensagens do seu número de telefone foi ativada, geralmente após adicionar um método de pagamento e sair do modo de teste.
    Resultado Esperado: Criação/atualização do arquivo business_capability_update.csv.
    
    Teste 8: Teste de account_update (Banimento) Este é um teste importante para garantir que seu sistema está preparado para o pior cenário.
    Comando cURL:
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{
    "object": "whatsapp_business_account",
    "entry": [
        {
        "changes": [
            {
            "value": {
                "event": "DISABLED_UPDATE",
                "phone_number": "+1 555-123-4567",
                "ban_info": {
                "waba_ban_state": "SCHEDULE_FOR_DISABLE",
                "waba_ban_date": "2024-01-15"
                }
            },
            "field": "account_update"
            }
        ]
        }
    ]
    }' \
    http://localhost:3000/whatsapp
    
    Ação: Simula um aviso de que sua conta foi marcada para ser desativada em uma data futura devido a violações de política.
    Resultado Esperado: Criação/atualização do arquivo account_update.csv com o evento SCHEDULE_FOR_DISABLE.
*/


require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

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

// 1. Processador para 'messages'
processRouter.post('/messages', (req, res) => {
    const { from, type, timestamp, id, ...details } = req.body;
    let content = '';

    if (type === 'text') content = details.text.body;
    else if (type === 'image') content = `ID da imagem: ${details.image.id}`;
    else if (type === 'button') content = `Texto do botão: ${details.button.text}`;
    else if (type === 'interactive') content = `ID da resposta: ${details.interactive[details.interactive.type].id}`;
    else content = JSON.stringify(details); // Para outros tipos

    appendToCsv('messages.csv', { timestamp, from, type, content, message_id: id });
    res.sendStatus(200);
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
            
            // Aqui está a mágica: redirecionamos internamente a requisição.
            // Usamos uma chamada `fetch` para o nosso próprio servidor.
            // Isso mantém o código limpo e desacoplado.
            try {
                await fetch(`http://localhost:${PORT}/process/${field}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(value)
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
    console.log(`Configure a URL de callback na Meta para: https://<sua-url-ngrok>/whatsapp`);
});
