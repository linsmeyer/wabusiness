# Versão do NodeJS v20.18.1
# Estrutura do projeto:

# wabusiness/
# ├── .gitattributes
# ├── .gitignore
# ├── LICENSE
# ├── README.md
# ├── agent-IA.js                 # (Legado/Estudo) Servidor para um agente de IA com webhook.
# ├── dashboard-server.js         # ✅ SERVIDOR PRINCIPAL ATUAL da aplicação.
# ├── mock-api-server.js          # (Legado/Estudo) Servidor para simular a API da Meta.
# ├── package-lock.json
# ├── package.json
# ├── processador.js              # (Legado/Estudo) Script para processar CSV e gerar payloads.
# ├── template_definition.json
# ├── webhook-router.js           # (Legado/Estudo) Servidor para roteamento de webhooks.
# ├── .env                        # Arquivo de configuração para variáveis de ambiente.
# │
# ├── data/
# │   ├── contacts.json           # Armazena dados de contatos (nome, observações).
# │   ├── contatos.csv            # Armazena dados de clientes para envios em massa.
# │   ├── messages.csv            # Banco de dados principal para o histórico de mensagens.
# │   └── quick_replies.json      # Armazena mensagens rápidas pré-configuradas.
# │
# └── public/
#     ├── assets/
#     │   ├── images/
#     │   │   └── logo.png          # Imagens utilizadas na interface.
#     │   ├── css/
#     │   │   ├── dashboard.css     # Folha de estilo principal da interface de CHAT.
#     │   │   ├── templates.css     # Folha de estilo da interface de TEMPLATES.
#     │   │   └── asset.89b639f6.css    # Folha de estilo compilada (provavelmente do Tailwind).
#     │   └── js/
#     │       ├── dashboard.js      # ✅ SCRIPT PRINCIPAL da interface de chat.
#     │       ├── templates.js      # Script da interface de templates.
#     │       └── tailwind.js       # Script de configuração do Tailwind CSS.
#     │
#     ├── components/
#     │   ├── contact-info-panel.js # Componente JS para o painel de informações do contato.
#     │   ├── emoji-picker.js       # Componente JS para o seletor de emojis.
#     │   └── quick-replies.js      # Componente JS para o painel de mensagens rápidas.
#     │
#     ├── index.html              # Estrutura HTML da interface de CHAT.
#     └── templates.html          # Estrutura HTML da interface de TEMPLATES.


# STATUS: IMPLANTADOS:
#    "agent": "node agent-IA.js",
#    "dashboard": "node dashboard-server.js",
#    "mock": "node mock-api-server.js",
#    "templates": "node templates-server.js",

# STATUS: AGUARDANDO IMPLANTAÇÃO:
#    "webhook": "node webhook-router.js"
#    "processador": "node processador.js"


# --------------------------------------------------------------------------------
## ARQUIVOS DE SERVIDOR (BACKEND)
# --------------------------------------------------------------------------------

# - dashboard-server.js:
#   É o coração da aplicação. Um servidor Node.js com Express que roda na porta 4000.
#   Suas responsabilidades são:
#   1. Servir os arquivos estáticos do frontend (HTML, CSS, JS) da pasta 'public'.
#   2. Fornecer uma API RESTful para a interface, com endpoints que leem e escrevem nos arquivos da pasta `data/` (messages.csv, contacts.json, etc.), atuando como um banco de dados local.

# - agent-IA.js:
#   (Legado/Estudo) Um servidor Express independente projetado para atuar como um webhook. Ele recebe mensagens, usa uma lógica simples de palavras-chave para interpretar a intenção do usuário e se comunica com o `dashboard-server` para registrar a conversa e a resposta automática.

# - mock-api-server.js:
#   (Legado/Estudo) Um servidor Express que simula a API oficial da Meta. Ele possui um banco de dados em memória e rotas que imitam os endpoints reais, permitindo o desenvolvimento e teste do frontend sem a necessidade de uma conexão real com a API da Meta.

# - webhook-router.js:
#   (Legado/Estudo) Um servidor de webhook mais avançado que atua como um roteador. Ele recebe todas as notificações da Meta em um único endpoint e as redireciona para processadores internos especializados, salvando os dados em arquivos CSV separados por tipo de evento (ex: `messages.csv`, `account_update.csv`).

# - processador.js:
#   (Legado/Estudo) Um script Node.js autônomo, não um servidor. Ele é projetado para ser executado manualmente para ler um arquivo de entrada (`contatos.csv`) e, com base em um mapa de template (`template_definition.json`), gerar os payloads JSON necessários para um disparo em massa de mensagens via API.


# --------------------------------------------------------------------------------
## ARQUIVOS DE DADOS (./data/)
# --------------------------------------------------------------------------------

# - contacts.json:
#   Armazena informações detalhadas sobre os contatos, como nome e observações personalizadas. Funciona como a tabela "users" de um CRM.

# - contatos.csv:
#   Arquivo de exemplo para ser usado pelo `processador.js`, contendo uma lista de clientes e dados variáveis para preencher templates em campanhas de envio.

# - messages.csv:
#   O banco de dados principal da interface de chat. Cada linha representa uma única mensagem (enviada ou recebida) e contém informações como timestamp, remetente, conteúdo e status de leitura.

# - quick_replies.json:
#   Armazena as mensagens rápidas que podem ser criadas e usadas na interface de chat, contendo nome, texto, URL de imagem e nome de template associado.


# --------------------------------------------------------------------------------
## ARQUIVOS DE FRONTEND (./public/)
# --------------------------------------------------------------------------------

# - index.html:
#   A estrutura HTML principal da interface de chat. Define todos os contêineres, botões e painéis que o `dashboard.js` irá manipular.

# - templates.html:
#   A estrutura HTML da página secundária, destinada ao gerenciamento e visualização de templates de mensagem.

# - assets/css/dashboard.css:
#   A folha de estilo principal para a interface de chat (`index.html`). Contém estilos CSS personalizados e variáveis de tema.

# - assets/css/templates.css:
#   A folha de estilo específica para a página de gerenciamento de templates (`templates.html`).

# - assets/css/asset.89b639f6.css:
#   Um arquivo de CSS compilado, provavelmente gerado por uma ferramenta de build do Tailwind CSS em um momento anterior do desenvolvimento.

# - assets/js/dashboard.js:
#   O cérebro da interface de chat. Este script gerencia o estado da aplicação (conversa ativa, filtros, etc.), busca dados do backend via polling, renderiza dinamicamente a lista de conversas e mensagens, e anexa todos os listeners de eventos para a interatividade do usuário.

# - assets/js/templates.js:
#   O script para a página de templates. Atualmente, ele contém a lógica completa para o visualizador e compositor de templates, permitindo criar, editar, visualizar e salvar templates no localStorage.

# - assets/js/tailwind.js:
#   Script de configuração do Tailwind CSS para o modo "Play CDN", que define a paleta de cores customizada e habilita o modo escuro.

# - components/*.js:
#   Arquivos JavaScript modulares, cada um contendo uma função `initialize...` que encapsula a lógica de um componente de UI específico (seletor de emoji, painel de informações de contato, mensagens rápidas), mantendo o `dashboard.js` mais limpo e focado na orquestração.


# --------------------------------------------------------------------------------
## ARQUIVOS DE CONFIGURAÇÃO E RAIZ
# --------------------------------------------------------------------------------

# - .env:
#   Armazena as variáveis de ambiente sensíveis, como tokens de acesso e IDs da API da Meta, para que não sejam expostas diretamente no código.

# - package.json:
#   Define o projeto, suas dependências (Express, Axios, Dotenv, etc.) e os scripts de atalho `npm` para executar os diferentes servidores.

# - template_definition.json:
#   Arquivo de configuração usado pelo `processador.js`. Ele define como as colunas de um CSV devem ser mapeadas para os componentes de um template do WhatsApp (header, body, etc.).