#!/bin/bash

# ================================
# ZazAP - Auto Instalador
# Versão: 1.0
# Sistema: Ubuntu/Debian
# ================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logo do sistema
print_logo() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║   ███████╗ █████╗ ███████╗ █████╗ ██████╗                   ║"
    echo "║   ╚══███╔╝██╔══██╗╚══███╔╝██╔══██╗██╔══██╗                  ║"
    echo "║     ███╔╝ ███████║  ███╔╝ ███████║██████╔╝                  ║"
    echo "║    ███╔╝  ██╔══██║ ███╔╝  ██╔══██║██╔═══╝                   ║"
    echo "║   ███████╗██║  ██║███████╗██║  ██║██║                       ║"
    echo "║   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝                       ║"
    echo "║                                                              ║"
    echo "║                 AUTO INSTALADOR v1.0                        ║"
    echo "║              Sistema de WhatsApp Multi-Sessão               ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

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

# Função para verificar sistema operacional
check_os() {
    if [ ! -f /etc/lsb-release ] && [ ! -f /etc/debian_version ] && [ ! -f /etc/os-release ]; then
        log_error "Este instalador é compatível apenas com Ubuntu/Debian"
        exit 1
    fi
    
    # Detectar distribuição e versão
    OS_NAME=""
    OS_VERSION=""
    
    if [ -f /etc/os-release ]; then
        source /etc/os-release
        OS_NAME=$ID
        OS_VERSION=$VERSION_ID
    elif [ -f /etc/lsb-release ]; then
        source /etc/lsb-release
        OS_NAME=$(echo $DISTRIB_ID | tr '[:upper:]' '[:lower:]')
        OS_VERSION=$DISTRIB_RELEASE
    elif [ -f /etc/debian_version ]; then
        OS_NAME="debian"
        OS_VERSION=$(cat /etc/debian_version)
    fi
    
    log_info "Sistema detectado: $OS_NAME $OS_VERSION"
    
    # Verificar compatibilidade
    case $OS_NAME in
        ubuntu)
            if [[ "$OS_VERSION" < "18.04" ]]; then
                log_warning "Ubuntu $OS_VERSION pode não ser totalmente compatível"
                log_warning "Recomendamos Ubuntu 20.04 ou superior"
            else
                log_info "Sistema compatível ✓"
            fi
            ;;
        debian)
            if [[ "$OS_VERSION" < "10" ]]; then
                log_warning "Debian $OS_VERSION pode não ser totalmente compatível"
                log_warning "Recomendamos Debian 10 ou superior"
            else
                log_info "Sistema compatível ✓"
            fi
            ;;
        *)
            log_warning "Sistema não testado: $OS_NAME $OS_VERSION"
            log_warning "O instalador pode não funcionar corretamente"
            read -p "Deseja continuar mesmo assim? (s/N): " CONTINUE
            if [[ ! "$CONTINUE" =~ ^[Ss]$ ]]; then
                exit 1
            fi
            ;;
    esac
}

# Função para coletar informações do usuário
collect_user_info() {
    echo -e "\n${YELLOW}=== CONFIGURAÇÃO INICIAL ===${NC}\n"
    
    # Domínio principal
    while [[ -z "$DOMAIN" ]]; do
        read -p "Digite o domínio principal (ex: meusite.com): " DOMAIN
        if [[ -z "$DOMAIN" ]]; then
            log_warning "Domínio é obrigatório!"
        fi
    done
    
    # Email para SSL
    while [[ -z "$SSL_EMAIL" ]]; do
        read -p "Digite seu email para o certificado SSL: " SSL_EMAIL
        if [[ -z "$SSL_EMAIL" ]]; then
            log_warning "Email é obrigatório para o SSL!"
        fi
    done
    
    # Senha do banco de dados
    while [[ -z "$DB_PASSWORD" ]]; do
        read -s -p "Digite uma senha para o banco de dados PostgreSQL: " DB_PASSWORD
        echo
        if [[ -z "$DB_PASSWORD" ]]; then
            log_warning "Senha do banco é obrigatória!"
        elif [[ ${#DB_PASSWORD} -lt 8 ]]; then
            log_warning "Senha deve ter pelo menos 8 caracteres!"
            DB_PASSWORD=""
        fi
    done
    
    # Confirmação da senha
    while [[ -z "$DB_PASSWORD_CONFIRM" ]] || [[ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]]; do
        read -s -p "Confirme a senha do banco de dados: " DB_PASSWORD_CONFIRM
        echo
        if [[ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]]; then
            log_warning "Senhas não coincidem!"
            DB_PASSWORD_CONFIRM=""
        fi
    done
    
    # Nome do banco
    read -p "Nome do banco de dados [zazap]: " DB_NAME
    DB_NAME=${DB_NAME:-zazap}
    
    # Usuário do sistema
    read -p "Nome do usuário do sistema [zazap]: " SYSTEM_USER
    SYSTEM_USER=${SYSTEM_USER:-zazap}
    
    # Porta do backend
    read -p "Porta do backend [3001]: " BACKEND_PORT
    BACKEND_PORT=${BACKEND_PORT:-3001}
    
    # Confirmar instalação
    echo -e "\n${YELLOW}=== RESUMO DA CONFIGURAÇÃO ===${NC}"
    echo "Domínio: $DOMAIN"
    echo "Email SSL: $SSL_EMAIL"
    echo "Banco de dados: $DB_NAME"
    echo "Usuário sistema: $SYSTEM_USER"
    echo "Porta backend: $BACKEND_PORT"
    echo
    
    read -p "Deseja continuar com esta configuração? (s/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
        log_info "Instalação cancelada pelo usuário"
        exit 0
    fi
    
    # Salvar configurações em arquivo
    cat > /tmp/zazap-config << EOF
DOMAIN="$DOMAIN"
SSL_EMAIL="$SSL_EMAIL"
DB_NAME="$DB_NAME"
DB_PASSWORD="$DB_PASSWORD"
SYSTEM_USER="$SYSTEM_USER"
BACKEND_PORT="$BACKEND_PORT"
EOF
}

# Função para atualizar sistema
update_system() {
    log "Atualizando sistema..."
    apt update && apt upgrade -y
    check_error "Falha ao atualizar o sistema"
}

# Função para instalar dependências básicas
install_basic_dependencies() {
    log "Instalando dependências básicas..."
    
    # Detectar versão do Ubuntu
    UBUNTU_VERSION=""
    if [ -f /etc/lsb-release ]; then
        source /etc/lsb-release
        UBUNTU_VERSION=$DISTRIB_RELEASE
    fi
    
    # Pacotes básicos que funcionam em todas as versões
    BASIC_PACKAGES="curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release build-essential python3-dev"
    
    # Pacotes específicos por versão
    if [[ "$UBUNTU_VERSION" =~ ^(24\.|25\.) ]]; then
        # Ubuntu 24.04+ (versões mais recentes)
        ADDITIONAL_PACKAGES="libxss1 libxtst6 libxrandr2 libasound2t64 libpangocairo-1.0-0 libatk1.0-0t64 libcairo-gobject2 libgtk-3-0t64 libgdk-pixbuf2.0-0"
    else
        # Ubuntu mais antigas
        ADDITIONAL_PACKAGES="libgconf-2-4 libxss1 libxtst6 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libcairo-gobject2 libgtk-3-0 libgdk-pixbuf2.0-0"
    fi
    
    # Instalar pacotes básicos
    apt install -y $BASIC_PACKAGES
    check_error "Falha ao instalar dependências básicas"
    
    # Tentar instalar pacotes adicionais (ignorar erros)
    log_info "Instalando dependências adicionais..."
    for package in $ADDITIONAL_PACKAGES; do
        if apt install -y $package 2>/dev/null; then
            log_info "✓ $package instalado"
        else
            log_warning "⚠ $package não disponível nesta versão"
        fi
    done
    
    log_info "Dependências básicas configuradas"
}

# Função para instalar Node.js
install_nodejs() {
    log "Instalando Node.js..."
    
    # Verificar se Node.js já está instalado
    if command -v node &> /dev/null; then
        CURRENT_VERSION=$(node --version | cut -d'v' -f2)
        log_warning "Node.js já instalado: v$CURRENT_VERSION"
        
        # Verificar se é uma versão compatível (v18+)
        if [[ "${CURRENT_VERSION%%.*}" -ge 18 ]]; then
            log_info "Versão do Node.js é compatível"
            
            # Instalar PM2 se não estiver instalado
            if ! command -v pm2 &> /dev/null; then
                npm install -g pm2
                check_error "Falha ao instalar PM2"
            fi
            return 0
        else
            log_warning "Versão do Node.js é muito antiga, atualizando..."
        fi
    fi
    
    # Remover instalações antigas do Node.js se existirem
    apt remove -y nodejs npm 2>/dev/null || true
    
    # Instalar Node.js 20 LTS
    log_info "Baixando repositório Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    check_error "Falha ao adicionar repositório Node.js"
    
    apt update
    apt install -y nodejs
    check_error "Falha ao instalar Node.js"
    
    # Verificar instalação
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log_info "Node.js instalado: $NODE_VERSION"
    log_info "NPM instalado: $NPM_VERSION"
    
    # Configurar npm para não usar sudo
    mkdir -p ~/.npm-global
    npm config set prefix '~/.npm-global'
    export PATH=~/.npm-global/bin:$PATH
    
    # Instalar PM2 globalmente
    npm install -g pm2
    check_error "Falha ao instalar PM2"
    
    # Instalar dependências para puppeteer/whatsapp-web.js
    log_info "Instalando dependências para WhatsApp Web..."
    
    # Tentar instalar Chromium
    if apt install -y chromium-browser 2>/dev/null; then
        log_info "✓ Chromium instalado"
    elif apt install -y chromium 2>/dev/null; then
        log_info "✓ Chromium instalado"  
    else
        log_warning "⚠ Chromium não disponível via apt, será baixado pelo Puppeteer"
    fi
    
    log_info "Node.js configurado com sucesso"
}

# Função para instalar PostgreSQL
install_postgresql() {
    log "Instalando PostgreSQL..."
    
    apt install -y postgresql postgresql-contrib
    check_error "Falha ao instalar PostgreSQL"
    
    # Iniciar serviço
    systemctl start postgresql
    systemctl enable postgresql
    
    # Configurar usuário e banco
    log "Configurando banco de dados..."
    
    # Alterar senha do usuário postgres
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$DB_PASSWORD';"
    check_error "Falha ao configurar senha do PostgreSQL"
    
    # Criar banco de dados
    sudo -u postgres createdb $DB_NAME
    check_error "Falha ao criar banco de dados"
    
    log_info "PostgreSQL configurado com sucesso"
}

# Função para criar usuário do sistema
create_system_user() {
    log "Criando usuário do sistema..."
    
    # Verificar se usuário já existe
    if id "$SYSTEM_USER" &>/dev/null; then
        log_warning "Usuário $SYSTEM_USER já existe"
    else
        useradd -m -s /bin/bash $SYSTEM_USER
        check_error "Falha ao criar usuário $SYSTEM_USER"
        
        # Adicionar ao grupo sudo se necessário
        usermod -aG sudo $SYSTEM_USER
        
        log_info "Usuário $SYSTEM_USER criado com sucesso"
    fi
}

# Função para clonar repositório e instalar aplicação
install_application() {
    log "Instalando aplicação ZazAP..."
    
    # Diretório da aplicação
    APP_DIR="/home/$SYSTEM_USER/zazap"
    
    # Remover diretório se existir
    if [ -d "$APP_DIR" ]; then
        log_warning "Removendo instalação anterior..."
        rm -rf "$APP_DIR"
    fi
    
    # Criar diretório
    mkdir -p "$APP_DIR"
    
    # Verificar se estamos executando de dentro do projeto
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    
    if [ -f "$PROJECT_DIR/backend/package.json" ] && [ -f "$PROJECT_DIR/frontend/package.json" ]; then
        log_info "Copiando arquivos da aplicação..."
        
        # Copiar arquivos
        cp -r "$PROJECT_DIR/backend" "$APP_DIR/"
        cp -r "$PROJECT_DIR/frontend" "$APP_DIR/"
        cp -r "$PROJECT_DIR/docs" "$APP_DIR/" 2>/dev/null || true
        
        # Copiar arquivos de configuração se existirem
        [ -f "$PROJECT_DIR/README.md" ] && cp "$PROJECT_DIR/README.md" "$APP_DIR/"
        [ -f "$PROJECT_DIR/nginx.conf" ] && cp "$PROJECT_DIR/nginx.conf" "$APP_DIR/"
        
        check_error "Falha ao copiar arquivos da aplicação"
    else
        log_error "Arquivos da aplicação não encontrados"
        log_error "Execute este script no diretório 'instalador' do projeto ZazAP"
        exit 1
    fi
    
    # Alterar proprietário
    chown -R $SYSTEM_USER:$SYSTEM_USER "$APP_DIR"
    
    # Instalar dependências do backend
    log "Instalando dependências do backend..."
    cd "$APP_DIR/backend"
    sudo -u $SYSTEM_USER npm install
    check_error "Falha ao instalar dependências do backend"
    
    # Instalar dependências do frontend
    log "Instalando dependências do frontend..."
    cd "$APP_DIR/frontend"
    sudo -u $SYSTEM_USER npm install
    check_error "Falha ao instalar dependências do frontend"
    
    log_info "Aplicação instalada com sucesso"
}

# Função para configurar arquivos de configuração
configure_application() {
    log "Configurando aplicação..."
    
    APP_DIR="/home/$SYSTEM_USER/zazap"
    
    # Configurar backend
    cd "$APP_DIR/backend"
    
    # Gerar chave JWT segura
    JWT_SECRET=$(openssl rand -base64 64)
    
    # Criar arquivo .env
    cat > .env << EOF
# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD

# Configurações da Aplicação
PORT=$BACKEND_PORT
JWT_SECRET=$JWT_SECRET

# Configurações do WhatsApp
WHATSAPP_SESSION_DIR=./sessions

# Configurações de Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50mb

# Configurações de Logs
LOG_LEVEL=info

# Configurações de Produção
NODE_ENV=production

# Configurações de CORS
FRONTEND_URL=https://$DOMAIN
ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

# Configurações de WebSocket
SOCKET_CORS_ORIGIN=https://$DOMAIN
EOF
    
    # Configurar config.json
    cat > config/config.json << EOF
{
  "development": {
    "username": "postgres",
    "password": "$DB_PASSWORD",
    "database": "$DB_NAME",
    "host": "localhost",
    "port": 5432,
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": false
    },
    "logging": false
  },
  "production": {
    "username": "postgres",
    "password": "$DB_PASSWORD",
    "database": "$DB_NAME",
    "host": "localhost",
    "port": 5432,
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": false
    },
    "logging": false
  }
}
EOF
    
    # Criar diretórios necessários
    mkdir -p sessions uploads logs
    
    # Executar migrações
    log "Executando migrações do banco de dados..."
    sudo -u $SYSTEM_USER NODE_ENV=production npm run db:migrate
    check_error "Falha ao executar migrações"
    
    # Build do frontend
    log "Compilando frontend..."
    cd "$APP_DIR/frontend"
    
    # Configurar variáveis de ambiente do frontend
    cat > .env << EOF
REACT_APP_API_URL=https://$DOMAIN/api
REACT_APP_SOCKET_URL=https://$DOMAIN
GENERATE_SOURCEMAP=false
EOF
    
    sudo -u $SYSTEM_USER npm run build
    check_error "Falha ao compilar frontend"
    
    # Alterar proprietário dos arquivos
    chown -R $SYSTEM_USER:$SYSTEM_USER "$APP_DIR"
    
    log_info "Aplicação configurada com sucesso"
}

# Função para configurar PM2
configure_pm2() {
    log "Configurando PM2..."
    
    APP_DIR="/home/$SYSTEM_USER/zazap"
    
    # Configurar PM2 para o backend
    cd "$APP_DIR"
    
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'zazap-backend',
    script: 'backend/index.js',
    cwd: '$APP_DIR',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'production',
      PORT: '$BACKEND_PORT'
    },
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
    
    # Alterar proprietário
    chown $SYSTEM_USER:$SYSTEM_USER ecosystem.config.js
    
    # Iniciar aplicação com PM2
    log "Iniciando aplicação com PM2..."
    sudo -u $SYSTEM_USER pm2 start ecosystem.config.js
    check_error "Falha ao iniciar aplicação com PM2"
    
    # Salvar configuração PM2
    sudo -u $SYSTEM_USER pm2 save
    
    # Configurar PM2 para iniciar no boot
    pm2 startup systemd -u $SYSTEM_USER --hp /home/$SYSTEM_USER
    
    log_info "PM2 configurado com sucesso"
}

# Função para criar scripts de gerenciamento
create_management_scripts() {
    log "Criando scripts de gerenciamento..."
    
    # Script de status
    cat > /usr/local/bin/zazap-status << 'EOF'
#!/bin/bash

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════╗"
echo -e "║           STATUS DO ZAZAP                ║"
echo -e "╚══════════════════════════════════════════╝${NC}\n"

# Carregar configurações
if [ -f /tmp/zazap-config ]; then
    source /tmp/zazap-config
else
    SYSTEM_USER="zazap"
fi

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
if sudo -u $SYSTEM_USER pm2 list 2>/dev/null | grep -q "online"; then
    echo -e "  Status: ${GREEN}Online${NC}"
    sudo -u $SYSTEM_USER pm2 list --no-color | grep "zazap-backend" || echo "  Aplicação não encontrada"
else
    echo -e "  Status: ${RED}Offline${NC}"
fi

# Uso de recursos
echo -e "\n${YELLOW}Recursos do Sistema:${NC}"
echo "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "  RAM: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "  Disco: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"

# Verificar SSL se disponível
if command -v openssl &> /dev/null && [ -n "$DOMAIN" ]; then
    echo -e "\n${YELLOW}Certificado SSL:${NC}"
    SSL_INFO=$(echo | timeout 5 openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    if [[ $? -eq 0 ]] && [[ -n "$SSL_INFO" ]]; then
        EXPIRY=$(echo "$SSL_INFO" | grep "notAfter" | cut -d= -f2)
        EXPIRY_TIMESTAMP=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
        CURRENT_TIMESTAMP=$(date +%s)
        if [[ $EXPIRY_TIMESTAMP -gt 0 ]]; then
            DAYS_LEFT=$(( ($EXPIRY_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))
            if [[ $DAYS_LEFT -gt 30 ]]; then
                echo -e "  Status: ${GREEN}Válido (${DAYS_LEFT} dias)${NC}"
            elif [[ $DAYS_LEFT -gt 0 ]]; then
                echo -e "  Status: ${YELLOW}Expira em ${DAYS_LEFT} dias${NC}"
            else
                echo -e "  Status: ${RED}Expirado${NC}"
            fi
        else
            echo -e "  Status: ${GREEN}Válido${NC}"
        fi
    else
        echo -e "  Status: ${RED}Erro ao verificar${NC}"
    fi
fi

echo
EOF

    chmod +x /usr/local/bin/zazap-status
    
    # Script de restart
    cat > /usr/local/bin/zazap-restart << EOF
#!/bin/bash
echo "Reiniciando ZazAP..."
sudo -u $SYSTEM_USER pm2 restart zazap-backend
echo "ZazAP reiniciado!"
EOF

    chmod +x /usr/local/bin/zazap-restart
    
    # Script de logs
    cat > /usr/local/bin/zazap-logs << EOF
#!/bin/bash
sudo -u $SYSTEM_USER pm2 logs zazap-backend --lines 50
EOF

    chmod +x /usr/local/bin/zazap-logs
    
    log_info "Scripts de gerenciamento criados"
}

# Função principal
main() {
    print_logo
    
    log "Iniciando instalação do ZazAP..."
    
    # Verificações iniciais
    check_root
    check_os
    
    # Coletar informações do usuário
    collect_user_info
    
    # Instalação do sistema
    update_system
    install_basic_dependencies
    install_nodejs
    install_postgresql
    create_system_user
    install_application
    configure_application
    configure_pm2
    create_management_scripts
    
    echo -e "\n${GREEN}=== INSTALAÇÃO CONCLUÍDA ===${NC}\n"
    
    log_info "ZazAP foi instalado com sucesso!"
    echo -e "${YELLOW}Próximos passos:${NC}"
    echo "1. Configure o Nginx executando: cd /home/$SYSTEM_USER/zazap/instalador && sudo ./nginx.sh"
    echo "2. Configure o SSL executando: cd /home/$SYSTEM_USER/zazap/instalador && sudo ./ssl.sh"
    echo "3. Após configurar DNS, acesse: https://$DOMAIN"
    echo ""
    echo -e "${BLUE}Informações importantes:${NC}"
    echo "- Usuário do sistema: $SYSTEM_USER"
    echo "- Diretório da aplicação: /home/$SYSTEM_USER/zazap"
    echo "- Banco de dados: $DB_NAME"
    echo "- Porta do backend: $BACKEND_PORT"
    echo ""
    echo -e "${YELLOW}Comandos úteis:${NC}"
    echo "- Status geral: zazap-status"
    echo "- Ver logs: zazap-logs"
    echo "- Reiniciar: zazap-restart"
    echo "- PM2 status: sudo -u $SYSTEM_USER pm2 status"
    
    echo -e "\n${GREEN}Instalação base finalizada!${NC}"
    echo -e "${YELLOW}Configure o Nginx e SSL para finalizar a instalação.${NC}"
}

# Executar função principal
main "$@"
