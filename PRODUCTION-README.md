# 🚀 Guia de Produção - Zazap

Este guia explica como configurar o Zazap para funcionar em produção com IP e domínio.

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL
- Nginx (opcional, recomendado)
- Certificado SSL (recomendado)
- WhatsApp Business API ou WhatsApp Web (para enquetes)

## ⚡ Configuração Rápida

### 1. Configuração Automática

Execute o script de configuração automática:

```bash
node configure-production.js
```

Este script irá:
- ✅ Detectar seu IP local
- ✅ Atualizar arquivos .env
- ✅ Configurar CORS para múltiplas origens
- ✅ Configurar variáveis para enquetes WhatsApp

### 2. Configuração Manual

#### Backend (.env)
```env
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://SEU_IP:3000,http://SEU_IP:3001

# Configurações de Enquetes
WHATSAPP_POLL_ENABLED=true
WHATSAPP_POLL_MAX_OPTIONS=12
WHATSAPP_POLL_MIN_OPTIONS=2
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://SEU_IP:3001
REACT_APP_WS_URL=ws://SEU_IP:3001
REACT_APP_BACKEND_URL=http://SEU_IP:3001
REACT_APP_POLL_ENABLED=true
```

## 🌐 Configuração com Domínio

### 1. Nginx (Proxy Reverso)

1. Instale o Nginx:
```bash
sudo apt update
sudo apt install nginx
```

2. Copie a configuração:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/zazap
sudo ln -s /etc/nginx/sites-available/zazap /etc/nginx/sites-enabled/
```

3. Atualize o arquivo nginx.conf com seu domínio

4. Teste a configuração:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 2. SSL/HTTPS (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

### 3. Atualizar Variáveis de Ambiente

```env
# Frontend
REACT_APP_API_URL=https://seu-dominio.com
REACT_APP_WS_URL=wss://seu-dominio.com
REACT_APP_BACKEND_URL=https://seu-dominio.com
REACT_APP_POLL_ENABLED=true

# Backend
NODE_ENV=production
WHATSAPP_POLL_ENABLED=true
WHATSAPP_POLL_MAX_OPTIONS=12
WHATSAPP_POLL_MIN_OPTIONS=2
```

## 📊 Configuração de Enquetes

### Requisitos para Enquetes
- ✅ WhatsApp Web ou Business API ativo
- ✅ Sessão WhatsApp conectada e autenticada
- ✅ Permissões para enviar mensagens
- ✅ Conexão estável com internet

### Configurações Avançadas
```env
# Limites de enquetes
WHATSAPP_POLL_MAX_OPTIONS=12
WHATSAPP_POLL_MIN_OPTIONS=2
WHATSAPP_POLL_QUESTION_MAX_LENGTH=300

# Timeouts e retries
WHATSAPP_POLL_TIMEOUT=30000
WHATSAPP_POLL_RETRY_ATTEMPTS=3
WHATSAPP_POLL_RETRY_DELAY=5000
```

### Teste de Enquetes
```bash
# Testar envio de enquete
curl -X POST http://SEU_IP:3001/api/buttons/poll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "sessionId": "sua_session_id",
    "ticketId": "ticket_id",
    "question": "Qual sua opinião sobre nosso atendimento?",
    "options": ["Excelente", "Bom", "Regular", "Ruim"]
  }'
```

## 🔧 Configurações Avançadas

### Firewall

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 3001

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### PM2 (Gerenciador de Processos)

```bash
# Instalar PM2
npm install -g pm2

# Backend
cd backend
pm2 start index.js --name "zazap-backend"

# Frontend (build de produção)
cd frontend
npm run build
pm2 serve build --name "zazap-frontend" --port 3000

# Salvar configuração
pm2 save
pm2 startup
```

### Docker

```dockerfile
# Dockerfile para produção
FROM node:18-alpine

WORKDIR /app

# Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

COPY backend/ ./backend/

# Frontend
COPY frontend/ ./frontend/
RUN cd frontend && npm ci && npm run build

EXPOSE 3000 3001

CMD ["sh", "-c", "cd backend && npm start & cd frontend && npm start"]
```

## 🔍 Verificação

### 1. Verificar se o backend está acessível:

```bash
curl http://SEU_IP:3001/
# Deve retornar: "Zazap Backend API"
```

### 2. Verificar CORS:

```bash
curl -H "Origin: http://SEU_IP:3000" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://SEU_IP:3001/api/sessions
```

### 3. Verificar WebSocket:

```bash
# Use uma ferramenta como Postman ou browser dev tools
# para testar a conexão WebSocket em ws://SEU_IP:3001
```

## 🚨 Solução de Problemas

### CORS Errors
- ✅ Verifique se o IP está na lista `CORS_ORIGINS`
- ✅ Certifique-se de que o HOST está configurado como `0.0.0.0`
- ✅ Reinicie o backend após mudanças

### WebSocket Connection Failed
- ✅ Verifique se a porta 3001 está aberta no firewall
- ✅ Confirme se o frontend está usando a URL correta
- ✅ Verifique logs do backend para erros de Socket.IO

### Enquetes não funcionam
- ✅ Verifique se a sessão WhatsApp está conectada
- ✅ Confirme se `WHATSAPP_POLL_ENABLED=true`
- ✅ Valide se a sessão tem permissão para enviar mensagens
- ✅ Verifique logs para erros específicos de enquetes
- ✅ Teste com uma enquete simples (2 opções)

### Erro "Poll creation failed"
- ✅ Sessão WhatsApp precisa estar totalmente sincronizada
- ✅ Verifique se o número de destino é válido
- ✅ Confirme limite de opções (2-12)
- ✅ Aguarde alguns segundos entre envios

### Respostas de enquetes não aparecem
- ✅ WebSocket precisa estar conectado
- ✅ Frontend deve ter `REACT_APP_POLL_ENABLED=true`
- ✅ Verifique se o ticket está ativo
- ✅ Confirme permissões de leitura de mensagens

## 📊 Monitoramento

### Logs
```bash
# Backend logs
tail -f backend/logs/app.log

# Nginx logs
tail -f /var/log/nginx/zazap_access.log
tail -f /var/log/nginx/zazap_error.log
```

### Health Check
```bash
# Endpoint de saúde
curl http://SEU_IP:3001/health

# Status de enquetes
curl http://SEU_IP:3001/api/poll/status

# Status do PM2
pm2 status
pm2 logs
```

### Métricas de Enquetes
```bash
# Verificar estatísticas de enquetes
curl http://SEU_IP:3001/api/poll/stats

# Logs específicos de enquetes
tail -f backend/logs/poll.log
```

## 🔒 Segurança

### Produção Checklist
- [ ] NODE_ENV=production
- [ ] HTTPS configurado
- [ ] Firewall ativo
- [ ] JWT_SECRET forte
- [ ] Logs configurados
- [ ] Backups automáticos
- [ ] Monitoramento ativo
- [ ] **Enquetes habilitadas:** WHATSAPP_POLL_ENABLED=true
- [ ] **Sessão WhatsApp configurada**
- [ ] **Limites de enquetes definidos**
- [ ] **Rate limiting para API de enquetes**

### Variáveis Sensíveis
Nunca commite:
- Senhas de banco
- JWT secrets
- Chaves API
- Certificados SSL

Use variáveis de ambiente ou serviços como:
- AWS Secrets Manager
- HashiCorp Vault
- Docker Secrets

## 📞 Suporte

Para problemas específicos:
1. Verifique os logs do backend/frontend
2. Teste conectividade de rede
3. Confirme configurações de firewall
4. Valide configurações de domínio/DNS

---

**🎉 Pronto!** Seu Zazap agora está configurado para produção com suporte a IP e domínio.
