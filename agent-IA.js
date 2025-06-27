// agent-IA.js

/* INFORMAÇÕES DA ARQUITETURA DO PROJETO

OBJETIVO: Servidor do Agente de IA.
STATUS: IMPLANTADO
*/

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
// app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// --- Dicionário de templates ---
// Agora, além do nome, incluímos o texto da resposta para simulação.
const templateResponses = {
    'resposta_saudacao': "Olá! 👋 Bem-vindo(a) ao nosso atendimento. Como podemos ajudar?",
    'info_horarios_local': "Nosso horário de funcionamento é de Segunda a Sexta, das 9h às 18h. Nosso endereço é Rua das Flores, 123.",
    'resposta_reclamacao_inicial': "Lamentamos pelo ocorrido. Um de nossos atendentes irá analisar sua situação e entrará em contato em breve.",
    'resposta_padrao_desconhecido': "Desculpe, não entendi sua pergunta. Um de nossos atendentes irá te ajudar em breve."
};

const intentMap = {
    SAUDACAO: { templateName: 'resposta_saudacao' },
    PEDIDO_INFO: { templateName: 'info_horarios_local' },
    RECLAMACAO: { templateName: 'resposta_reclamacao_inicial' },
    DESCONHECIDO: { templateName: 'resposta_padrao_desconhecido' }
};

function interpretIntent(messageText) {
    const text = messageText.toLowerCase();
    const keywords = {
        SAUDACAO: ['oi', 'olá', 'bom dia'],
        PEDIDO_INFO: ['horário', 'endereço', 'onde fica'],
        RECLAMACAO: ['problema', 'reclamação', 'não gostei']
    };
    for (const intent in keywords) {
        if (keywords[intent].some(k => text.includes(k))) {
            console.log(`[IA] Intenção detectada: ${intent}`);
            return intent;
        }
    }
    console.log("[IA] Intenção não reconhecida.");
    return 'DESCONHECIDO';
}

// --- Rota Webhook (Recebe mensagem do usuário e aciona a IA) ---
app.post('/webhook', async (req, res) => {
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message && message.type === 'text') {
        const from = message.from;
        const textBody = message.text.body;

        console.log(`\n[IA] Mensagem recebida de ${from}: "${textBody}"`);

        // 1. Salva a mensagem do usuário no nosso chat-server
        await fetch('http://localhost:4000/api/log-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, text: textBody, direction: 'in' })
        });
        
        // 2. IA decide a resposta
        const intent = interpretIntent(textBody);
        const responseInfo = intentMap[intent];
        
        if (responseInfo) {
            // 3. IA "envia" a resposta automática, registrando no chat-server
            const responseText = templateResponses[responseInfo.templateName];
            console.log(`[IA] Respondendo com template: ${responseInfo.templateName}`);
            await fetch('http://localhost:4000/api/log-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from, text: responseText, direction: 'out' })
            });
        }
    }
    res.sendStatus(200);
});

// Verificação do Webhook
app.get('/webhook', (req, res) => { const mode = req.query['hub.mode']; const token = req.query['hub.verify_token']; const challenge = req.query['hub.challenge']; if (mode === 'subscribe' && token === VERIFY_TOKEN) { res.status(200).send(challenge); } else { res.sendStatus(403); }});
app.listen(PORT, () => console.log(`Servidor Webhook com IA rodando na porta ${PORT}`));
