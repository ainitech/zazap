#!/bin/bash

# ================================
# ZazAP - Configurador SSL
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

# Função para verificar se o domínio está apontando para o servidor
check_domain_dns() {
    log "Verificando DNS do domínio..."
    
    # Obter IP público do servidor
    SERVER_IP=$(curl -s --connect-timeout 10 https://ipecho.net/plain || curl -s --connect-timeout 10 https://icanhazip.com/ || curl -s --connect-timeout 10 https://ifconfig.me)
    
    if [[ -z "$SERVER_IP" ]]; then
        log_warning "Não foi possível obter o IP público do servidor"
        log_warning "Verifique sua conexão com a internet"
        
        read -p "Deseja continuar mesmo assim? (s/N): " CONTINUE
        if [[ ! "$CONTINUE" =~ ^[Ss]$ ]]; then
            exit 1
        fi
        return 1
    fi
    
    log_info "IP do servidor: $SERVER_IP"
    
    # Verificar se o domínio aponta para este servidor
    DOMAIN_IP=$(dig +short $DOMAIN @8.8.8.8 | head -n1)
    
    if [[ -z "$DOMAIN_IP" ]]; then
        log_warning "Não foi possível resolver o DNS do domínio"
        log_warning "Verifique se o domínio está configurado corretamente"
        
        read -p "Deseja continuar mesmo assim? (s/N): " CONTINUE
        if [[ ! "$CONTINUE" =~ ^[Ss]$ ]]; then
            log_info "Configure o DNS primeiro e execute novamente"
            exit 1
        fi
        return 1
    fi
    
    if [[ "$DOMAIN_IP" == "$SERVER_IP" ]]; then
        log_info "DNS configurado corretamente ✓"
        return 0
    else
        log_warning "DNS não está apontando para este servidor"
        log_warning "Domínio aponta para: $DOMAIN_IP"
        log_warning "Servidor está em: $SERVER_IP"
        
        echo -e "\n${YELLOW}Para configurar o DNS:${NC}"
        echo "1. Acesse o painel do seu provedor de domínio"
        echo "2. Crie um registro A apontando para: $SERVER_IP"
        echo "3. Aguarde a propagação (pode demorar até 24h)"
        echo
        
        read -p "Deseja continuar mesmo assim? (s/N): " CONTINUE
        if [[ ! "$CONTINUE" =~ ^[Ss]$ ]]; then
            log_info "Configure o DNS primeiro e execute novamente"
            exit 1
        fi
    fi
}

# Função para coletar informações
collect_info() {
    echo -e "\n${YELLOW}=== CONFIGURAÇÃO DO SSL ===${NC}\n"
    
    # Domínio
    while [[ -z "$DOMAIN" ]]; do
        read -p "Digite o domínio principal (ex: meusite.com): " DOMAIN
        if [[ -z "$DOMAIN" ]]; then
            log_warning "Domínio é obrigatório!"
        fi
    done
    
    # Email para certificado
    while [[ -z "$SSL_EMAIL" ]]; do
        read -p "Digite seu email para o certificado SSL: " SSL_EMAIL
        if [[ -z "$SSL_EMAIL" ]]; then
            log_warning "Email é obrigatório!"
        elif [[ ! "$SSL_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            log_warning "Email inválido!"
            SSL_EMAIL=""
        fi
    done
    
    # Subdomínios adicionais
    read -p "Incluir subdomínio www.$DOMAIN? (S/n): " INCLUDE_WWW
    INCLUDE_WWW=${INCLUDE_WWW:-S}
    
    if [[ "$INCLUDE_WWW" =~ ^[Ss]$ ]]; then
        SUBDOMAINS="www.$DOMAIN"
    else
        SUBDOMAINS=""
    fi
    
    # Subdomínios personalizados
    read -p "Subdomínios adicionais (separados por espaço, opcional): " CUSTOM_SUBDOMAINS
    if [[ -n "$CUSTOM_SUBDOMAINS" ]]; then
        if [[ -n "$SUBDOMAINS" ]]; then
            SUBDOMAINS="$SUBDOMAINS $CUSTOM_SUBDOMAINS"
        else
            SUBDOMAINS="$CUSTOM_SUBDOMAINS"
        fi
    fi
    
    # Verificar se deve testar SSL
    read -p "Fazer teste do certificado antes de instalar? (S/n): " TEST_SSL
    TEST_SSL=${TEST_SSL:-S}
    
    echo -e "\n${YELLOW}=== RESUMO ===${NC}"
    echo "Domínio principal: $DOMAIN"
    echo "Email: $SSL_EMAIL"
    echo "Subdomínios: ${SUBDOMAINS:-Nenhum}"
    echo "Teste SSL: $([[ "$TEST_SSL" =~ ^[Ss]$ ]] && echo "Sim" || echo "Não")"
    echo
    
    read -p "Continuar? (s/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
        log_info "Configuração SSL cancelada"
        exit 0
    fi
    
    # Atualizar arquivo de configuração
    cat > /tmp/zazap-config << EOF
DOMAIN="$DOMAIN"
SSL_EMAIL="$SSL_EMAIL"
SUBDOMAINS="$SUBDOMAINS"
TEST_SSL="$TEST_SSL"
EOF
}

# Função para instalar Certbot
install_certbot() {
    log "Instalando Certbot..."
    
    # Verificar se já está instalado
    if command -v certbot &> /dev/null; then
        log_warning "Certbot já está instalado"
        CERTBOT_VERSION=$(certbot --version 2>&1 | head -n1)
        log_info "$CERTBOT_VERSION"
        return 0
    fi
    
    # Instalar snapd se não estiver instalado
    if ! command -v snap &> /dev/null; then
        log "Instalando snapd..."
        apt update
        apt install -y snapd
        check_error "Falha ao instalar snapd"
        
        # Aguardar snapd inicializar
        sleep 5
    fi
    
    # Instalar certbot via snap
    log "Instalando Certbot via snap..."
    snap install core
    snap refresh core
    snap install --classic certbot
    check_error "Falha ao instalar Certbot"
    
    # Criar link simbólico
    ln -sf /snap/bin/certbot /usr/bin/certbot
    
    # Verificar instalação
    CERTBOT_VERSION=$(certbot --version 2>&1 | head -n1)
    log_info "Certbot instalado: $CERTBOT_VERSION"
}

# Função para verificar pré-requisitos
check_prerequisites() {
    log "Verificando pré-requisitos..."
    
    # Verificar se Nginx está rodando
    if ! systemctl is-active --quiet nginx; then
        log_error "Nginx não está rodando"
        log_error "Execute primeiro: ./nginx.sh"
        exit 1
    fi
    
    # Verificar se o site está configurado
    if [ ! -f /etc/nginx/sites-enabled/zazap ]; then
        log_error "Site ZazAP não está configurado no Nginx"
        log_error "Execute primeiro: ./nginx.sh"
        exit 1
    fi
    
    # Testar se o domínio responde na porta 80
    log "Testando conectividade HTTP..."
    if timeout 10 curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN | grep -q "200\|301\|302"; then
        log_info "Domínio acessível via HTTP ✓"
    else
        log_warning "Domínio não está respondendo na porta 80"
        log_warning "Verifique se o DNS está configurado e o Nginx está funcionando"
        
        read -p "Deseja continuar mesmo assim? (s/N): " CONTINUE
        if [[ ! "$CONTINUE" =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
}

# Função para obter certificado SSL
obtain_ssl_certificate() {
    log "Obtendo certificado SSL..."
    
    # Construir lista de domínios
    DOMAIN_LIST="-d $DOMAIN"
    if [[ -n "$SUBDOMAINS" ]]; then
        for subdomain in $SUBDOMAINS; do
            if [[ "$subdomain" != "$DOMAIN" ]]; then
                DOMAIN_LIST="$DOMAIN_LIST -d $subdomain"
            fi
        done
    fi
    
    log_info "Domínios a serem certificados: $DOMAIN $(echo $SUBDOMAINS | tr ' ' ',')"
    
    # Comando certbot
    if [[ "$TEST_SSL" =~ ^[Ss]$ ]]; then
        log_info "Executando teste do certificado SSL..."
        CERTBOT_CMD="certbot certonly --nginx --dry-run"
    else
        log_info "Obtendo certificado SSL real..."
        CERTBOT_CMD="certbot certonly --nginx"
    fi
    
    # Executar certbot
    $CERTBOT_CMD \
        $DOMAIN_LIST \
        --email $SSL_EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive
    
    check_error "Falha ao obter certificado SSL"
    
    if [[ "$TEST_SSL" =~ ^[Ss]$ ]]; then
        log_info "Teste SSL realizado com sucesso! ✓"
        echo
        read -p "Deseja prosseguir com a instalação real? (s/N): " INSTALL_REAL
        if [[ "$INSTALL_REAL" =~ ^[Ss]$ ]]; then
            log "Obtendo certificado SSL real..."
            certbot certonly --nginx \
                $DOMAIN_LIST \
                --email $SSL_EMAIL \
                --agree-tos \
                --no-eff-email \
                --non-interactive
            check_error "Falha ao obter certificado SSL real"
        else
            log_info "Instalação SSL cancelada pelo usuário"
            exit 0
        fi
    fi
    
    log_info "Certificado SSL obtido com sucesso! ✓"
}

# Função para configurar HTTPS no Nginx
configure_https_nginx() {
    log "Configurando HTTPS no Nginx..."
    
    # Backup da configuração atual
    cp /etc/nginx/sites-available/zazap /etc/nginx/sites-available/zazap.backup.$(date +%Y%m%d_%H%M%S)
    
    # Carregar informações do certificado
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
    
    if [ ! -f "$CERT_PATH/fullchain.pem" ]; then
        log_error "Certificado não encontrado em $CERT_PATH"
        exit 1
    fi
    
    APP_DIR="/home/${SYSTEM_USER:-zazap}/zazap"
    BACKEND_PORT=${BACKEND_PORT:-3001}
    
    # Criar nova configuração com HTTPS
    cat > /etc/nginx/sites-available/zazap << EOF
# Configuração Nginx para ZazAP com SSL
server {
    listen 80;
    server_name $DOMAIN$([ -n "$SUBDOMAINS" ] && echo " $SUBDOMAINS");
    
    # Redirecionar para HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # Certificados SSL
    ssl_certificate $CERT_PATH/fullchain.pem;
    ssl_certificate_key $CERT_PATH/privkey.pem;
    
    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate $CERT_PATH/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Logs
    access_log /var/log/nginx/zazap_access.log;
    error_log /var/log/nginx/zazap_error.log;

    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline' wss:" always;
    add_header X-Robots-Tag "noindex, nofollow, nosnippet, noarchive" always;

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
EOF

    # Adicionar configuração para subdomínios se existirem
    if [[ -n "$SUBDOMAINS" ]]; then
        cat >> /etc/nginx/sites-available/zazap << EOF

# Redirecionamento de subdomínios para domínio principal
server {
    listen 443 ssl http2;
    server_name $SUBDOMAINS;
    
    ssl_certificate $CERT_PATH/fullchain.pem;
    ssl_certificate_key $CERT_PATH/privkey.pem;
    
    return 301 https://$DOMAIN\$request_uri;
}
EOF
    fi

    # Testar configuração
    nginx -t
    check_error "Configuração HTTPS inválida"
    
    # Recarregar Nginx
    systemctl reload nginx
    check_error "Falha ao recarregar Nginx"
    
    log_info "HTTPS configurado no Nginx ✓"
}

# Função para configurar renovação automática
configure_auto_renewal() {
    log "Configurando renovação automática..."
    
    # Testar renovação
    certbot renew --dry-run
    check_error "Falha no teste de renovação"
    
    # Criar script de renovação customizado
    cat > /etc/cron.daily/certbot-renew << 'EOF'
#!/bin/bash

# Script de renovação automática do certificado SSL
# Executa diariamente via cron

LOG_FILE="/var/log/certbot-renew.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Verificando renovação do certificado SSL" >> $LOG_FILE

# Tentar renovar certificados
if /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx" >> $LOG_FILE 2>&1; then
    echo "[$DATE] Verificação de renovação concluída com sucesso" >> $LOG_FILE
else
    echo "[$DATE] ERRO na verificação de renovação" >> $LOG_FILE
    # Notificar administrador se houver erro (opcional)
    if command -v mail &> /dev/null; then
        echo "Erro na renovação automática do certificado SSL em $(hostname)" | mail -s "Erro SSL - $(hostname)" root
    fi
fi

# Limpar logs antigos (manter apenas últimos 30 dias)
find /var/log -name "certbot-renew.log*" -mtime +30 -delete 2>/dev/null || true
EOF

    chmod +x /etc/cron.daily/certbot-renew
    
    # Criar job de verificação semanal adicional
    cat > /etc/cron.weekly/certbot-check << 'EOF'
#!/bin/bash

# Verificação semanal do status dos certificados
LOG_FILE="/var/log/certbot-status.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Verificação semanal de certificados SSL" >> $LOG_FILE

# Listar certificados e suas datas de expiração
/usr/bin/certbot certificates >> $LOG_FILE 2>&1

echo "[$DATE] Verificação concluída" >> $LOG_FILE
EOF

    chmod +x /etc/cron.weekly/certbot-check
    
    log_info "Renovação automática configurada ✓"
}

# Função para verificar certificado
verify_ssl_certificate() {
    log "Verificando certificado SSL..."
    
    # Aguardar um pouco para o Nginx processar
    sleep 3
    
    # Verificar se o certificado está funcionando
    SSL_CHECK=$(echo | timeout 15 openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null)
    
    if [[ $? -eq 0 ]] && [[ -n "$SSL_CHECK" ]]; then
        log_info "Certificado SSL válido ✓"
        
        # Extrair e exibir informações
        SUBJECT=$(echo "$SSL_CHECK" | grep "subject=" | cut -d= -f2-)
        ISSUER=$(echo "$SSL_CHECK" | grep "issuer=" | cut -d= -f2-)
        NOT_BEFORE=$(echo "$SSL_CHECK" | grep "notBefore=" | cut -d= -f2)
        NOT_AFTER=$(echo "$SSL_CHECK" | grep "notAfter=" | cut -d= -f2)
        
        echo -e "${BLUE}Informações do certificado:${NC}"
        echo "  Sujeito: $SUBJECT"
        echo "  Emissor: $ISSUER"
        echo "  Válido de: $NOT_BEFORE"
        echo "  Válido até: $NOT_AFTER"
        
        # Calcular dias restantes
        if command -v date &> /dev/null; then
            EXPIRY_TIMESTAMP=$(date -d "$NOT_AFTER" +%s 2>/dev/null || echo "0")
            CURRENT_TIMESTAMP=$(date +%s)
            if [[ $EXPIRY_TIMESTAMP -gt 0 ]]; then
                DAYS_LEFT=$(( ($EXPIRY_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))
                if [[ $DAYS_LEFT -gt 30 ]]; then
                    echo -e "  Status: ${GREEN}$DAYS_LEFT dias restantes${NC}"
                else
                    echo -e "  Status: ${YELLOW}$DAYS_LEFT dias restantes (renovar em breve)${NC}"
                fi
            fi
        fi
        
        # Testar HTTPS
        log "Testando acesso HTTPS..."
        HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 https://$DOMAIN || echo "000")
        
        if [[ "$HTTPS_STATUS" =~ ^2[0-9][0-9]$ ]]; then
            log_info "Site acessível via HTTPS ✓"
        elif [[ "$HTTPS_STATUS" =~ ^3[0-9][0-9]$ ]]; then
            log_info "Site redireciona via HTTPS ✓"
        else
            log_warning "Site pode não estar respondendo corretamente via HTTPS (código: $HTTPS_STATUS)"
        fi
        
    else
        log_warning "Erro ao verificar certificado SSL"
        log_warning "O certificado pode ainda estar sendo processado"
        log_warning "Aguarde alguns minutos e tente acessar: https://$DOMAIN"
    fi
}

# Função para criar script de verificação SSL
create_ssl_tools() {
    log "Criando ferramentas de SSL..."
    
    # Script de verificação SSL
    cat > /usr/local/bin/zazap-ssl-check << 'EOF'
#!/bin/bash

# Script de verificação SSL para ZazAP

DOMAIN="$1"
if [[ -z "$DOMAIN" ]]; then
    echo "Uso: $0 <dominio>"
    echo "Exemplo: $0 meusite.com"
    exit 1
fi

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════╗"
echo -e "║        VERIFICAÇÃO SSL - $DOMAIN        ║"
echo -e "╚══════════════════════════════════════════╝${NC}\n"

# Verificar certificado
echo -e "${YELLOW}Verificando certificado...${NC}"
SSL_INFO=$(echo | timeout 10 openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null)

if [[ $? -eq 0 ]] && [[ -n "$SSL_INFO" ]]; then
    echo -e "✅ ${GREEN}Certificado válido${NC}"
    echo "$SSL_INFO" | sed 's/^/  /'
    
    # Verificar dias restantes
    EXPIRY=$(echo "$SSL_INFO" | grep "notAfter" | cut -d= -f2)
    if [[ -n "$EXPIRY" ]]; then
        EXPIRY_TIMESTAMP=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
        CURRENT_TIMESTAMP=$(date +%s)
        if [[ $EXPIRY_TIMESTAMP -gt 0 ]]; then
            DAYS_LEFT=$(( ($EXPIRY_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))
            
            echo
            if [[ $DAYS_LEFT -gt 30 ]]; then
                echo -e "  📅 ${GREEN}$DAYS_LEFT dias restantes${NC}"
            elif [[ $DAYS_LEFT -gt 0 ]]; then
                echo -e "  ⚠️  ${YELLOW}$DAYS_LEFT dias restantes - Renovar em breve!${NC}"
            else
                echo -e "  ❌ ${RED}Certificado expirado há $((-$DAYS_LEFT)) dias!${NC}"
            fi
        fi
    fi
else
    echo -e "❌ ${RED}Erro ao verificar certificado${NC}"
fi

echo
echo -e "${YELLOW}Teste de conectividade:${NC}"

# Teste HTTP
echo -n "HTTP (porta 80): "
if timeout 5 bash -c "</dev/tcp/$DOMAIN/80" 2>/dev/null; then
    echo -e "${GREEN}✅ Acessível${NC}"
else
    echo -e "${RED}❌ Inacessível${NC}"
fi

# Teste HTTPS
echo -n "HTTPS (porta 443): "
if timeout 5 bash -c "</dev/tcp/$DOMAIN/443" 2>/dev/null; then
    echo -e "${GREEN}✅ Acessível${NC}"
else
    echo -e "${RED}❌ Inacessível${NC}"
fi

echo
echo -e "${YELLOW}Teste de redirecionamento:${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 http://$DOMAIN 2>/dev/null || echo "000")
echo "Status HTTP: $HTTP_STATUS"

if [[ "$HTTP_STATUS" == "301" ]] || [[ "$HTTP_STATUS" == "302" ]]; then
    echo -e "✅ ${GREEN}Redirecionamento HTTP→HTTPS configurado${NC}"
elif [[ "$HTTP_STATUS" =~ ^2[0-9][0-9]$ ]]; then
    echo -e "⚠️  ${YELLOW}HTTP funcionando, mas sem redirecionamento para HTTPS${NC}"
else
    echo -e "❌ ${RED}Problema no redirecionamento${NC}"
fi

# Teste HTTPS final
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 https://$DOMAIN 2>/dev/null || echo "000")
echo "Status HTTPS: $HTTPS_STATUS"

if [[ "$HTTPS_STATUS" =~ ^2[0-9][0-9]$ ]]; then
    echo -e "✅ ${GREEN}Site funcionando corretamente via HTTPS${NC}"
else
    echo -e "❌ ${RED}Problema no acesso HTTPS${NC}"
fi

echo
EOF

    chmod +x /usr/local/bin/zazap-ssl-check
    
    # Script de renovação manual
    cat > /usr/local/bin/zazap-ssl-renew << 'EOF'
#!/bin/bash

# Script de renovação manual SSL para ZazAP

echo "Renovando certificados SSL..."
certbot renew --force-renewal
echo "Recarregando Nginx..."
systemctl reload nginx
echo "Certificados renovados com sucesso!"
EOF

    chmod +x /usr/local/bin/zazap-ssl-renew
    
    log_info "Ferramentas SSL criadas:"
    log_info "- zazap-ssl-check <dominio>"
    log_info "- zazap-ssl-renew"
}

# Função para atualizar configuração do frontend
update_frontend_config() {
    log "Atualizando configuração do frontend para HTTPS..."
    
    APP_DIR="/home/${SYSTEM_USER:-zazap}/zazap"
    
    if [ -f "$APP_DIR/frontend/.env" ]; then
        # Atualizar URLs para HTTPS
        sed -i "s|http://|https://|g" "$APP_DIR/frontend/.env"
        
        # Fazer rebuild do frontend
        cd "$APP_DIR/frontend"
        sudo -u ${SYSTEM_USER:-zazap} npm run build
        check_error "Falha ao fazer rebuild do frontend"
        
        log_info "Frontend atualizado para HTTPS ✓"
    fi
}

# Função principal
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║         CONFIGURADOR SSL ZAZAP          ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    check_root
    load_config
    check_domain_dns
    check_prerequisites
    install_certbot
    obtain_ssl_certificate
    configure_https_nginx
    configure_auto_renewal
    update_frontend_config
    create_ssl_tools
    
    # Aguardar um pouco antes de verificar
    sleep 5
    verify_ssl_certificate
    
    echo -e "\n${GREEN}╔═══════════════════════════════════════════╗"
    echo -e "║            SSL CONFIGURADO!               ║"
    echo -e "╚═══════════════════════════════════════════╝${NC}\n"
    
    log_info "SSL configurado com sucesso! ✓"
    echo -e "${YELLOW}Informações:${NC}"
    echo "- Site seguro: https://$DOMAIN"
    if [[ -n "$SUBDOMAINS" ]]; then
        echo "- Subdomínios: $(echo $SUBDOMAINS | sed 's/ /, /g')"
    fi
    echo "- Renovação automática: Configurada"
    echo "- Logs de renovação: /var/log/certbot-renew.log"
    echo "- Certificados: /etc/letsencrypt/live/$DOMAIN/"
    echo ""
    echo -e "${BLUE}Comandos úteis:${NC}"
    echo "- Verificar SSL: zazap-ssl-check $DOMAIN"
    echo "- Renovar SSL: zazap-ssl-renew"
    echo "- Status geral: zazap-status"
    echo "- Ver certificados: certbot certificates"
    echo "- Testar renovação: certbot renew --dry-run"
    echo ""
    echo -e "${GREEN}🎉 Acesse seu sistema em: https://$DOMAIN${NC}"
    echo -e "${GREEN}🔒 Seu site agora está seguro com SSL/TLS!${NC}"
}

main "$@"
