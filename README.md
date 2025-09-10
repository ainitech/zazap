# � ZaZap - Sistema de Atendimento WhatsApp

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Sistema completo de atendimento ao cliente via WhatsApp com interface moderna e funcionalidades avançadas.

## � Funcionalidades Principais

✅ **Dashboard Interativo** - Métricas em tempo real  
✅ **Chat Moderno** - Interface responsiva e fluida  
✅ **Campanhas em Massa** - Envio automatizado  
✅ **Sistema de Filas** - Distribuição inteligente  
✅ **Multi-sessões** - Múltiplos WhatsApp  
✅ **Relatórios Avançados** - Analytics detalhados  
✅ **Tema Dark/Light** - Interface customizável  
✅ **Tags e Comentários** - Organização completa  
✅ **Sistema de Enquetes** - Interação avançada com clientes  
✅ **Integração WhatsApp** - Baileys + WhatsApp.js  

## 🛠 Tecnologias

**Frontend:** React 18 + Tailwind CSS + Heroicons + Lucide React  
**Backend:** Node.js + Express + Sequelize + PostgreSQL  
**WhatsApp:** Baileys + WhatsApp.js (com suporte a Enquetes)  
**Auth:** JWT + Middleware de segurança  
**Real-time:** Socket.IO para comunicação em tempo real  

## ⚡ Instalação Rápida

### 1. Clone e instale
```bash
git clone https://github.com/flaviokalleu/zazap.git
cd zazap

# Backend
cd backend && npm install

# Frontend  
cd ../frontend && npm install
```

### 2. Configure o banco
```sql
CREATE DATABASE zazap_db;
```

### 3. Configure o arquivo `backend/config/config.json`
```json
{
  "development": {
    "username": "seu_usuario",
    "password": "sua_senha", 
    "database": "zazap_db",
    "host": "localhost",
    "dialect": "postgres"
  }
}
```

### 4. Configure as enquetes (opcional)
```bash
# Copie os arquivos de configuração
cp .env.example backend/.env
cp frontend/.env.example frontend/.env

# Configure as variáveis de ambiente
# Edite backend/.env e frontend/.env com suas configurações
```

### 5. Execute as migrações e inicie
```bash
# Backend
cd backend
npx sequelize-cli db:migrate
npm start

# Frontend (novo terminal)
cd frontend  
npm start
```

**Acesso:** http://localhost:3000  
**Login:** admin@zazap.com / admin123

### 🎯 Teste o Sistema de Enquetes
1. Faça login no sistema
2. Abra um ticket de atendimento
3. Clique no botão "+" para nova mensagem
4. Selecione "Enquete" e crie sua primeira enquete
5. Envie para um contato WhatsApp válido

## 📁 Estrutura Simplificada

```
zazap/
├── backend/           # API Node.js + Express
│   ├── controllers/   # Lógica de negócio
│   │   ├── pollController.js    # 🎯 Sistema de enquetes
│   │   └── ...
│   ├── models/       # Modelos Sequelize  
│   ├── routes/       # Endpoints API
│   ├── services/     # Serviços WhatsApp
│   │   ├── (removido) whatsappjsService.js # 🔧 Removido; uso exclusivo do Baileys
│   │   └── ...
│   └── ...
├── frontend/         # React App
│   ├── src/
│   │   ├── modals/   # Modais da aplicação
│   │   │   ├── PollModal.js     # 📝 Criação de enquetes
│   │   │   ├── ButtonModal.js   # 📱 Modal atualizado
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── docs/             # 📚 Documentação
│   ├── ENQUETES-GUIDE.md       # 🎯 Guia completo de enquetes
│   └── ...
├── .env.example      # ⚙️ Configuração backend
├── frontend/.env.example       # ⚙️ Configuração frontend
├── PRODUCTION-README.md        # 🚀 Guia de produção
├── CHANGELOG.md     # 📋 Histórico de versões
└── README.md        # 📖 Este arquivo

## Conectores WhatsApp

- Baileys (principal): `/api/baileys`
- whatsapp-web.js (opcional e isolado): `/api/wwebjs`

Os dois podem rodar lado a lado sem conflito. As credenciais do whatsapp-web.js ficam em `privated/wwebjs-sessions`.

Endpoints (JWT obrigatório):

- POST `/api/wwebjs/init` { sessionId } → retorna `{ qr: { qr, dataUrl } }` quando precisar escanear
- POST `/api/wwebjs/send-text` { sessionId, to, text }
- POST `/api/wwebjs/send-media` { sessionId, to, base64, mimetype, filename? }
```

## 📊 Sistema de Enquetes

O ZaZap inclui um sistema avançado de enquetes para interação com clientes:

### ✨ Funcionalidades
- 📝 **Criação Simples** - Interface intuitiva para criar enquetes
- 🔘 **Múltiplas Opções** - Até 12 opções por enquete
- 📊 **Resultados em Tempo Real** - Acompanhe respostas instantaneamente
- 📱 **Compatibilidade Total** - Funciona em todos os dispositivos
- 🎯 **Integração WhatsApp** - Enviadas diretamente via WhatsApp

### 🚀 Como Usar
1. Abra um ticket de atendimento
2. Clique no botão de mensagem (+)
3. Selecione "Enquete" 
4. Configure pergunta e opções
5. Envie para o cliente

### 📈 Benefícios
- **Engajamento** - Clientes interagem diretamente
- **Feedback** - Colete opiniões valiosas
- **Automação** - Reduza tempo de resposta
- **Analytics** - Métricas detalhadas de participação  

## � Apoie o Projeto

Se o ZaZap está ajudando seu negócio, considere fazer uma doação para manter o desenvolvimento ativo!

<div align="center">

### 🎁 Faça sua Doação via PIX

<img src="docs/images/donation-qr.jpg" alt="QR Code PIX para Doação" width="200"/>

**PIX:** Escaneie o QR Code acima

---

💛 **Sua doação ajuda a:**  
✨ Desenvolver novas funcionalidades  
🐛 Corrigir bugs mais rapidamente  
📚 Melhorar a documentação  
� Manter o projeto sempre atualizado  

</div>

## � Comunidade

📱 **Telegram:** [ZaZap Multiatendimento](https://t.me/zazapmutiatendimento)  
🐛 **Issues:** [GitHub Issues](https://github.com/flaviokalleu/zazap/issues)  
💬 **Discussões:** [GitHub Discussions](https://github.com/flaviokalleu/zazap/discussions)  

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

<div align="center">
  <p><strong>💛 ZaZap</strong> - Transformando comunicação em resultados</p>
  <p>Feito com ❤️ para melhorar o atendimento ao cliente</p>
  <p>© 2025 ZaZap. Todos os direitos reservados.</p>
</div>
