import express from 'express';
import * as wwebjsAdvanced from '../controllers/wwebjsAdvancedController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all WWebJS advanced routes
router.use(authMiddleware);

// ===== ADVANCED MESSAGING ROUTES =====
router.post('/:sessionId/send-sticker', wwebjsAdvanced.sendSticker);
router.post('/:sessionId/send-contact', wwebjsAdvanced.sendContact);
router.post('/:sessionId/send-location', wwebjsAdvanced.sendLocation);
router.post('/:sessionId/send-poll', wwebjsAdvanced.sendPoll);
router.post('/:sessionId/reply-message', wwebjsAdvanced.replyToMessage);
router.post('/:sessionId/react-message', wwebjsAdvanced.reactToMessage);
router.post('/:sessionId/forward-message', wwebjsAdvanced.forwardMessage);
router.post('/:sessionId/delete-message', wwebjsAdvanced.deleteMessage);
router.post('/:sessionId/edit-message', wwebjsAdvanced.editMessage);

// ===== MEDIA ROUTES =====
router.post('/:sessionId/download-media', wwebjsAdvanced.downloadMedia);
router.post('/:sessionId/get-profile-picture', wwebjsAdvanced.getProfilePicture);

// ===== CONTACT ROUTES =====
router.post('/:sessionId/get-contact-info', wwebjsAdvanced.getContactInfo);
router.post('/:sessionId/block-contact', wwebjsAdvanced.blockContact);
router.post('/:sessionId/unblock-contact', wwebjsAdvanced.unblockContact);

// ===== CHAT ROUTES =====
router.post('/:sessionId/mute-chat', wwebjsAdvanced.muteChat);
router.post('/:sessionId/unmute-chat', wwebjsAdvanced.unmuteChat);
router.post('/:sessionId/pin-chat', wwebjsAdvanced.pinChat);
router.post('/:sessionId/unpin-chat', wwebjsAdvanced.unpinChat);
router.post('/:sessionId/archive-chat', wwebjsAdvanced.archiveChat);
router.post('/:sessionId/unarchive-chat', wwebjsAdvanced.unarchiveChat);
router.post('/:sessionId/mark-chat-unread', wwebjsAdvanced.markChatUnread);
router.post('/:sessionId/clear-chat', wwebjsAdvanced.clearChat);
router.post('/:sessionId/delete-chat', wwebjsAdvanced.deleteChat);

// ===== GROUP ROUTES =====
router.post('/:sessionId/create-group', wwebjsAdvanced.createGroup);
router.post('/:sessionId/get-group-info', wwebjsAdvanced.getGroupInfo);
router.post('/:sessionId/update-group-subject', wwebjsAdvanced.updateGroupSubject);
router.post('/:sessionId/update-group-description', wwebjsAdvanced.updateGroupDescription);
router.post('/:sessionId/update-group-settings', wwebjsAdvanced.updateGroupSettings);
router.post('/:sessionId/add-group-participants', wwebjsAdvanced.addGroupParticipants);
router.post('/:sessionId/remove-group-participants', wwebjsAdvanced.removeGroupParticipants);
router.post('/:sessionId/promote-group-participants', wwebjsAdvanced.promoteGroupParticipants);
router.post('/:sessionId/demote-group-participants', wwebjsAdvanced.demoteGroupParticipants);
router.post('/:sessionId/get-group-invite-link', wwebjsAdvanced.getGroupInviteLink);
router.post('/:sessionId/revoke-group-invite-link', wwebjsAdvanced.revokeGroupInviteLink);
router.post('/:sessionId/join-group-via-link', wwebjsAdvanced.joinGroupViaLink);
router.post('/:sessionId/leave-group', wwebjsAdvanced.leaveGroup);

// ===== STATUS ROUTES =====
router.post('/:sessionId/set-user-status', wwebjsAdvanced.setUserStatus);
router.post('/:sessionId/get-user-status', wwebjsAdvanced.getUserStatus);

// ===== CHANNEL ROUTES =====
router.get('/:sessionId/get-channels', wwebjsAdvanced.getChannels);
router.post('/:sessionId/follow-channel', wwebjsAdvanced.followChannel);
router.post('/:sessionId/unfollow-channel', wwebjsAdvanced.unfollowChannel);

export default router;
