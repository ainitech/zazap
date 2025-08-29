#!/bin/bash

# ================================
# ZazAP - Setup Completo
# Versão: 1.0
# Sistema: Ubuntu/Debian
# ================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner principal
print_banner() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║   ███████╗ █████╗ ███████╗ █████╗ ██████╗                   ║"
    echo "║   ╚══███╔╝██╔══██╗╚══███╔╝██╔══██╗██╔══██╗                  ║"
    echo "║     ███╔╝ ███████║  ███╔╝ ███████║██████╔╝                  ║"
    echo "║    ███╔╝  ██╔══██║ ███╔╝  ██╔══██║██╔═══╝                   ║"
    echo "║   ███████╗██║  ██║███████╗██║  ██║██║                       ║"
    echo "║   ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝                       ║"
    echo "║                                                              ║"
    echo "║                    SETUP COMPLETO v1.0                      ║"
    echo "║               Sistema de WhatsApp Multi-Sessão              ║"
    echo "║                                                              ║"
    echo "║                 🚀 Instalação Automática                    ║"
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

log_step() {
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')] PASSO: $1${NC}"
}

# Função para verificar se está rodando como root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Este script deve ser executado como root (use sudo)"
        exit 1
    fi
}

# Função para verificar se os scripts existem
check_scripts() {
    log_step "Verificando scripts de instalação..."
    
    local missing_scripts=()
    
    if [ ! -f "install.sh" ]; then
        missing_scripts+=("install.sh")
    fi
    
    if [ ! -f "nginx.sh" ]; then
        missing_scripts+=("nginx.sh")
    fi
    
    if [ ! -f "ssl.sh" ]; then
        missing_scripts+=("ssl.sh")
    fi
    
    if [ ${#missing_scripts[@]} -gt 0 ]; then
        log_error "Scripts não encontrados: ${missing_scripts[*]}"
        log_error "Execute este script no diretório 'instalador' do projeto ZazAP"
        exit 1
    fi
    
    # Tornar scripts executáveis
    chmod +x install.sh nginx.sh ssl.sh
    
    log_info "Todos os scripts encontrados e configurados ✓"
}

# Função para mostrar menu
show_menu() {
    echo -e "\n${YELLOW}=== OPÇÕES DE INSTALAÇÃO ===${NC}\n"
    echo "1. 🔧 Instalação Completa (Recomendado)"
    echo "2. 📦 Apenas Sistema Base"
    echo "3. 🌐 Apenas Nginx"
    echo "4. 🔒 Apenas SSL"
    echo "5. 📊 Status do Sistema"
    echo "6. 🚪 Sair"
    echo
}

# Função para progresso
show_progress() {
    local current=$1
    local total=$2
    local description=$3
    
    local percentage=$((current * 100 / total))
    local bars=$((percentage / 5))
    
    printf "\r${BLUE}Progress: ["
    for ((i=1; i<=20; i++)); do
        if [ $i -le $bars ]; then
            printf "█"
        else
            printf "░"
        fi
    done
    printf "] %d%% - %s${NC}" $percentage "$description"
    
    if [ $current -eq $total ]; then
        echo
    fi
}

# Função para executar script com progresso
execute_script() {
    local script=$1
    local description=$2
    local step=$3
    local total_steps=$4
    
    log_step "Executando: $description"
    show_progress $step $total_steps "$description"
    
    if ./$script; then
        show_progress $((step + 1)) $total_steps "$description - Concluído"
        log_info "$description concluído com sucesso ✓"
        return 0
    else
        echo
        log_error "Falha na execução: $description"
        return 1
    fi
}

# Função para instalação completa
full_installation() {
    log_step "Iniciando instalação completa do ZazAP..."
    
    local total_steps=3
    
    echo -e "\n${YELLOW}Esta instalação irá:${NC}"
    echo "• Instalar e configurar todos os componentes do sistema"
    echo "• Configurar Nginx como proxy reverso"
    echo "• Obter e configurar certificados SSL gratuitos"
    echo "• Configurar renovação automática"
    echo
    
    read -p "Deseja continuar? (s/N): " confirm
    if [[ ! "$confirm" =~ ^[Ss]$ ]]; then
        log_info "Instalação cancelada pelo usuário"
        return 1
    fi
    
    echo -e "\n${PURPLE}=== INICIANDO INSTALAÇÃO COMPLETA ===${NC}\n"
    
    # Passo 1: Sistema Base
    if ! execute_script "install.sh" "Sistema Base" 0 $total_steps; then
        log_error "Falha na instalação do sistema base"
        return 1
    fi
    
    # Passo 2: Nginx
    if ! execute_script "nginx.sh" "Configuração Nginx" 1 $total_steps; then
        log_error "Falha na configuração do Nginx"
        return 1
    fi
    
    # Passo 3: SSL
    if ! execute_script "ssl.sh" "Configuração SSL" 2 $total_steps; then
        log_error "Falha na configuração do SSL"
        return 1
    fi
    
    show_progress 3 3 "Instalação Completa"
    
    # Sucesso
    echo -e "\n${GREEN}╔═══════════════════════════════════════════╗"
    echo -e "║        INSTALAÇÃO CONCLUÍDA COM SUCESSO!   ║"
    echo -e "╚═══════════════════════════════════════════╝${NC}\n"
    
    show_completion_info
}

# Função para mostrar informações de conclusão
show_completion_info() {
    # Tentar carregar configurações
    if [ -f /tmp/zazap-config ]; then
        source /tmp/zazap-config
    fi
    
    echo -e "${YELLOW}🎉 INSTALAÇÃO FINALIZADA! 🎉${NC}\n"
    
    if [ -n "$DOMAIN" ]; then
        echo -e "${GREEN}🌐 Acesse seu sistema em: https://$DOMAIN${NC}"
    fi
    
    echo -e "\n${BLUE}📋 Informações importantes:${NC}"
    echo "• Usuário do sistema: ${SYSTEM_USER:-zazap}"
    echo "• Diretório da aplicação: /home/${SYSTEM_USER:-zazap}/zazap"
    echo "• Banco de dados: ${DB_NAME:-zazap}"
    echo "• Renovação SSL: Automática"
    
    echo -e "\n${YELLOW}🛠️ Comandos úteis:${NC}"
    echo "• Status geral: ${GREEN}zazap-status${NC}"
    echo "• Ver logs: ${GREEN}zazap-logs${NC}"
    echo "• Reiniciar: ${GREEN}zazap-restart${NC}"
    if [ -n "$DOMAIN" ]; then
        echo "• Verificar SSL: ${GREEN}zazap-ssl-check $DOMAIN${NC}"
    fi
    
    echo -e "\n${CYAN}📚 Documentação:${NC}"
    echo "• README completo: ./README.md"
    echo "• Logs de instalação: /var/log/"
    
    echo -e "\n${GREEN}✅ Seu sistema ZazAP está pronto para uso!${NC}"
}

# Função para mostrar status
show_status() {
    log_step "Verificando status do sistema..."
    
    if command -v zazap-status &> /dev/null; then
        zazap-status
    else
        echo -e "${YELLOW}Sistema ainda não foi instalado completamente.${NC}"
        echo
        echo "Status dos componentes:"
        
        # Verificar scripts
        echo -n "Scripts de instalação: "
        if [ -f "install.sh" ] && [ -f "nginx.sh" ] && [ -f "ssl.sh" ]; then
            echo -e "${GREEN}✓ Disponíveis${NC}"
        else
            echo -e "${RED}✗ Faltando${NC}"
        fi
        
        # Verificar Nginx
        echo -n "Nginx: "
        if systemctl is-active --quiet nginx 2>/dev/null; then
            echo -e "${GREEN}✓ Ativo${NC}"
        else
            echo -e "${RED}✗ Inativo/Não instalado${NC}"
        fi
        
        # Verificar PostgreSQL
        echo -n "PostgreSQL: "
        if systemctl is-active --quiet postgresql 2>/dev/null; then
            echo -e "${GREEN}✓ Ativo${NC}"
        else
            echo -e "${RED}✗ Inativo/Não instalado${NC}"
        fi
        
        # Verificar PM2
        echo -n "PM2: "
        if command -v pm2 &> /dev/null; then
            echo -e "${GREEN}✓ Instalado${NC}"
        else
            echo -e "${RED}✗ Não instalado${NC}"
        fi
    fi
}

# Função principal com menu interativo
main() {
    print_banner
    
    # Verificações iniciais
    check_root
    check_scripts
    
    while true; do
        show_menu
        
        read -p "Escolha uma opção [1-6]: " choice
        
        case $choice in
            1)
                echo
                full_installation
                echo
                read -p "Pressione Enter para continuar..."
                ;;
            2)
                echo
                execute_script "install.sh" "Sistema Base" 1 1
                echo
                read -p "Pressione Enter para continuar..."
                ;;
            3)
                echo
                execute_script "nginx.sh" "Configuração Nginx" 1 1
                echo
                read -p "Pressione Enter para continuar..."
                ;;
            4)
                echo
                execute_script "ssl.sh" "Configuração SSL" 1 1
                echo
                read -p "Pressione Enter para continuar..."
                ;;
            5)
                echo
                show_status
                echo
                read -p "Pressione Enter para continuar..."
                ;;
            6)
                echo
                log_info "Saindo do instalador..."
                echo -e "${GREEN}Obrigado por usar o ZazAP! 🚀${NC}"
                exit 0
                ;;
            *)
                echo
                log_warning "Opção inválida. Escolha entre 1-6."
                echo
                ;;
        esac
        
        clear
        print_banner
    done
}

# Verificar se foi chamado com argumentos para instalação silenciosa
if [ "$1" = "--auto" ] || [ "$1" = "-a" ]; then
    print_banner
    check_root
    check_scripts
    full_installation
else
    # Modo interativo
    main
fi
