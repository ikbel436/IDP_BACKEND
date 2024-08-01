const express = require("express");
const router = require("express").Router();
const User = require("../models/User.js");

exports.GetUserNotificatons = async (req, res) => {
  const { email } = req.params;
  
  try {
    const user = await User.findOne({ email }, 'notifications');
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    return res.status(200).json(user.notifications);
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.MarkNotificationAsRead = async (req, res) => {
  const { email, notificationId } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Find the notification by iterating through the notifications array
    const notification = user.notifications.find(notification => notification.id === notificationId);
    if (!notification) {
      return res.status(404).send({ error: "Notification not found" });
    }

    notification.read = !notification.read;
    await user.save();

    return res.status(200).json(notification);
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};


exports.MarkAllNotificationsAsRead = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    user.notifications.forEach(notification => {
      notification.read = true;
    });
    await user.save();

    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
};

