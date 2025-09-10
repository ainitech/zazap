import { apiUrl, apiFetch } from '../utils/apiClient';

// ===== ADVANCED MESSAGING SERVICES =====

export const sendSticker = async (sessionId, chatId, stickerPath, options = {}) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/send-sticker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, stickerPath, options })
    });
    return response;
  } catch (error) {
    console.error('Error sending sticker:', error);
    throw error;
  }
};

export const sendContact = async (sessionId, chatId, contactId, options = {}) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/send-contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, contactId, options })
    });
    return response;
  } catch (error) {
    console.error('Error sending contact:', error);
    throw error;
  }
};

export const sendLocation = async (sessionId, chatId, latitude, longitude, description = '', options = {}) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/send-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, latitude, longitude, description, options })
    });
    return response;
  } catch (error) {
    console.error('Error sending location:', error);
    throw error;
  }
};

export const sendPoll = async (sessionId, chatId, pollName, pollOptions, options = {}) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/send-poll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, pollName, pollOptions, options })
    });
    return response;
  } catch (error) {
    console.error('Error sending poll:', error);
    throw error;
  }
};

export const replyToMessage = async (sessionId, messageId, text, options = {}) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/reply-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId, text, options })
    });
    return response;
  } catch (error) {
    console.error('Error replying to message:', error);
    throw error;
  }
};

export const reactToMessage = async (sessionId, messageId, reaction) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/react-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId, reaction })
    });
    return response;
  } catch (error) {
    console.error('Error reacting to message:', error);
    throw error;
  }
};

export const forwardMessage = async (sessionId, messageId, chatId, options = {}) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/forward-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId, chatId, options })
    });
    return response;
  } catch (error) {
    console.error('Error forwarding message:', error);
    throw error;
  }
};

export const deleteMessage = async (sessionId, messageId, everyone = false) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/delete-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId, everyone })
    });
    return response;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

export const editMessage = async (sessionId, messageId, newText, options = {}) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/edit-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId, newText, options })
    });
    return response;
  } catch (error) {
    console.error('Error editing message:', error);
    throw error;
  }
};

// ===== MEDIA SERVICES =====

export const downloadMedia = async (sessionId, messageId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/download-media`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messageId })
    });
    return response;
  } catch (error) {
    console.error('Error downloading media:', error);
    throw error;
  }
};

export const getProfilePicture = async (sessionId, contactId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/get-profile-picture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactId })
    });
    return response;
  } catch (error) {
    console.error('Error getting profile picture:', error);
    throw error;
  }
};

// ===== CONTACT SERVICES =====

export const getContactInfo = async (sessionId, contactId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/get-contact-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactId })
    });
    return response;
  } catch (error) {
    console.error('Error getting contact info:', error);
    throw error;
  }
};

export const blockContact = async (sessionId, contactId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/block-contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactId })
    });
    return response;
  } catch (error) {
    console.error('Error blocking contact:', error);
    throw error;
  }
};

export const unblockContact = async (sessionId, contactId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/unblock-contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactId })
    });
    return response;
  } catch (error) {
    console.error('Error unblocking contact:', error);
    throw error;
  }
};

// ===== CHAT SERVICES =====

export const muteChat = async (sessionId, chatId, unmuteDate = null) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/mute-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, unmuteDate })
    });
    return response;
  } catch (error) {
    console.error('Error muting chat:', error);
    throw error;
  }
};

export const unmuteChat = async (sessionId, chatId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/unmute-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId })
    });
    return response;
  } catch (error) {
    console.error('Error unmuting chat:', error);
    throw error;
  }
};

export const pinChat = async (sessionId, chatId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/pin-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId })
    });
    return response;
  } catch (error) {
    console.error('Error pinning chat:', error);
    throw error;
  }
};

export const unpinChat = async (sessionId, chatId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/unpin-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId })
    });
    return response;
  } catch (error) {
    console.error('Error unpinning chat:', error);
    throw error;
  }
};

export const archiveChat = async (sessionId, chatId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/archive-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId })
    });
    return response;
  } catch (error) {
    console.error('Error archiving chat:', error);
    throw error;
  }
};

export const unarchiveChat = async (sessionId, chatId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/unarchive-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId })
    });
    return response;
  } catch (error) {
    console.error('Error unarchiving chat:', error);
    throw error;
  }
};

export const markChatUnread = async (sessionId, chatId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/mark-chat-unread`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId })
    });
    return response;
  } catch (error) {
    console.error('Error marking chat as unread:', error);
    throw error;
  }
};

export const clearChat = async (sessionId, chatId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/clear-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId })
    });
    return response;
  } catch (error) {
    console.error('Error clearing chat:', error);
    throw error;
  }
};

export const deleteChat = async (sessionId, chatId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/delete-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId })
    });
    return response;
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
};

// ===== GROUP SERVICES =====

export const createGroup = async (sessionId, groupName, participants) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/create-group`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupName, participants })
    });
    return response;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

export const getGroupInfo = async (sessionId, groupId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/get-group-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId })
    });
    return response;
  } catch (error) {
    console.error('Error getting group info:', error);
    throw error;
  }
};

export const updateGroupSubject = async (sessionId, groupId, subject) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/update-group-subject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId, subject })
    });
    return response;
  } catch (error) {
    console.error('Error updating group subject:', error);
    throw error;
  }
};

export const updateGroupDescription = async (sessionId, groupId, description) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/update-group-description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId, description })
    });
    return response;
  } catch (error) {
    console.error('Error updating group description:', error);
    throw error;
  }
};

export const updateGroupSettings = async (sessionId, groupId, settings) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/update-group-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId, settings })
    });
    return response;
  } catch (error) {
    console.error('Error updating group settings:', error);
    throw error;
  }
};

export const addGroupParticipants = async (sessionId, groupId, participants) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/add-group-participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId, participants })
    });
    return response;
  } catch (error) {
    console.error('Error adding group participants:', error);
    throw error;
  }
};

export const removeGroupParticipants = async (sessionId, groupId, participants) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/remove-group-participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId, participants })
    });
    return response;
  } catch (error) {
    console.error('Error removing group participants:', error);
    throw error;
  }
};

export const promoteGroupParticipants = async (sessionId, groupId, participants) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/promote-group-participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId, participants })
    });
    return response;
  } catch (error) {
    console.error('Error promoting group participants:', error);
    throw error;
  }
};

export const demoteGroupParticipants = async (sessionId, groupId, participants) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/demote-group-participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId, participants })
    });
    return response;
  } catch (error) {
    console.error('Error demoting group participants:', error);
    throw error;
  }
};

export const getGroupInviteLink = async (sessionId, groupId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/get-group-invite-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId })
    });
    return response;
  } catch (error) {
    console.error('Error getting group invite link:', error);
    throw error;
  }
};

export const revokeGroupInviteLink = async (sessionId, groupId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/revoke-group-invite-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId })
    });
    return response;
  } catch (error) {
    console.error('Error revoking group invite link:', error);
    throw error;
  }
};

export const joinGroupViaLink = async (sessionId, inviteCode) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/join-group-via-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inviteCode })
    });
    return response;
  } catch (error) {
    console.error('Error joining group via link:', error);
    throw error;
  }
};

export const leaveGroup = async (sessionId, groupId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/leave-group`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId })
    });
    return response;
  } catch (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
};

// ===== STATUS SERVICES =====

export const setUserStatus = async (sessionId, status) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/set-user-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    });
    return response;
  } catch (error) {
    console.error('Error setting user status:', error);
    throw error;
  }
};

export const getUserStatus = async (sessionId, contactId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/get-user-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contactId })
    });
    return response;
  } catch (error) {
    console.error('Error getting user status:', error);
    throw error;
  }
};

// ===== CHANNEL SERVICES =====

export const getChannels = async (sessionId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/get-channels`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    return response;
  } catch (error) {
    console.error('Error getting channels:', error);
    throw error;
  }
};

export const followChannel = async (sessionId, channelId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/follow-channel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelId })
    });
    return response;
  } catch (error) {
    console.error('Error following channel:', error);
    throw error;
  }
};

export const unfollowChannel = async (sessionId, channelId) => {
  try {
    const response = await apiFetch(`${apiUrl}/wwebjs-advanced/${sessionId}/unfollow-channel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelId })
    });
    return response;
  } catch (error) {
    console.error('Error unfollowing channel:', error);
    throw error;
  }
};
