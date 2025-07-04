import express from "express";
import { webhookHandler } from "./webhook";

const router = express.Router();

router.get("/webhook", ...webhookHandler);

export { router as stripeHandler };
