// processador.js 

/* INFORMAÇÕES DA ARQUITETURA DO PROJETO

OBJETIVO: Modelo para processar arquivos CSV e Gerar Payloads para API da Meta.
STATUS: AGUARDANDO IMPLANTAÇÃO
*/ 

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Função principal que lê o CSV e gera um array com todos os payloads.
 * (Esta função permanece a mesma, pois já está correta)
 */
async function processCSVAndGeneratePayloads(csvFilePath, templateDefinition) {
    const payloads = [];
    const records = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => records.push(data))
            .on('end', resolve)
            .on('error', reject);
    });

    for (const record of records) {
        const components = [];

        // Montar HEADER
        if (templateDefinition.components.header && templateDefinition.components.header.length > 0) {
            const headerParameters = templateDefinition.components.header.map(paramDef => {
                const value = record[paramDef.csv_column];
                if (!value) return null;
                switch (paramDef.type) {
                    case 'image': return { type: 'image', image: { id: value } };
                    case 'document': return { type: 'document', document: { id: value } };
                    case 'video': return { type: 'video', video: { id: value } };
                    case 'text': return { type: 'text', text: value };
                    default: return null;
                }
            }).filter(Boolean);
            if (headerParameters.length > 0) components.push({ type: 'header', parameters: headerParameters });
        }

        // Montar BODY
        if (templateDefinition.components.body && templateDefinition.components.body.length > 0) {
            const bodyParameters = templateDefinition.components.body.map(paramDef => {
                const value = record[paramDef.csv_column];
                if (value === undefined || value === null) return null;
                switch (paramDef.type) {
                    case 'text': return { type: 'text', text: value };
                    case 'currency':
                        const amount_1000 = parseInt(value.replace(/[,.]/g, ''), 10);
                        return { type: 'currency', currency: { fallback_value: `R$ ${value}`, code: paramDef.currency_code, amount_1000 } };
                    case 'date_time':
                        return { type: 'date_time', date_time: { fallback_value: new Date(value).toLocaleString('pt-BR'), timestamp: Math.floor(new Date(value).getTime() / 1000) } };
                    default: return null;
                }
            }).filter(Boolean);
            if (bodyParameters.length > 0) components.push({ type: 'body', parameters: bodyParameters });
        }
        
        const payload = {
            messaging_product: 'whatsapp',
            to: record.telefone,
            type: 'template',
            template: {
                name: templateDefinition.name,
                language: { code: templateDefinition.language_code },
                components: components
            }
        };
        payloads.push(payload);
    }
    return payloads;
}


// ==============================================================================
// ==  NOVA IMPLEMENTAÇÃO DO LOOP DE ENVIO NA FUNÇÃO `main`  ==
// ==============================================================================

/**
 * Função auxiliar para simular um delay entre as requisições, 
 * uma boa prática para não sobrecarregar a API.
 * @param {number} ms - Tempo em milissegundos.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Função para simular o envio do payload para a API do WhatsApp.
 * Em uma aplicação real, aqui você faria a chamada `fetch` para a API.
 * @param {object} payload - O corpo da requisição a ser enviado.
 */
async function sendToWhatsAppAPI(payload) {
    console.log(`--> SIMULANDO ENVIO para o número: ${payload.to}`);
    // console.log(JSON.stringify(payload, null, 2)); // Descomente para ver o payload completo

    // Em uma aplicação real, o código abaixo seria usado:
    /*
    try {
        const YOUR_PHONE_ID = 'SEU_ID_DE_TELEFONE';
        const YOUR_TOKEN = 'SEU_TOKEN_DE_ACESSO';
        
        const response = await fetch(`https://graph.facebook.com/v18.0/${YOUR_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${YOUR_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            console.error(`--> ERRO ao enviar para ${payload.to}:`, data);
            return { success: false, data };
        }
        
        console.log(`--> SUCESSO! ID da mensagem (wamid): ${data.messages[0].id}`);
        return { success: true, data };

    } catch (error) {
        console.error(`--> ERRO DE REDE ao enviar para ${payload.to}:`, error);
        return { success: false, error };
    }
    */

    // Para o nosso mock, apenas retornamos sucesso.
    return Promise.resolve({ success: true });
}


/**
 * Função orquestradora principal
 */
async function main() {
    try {

        const csvPath = path.join(__dirname, 'data', 'contatos.csv');
        const templateDefPath = path.join(__dirname, 'template_definition.json');
        
        const templateDefinition = JSON.parse(fs.readFileSync(templateDefPath, 'utf-8'));

        console.log("1. Lendo arquivo CSV e gerando todos os payloads...");
        const allPayloads = await processCSVAndGeneratePayloads(csvPath, templateDefinition);

        const totalRecords = allPayloads.length;
        console.log(`\n2. Geração concluída. Total de ${totalRecords} payloads prontos para envio.`);
        console.log("---------------------------------------------------\n");
        console.log("3. Iniciando o loop de envio simulado...\n");

        // ESTE É O LOOP QUE PROCESSA TODOS OS REGISTROS
        let count = 0;
        for (const payload of allPayloads) {
            count++;
            console.log(`[${count}/${totalRecords}] Processando registro...`);
            
            // Chama a função que simula o envio para a API
            await sendToWhatsAppAPI(payload);
            
            // Adiciona um pequeno delay entre cada envio para não ser bloqueado
            await delay(1000); // Delay de 1 segundo
        }

        console.log("\n---------------------------------------------------");
        console.log("4. Processamento de todos os registros concluído!");

    } catch (error) {
        console.error("Ocorreu um erro fatal no processo:", error);
    }
}

main();
