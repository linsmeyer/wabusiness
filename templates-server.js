// templates-server.js

/* INFORMAÇÕES DA ARQUITETURA DO PROJETO

OBJETIVO: Servidor do editor de templates da Meta API.
STATUS: IMPLANTADO
*/

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Servir arquivos estáticos da pasta 'templates-manager'
app.use(express.static(path.join(__dirname, 'templates-manager')));

app.listen(PORT, () => {
    console.log(`Template Visualizer rodando em http://localhost:${PORT}`);
});