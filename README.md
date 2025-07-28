# 🚀 ZaZap - Sistema de Atendimento WhatsApp

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Development-orange.svg)]()

> Sistema completo de atendimento ao cliente via WhatsApp com interface moderna e funcionalidades avançadas de gerenciamento.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Screenshots](#screenshots)
- [Contribuição](#contribuição)
- [Licença](#licença)

## 🎯 Sobre o Projeto

O **ZaZap** é um sistema completo de atendimento ao cliente via WhatsApp, desenvolvido para empresas que precisam de uma solução robusta e escalável para gerenciar conversas, tickets e atendimentos em massa.

### ✨ Principais Características

- 💬 **Interface de Chat em Tempo Real** - Conversas fluidas e responsivas
- 📊 **Dashboard Analítico** - Métricas detalhadas e visualizações interativas
- 👥 **Gerenciamento de Agentes** - Controle completo de usuários e permissões
- 🎫 **Sistema de Tickets** - Organização e acompanhamento de atendimentos
- 📱 **Integração WhatsApp** - Conexão direta com a API do WhatsApp
- 🔄 **Filas de Atendimento** - Distribuição inteligente de conversas
- 📈 **Relatórios Avançados** - Análises de desempenho e produtividade

## 🚀 Funcionalidades

### 📱 Frontend (React)
- ✅ **Dashboard Interativo** com gráficos em tempo real
- ✅ **Chat Interface** com design moderno e responsivo
- ✅ **Gerenciamento de Contatos** com busca e filtros
- ✅ **Sistema de Filas** para organização de atendimentos
- ✅ **Painel de Sessões** para monitoramento de conexões
- ✅ **Configurações Avançadas** personalizáveis
- ✅ **Tema Dark/Light** com cores customizáveis
- ✅ **Notificações em Tempo Real**

### 🔧 Backend (Node.js)
- ✅ **API RESTful** completa e documentada
- ✅ **Autenticação JWT** segura
- ✅ **Integração WhatsApp** via Baileys e WhatsApp.js
- ✅ **Banco de Dados** PostgreSQL com Sequelize ORM
- ✅ **Sistema de Migrações** para versionamento do banco
- ✅ **Upload de Arquivos** com validação
- ✅ **Logs Detalhados** para debugging
- ✅ **Middleware de Segurança**

## 🛠 Tecnologias

### Frontend
- **React 18+** - Biblioteca principal
- **React Router DOM** - Roteamento
- **Tailwind CSS** - Estilização
- **Heroicons** - Ícones
- **Fetch API** - Requisições HTTP

### Backend
- **Node.js 18+** - Runtime JavaScript
- **Express.js** - Framework web
- **Sequelize** - ORM para banco de dados
- **PostgreSQL** - Banco de dados principal
- **JWT** - Autenticação
- **Multer** - Upload de arquivos
- **Baileys** - Integração WhatsApp
- **WhatsApp.js** - Alternativa para WhatsApp

### Ferramentas
- **Git** - Controle de versão
- **npm** - Gerenciador de pacotes
- **Nodemon** - Auto-reload em desenvolvimento

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18 ou superior) - [Download](https://nodejs.org/)
- **npm** (vem com Node.js) ou **yarn**
- **PostgreSQL** (versão 14 ou superior) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

## 💾 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/flaviokalleu/zazap.git
cd zazap
```

### 2. Instale as dependências do Backend
```bash
cd backend
npm install
```

### 3. Instale as dependências do Frontend
```bash
cd ../frontend
npm install
```

## ⚙ Configuração

### 1. Configuração do Banco de Dados

Crie um banco de dados PostgreSQL:
```sql
CREATE DATABASE zazap_db;
```

### 2. Configuração do Backend

Crie o arquivo `backend/config/config.json`:
```json
{
  "development": {
    "username": "seu_usuario",
    "password": "sua_senha",
    "database": "zazap_db",
    "host": "localhost",
    "dialect": "postgres",
    "port": 5432
  },
  "production": {
    "username": "seu_usuario",
    "password": "sua_senha",
    "database": "zazap_db",
    "host": "localhost",
    "dialect": "postgres",
    "port": 5432
  }
}
```

### 3. Configuração do Frontend

Crie o arquivo `frontend/src/config/config.js`:
```javascript
const config = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  WS_BASE_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:3001'
};

export default config;
```

### 4. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do backend (opcional):
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=seu_jwt_secret_aqui
```

## 🎮 Uso

### 1. Execute as migrações do banco de dados
```bash
cd backend
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

### 2. Inicie o Backend
```bash
cd backend
npm start
# ou para desenvolvimento
npm run dev
```

### 3. Inicie o Frontend
```bash
cd frontend
npm start
```

### 4. Acesse a aplicação
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### 5. Login Padrão
```
Email: admin@zazap.com
Senha: admin123
```

## 📁 Estrutura do Projeto

```
zazap/
├── backend/                 # Backend Node.js
│   ├── config/             # Configurações do banco
│   ├── controllers/        # Controladores da API
│   ├── middleware/         # Middlewares personalizados
│   ├── migrations/         # Migrações do banco
│   ├── models/            # Modelos Sequelize
│   ├── routes/            # Rotas da API
│   ├── seeders/           # Seeds do banco
│   ├── services/          # Serviços e lógica de negócio
│   ├── uploads/           # Arquivos uploadados
│   ├── index.js           # Servidor principal
│   └── package.json       # Dependências do backend
│
├── frontend/               # Frontend React
│   ├── public/            # Arquivos públicos
│   ├── src/               # Código fonte React
│   │   ├── components/    # Componentes reutilizáveis
│   │   │   ├── chat/      # Componentes de chat
│   │   │   └── pages/     # Componentes de página
│   │   ├── context/       # Context API
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Páginas principais
│   │   ├── services/      # Serviços de API
│   │   └── config/        # Configurações
│   └── package.json       # Dependências do frontend
│
└── README.md              # Documentação
```

## 🌐 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/register` - Registro de usuário

### Usuários
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Deletar usuário

### Tickets
- `GET /api/tickets` - Listar tickets
- `POST /api/tickets` - Criar ticket
- `PUT /api/tickets/:id` - Atualizar ticket
- `DELETE /api/tickets/:id` - Deletar ticket

### Mensagens
- `GET /api/ticket-messages/:ticketId` - Mensagens do ticket
- `POST /api/ticket-messages/:ticketId` - Enviar mensagem

### Filas
- `GET /api/queues` - Listar filas
- `POST /api/queues` - Criar fila
- `PUT /api/queues/:id` - Atualizar fila
- `DELETE /api/queues/:id` - Deletar fila

### Sessões
- `GET /api/sessions` - Listar sessões WhatsApp
- `POST /api/sessions` - Criar sessão
- `DELETE /api/sessions/:id` - Remover sessão

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas do dashboard

## 📸 Screenshots

### Dashboard Principal
![Dashboard](docs/images/dashboard.png)

### Interface de Chat
![Chat](docs/images/chat.png)

### Gerenciamento de Contatos
![Contatos](docs/images/contacts.png)

### Filas de Atendimento
![Filas](docs/images/queues.png)

## 🤝 Contribuição

Contribuições são sempre bem-vindas! Para contribuir:

1. **Fork** o projeto
2. Crie uma **branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### 📝 Diretrizes de Contribuição

- Mantenha o código limpo e bem comentado
- Siga as convenções de nomenclatura existentes
- Teste suas alterações antes de enviar
- Atualize a documentação se necessário

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Se você encontrar algum problema ou tiver dúvidas:

- 🐛 **Issues**: Reporte bugs através das [Issues do GitHub](https://github.com/seu-usuario/zazap/issues)
- 💬 **Discussões**: Participe das [Discussões do GitHub](https://github.com/seu-usuario/zazap/discussions)
- 📧 **Email**: contato@zazap.com

## 👥 Comunidade

Participe da nossa comunidade no Telegram para dúvidas, novidades e networking:

- [ZaZap Multiatendimento Telegram](https://t.me/zazapmutiatendimento)

## 🙏 Agradecimentos

- [React](https://reactjs.org/) - Biblioteca principal do frontend
- [Express.js](https://expressjs.com/) - Framework backend
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [Heroicons](https://heroicons.com/) - Ícones SVG
- [Sequelize](https://sequelize.org/) - ORM para Node.js
- [Baileys](https://github.com/adiwajshing/Baileys) - API WhatsApp

---

<div align="center">
  <p>Feito com ❤️ para melhorar o atendimento ao cliente</p>
  <p>© 2025 ZaZap. Todos os direitos reservados.</p>
</div>
