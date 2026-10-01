import Notification from "../models/Notification.js";

/**
 * Creates an in-app notification. Fire-and-forget by design — a failed
 * notification write should never block the main action (apply, status update, etc.)
 */
export const notify = async ({ user, type, title, message, link = "" }) => {
  try {
    await Notification.create({ user, type, title, message, link });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
};
