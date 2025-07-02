// meta-api-server.js

/* INFORMAÇÕES DA ARQUITETURA DO PROJETO

OBJETIVO: Servidor Mock da Meta API.
STATUS: AGUARDANDO IMPLANTAÇÃO

TESTES VIA cURL:


    1. Endpoints de Message Templates
    MÉTODO: GET /message_templates
    Obtém a lista de todos os templates de mensagem.
    Comando:
    Generated bash
    curl -X GET http://localhost:8081/v18.0/123456789012345/message_templates
    
    Resposta JSON Esperada:
    Generated json
    {
        "data": [
            {
                "name": "boas_vindas",
                "language": "pt_BR",
                "category": "MARKETING",
                "status": "APPROVED",
                "id": "176283746237462",
                "components": [
                    { "type": "BODY", "text": "Olá {{1}}! Bem-vindo(a) à nossa comunidade." }
                ]
            },
            {
                "name": "status_pedido",
                "language": "pt_BR",
                "category": "UTILITY",
                "status": "APPROVED",
                "id": "986238472384722",
                "components": [
                    { "type": "BODY", "text": "Seu pedido {{1}} foi atualizado para: {{2}}." },
                    { "type": "BUTTONS", "buttons": [{ "type": "URL", "text": "Rastrear", "url": "https://rastreio.com/track/{{1}}" }] }
                ]
            }
        ],
        "paging": { "cursors": { "before": "before_cursor_mock", "after": "after_cursor_mock" } }
    }
        
    MÉTODO: POST /message_templates
    Cria um novo template de mensagem.
    Comando:
    Generated bash
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{
    "name": "cupom_desconto_junho",
    "language": "pt_BR",
    "category": "MARKETING",
    "components": [
        {
        "type": "HEADER",
        "format": "TEXT",
        "text": "Temos um presente para você!"
        },
        {
        "type": "BODY",
        "text": "Olá {{1}}, para comemorar, aqui está um cupom de 20% OFF para sua próxima compra. Use o código: {{2}}."
        }
    ]
    }' \
    http://localhost:8081/v18.0/123456789012345/message_templates
    
    Resposta JSON Esperada:
    Generated json
    {
        "id": "a1b2c3d4-e5f6-...",
        "status": "PENDING",
        "category": "MARKETING"
    }
        
    (Se você rodar o GET novamente, verá este novo template na lista)
    MÉTODO: DELETE /message_templates
    Deleta um template pelo nome (passado como query param).
    Comando:
    Generated bash
    curl -X DELETE "http://localhost:8081/v18.0/123456789012345/message_templates?name=boas_vindas"
    
    Resposta JSON Esperada:
    Generated json
    {
        "success": true
    }
        
    (Se você rodar o GET novamente, o template "boas_vindas" terá desaparecido)

    2. Endpoints de Messages
    MÉTODO: POST /messages (Enviar Mensagem)
    Envia uma mensagem para um usuário.
    Exemplo 1: Mensagem de Texto Simples
    Generated bash
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{
    "messaging_product": "whatsapp",
    "to": "5511999998888",
    "type": "text",
    "text": { "body": "Olá do mock server! Esta é uma mensagem de texto." }
    }' \
    http://localhost:8081/v18.0/987654321098765/messages
    
    Exemplo 2: Mensagem de Template
    Generated bash
    curl -X POST \
    -H "Content-Type: application/json" \
    -d '{
    "messaging_product": "whatsapp",
    "to": "5511999998888",
    "type": "template",
    "template": {
        "name": "status_pedido",
        "language": { "code": "pt_BR" },
        "components": [
        {
            "type": "body",
            "parameters": [
            { "type": "text", "text": "BR-98765" },
            { "type": "text", "text": "A CAMINHO" }
            ]
        }
        ]
    }
    }' \
    http://localhost:8081/v18.0/987654321098765/messages
    
    Resposta JSON Esperada (para qualquer envio):
    Generated json
    {
        "messaging_product": "whatsapp",
        "contacts": [
            { "input": "5511999998888", "wa_id": "5511999998888" }
        ],
        "messages": [
            { "id": "wamid.d3e4f5a6b7c8..." }
        ]
    }
        
    MÉTODO: GET /:message_id
    Obtém o status de uma mensagem enviada. (Primeiro, envie uma mensagem para obter um wamid)
    Comando (substitua o wamid pelo retornado no passo anterior):
    Generated bash
    curl -X GET http://localhost:8081/v18.0/wamid.d3e4f5a6b7c8...
    
    Resposta JSON Esperada:
    Generated json
    {
        "id": "wamid.d3e4f5a6b7c8...",
        "status": "delivered"
    }
        
    MÉTODO: PUT /:message_id
    Marca uma mensagem como lida.
    Comando (use o mesmo wamid):
    Generated bash
    curl -X PUT http://localhost:8081/v18.0/wamid.d3e4f5a6b7c8...
    
    Resposta JSON Esperada:
    Generated json
    {
        "success": true
    }
        
    (Se você rodar o GET novamente, o status será "read")

    3. Endpoints de Media
    MÉTODO: POST /media
    Faz o upload de uma mídia para obter um ID.
    Pré-requisito: Crie um arquivo de imagem de teste, por exemplo teste.jpg, na mesma pasta onde você está rodando o curl.
    Comando:
    Generated bash
    curl -X POST \
    -H "Content-Type: multipart/form-data" \
    -F "file=@teste.jpg" \
    -F "messaging_product=whatsapp" \
    http://localhost:8081/v18.0/987654321098765/media
    
    Resposta JSON Esperada:
    Generated json
    {
        "id": "a1b2c3d4e5f6..."
    }
        
    MÉTODO: GET /:media_id
    Obtém a URL para download de uma mídia. (Use o ID retornado no passo anterior)
    Comando:
    Generated bash
    curl -X GET http://localhost:8081/v18.0/a1b2c3d4e5f6...
    
    Resposta JSON Esperada:
    Generated json
    {
        "url": "https://mock.whatsapp.com/v1/media/a1b2c3d4e5f6.../download?token=fake_token",
        "mime_type": "image/png",
        "sha256": "mock_sha_string",
        "file_size": 54321,
        "id": "a1b2c3d4e5f6..."
    }
        
    MÉTODO: DELETE /:media_id
    Deleta uma mídia do servidor.
    Comando:
    Generated bash
    curl -X DELETE http://localhost:8081/v18.0/a1b2c3d4e5f6...
    Use code with caution.
    Bash
    Resposta JSON Esperada:
    Generated json
    {
        "success": true
    }
        
    4. Endpoints de Business Profile & Phone Numbers
    MÉTODO: GET /:phone_number_id/whatsapp_business_profile
    Obtém o perfil de negócios do número de telefone.
    Comando:
    Generated bash
    curl -X GET http://localhost:8081/v18.0/123456789012345/whatsapp_business_profile
    
    Resposta JSON Esperada:
    Generated json
    {
        "data": [
            {
                "about": "Sempre prontos para te ajudar!",
                "address": "123 Main St, Anytown, USA",
                "description": "Loja oficial de produtos incríveis.",
                "email": "contato@suaempresa.com",
                "profile_picture_url": "https://via.placeholder.com/150",
                "websites": ["https://www.suaempresa.com"],
                "vertical": "RETAIL"
            }
        ]
    }
        
    MÉTODO: GET /:waba_id/phone_numbers
    Obtém a lista de números de telefone associados à conta (WABA).
    Comando:
    Generated bash
    curl -X GET http://localhost:8081/v18.0/987654321098765/phone_numbers
    
    Resposta JSON Esperada:
    Generated json
    {
        "data": [
            {
                "id": "123456789012345",
                "verified_name": "Sua Empresa Inc.",
                "code_verification_status": "VERIFIED",
                "display_phone_number": "+1 555-123-4567",
                "quality_rating": "GREEN"
            }
        ]
    }
        
*/

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const morgan = require('morgan');
const app = express();
const PORT = 8081; // Usaremos uma porta diferente da sua aplicação frontend
const crypto = require('crypto'); // Para gerar IDs únicos, já vem no Node.js

// --- MIDDLEWARES ---
app.use(cors()); // Permite requisições de outras origens (ex: seu frontend em localhost:3000)
app.use(express.json()); // Habilita o parsing de body JSON nas requisições
app.use(morgan('dev')); // Loga cada requisição no console (ex: POST /v18.0/... 200)

const { META_ACCESS_TOKEN, META_PHONE_NUMBER_ID, META_WABA_ID } = process.env;
const API_VERSION = 'v18.0'; // Use a versão mais recente da API

// Configuração do Axios para a API da Meta
const metaApi = axios.create({
    // baseURL: `https://graph.facebook.com/${API_VERSION}`,
    baseURL: `http://localhost:8081/${API_VERSION}`,
    headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
    },
});

// ROTA PARA ENVIAR MENSAGEM
app.post('/send-message', async (req, res) => {
    try {
        const response = await metaApi.post(`/${META_PHONE_NUMBER_ID}/messages`, req.body);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error sending message:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'An internal error occurred' });
    }
});

// ROTA PARA BUSCAR OS MODELOS (TEMPLATES)
app.get('/templates', async (req, res) => {
    try {
        const response = await metaApi.get(`/${META_WABA_ID}/message_templates`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching templates:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'An internal error occurred' });
    }
});

// ROTA PARA CRIAR UM NOVO MODELO
app.post('/templates', async (req, res) => {
    try {
        const response = await metaApi.post(`/${META_WABA_ID}/message_templates`, req.body);
        res.status(201).json(response.data);
    } catch (error) {
        console.error('Error creating template:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'An internal error occurred' });
    }
});

// ROTA PARA DELETAR UM MODELO
app.delete('/templates/:templateName', async (req, res) => {
    const { templateName } = req.params;
    try {
        const response = await metaApi.delete(`/${META_WABA_ID}/message_templates`, {
            params: { name: templateName }
        });
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error deleting template:', error.response?.data || error.message);
         res.status(error.response?.status || 500).json(error.response?.data || { message: 'An internal error occurred' });
    }
});

/* MOCK API SERVER */

// --- BANCO DE DADOS EM MEMÓRIA ---
let DB = {
    messageTemplates: [
        { name: "boas_vindas", language: "pt_BR", category: "MARKETING", status: "APPROVED", id: "176283746237462", components: [{ type: "BODY", text: "Olá {{1}}! Bem-vindo(a) à nossa comunidade." }] },
        { name: "status_pedido", language: "pt_BR", category: "UTILITY", status: "APPROVED", id: "986238472384722", components: [{ type: "BODY", text: "Seu pedido {{1}} foi atualizado para: {{2}}." }, { type: "BUTTONS", buttons: [{ type: "URL", text: "Rastrear", url: "https://rastreio.com/track/{{1}}" }] }] }
    ],
    uploadedMedia: {
        "248442338352932": { mime_type: "image/jpeg", sha256: "fake_sha_256_string", file_size: 12345, id: "248442338352932" }
    },
    sentMessages: {},
    businessProfile: {
        "123456789012345": { about: "Sempre prontos para te ajudar!", address: "123 Main St, Anytown, USA", description: "Loja oficial de produtos incríveis.", email: "contato@suaempresa.com", profile_picture_url: "https://via.placeholder.com/150", websites: ["https://www.suaempresa.com"], vertical: "RETAIL" }
    },
    phoneNumbers: {
        "987654321098765": [{ id: "123456789012345", verified_name: "Sua Empresa Inc.", code_verification_status: "VERIFIED", display_phone_number: "+1 555-123-4567", quality_rating: "GREEN" }]
    }
};

// =================================================================================
// ==      MESSAGE TEMPLATES ENDPOINTS ( /:waba_id/message_templates )         ==
// =================================================================================

// --- MÉTODO: GET /message_templates ---
// Descrição: Obtém a lista de todos os templates de mensagem.
app.get('/v:version/:waba_id/message_templates', (req, res) => {
    console.log(`[MOCK] GET /message_templates`);
    const response = {
        data: DB.messageTemplates,
        paging: { cursors: { before: "before_cursor_mock", after: "after_cursor_mock" } }
    };
    res.status(200).json(response);
});

// --- MÉTODO: POST /message_templates ---
// Descrição: Cria um novo template de mensagem.
app.post('/v:version/:waba_id/message_templates', (req, res) => {
    const newTemplateData = req.body;
    console.log(`[MOCK] POST /message_templates com nome: ${newTemplateData.name}`);

    if (!newTemplateData.name || !newTemplateData.components) {
        return res.status(400).json({ error: { code: 100, message: "Parâmetros inválidos." } });
    }
    const newTemplate = { ...newTemplateData, id: crypto.randomUUID(), status: "PENDING" };
    DB.messageTemplates.push(newTemplate);
    
    const response = { id: newTemplate.id, status: "PENDING", category: newTemplate.category };
    res.status(201).json(response);
});

// --- MÉTODO: DELETE /message_templates ---
// Descrição: Deleta um template pelo nome.
app.delete('/v:version/:waba_id/message_templates', (req, res) => {
    const { name } = req.query;
    console.log(`[MOCK] DELETE /message_templates com nome: ${name}`);
    const initialLength = DB.messageTemplates.length;
    DB.messageTemplates = DB.messageTemplates.filter(t => t.name !== name);
    
    if (DB.messageTemplates.length < initialLength) {
        res.status(200).json({ success: true });
    } else {
        res.status(404).json({ error: { code: 100, message: "Template não encontrado." } });
    }
});

// =================================================================================
// ==           MESSAGES ENDPOINTS ( /:phone_number_id/messages )             ==
// =================================================================================

// --- MÉTODO: POST /messages ---
// Descrição: Envia uma mensagem. Suporta vários tipos.
app.post('/v:version/:phone_number_id/messages', (req, res) => {
    const payload = req.body;
    console.log(`[MOCK] POST /messages (tipo: ${payload.type}) para: ${payload.to}`);

    if (!payload.to || !payload.type) {
        return res.status(400).json({ error: { message: "'to' e 'type' são obrigatórios." } });
    }

    const wamid = `wamid.${crypto.randomBytes(24).toString('hex')}`;
    DB.sentMessages[wamid] = {
        id: wamid,
        status: "delivered", // Simula que já foi entregue
        timestamp: Math.floor(Date.now() / 1000),
        recipient_id: payload.to,
        payload: payload
    };

    const response = {
        messaging_product: "whatsapp",
        contacts: [{ input: payload.to, wa_id: payload.to }],
        messages: [{ id: wamid }]
    };
    res.status(200).json(response);
});

// --- MÉTODO: GET /messages/:message_id ---
// Descrição: Obtém o status de uma mensagem enviada.
app.get('/v:version/:message_id', (req, res) => {
    const { message_id } = req.params;
    console.log(`[MOCK] GET /messages/${message_id}`);
    
    const message = DB.sentMessages[message_id];
    if (message) {
        const response = { id: message.id, status: message.status };
        res.status(200).json(response);
    } else {
        res.status(404).json({ error: { message: "Mensagem não encontrada." } });
    }
});

// --- MÉTODO: PUT /messages/:message_id ---
// Descrição: Marca uma mensagem como lida.
app.put('/v:version/:message_id', (req, res) => {
    const { message_id } = req.params;
    console.log(`[MOCK] PUT /messages/${message_id} (marcar como lida)`);

    if (DB.sentMessages[message_id]) {
        DB.sentMessages[message_id].status = "read";
        res.status(200).json({ success: true });
    } else {
        res.status(404).json({ error: { message: "Mensagem não encontrada." } });
    }
});

// =================================================================================
// ==                MEDIA ENDPOINTS ( /:phone_number_id/media )               ==
// =================================================================================

// --- MÉTODO: POST /media ---
// Descrição: Simula o upload de um arquivo de mídia.
app.post('/v:version/:phone_number_id/media', (req, res) => {
    console.log(`[MOCK] POST /media (upload)`);
    // Em um mock, não precisamos processar o arquivo, apenas gerar um ID.
    const newMediaId = crypto.randomBytes(16).toString('hex');
    DB.uploadedMedia[newMediaId] = { id: newMediaId, mime_type: "image/png", file_size: 54321, sha256: "mock_sha_string" };
    
    const response = { id: newMediaId };
    res.status(200).json(response);
});

// --- MÉTODO: GET /media/:media_id ---
// Descrição: Obtém informações de uma mídia ou sua URL de download.
app.get('/v:version/:media_id', (req, res) => {
    const { media_id } = req.params;
    console.log(`[MOCK] GET /media/${media_id}`);
    
    const media = DB.uploadedMedia[media_id];
    if (media) {
        const response = {
            url: `https://mock.whatsapp.com/v1/media/${media_id}/download?token=fake_token`,
            mime_type: media.mime_type,
            sha256: media.sha256,
            file_size: media.file_size,
            id: media.id
        };
        res.status(200).json(response);
    } else {
        res.status(404).json({ error: { message: "Mídia não encontrada." } });
    }
});

// --- MÉTODO: DELETE /media/:media_id ---
// Descrição: Simula a deleção de uma mídia.
app.delete('/v:version/:media_id', (req, res) => {
    const { media_id } = req.params;
    console.log(`[MOCK] DELETE /media/${media_id}`);
    if (DB.uploadedMedia[media_id]) {
        delete DB.uploadedMedia[media_id];
        res.status(200).json({ success: true });
    } else {
        res.status(404).json({ error: { message: "Mídia não encontrada." } });
    }
});

// =================================================================================
// ==         BUSINESS PROFILE & PHONE NUMBERS ENDPOINTS                        ==
// =================================================================================

// --- MÉTODO: GET /:phone_number_id/whatsapp_business_profile ---
// Descrição: Obtém o perfil de negócios do número.
app.get('/v:version/:phone_number_id/whatsapp_business_profile', (req, res) => {
    const { phone_number_id } = req.params;
    console.log(`[MOCK] GET /whatsapp_business_profile para o número: ${phone_number_id}`);
    
    const profile = DB.businessProfile[phone_number_id];
    if (profile) {
        res.status(200).json({ data: [profile] });
    } else {
        res.status(404).json({ error: { message: "Perfil de negócios não encontrado." } });
    }
});

// --- MÉTODO: GET /:waba_id/phone_numbers ---
// Descrição: Obtém a lista de números de telefone associados à conta.
app.get('/v:version/:waba_id/phone_numbers', (req, res) => {
    const { waba_id } = req.params;
    console.log(`[MOCK] GET /phone_numbers para WABA: ${waba_id}`);
    
    const numbers = DB.phoneNumbers[waba_id];
    if (numbers) {
        res.status(200).json({ data: numbers });
    } else {
        res.status(404).json({ error: { message: "Nenhum número encontrado para este WABA ID." } });
    }
});

// Rota catch-all para endpoints não implementados
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: `Endpoint não encontrado no MOCK: ${req.method} ${req.originalUrl}`,
            type: "GraphMethodException",
            code: 100,
            fbtrace_id: `mock_trace_${crypto.randomBytes(8).toString('hex')}`
        }
    });
});

app.listen(PORT, () => {
    console.log(`WhatsApp Mock API rodando na porta ${PORT}`);
    console.log(`Acesse em http://localhost:${PORT}`);
});