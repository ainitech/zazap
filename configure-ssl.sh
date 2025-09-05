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

# Função para verificar se o domínio está apontando para o servidor
check_domain_dns() {
    log "Verificando DNS do domínio..."
    
    # Obter IP público do servidor
    SERVER_IP=$(curl -s https://ipecho.net/plain || curl -s https://icanhazip.com/)
    
    if [[ -z "$SERVER_IP" ]]; then
        log_warning "Não foi possível obter o IP público do servidor"
        return 1
    fi
    
    log_info "IP do servidor: $SERVER_IP"
    
    # Verificar se o domínio aponta para este servidor
    DOMAIN_IP=$(dig +short $DOMAIN)
    
    if [[ "$DOMAIN_IP" == "$SERVER_IP" ]]; then
        log_info "DNS configurado corretamente"
        return 0
    else
        log_warning "DNS não está apontando para este servidor"
        log_warning "Domínio aponta para: $DOMAIN_IP"
        log_warning "Servidor está em: $SERVER_IP"
        
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
        fi
    done
    
    # Subdomínios adicionais
    read -p "Subdomínios adicionais (separados por espaço) [www.$DOMAIN]: " SUBDOMAINS
    if [[ -z "$SUBDOMAINS" ]]; then
        SUBDOMAINS="www.$DOMAIN"
    fi
    
    # Verificar se deve testar SSL
    read -p "Fazer teste do certificado antes de instalar? (S/n): " TEST_SSL
    TEST_SSL=${TEST_SSL:-S}
    
    echo -e "\n${YELLOW}=== RESUMO ===${NC}"
    echo "Domínio principal: $DOMAIN"
    echo "Email: $SSL_EMAIL"
    echo "Subdomínios: $SUBDOMAINS"
    echo "Teste SSL: $([[ "$TEST_SSL" =~ ^[Ss]$ ]] && echo "Sim" || echo "Não")"
    echo
    
    read -p "Continuar? (s/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
        log_info "Configuração SSL cancelada"
        exit 0
    fi
}

# Função para instalar Certbot
install_certbot() {
    log "Instalando Certbot..."
    
    # Verificar se já está instalado
    if command -v certbot &> /dev/null; then
        log_warning "Certbot já está instalado"
        return 0
    fi
    
    # Instalar snapd se não estiver instalado
    if ! command -v snap &> /dev/null; then
        apt update
        apt install -y snapd
        check_error "Falha ao instalar snapd"
    fi
    
    # Instalar certbot via snap
    snap install core; snap refresh core
    snap install --classic certbot
    check_error "Falha ao instalar Certbot"
    
    # Criar link simbólico
    ln -sf /snap/bin/certbot /usr/bin/certbot
    
    log_info "Certbot instalado com sucesso"
}

# Função para obter certificado SSL
obtain_ssl_certificate() {
    log "Obtendo certificado SSL..."
    
    # Construir lista de domínios
    DOMAIN_LIST="-d $DOMAIN"
    for subdomain in $SUBDOMAINS; do
        if [[ "$subdomain" != "$DOMAIN" ]]; then
            DOMAIN_LIST="$DOMAIN_LIST -d $subdomain"
        fi
    done
    
    # Comando certbot
    if [[ "$TEST_SSL" =~ ^[Ss]$ ]]; then
        log_info "Executando teste do certificado SSL..."
        CERTBOT_CMD="certbot --nginx --dry-run"
    else
        log_info "Obtendo certificado SSL real..."
        CERTBOT_CMD="certbot --nginx"
    fi
    
    # Executar certbot
    $CERTBOT_CMD \
        $DOMAIN_LIST \
        --email $SSL_EMAIL \
        --agree-tos \
        --no-eff-email \
        --redirect
    
    check_error "Falha ao obter certificado SSL"
    
    if [[ "$TEST_SSL" =~ ^[Ss]$ ]]; then
        log_info "Teste SSL realizado com sucesso!"
        read -p "Deseja prosseguir com a instalação real? (s/N): " INSTALL_REAL
        if [[ "$INSTALL_REAL" =~ ^[Ss]$ ]]; then
            log "Obtendo certificado SSL real..."
            certbot --nginx \
                $DOMAIN_LIST \
                --email $SSL_EMAIL \
                --agree-tos \
                --no-eff-email \
                --redirect
            check_error "Falha ao obter certificado SSL real"
        else
            log_info "Instalação SSL cancelada pelo usuário"
            exit 0
        fi
    fi
    
    log_info "Certificado SSL obtido com sucesso!"
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

echo "$(date): Verificando renovação do certificado SSL" >> $LOG_FILE

# Tentar renovar certificados
if /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx" >> $LOG_FILE 2>&1; then
    echo "$(date): Verificação de renovação concluída com sucesso" >> $LOG_FILE
else
    echo "$(date): ERRO na verificação de renovação" >> $LOG_FILE
    # Enviar notificação de erro (opcional)
    # mail -s "Erro na renovação SSL" admin@domain.com < $LOG_FILE
fi
EOF

    chmod +x /etc/cron.daily/certbot-renew
    
    log_info "Renovação automática configurada"
}

# Função para otimizar configuração SSL
optimize_ssl_config() {
    log "Otimizando configuração SSL..."
    
    # Backup da configuração atual
    cp /etc/nginx/sites-available/zazap /etc/nginx/sites-available/zazap.backup
    
    # Verificar se a configuração SSL já foi aplicada pelo certbot
    if grep -q "managed by Certbot" /etc/nginx/sites-available/zazap; then
        log_info "Configuração SSL já aplicada pelo Certbot"
        
        # Adicionar configurações de segurança SSL extras
        cat >> /etc/nginx/sites-available/zazap << 'EOF'

# Configurações SSL adicionais para melhor segurança
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
EOF
        
        # Testar configuração
        nginx -t
        if [ $? -eq 0 ]; then
            systemctl reload nginx
            log_info "Configurações SSL otimizadas"
        else
            log_warning "Erro na configuração SSL otimizada, restaurando backup"
            cp /etc/nginx/sites-available/zazap.backup /etc/nginx/sites-available/zazap
            systemctl reload nginx
        fi
    fi
}

# Função para verificar certificado
verify_ssl_certificate() {
    log "Verificando certificado SSL..."
    
    # Verificar se o certificado está funcionando
    SSL_CHECK=$(echo | timeout 10 openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [[ $? -eq 0 ]] && [[ -n "$SSL_CHECK" ]]; then
        log_info "Certificado SSL válido:"
        echo "$SSL_CHECK" | sed 's/^/  /'
        
        # Verificar expiração
        EXPIRY_DATE=$(echo "$SSL_CHECK" | grep "notAfter" | cut -d= -f2)
        log_info "Certificado expira em: $EXPIRY_DATE"
    else
        log_warning "Não foi possível verificar o certificado SSL"
        log_warning "Aguarde alguns minutos e tente acessar: https://$DOMAIN"
    fi
}

# Função para criar script de verificação SSL
create_ssl_check_script() {
    log "Criando script de verificação SSL..."
    
    cat > /usr/local/bin/zazap-ssl-check << 'EOF'
#!/bin/bash

# Script de verificação SSL para ZazAP

DOMAIN="$1"
if [[ -z "$DOMAIN" ]]; then
    echo "Uso: $0 <dominio>"
    exit 1
fi

echo "=== VERIFICAÇÃO SSL PARA $DOMAIN ==="
echo

# Verificar certificado
echo "Verificando certificado..."
SSL_INFO=$(echo | timeout 10 openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null)

if [[ $? -eq 0 ]] && [[ -n "$SSL_INFO" ]]; then
    echo "✅ Certificado válido"
    echo "$SSL_INFO"
    
    # Verificar dias restantes
    EXPIRY=$(echo "$SSL_INFO" | grep "notAfter" | cut -d= -f2)
    EXPIRY_TIMESTAMP=$(date -d "$EXPIRY" +%s)
    CURRENT_TIMESTAMP=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))
    
    echo
    echo "Dias restantes: $DAYS_LEFT"
    
    if [[ $DAYS_LEFT -lt 30 ]]; then
        echo "⚠️  ATENÇÃO: Certificado expira em menos de 30 dias!"
    fi
else
    echo "❌ Erro ao verificar certificado"
fi

echo
echo "=== TESTE DE CONECTIVIDADE ==="
echo "HTTP (porta 80):"
if timeout 5 bash -c "</dev/tcp/$DOMAIN/80" 2>/dev/null; then
    echo "✅ Porta 80 acessível"
else
    echo "❌ Porta 80 inacessível"
fi

echo "HTTPS (porta 443):"
if timeout 5 bash -c "</dev/tcp/$DOMAIN/443" 2>/dev/null; then
    echo "✅ Porta 443 acessível"
else
    echo "❌ Porta 443 inacessível"
fi

echo
echo "=== TESTE DE REDIRECIONAMENTO ==="
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN)
echo "Status HTTP: $HTTP_STATUS"

if [[ "$HTTP_STATUS" == "301" ]] || [[ "$HTTP_STATUS" == "302" ]]; then
    echo "✅ Redirecionamento HTTP->HTTPS configurado"
else
    echo "⚠️  Redirecionamento HTTP->HTTPS não detectado"
fi
EOF

    chmod +x /usr/local/bin/zazap-ssl-check
    log_info "Script de verificação SSL criado: zazap-ssl-check <dominio>"
}

# Função principal
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║         CONFIGURADOR SSL ZAZAP          ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    check_root
    collect_info
    check_domain_dns
    install_certbot
    obtain_ssl_certificate
    configure_auto_renewal
    optimize_ssl_config
    create_ssl_check_script
    
    # Aguardar um pouco antes de verificar
    sleep 5
    verify_ssl_certificate
    
    echo -e "\n${GREEN}=== SSL CONFIGURADO ===${NC}\n"
    
    log_info "SSL configurado com sucesso!"
    echo -e "${YELLOW}Informações:${NC}"
    echo "- Domínio: https://$DOMAIN"
    echo "- Subdomínios: $SUBDOMAINS"
    echo "- Renovação automática: Configurada"
    echo "- Logs de renovação: /var/log/certbot-renew.log"
    echo ""
    echo -e "${BLUE}Comandos úteis:${NC}"
    echo "- Verificar SSL: zazap-ssl-check $DOMAIN"
    echo "- Testar renovação: certbot renew --dry-run"
    echo "- Ver certificados: certbot certificates"
    echo "- Status geral: zazap-status"
    echo ""
    echo -e "${GREEN}Acesse seu sistema em: https://$DOMAIN${NC}"
}

main "$@"
