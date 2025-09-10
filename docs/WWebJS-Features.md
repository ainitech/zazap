# WWebJS Advanced Features Documentation

Este documento descreve todas as funcionalidades avançadas implementadas no WhatsApp-web.js (WWebJS) que estão disponíveis no sistema.

## 🚀 Funcionalidades Implementadas

### ✅ Multi Device
- Suporte completo a Multi Device do WhatsApp
- Sessões persistentes com LocalAuth

### ✅ Envio de Mensagens
- **Texto**: `/api/wwebjs/:sessionId/send-text`
- **Mídia**: `/api/wwebjs/:sessionId/send-media`
- **Stickers**: `/api/wwebjs-advanced/:sessionId/send-sticker`
- **Contatos**: `/api/wwebjs-advanced/:sessionId/send-contact`
- **Localização**: `/api/wwebjs-advanced/:sessionId/send-location`
- **Enquetes**: `/api/wwebjs-advanced/:sessionId/send-poll`

### ✅ Recebimento de Mensagens
- Recebimento automático de todas as mensagens
- Processamento de mídia, texto e outros tipos
- Integração com sistema de tickets

### ✅ Recursos de Mensagem
- **Responder mensagem**: `/api/wwebjs-advanced/:sessionId/reply-message`
- **Reagir à mensagem**: `/api/wwebjs-advanced/:sessionId/react-message`
- **Encaminhar mensagem**: `/api/wwebjs-advanced/:sessionId/forward-message`
- **Deletar mensagem**: `/api/wwebjs-advanced/:sessionId/delete-message`
- **Editar mensagem**: `/api/wwebjs-advanced/:sessionId/edit-message`

### ✅ Recursos de Mídia
- **Download de mídia**: `/api/wwebjs-advanced/:sessionId/download-media`
- **Foto de perfil**: `/api/wwebjs-advanced/:sessionId/get-profile-picture`
- Suporte para vídeo (requer Google Chrome)

### ✅ Gerenciamento de Contatos
- **Informações do contato**: `/api/wwebjs-advanced/:sessionId/get-contact-info`
- **Bloquear contato**: `/api/wwebjs-advanced/:sessionId/block-contact`
- **Desbloquear contato**: `/api/wwebjs-advanced/:sessionId/unblock-contact`

### ✅ Gerenciamento de Chats
- **Silenciar chat**: `/api/wwebjs-advanced/:sessionId/mute-chat`
- **Ativar som do chat**: `/api/wwebjs-advanced/:sessionId/unmute-chat`
- **Fixar chat**: `/api/wwebjs-advanced/:sessionId/pin-chat`
- **Desfixar chat**: `/api/wwebjs-advanced/:sessionId/unpin-chat`
- **Arquivar chat**: `/api/wwebjs-advanced/:sessionId/archive-chat`
- **Desarquivar chat**: `/api/wwebjs-advanced/:sessionId/unarchive-chat`
- **Marcar como não lida**: `/api/wwebjs-advanced/:sessionId/mark-chat-unread`
- **Limpar chat**: `/api/wwebjs-advanced/:sessionId/clear-chat`
- **Deletar chat**: `/api/wwebjs-advanced/:sessionId/delete-chat`

### ✅ Gerenciamento de Grupos
- **Criar grupo**: `/api/wwebjs-advanced/:sessionId/create-group`
- **Informações do grupo**: `/api/wwebjs-advanced/:sessionId/get-group-info`
- **Alterar nome do grupo**: `/api/wwebjs-advanced/:sessionId/update-group-subject`
- **Alterar descrição**: `/api/wwebjs-advanced/:sessionId/update-group-description`
- **Configurações do grupo**: `/api/wwebjs-advanced/:sessionId/update-group-settings`
- **Adicionar participantes**: `/api/wwebjs-advanced/:sessionId/add-group-participants`
- **Remover participantes**: `/api/wwebjs-advanced/:sessionId/remove-group-participants`
- **Promover a admin**: `/api/wwebjs-advanced/:sessionId/promote-group-participants`
- **Rebaixar de admin**: `/api/wwebjs-advanced/:sessionId/demote-group-participants`
- **Link de convite**: `/api/wwebjs-advanced/:sessionId/get-group-invite-link`
- **Revogar link**: `/api/wwebjs-advanced/:sessionId/revoke-group-invite-link`
- **Entrar por link**: `/api/wwebjs-advanced/:sessionId/join-group-via-link`
- **Sair do grupo**: `/api/wwebjs-advanced/:sessionId/leave-group`

### ✅ Status e Perfil
- **Definir status**: `/api/wwebjs-advanced/:sessionId/set-user-status`
- **Obter status**: `/api/wwebjs-advanced/:sessionId/get-user-status`

### ✅ Canais (Channels)
- **Listar canais**: `/api/wwebjs-advanced/:sessionId/get-channels`
- **Seguir canal**: `/api/wwebjs-advanced/:sessionId/follow-channel`
- **Parar de seguir**: `/api/wwebjs-advanced/:sessionId/unfollow-channel`

---

## 📚 Exemplos de Uso

### Enviar Sticker
```javascript
POST /api/wwebjs-advanced/minha-sessao/send-sticker
{
  "chatId": "5511999999999@c.us",
  "stickerPath": "/caminho/para/sticker.webp",
  "options": {}
}
```

### Enviar Localização
```javascript
POST /api/wwebjs-advanced/minha-sessao/send-location
{
  "chatId": "5511999999999@c.us",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "description": "São Paulo, Brasil"
}
```

### Criar Enquete
```javascript
POST /api/wwebjs-advanced/minha-sessao/send-poll
{
  "chatId": "5511999999999@c.us",
  "pollName": "Qual sua cor favorita?",
  "pollOptions": ["Azul", "Verde", "Vermelho", "Amarelo"],
  "options": {}
}
```

### Reagir à Mensagem
```javascript
POST /api/wwebjs-advanced/minha-sessao/react-message
{
  "messageId": "false_5511999999999@c.us_3EB0F...",
  "reaction": "👍"
}
```

### Criar Grupo
```javascript
POST /api/wwebjs-advanced/minha-sessao/create-group
{
  "groupName": "Meu Grupo",
  "participants": ["5511999999999@c.us", "5511888888888@c.us"]
}
```

### Obter Informações do Contato
```javascript
POST /api/wwebjs-advanced/minha-sessao/get-contact-info
{
  "contactId": "5511999999999@c.us"
}
```

---

## 🔧 Configuração e Uso

1. **Inicializar Sessão WWebJS**:
   ```javascript
   POST /api/wwebjs/init
   {
     "sessionId": "minha-sessao"
   }
   ```

2. **Escanear QR Code**: Use o QR code retornado para conectar

3. **Usar Funcionalidades**: Após conectado, todas as rotas avançadas ficam disponíveis

---

## ⚠️ Funcionalidades Deprecadas (WhatsApp)

- ❌ **Botões**: Deprecado pelo WhatsApp
- ❌ **Listas**: Deprecado pelo WhatsApp

---

## 🔜 Funcionalidades Futuras

- 🔜 **Votar em enquetes**: Em desenvolvimento
- 🔜 **Comunidades**: Em desenvolvimento

---

## 📋 Headers Necessários

Todas as requisições precisam do header de autorização:
```
Authorization: Bearer seu-token-jwt
```

---

## 🐛 Resolução de Problemas

### Sessão não conecta
- Verifique se o QR code foi escaneado
- Aguarde a emissão do evento `whatsappSession`
- Verifique logs do backend

### Erro EBUSY (Windows)
- Sistema configurado para prevenir conflitos de arquivo
- Aguarde alguns segundos entre operações

### Mídia não carrega
- Verifique permissões de arquivo
- Certifique-se que o arquivo existe no caminho especificado

---

## 💡 Dicas de Performance

1. **Reutilize sessões**: WWebJS mantém estado persistente
2. **Evite múltiplas operações simultâneas**: Aguarde conclusão
3. **Use mensagens em lote**: Para múltiplos envios
4. **Monitor logs**: Para identificar problemas rapidamente

---

Esta implementação completa oferece todos os recursos do WhatsApp-web.js de forma organizada e escalável!
