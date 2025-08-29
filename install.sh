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
    if [ ! -f /etc/lsb-release ] && [ ! -f /etc/debian_version ]; then
        log_error "Este instalador é compatível apenas com Ubuntu/Debian"
        exit 1
    fi
    
    # Verificar versão do Ubuntu
    if [ -f /etc/lsb-release ]; then
        source /etc/lsb-release
        if [[ "$DISTRIB_ID" == "Ubuntu" ]]; then
            log_info "Sistema detectado: Ubuntu $DISTRIB_RELEASE"
        fi
    fi
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
    apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release build-essential
    check_error "Falha ao instalar dependências básicas"
}

# Função para instalar Node.js
install_nodejs() {
    log "Instalando Node.js..."
    
    # Instalar Node.js 20 LTS
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    check_error "Falha ao adicionar repositório Node.js"
    
    apt install -y nodejs
    check_error "Falha ao instalar Node.js"
    
    # Verificar instalação
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log_info "Node.js instalado: $NODE_VERSION"
    log_info "NPM instalado: $NPM_VERSION"
    
    # Instalar PM2 globalmente
    npm install -g pm2
    check_error "Falha ao instalar PM2"
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
    
    # Clonar repositório (assumindo que está em algum repositório)
    # Como não temos o repositório, vamos criar a estrutura
    mkdir -p "$APP_DIR"
    
    # Copiar arquivos do diretório atual para o diretório da aplicação
    if [ -f "$(pwd)/backend/package.json" ]; then
        log_info "Copiando arquivos da aplicação..."
        cp -r "$(pwd)"/* "$APP_DIR/"
        check_error "Falha ao copiar arquivos da aplicação"
    else
        log_error "Arquivos da aplicação não encontrados no diretório atual"
        log_error "Execute este script no diretório raiz do projeto ZazAP"
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
JWT_SECRET=$(openssl rand -base64 32)

# Configurações do WhatsApp
WHATSAPP_SESSION_DIR=./sessions

# Configurações de Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50mb

# Configurações de Logs
LOG_LEVEL=info

# Configurações de Produção
NODE_ENV=production
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
    sudo -u $SYSTEM_USER npm run db:migrate
    check_error "Falha ao executar migrações"
    
    # Build do frontend
    log "Compilando frontend..."
    cd "$APP_DIR/frontend"
    
    # Configurar variáveis de ambiente do frontend
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:$BACKEND_PORT
REACT_APP_SOCKET_URL=http://localhost:$BACKEND_PORT
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
    script: './backend/index.js',
    cwd: './backend',
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
    max_memory_restart: '500M',
    restart_delay: 5000
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
    
    echo -e "\n${GREEN}=== INSTALAÇÃO CONCLUÍDA ===${NC}\n"
    
    log_info "ZazAP foi instalado com sucesso!"
    echo -e "${YELLOW}Próximos passos:${NC}"
    echo "1. Configure o Nginx executando: ./configure-nginx.sh"
    echo "2. Configure o SSL executando: ./configure-ssl.sh"
    echo "3. Acesse o sistema em: http://seu-servidor:$BACKEND_PORT"
    echo ""
    echo -e "${BLUE}Informações importantes:${NC}"
    echo "- Usuário do sistema: $SYSTEM_USER"
    echo "- Diretório da aplicação: /home/$SYSTEM_USER/zazap"
    echo "- Banco de dados: $DB_NAME"
    echo "- Porta do backend: $BACKEND_PORT"
    echo ""
    echo -e "${YELLOW}Comandos úteis:${NC}"
    echo "- Ver logs: sudo -u $SYSTEM_USER pm2 logs"
    echo "- Reiniciar: sudo -u $SYSTEM_USER pm2 restart zazap-backend"
    echo "- Status: sudo -u $SYSTEM_USER pm2 status"
    
    echo -e "\n${GREEN}Instalação finalizada!${NC}"
}

# Executar função principal
main "$@"
