# 📊 Guia Completo - Sistema de Enquetes ZaZap

## 🎯 Visão Geral

O Sistema de Enquetes do ZaZap é uma solução avançada para interação com clientes via WhatsApp, desenvolvida como alternativa aos botões interativos que não funcionam adequadamente na plataforma.

## ✨ Funcionalidades

### 📝 Criação de Enquetes
- **Interface Intuitiva**: Modal dedicado com design moderno
- **Validação em Tempo Real**: Verificação automática de campos obrigatórios
- **Opções Dinâmicas**: Adicionar/remover opções facilmente
- **Limites Inteligentes**: 2-12 opções por enquete

### 📊 Gestão e Acompanhamento
- **Envio Direto**: Integração nativa com WhatsApp-web.js
- **Respostas em Tempo Real**: Acompanhe votos instantaneamente via Socket.IO
- **Relatórios Detalhados**: Estatísticas completas de participação
- **Histórico Completo**: Todas as enquetes enviadas ficam registradas

### 🎨 Experiência do Usuário
- **Design Responsivo**: Perfeito em desktop e mobile
- **Tema Dark**: Consistente com o sistema ZaZap
- **Animações Suaves**: Transições fluidas e modernas
- **Acessibilidade**: Totalmente acessível para todos os usuários

## 🛠️ Arquitetura Técnica

### Backend
```
controllers/
├── pollController.js          # API endpoints para enquetes
└── ...

services/
├── whatsappjsService.js       # Integração WhatsApp + função sendPoll()
└── ...

routes/
├── buttonRoutes.js            # Endpoint /api/buttons/poll
└── ...
```

### Frontend
```
src/
├── modals/
│   ├── PollModal.js           # Modal de criação de enquetes
│   └── ButtonModal.js         # Modal atualizado (apenas enquetes)
├── components/
│   └── ...                    # Componentes de exibição
└── ...
```

## 🚀 Como Usar

### 1. Criar uma Enquete

1. **Abra um Ticket**: Navegue até um atendimento ativo
2. **Clique no Botão +**: Localizado na área de mensagens
3. **Selecione "Enquete"**: Única opção disponível no modal
4. **Configure a Enquete**:
   - **Pergunta**: Texto da enquete (obrigatório)
   - **Opções**: Adicione de 2 a 12 opções
   - **Sessão**: Selecione a sessão WhatsApp

### 2. Enviar para o Cliente

1. **Preview**: Visualize como ficará a enquete
2. **Enviar**: Clique em "Enviar Enquete"
3. **Confirmação**: Receba feedback de envio bem-sucedido

### 3. Acompanhar Respostas

1. **Tempo Real**: Respostas aparecem automaticamente
2. **Notificações**: Alertas para novos votos
3. **Estatísticas**: Visualize participação e resultados

## 📊 API Reference

### POST /api/buttons/poll

Cria e envia uma enquete via WhatsApp.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

**Body:**
```json
{
  "sessionId": "string",           // ID da sessão WhatsApp
  "ticketId": "string",            // ID do ticket
  "question": "string",            // Pergunta da enquete (máx. 300 chars)
  "options": ["string"],           // Array de opções (2-12 itens)
  "multipleAnswers": false         // Permitir múltiplas respostas (opcional)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Enquete enviada com sucesso",
  "pollId": "string",
  "whatsappMessageId": "string"
}
```

**Erros Possíveis:**
- `400`: Pergunta obrigatória ou opções inválidas
- `401`: Token JWT inválido
- `403`: Sessão WhatsApp não autorizada
- `500`: Erro interno do servidor

## ⚙️ Configurações

### Variáveis de Ambiente

**Backend (.env):**
```env
WHATSAPP_POLL_ENABLED=true          # Habilita sistema de enquetes
WHATSAPP_POLL_MAX_OPTIONS=12        # Máximo de opções por enquete
WHATSAPP_POLL_MIN_OPTIONS=2         # Mínimo de opções por enquete
WHATSAPP_POLL_QUESTION_MAX_LENGTH=300 # Máximo de caracteres na pergunta
WHATSAPP_POLL_TIMEOUT=30000         # Timeout para envio (ms)
WHATSAPP_POLL_RETRY_ATTEMPTS=3      # Tentativas de reenvio
WHATSAPP_POLL_RETRY_DELAY=5000      # Delay entre tentativas (ms)
```

**Frontend (.env):**
```env
REACT_APP_POLL_ENABLED=true         # Habilita interface de enquetes
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
```

## 🔧 Solução de Problemas

### Enquete não é enviada
- ✅ Verifique se a sessão WhatsApp está conectada
- ✅ Confirme se o número do cliente é válido
- ✅ Aguarde sincronização completa da sessão
- ✅ Verifique logs do backend para erros específicos

### Respostas não aparecem
- ✅ Confirme conexão WebSocket ativa
- ✅ Verifique se o ticket está aberto
- ✅ Valide permissões de leitura de mensagens
- ✅ Teste com uma enquete simples primeiro

### Interface não carrega
- ✅ Verifique `REACT_APP_POLL_ENABLED=true`
- ✅ Confirme build do frontend atualizado
- ✅ Limpe cache do navegador
- ✅ Verifique console para erros JavaScript

## 📈 Métricas e Analytics

### Dados Coletados
- **Taxa de Participação**: Porcentagem de respostas
- **Distribuição de Votos**: Contagem por opção
- **Tempo de Resposta**: Média para primeira resposta
- **Engajamento**: Total de interações

### Visualização
- **Dashboard em Tempo Real**: Acompanhe enquetes ativas
- **Relatórios Históricos**: Análise de performance
- **Exportação de Dados**: CSV/JSON para análise externa
- **Gráficos Interativos**: Visualização moderna dos resultados

## 🔒 Segurança

### Validações Implementadas
- **Sanitização de Input**: Prevenção de XSS
- **Rate Limiting**: Controle de frequência de envios
- **Autenticação JWT**: Acesso controlado à API
- **Logs de Auditoria**: Rastreamento de todas as ações

### Boas Práticas
- ✅ Use HTTPS em produção
- ✅ Configure CORS adequadamente
- ✅ Monitore logs regularmente
- ✅ Faça backups automáticos
- ✅ Atualize dependências regularmente

## 🎯 Casos de Uso

### Atendimento ao Cliente
- **Pesquisa de Satisfação**: Colete feedback pós-atendimento
- **Avaliação de Serviço**: Meça qualidade do suporte
- **Pesquisa de Produto**: Entenda preferências dos clientes

### Marketing e Vendas
- **Pesquisa de Mercado**: Colete insights valiosos
- **Segmentação**: Entenda perfil do cliente
- **Promoções**: Teste aceitação de ofertas

### Suporte Técnico
- **Diagnóstico**: Identifique problemas comuns
- **Priorização**: Determine urgência de chamados
- **Soluções**: Ofereça opções de resolução

## 🚀 Próximas Funcionalidades

### Planejadas
- 📊 **Dashboard Avançado**: Gráficos e métricas detalhadas
- 🎯 **Segmentação**: Envio para grupos específicos
- ⏰ **Agendamento**: Envio automático em horários definidos
- 🤖 **Automação**: Respostas baseadas em votos
- 📱 **Notificações Push**: Alertas para novos votos

### Em Desenvolvimento
- 🔄 **Enquetes Recorrentes**: Sistema de lembretes
- 📈 **Analytics Avançado**: Machine learning para insights
- 🎨 **Templates**: Enquetes pré-configuradas
- 🌐 **Multi-idioma**: Suporte a diferentes idiomas

## 📞 Suporte

Para dúvidas específicas sobre o sistema de enquetes:

1. **Verifique a Documentação**: Esta documentação completa
2. **Consulte os Logs**: Backend e frontend logs
3. **Teste em Desenvolvimento**: Ambiente local primeiro
4. **Abra uma Issue**: GitHub Issues para bugs
5. **Comunidade**: Telegram para discussões gerais

---

**💛 ZaZap** - Transformando comunicação em resultados
*Sistema de Enquetes desenvolvido com ❤️ para melhorar o engajamento com clientes*
