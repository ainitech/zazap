#!/bin/bash

# ================================
# ZazAP - Configurador Nginx
# Versão: 1.0
# ================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logs
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERRO: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] AVISO: $1${NC}"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Função para verificar se o comando foi executado com sucesso
check_error() {
    if [ $? -ne 0 ]; then
        log_error "$1"
        exit 1
    fi
}

# Função para verificar se está rodando como root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Este script deve ser executado como root (use sudo)"
        exit 1
    fi
}

# Função para coletar informações
collect_info() {
    echo -e "\n${YELLOW}=== CONFIGURAÇÃO DO NGINX ===${NC}\n"
    
    # Domínio
    while [[ -z "$DOMAIN" ]]; do
        read -p "Digite o domínio principal (ex: meusite.com): " DOMAIN
        if [[ -z "$DOMAIN" ]]; then
            log_warning "Domínio é obrigatório!"
        fi
    done
    
    # Porta do backend
    read -p "Porta do backend [3001]: " BACKEND_PORT
    BACKEND_PORT=${BACKEND_PORT:-3001}
    
    # Usuário do sistema
    read -p "Usuário do sistema [zazap]: " SYSTEM_USER
    SYSTEM_USER=${SYSTEM_USER:-zazap}
    
    # Confirmar
    echo -e "\n${YELLOW}=== RESUMO ===${NC}"
    echo "Domínio: $DOMAIN"
    echo "Porta backend: $BACKEND_PORT"
    echo "Usuário: $SYSTEM_USER"
    echo
    
    read -p "Continuar? (s/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
        log_info "Configuração cancelada"
        exit 0
    fi
}

# Função para instalar Nginx
install_nginx() {
    log "Instalando Nginx..."
    
    # Verificar se já está instalado
    if command -v nginx &> /dev/null; then
        log_warning "Nginx já está instalado"
    else
        apt update
        apt install -y nginx
        check_error "Falha ao instalar Nginx"
    fi
    
    # Iniciar e habilitar Nginx
    systemctl start nginx
    systemctl enable nginx
    
    log_info "Nginx instalado e iniciado"
}

# Função para configurar Nginx
configure_nginx() {
    log "Configurando Nginx..."
    
    APP_DIR="/home/$SYSTEM_USER/zazap"
    
    # Criar configuração do site
    cat > /etc/nginx/sites-available/zazap << EOF
# Configuração Nginx para ZazAP
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Logs
    access_log /var/log/nginx/zazap_access.log;
    error_log /var/log/nginx/zazap_error.log;

    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' ws: wss:" always;

    # Configurações de performance
    client_max_body_size 50M;
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Servir arquivos estáticos do frontend
    location / {
        root $APP_DIR/frontend/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
        
        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy para API do backend
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy para Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:$BACKEND_PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket specific
        proxy_buffering off;
        proxy_cache off;
    }

    # Servir uploads
    location /uploads/ {
        alias $APP_DIR/backend/uploads/;
        expires 1d;
        add_header Cache-Control "public";
    }

    # Bloquear acesso a arquivos sensíveis
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log|config)$ {
        deny all;
    }
}
EOF

    # Habilitar site
    ln -sf /etc/nginx/sites-available/zazap /etc/nginx/sites-enabled/
    
    # Remover site padrão se existir
    if [ -f /etc/nginx/sites-enabled/default ]; then
        rm /etc/nginx/sites-enabled/default
    fi
    
    # Testar configuração
    nginx -t
    check_error "Configuração do Nginx inválida"
    
    # Recarregar Nginx
    systemctl reload nginx
    check_error "Falha ao recarregar Nginx"
    
    log_info "Nginx configurado com sucesso"
}

# Função para configurar firewall
configure_firewall() {
    log "Configurando firewall..."
    
    # Verificar se ufw está instalado
    if command -v ufw &> /dev/null; then
        # Permitir SSH
        ufw allow ssh
        
        # Permitir HTTP e HTTPS
        ufw allow 'Nginx Full'
        
        # Habilitar firewall se não estiver ativo
        if ! ufw status | grep -q "Status: active"; then
            echo "y" | ufw enable
        fi
        
        log_info "Firewall configurado"
    else
        log_warning "UFW não encontrado, configuração de firewall ignorada"
    fi
}

# Função para criar script de status
create_status_script() {
    log "Criando script de status..."
    
    cat > /usr/local/bin/zazap-status << 'EOF'
#!/bin/bash

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== STATUS DO ZAZAP ===${NC}\n"

# Status do Nginx
echo -e "${YELLOW}Nginx:${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "  Status: ${GREEN}Ativo${NC}"
else
    echo -e "  Status: ${RED}Inativo${NC}"
fi

# Status do PostgreSQL
echo -e "\n${YELLOW}PostgreSQL:${NC}"
if systemctl is-active --quiet postgresql; then
    echo -e "  Status: ${GREEN}Ativo${NC}"
else
    echo -e "  Status: ${RED}Inativo${NC}"
fi

# Status da aplicação (PM2)
echo -e "\n${YELLOW}Aplicação ZazAP:${NC}"
if sudo -u zazap pm2 list | grep -q "online"; then
    echo -e "  Status: ${GREEN}Online${NC}"
    sudo -u zazap pm2 list --no-color | grep "zazap-backend"
else
    echo -e "  Status: ${RED}Offline${NC}"
fi

# Uso de recursos
echo -e "\n${YELLOW}Recursos do Sistema:${NC}"
echo "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "  RAM: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "  Disco: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"

# Logs recentes
echo -e "\n${YELLOW}Logs Recentes:${NC}"
echo "Nginx Error Log (últimas 5 linhas):"
tail -n 5 /var/log/nginx/zazap_error.log 2>/dev/null || echo "  Nenhum erro encontrado"

echo
EOF

    chmod +x /usr/local/bin/zazap-status
    log_info "Script de status criado: zazap-status"
}

# Função principal
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║         CONFIGURADOR NGINX ZAZAP        ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    check_root
    collect_info
    install_nginx
    configure_nginx
    configure_firewall
    create_status_script
    
    echo -e "\n${GREEN}=== NGINX CONFIGURADO ===${NC}\n"
    
    log_info "Nginx configurado com sucesso!"
    echo -e "${YELLOW}Informações:${NC}"
    echo "- Site configurado: $DOMAIN"
    echo "- Configuração: /etc/nginx/sites-available/zazap"
    echo "- Logs: /var/log/nginx/zazap_*.log"
    echo ""
    echo -e "${YELLOW}Próximos passos:${NC}"
    echo "1. Configure o SSL: ./configure-ssl.sh"
    echo "2. Aponte o DNS do domínio para este servidor"
    echo "3. Acesse: http://$DOMAIN"
    echo ""
    echo -e "${BLUE}Comandos úteis:${NC}"
    echo "- Status geral: zazap-status"
    echo "- Testar Nginx: nginx -t"
    echo "- Recarregar Nginx: systemctl reload nginx"
    echo "- Ver logs: tail -f /var/log/nginx/zazap_*.log"
}

main "$@"
