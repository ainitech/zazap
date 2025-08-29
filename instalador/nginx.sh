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

# Função para carregar configurações
load_config() {
    if [ -f /tmp/zazap-config ]; then
        source /tmp/zazap-config
        log_info "Configurações carregadas da instalação anterior"
    else
        log_warning "Configurações não encontradas, solicitando manualmente"
        collect_info
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
    
    # Salvar configurações
    cat > /tmp/zazap-config << EOF
DOMAIN="$DOMAIN"
BACKEND_PORT="$BACKEND_PORT"
SYSTEM_USER="$SYSTEM_USER"
EOF
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
    
    # Verificar se o diretório da aplicação existe
    if [ ! -d "$APP_DIR" ]; then
        log_error "Diretório da aplicação não encontrado: $APP_DIR"
        log_error "Execute primeiro o script de instalação: ./install.sh"
        exit 1
    fi
    
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
        
        # Cache para HTML
        location ~* \.html$ {
            expires 1h;
            add_header Cache-Control "public";
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
        
        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
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
        proxy_read_timeout 86400;
    }

    # Servir uploads
    location /uploads/ {
        alias $APP_DIR/backend/uploads/;
        expires 1d;
        add_header Cache-Control "public";
        
        # Tipos de arquivo permitidos
        location ~* \.(jpg|jpeg|png|gif|ico|svg|pdf|doc|docx|mp4|mp3|wav|zip)$ {
            expires 30d;
        }
    }

    # API de saúde
    location /health {
        proxy_pass http://localhost:$BACKEND_PORT/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Bloquear acesso a arquivos sensíveis
    location ~ /\. {
        deny all;
        return 404;
    }
    
    location ~ \.(env|log|config|json|js\.map|css\.map)$ {
        deny all;
        return 404;
    }
    
    # Bloquear acesso aos diretórios de sistema
    location ~ ^/(sessions|logs|node_modules)/ {
        deny all;
        return 404;
    }
}

# Configuração adicional para redirecionamento www
server {
    listen 80;
    server_name www.$DOMAIN;
    return 301 http://$DOMAIN\$request_uri;
}
EOF

    # Verificar se o diretório build existe
    if [ ! -d "$APP_DIR/frontend/build" ]; then
        log_warning "Diretório build do frontend não encontrado"
        log_info "Executando build do frontend..."
        
        cd "$APP_DIR/frontend"
        sudo -u $SYSTEM_USER npm run build
        check_error "Falha ao fazer build do frontend"
    fi

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
        
        # Permitir porta específica do backend (se necessário para debug)
        # ufw allow $BACKEND_PORT
        
        # Habilitar firewall se não estiver ativo
        if ! ufw status | grep -q "Status: active"; then
            echo "y" | ufw enable
        fi
        
        log_info "Firewall configurado"
        ufw status
    else
        log_warning "UFW não encontrado, configuração de firewall ignorada"
    fi
}

# Função para otimizar Nginx
optimize_nginx() {
    log "Otimizando configuração do Nginx..."
    
    # Backup da configuração original
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
    
    # Configurar nginx.conf para melhor performance
    cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 15;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
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

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

    # Testar configuração
    nginx -t
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        log_info "Nginx otimizado com sucesso"
    else
        log_warning "Erro na otimização, restaurando configuração original"
        cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf
        systemctl reload nginx
    fi
}

# Função para criar script de monitoramento
create_monitoring() {
    log "Criando script de monitoramento..."
    
    cat > /usr/local/bin/zazap-nginx-status << 'EOF'
#!/bin/bash

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== STATUS DO NGINX ZAZAP ===${NC}\n"

# Status do serviço
echo -e "${YELLOW}Serviço Nginx:${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "  Status: ${GREEN}Ativo${NC}"
    echo "  Uptime: $(systemctl show nginx --property=ActiveEnterTimestamp --value | cut -d' ' -f2-)"
else
    echo -e "  Status: ${RED}Inativo${NC}"
fi

# Teste de configuração
echo -e "\n${YELLOW}Configuração:${NC}"
if nginx -t 2>/dev/null; then
    echo -e "  Sintaxe: ${GREEN}OK${NC}"
else
    echo -e "  Sintaxe: ${RED}ERRO${NC}"
fi

# Sites habilitados
echo -e "\n${YELLOW}Sites habilitados:${NC}"
for site in /etc/nginx/sites-enabled/*; do
    if [ -f "$site" ]; then
        basename "$site"
    fi
done

# Conexões ativas
echo -e "\n${YELLOW}Conexões:${NC}"
CONNECTIONS=$(ss -tuln | grep :80 | wc -l)
echo "  Porta 80: $CONNECTIONS conexões"
CONNECTIONS_443=$(ss -tuln | grep :443 | wc -l)
echo "  Porta 443: $CONNECTIONS_443 conexões"

# Logs recentes
echo -e "\n${YELLOW}Logs recentes (últimas 5 linhas):${NC}"
echo -e "${YELLOW}Access Log:${NC}"
tail -n 5 /var/log/nginx/zazap_access.log 2>/dev/null || echo "  Nenhum acesso registrado"

echo -e "\n${YELLOW}Error Log:${NC}"
tail -n 5 /var/log/nginx/zazap_error.log 2>/dev/null || echo "  Nenhum erro registrado"
EOF

    chmod +x /usr/local/bin/zazap-nginx-status
    log_info "Script de monitoramento criado: zazap-nginx-status"
}

# Função principal
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║         CONFIGURADOR NGINX ZAZAP        ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    check_root
    load_config
    install_nginx
    configure_nginx
    optimize_nginx
    configure_firewall
    create_monitoring
    
    echo -e "\n${GREEN}=== NGINX CONFIGURADO ===${NC}\n"
    
    log_info "Nginx configurado com sucesso!"
    echo -e "${YELLOW}Informações:${NC}"
    echo "- Site configurado: $DOMAIN"
    echo "- Configuração: /etc/nginx/sites-available/zazap"
    echo "- Logs: /var/log/nginx/zazap_*.log"
    echo "- Acesso temporário: http://$DOMAIN"
    echo ""
    echo -e "${YELLOW}Próximos passos:${NC}"
    echo "1. Configure o DNS do domínio para apontar para este servidor"
    echo "2. Configure o SSL: ./ssl.sh"
    echo "3. Acesse: https://$DOMAIN (após SSL)"
    echo ""
    echo -e "${BLUE}Comandos úteis:${NC}"
    echo "- Status Nginx: zazap-nginx-status"
    echo "- Status geral: zazap-status"
    echo "- Testar config: nginx -t"
    echo "- Recarregar: systemctl reload nginx"
    echo "- Ver logs: tail -f /var/log/nginx/zazap_*.log"
    
    echo -e "\n${GREEN}Configuração do Nginx finalizada!${NC}"
}

main "$@"
