const express = require('express');
const router = express.Router();

const { GetUserNotificatons , MarkNotificationAsRead ,MarkAllNotificationsAsRead } = require('../controllers/NotificationsController');

router.get('/:email', GetUserNotificatons);

router.patch('/mark-as-read', MarkNotificationAsRead);
router.patch('/mark-all-as-read', MarkAllNotificationsAsRead);
module.exports = router;    