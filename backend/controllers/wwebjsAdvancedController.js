import wwebjsService from '../services/wwebjsService.js';
import { Session } from '../models/index.js';

// ===== ADVANCED MESSAGING ENDPOINTS =====

export const sendSticker = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId, stickerPath, options = {} } = req.body;
    
    if (!chatId || !stickerPath) {
      return res.status(400).json({ error: 'chatId and stickerPath are required' });
    }

    const result = await wwebjsService.sendSticker(sessionId, chatId, stickerPath, options);
    res.json({ success: true, result });
  } catch (error) {
    console.error('sendSticker error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const sendContact = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId, contactId, options = {} } = req.body;
    
    if (!chatId || !contactId) {
      return res.status(400).json({ error: 'chatId and contactId are required' });
    }

    const result = await wwebjsService.sendContact(sessionId, chatId, contactId, options);
    res.json({ success: true, result });
  } catch (error) {
    console.error('sendContact error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const sendLocation = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId, latitude, longitude, description = '', options = {} } = req.body;
    
    if (!chatId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'chatId, latitude, and longitude are required' });
    }

    const result = await wwebjsService.sendLocation(sessionId, chatId, latitude, longitude, description, options);
    res.json({ success: true, result });
  } catch (error) {
    console.error('sendLocation error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const sendPoll = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId, pollName, pollOptions, options = {} } = req.body;
    
    if (!chatId || !pollName || !pollOptions || !Array.isArray(pollOptions)) {
      return res.status(400).json({ error: 'chatId, pollName, and pollOptions (array) are required' });
    }

    const result = await wwebjsService.sendPoll(sessionId, chatId, pollName, pollOptions, options);
    res.json({ success: true, result });
  } catch (error) {
    console.error('sendPoll error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const replyToMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messageId, text, options = {} } = req.body;
    
    if (!messageId || !text) {
      return res.status(400).json({ error: 'messageId and text are required' });
    }

    const result = await wwebjsService.replyToMessage(sessionId, messageId, text, options);
    res.json({ success: true, result });
  } catch (error) {
    console.error('replyToMessage error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messageId, reaction } = req.body;
    
    if (!messageId || !reaction) {
      return res.status(400).json({ error: 'messageId and reaction are required' });
    }

    const result = await wwebjsService.reactToMessage(sessionId, messageId, reaction);
    res.json({ success: true, result });
  } catch (error) {
    console.error('reactToMessage error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const forwardMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messageId, chatId, options = {} } = req.body;
    
    if (!messageId || !chatId) {
      return res.status(400).json({ error: 'messageId and chatId are required' });
    }

    const result = await wwebjsService.forwardMessage(sessionId, messageId, chatId, options);
    res.json({ success: true, result });
  } catch (error) {
    console.error('forwardMessage error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messageId, everyone = false } = req.body;
    
    if (!messageId) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    const result = await wwebjsService.deleteMessage(sessionId, messageId, everyone);
    res.json({ success: true, result });
  } catch (error) {
    console.error('deleteMessage error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messageId, newText, options = {} } = req.body;
    
    if (!messageId || !newText) {
      return res.status(400).json({ error: 'messageId and newText are required' });
    }

    const result = await wwebjsService.editMessage(sessionId, messageId, newText, options);
    res.json({ success: true, result });
  } catch (error) {
    console.error('editMessage error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===== MEDIA ENDPOINTS =====

export const downloadMedia = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { messageId } = req.body;
    
    if (!messageId) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    const media = await wwebjsService.downloadMedia(sessionId, messageId);
    res.json({ success: true, media });
  } catch (error) {
    console.error('downloadMedia error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getProfilePicture = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { contactId } = req.body;
    
    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    const profilePicUrl = await wwebjsService.getProfilePicture(sessionId, contactId);
    res.json({ success: true, profilePicUrl });
  } catch (error) {
    console.error('getProfilePicture error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===== CONTACT ENDPOINTS =====

export const getContactInfo = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { contactId } = req.body;
    
    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    const contactInfo = await wwebjsService.getContactInfo(sessionId, contactId);
    res.json({ success: true, contactInfo });
  } catch (error) {
    console.error('getContactInfo error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const blockContact = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { contactId } = req.body;
    
    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    const result = await wwebjsService.blockContact(sessionId, contactId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('blockContact error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const unblockContact = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { contactId } = req.body;
    
    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    const result = await wwebjsService.unblockContact(sessionId, contactId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('unblockContact error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===== CHAT ENDPOINTS =====

export const muteChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId, unmuteDate = null } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const result = await wwebjsService.muteChat(sessionId, chatId, unmuteDate);
    res.json({ success: true, result });
  } catch (error) {
    console.error('muteChat error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const unmuteChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const result = await wwebjsService.unmuteChat(sessionId, chatId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('unmuteChat error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const pinChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const result = await wwebjsService.pinChat(sessionId, chatId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('pinChat error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const unpinChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const result = await wwebjsService.unpinChat(sessionId, chatId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('unpinChat error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const archiveChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const result = await wwebjsService.archiveChat(sessionId, chatId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('archiveChat error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const unarchiveChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const result = await wwebjsService.unarchiveChat(sessionId, chatId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('unarchiveChat error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const markChatUnread = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const result = await wwebjsService.markChatUnread(sessionId, chatId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('markChatUnread error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const clearChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const result = await wwebjsService.clearChat(sessionId, chatId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('clearChat error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const result = await wwebjsService.deleteChat(sessionId, chatId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('deleteChat error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===== GROUP ENDPOINTS =====

export const createGroup = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupName, participants } = req.body;
    
    if (!groupName || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'groupName and participants (array) are required' });
    }

    const result = await wwebjsService.createGroup(sessionId, groupName, participants);
    res.json({ success: true, result });
  } catch (error) {
    console.error('createGroup error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getGroupInfo = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }

    const groupInfo = await wwebjsService.getGroupInfo(sessionId, groupId);
    res.json({ success: true, groupInfo });
  } catch (error) {
    console.error('getGroupInfo error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateGroupSubject = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId, subject } = req.body;
    
    if (!groupId || !subject) {
      return res.status(400).json({ error: 'groupId and subject are required' });
    }

    const result = await wwebjsService.updateGroupSubject(sessionId, groupId, subject);
    res.json({ success: true, result });
  } catch (error) {
    console.error('updateGroupSubject error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateGroupDescription = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId, description } = req.body;
    
    if (!groupId || !description) {
      return res.status(400).json({ error: 'groupId and description are required' });
    }

    const result = await wwebjsService.updateGroupDescription(sessionId, groupId, description);
    res.json({ success: true, result });
  } catch (error) {
    console.error('updateGroupDescription error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateGroupSettings = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId, settings } = req.body;
    
    if (!groupId || !settings) {
      return res.status(400).json({ error: 'groupId and settings are required' });
    }

    const result = await wwebjsService.updateGroupSettings(sessionId, groupId, settings);
    res.json({ success: true, result });
  } catch (error) {
    console.error('updateGroupSettings error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const addGroupParticipants = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId, participants } = req.body;
    
    if (!groupId || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'groupId and participants (array) are required' });
    }

    const result = await wwebjsService.addGroupParticipants(sessionId, groupId, participants);
    res.json({ success: true, result });
  } catch (error) {
    console.error('addGroupParticipants error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const removeGroupParticipants = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId, participants } = req.body;
    
    if (!groupId || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'groupId and participants (array) are required' });
    }

    const result = await wwebjsService.removeGroupParticipants(sessionId, groupId, participants);
    res.json({ success: true, result });
  } catch (error) {
    console.error('removeGroupParticipants error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const promoteGroupParticipants = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId, participants } = req.body;
    
    if (!groupId || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'groupId and participants (array) are required' });
    }

    const result = await wwebjsService.promoteGroupParticipants(sessionId, groupId, participants);
    res.json({ success: true, result });
  } catch (error) {
    console.error('promoteGroupParticipants error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const demoteGroupParticipants = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId, participants } = req.body;
    
    if (!groupId || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ error: 'groupId and participants (array) are required' });
    }

    const result = await wwebjsService.demoteGroupParticipants(sessionId, groupId, participants);
    res.json({ success: true, result });
  } catch (error) {
    console.error('demoteGroupParticipants error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getGroupInviteLink = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }

    const result = await wwebjsService.getGroupInviteLink(sessionId, groupId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('getGroupInviteLink error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const revokeGroupInviteLink = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }

    const result = await wwebjsService.revokeGroupInviteLink(sessionId, groupId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('revokeGroupInviteLink error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const joinGroupViaLink = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ error: 'inviteCode is required' });
    }

    const result = await wwebjsService.joinGroupViaLink(sessionId, inviteCode);
    res.json({ success: true, result });
  } catch (error) {
    console.error('joinGroupViaLink error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }

    const result = await wwebjsService.leaveGroup(sessionId, groupId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('leaveGroup error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===== STATUS ENDPOINTS =====

export const setUserStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const result = await wwebjsService.setUserStatus(sessionId, status);
    res.json({ success: true, result });
  } catch (error) {
    console.error('setUserStatus error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getUserStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { contactId } = req.body;
    
    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    const status = await wwebjsService.getUserStatus(sessionId, contactId);
    res.json({ success: true, status });
  } catch (error) {
    console.error('getUserStatus error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ===== CHANNEL ENDPOINTS =====

export const getChannels = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const channels = await wwebjsService.getChannels(sessionId);
    res.json({ success: true, channels });
  } catch (error) {
    console.error('getChannels error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const followChannel = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { channelId } = req.body;
    
    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    const result = await wwebjsService.followChannel(sessionId, channelId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('followChannel error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const unfollowChannel = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { channelId } = req.body;
    
    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    const result = await wwebjsService.unfollowChannel(sessionId, channelId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('unfollowChannel error:', error);
    res.status(500).json({ error: error.message });
  }
};
