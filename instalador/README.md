# 🚀 ZazAP - Instalador Automático

Sistema completo de instalação automática do ZazAP para Ubuntu/Debian.

## 📋 Pré-requisitos

- Ubuntu 18.04+ ou Debian 10+
- Acesso root (sudo)
- Domínio apontando para o servidor
- Conexão com internet

## 🛠️ Instalação Completa

### 1. Instalação do Sistema

```bash
cd instalador
sudo ./install.sh
```

Este script irá:
- ✅ Instalar Node.js 20 LTS
- ✅ Instalar PostgreSQL
- ✅ Configurar banco de dados
- ✅ Instalar dependências da aplicação
- ✅ Configurar PM2
- ✅ Criar usuário do sistema

### 2. Configuração do Nginx

```bash
sudo ./nginx.sh
```

Este script irá:
- ✅ Instalar e configurar Nginx
- ✅ Configurar proxy reverso
- ✅ Otimizar performance
- ✅ Configurar firewall

### 3. Configuração do SSL

```bash
sudo ./ssl.sh
```

Este script irá:
- ✅ Instalar Certbot
- ✅ Obter certificados SSL gratuitos
- ✅ Configurar HTTPS
- ✅ Configurar renovação automática

## 🎯 Instalação Rápida (Tudo de uma vez)

```bash
cd instalador
sudo ./setup.sh
```

## 📊 Monitoramento

### Comandos Úteis

```bash
# Status geral do sistema
zazap-status

# Verificar SSL
zazap-ssl-check seudominio.com

# Ver logs da aplicação
zazap-logs

# Reiniciar aplicação
zazap-restart

# Status do Nginx
zazap-nginx-status
```

### Logs Importantes

```bash
# Logs da aplicação
sudo -u zazap pm2 logs

# Logs do Nginx
tail -f /var/log/nginx/zazap_*.log

# Logs de renovação SSL
tail -f /var/log/certbot-renew.log
```

## 🔧 Configurações

### Estrutura de Arquivos

```
/home/zazap/zazap/
├── backend/           # API e lógica de negócio
├── frontend/build/    # Interface web compilada
├── logs/             # Logs da aplicação
├── sessions/         # Sessões do WhatsApp
├── uploads/          # Arquivos enviados
└── ecosystem.config.js # Configuração PM2
```

### Portas Utilizadas

- **80**: HTTP (redireciona para HTTPS)
- **443**: HTTPS
- **3001**: Backend (interno)
- **5432**: PostgreSQL (interno)

### Usuários

- **zazap**: Usuário do sistema para executar a aplicação
- **postgres**: Usuário do banco de dados

## 🛡️ Segurança

### Firewall (UFW)

```bash
# Verificar status
sudo ufw status

# Permitir apenas portas necessárias
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### SSL/TLS

- Certificados Let's Encrypt gratuitos
- Renovação automática configurada
- Protocolos TLS 1.2 e 1.3
- HSTS habilitado
- OCSP Stapling

### Nginx

- Headers de segurança configurados
- Rate limiting
- Compressão Gzip
- Cache otimizado
- Bloqueio de arquivos sensíveis

## 🔄 Manutenção

### Atualizações da Aplicação

```bash
# Navegar para o diretório
cd /home/zazap/zazap

# Parar aplicação
sudo -u zazap pm2 stop zazap-backend

# Atualizar código (git pull ou copiar arquivos)
# ...

# Instalar dependências se necessário
cd backend && sudo -u zazap npm install
cd ../frontend && sudo -u zazap npm install && sudo -u zazap npm run build

# Reiniciar aplicação
sudo -u zazap pm2 start zazap-backend
```

### Backup

```bash
# Backup do banco de dados
sudo -u postgres pg_dump zazap > backup_$(date +%Y%m%d).sql

# Backup dos arquivos
tar -czf backup_files_$(date +%Y%m%d).tar.gz /home/zazap/zazap/uploads /home/zazap/zazap/sessions
```

### Restauração

```bash
# Restaurar banco de dados
sudo -u postgres psql zazap < backup_20240101.sql

# Restaurar arquivos
tar -xzf backup_files_20240101.tar.gz -C /
chown -R zazap:zazap /home/zazap/zazap/uploads /home/zazap/zazap/sessions
```

## 🚨 Solução de Problemas

### Aplicação não inicia

```bash
# Verificar logs
sudo -u zazap pm2 logs

# Verificar se as dependências estão instaladas
cd /home/zazap/zazap/backend && npm list

# Verificar configuração do banco
sudo -u postgres psql -c "SELECT version();"
```

### Problemas de SSL

```bash
# Verificar certificados
certbot certificates

# Testar renovação
certbot renew --dry-run

# Verificar configuração Nginx
nginx -t
```

### Problemas de conectividade

```bash
# Verificar se as portas estão abertas
netstat -tlnp | grep -E ':(80|443|3001)'

# Verificar firewall
sudo ufw status

# Verificar DNS
dig seudominio.com
```

## 📞 Suporte

### Logs de Instalação

Os logs de instalação são salvos em:
- `/tmp/zazap-install.log`
- `/var/log/nginx/zazap_*.log`
- `/var/log/certbot-renew.log`

### Arquivos de Configuração

- **Nginx**: `/etc/nginx/sites-available/zazap`
- **SSL**: `/etc/letsencrypt/live/seudominio.com/`
- **PM2**: `/home/zazap/zazap/ecosystem.config.js`
- **Aplicação**: `/home/zazap/zazap/backend/.env`

## 🎉 Próximos Passos

Após a instalação completa:

1. Acesse `https://seudominio.com`
2. Configure sua primeira sessão do WhatsApp
3. Explore as funcionalidades do sistema
4. Configure backups regulares
5. Monitore os logs regularmente

---

**ZazAP** - Sistema de WhatsApp Multi-Sessão
Instalação automatizada para Ubuntu/Debian
