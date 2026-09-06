import express from "express";
import { appleNotificationsHandler } from "./appleNotifications";
import { googleNotificationsHandler } from "./googleNotifications";

const router = express.Router();

router.post("/apple/notifications", ...appleNotificationsHandler);
router.post("/google/notifications", ...googleNotificationsHandler);

export { router as iapRouter };
