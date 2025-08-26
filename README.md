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

## 🛠 Tecnologias

**Frontend:** React 18 + Tailwind CSS + Heroicons  
**Backend:** Node.js + Express + Sequelize + PostgreSQL  
**WhatsApp:** Baileys + WhatsApp.js  
**Auth:** JWT + Middleware de segurança  

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

### 4. Execute as migrações e inicie
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

## 📁 Estrutura Simplificada

```
zazap/
├── backend/           # API Node.js + Express
│   ├── controllers/   # Lógica de negócio
│   ├── models/       # Modelos Sequelize  
│   ├── routes/       # Endpoints API
│   └── services/     # Serviços WhatsApp
├── frontend/         # React App
│   └── src/
│       ├── pages/    # Páginas principais
│       └── components/ # Componentes reutilizáveis
```

## 🌐 API Principais

**Auth:** `POST /api/auth/login`  
**Tickets:** `GET|POST|PUT /api/tickets`  
**Mensagens:** `GET|POST /api/ticket-messages/:id`  
**Sessões:** `GET|POST|DELETE /api/sessions`  
**Dashboard:** `GET /api/dashboard/stats`  
**Campanhas:** `GET|POST /api/campaigns`  

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
