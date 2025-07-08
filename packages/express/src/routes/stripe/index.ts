import express from "express";
import { webhookHandler } from "./webhook";

const router = express.Router();

router.post("/webhook", ...webhookHandler);

export { router as stripeHandler };
