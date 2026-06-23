import express from "express";
import { desktopGoogleInitiateHandler } from "./desktopGoogleInitiate";
import { desktopGoogleCallbackHandler } from "./desktopGoogleCallback";

const router = express.Router();

router.get("/desktop-google", ...desktopGoogleInitiateHandler);
router.get("/desktop-google/callback", ...desktopGoogleCallbackHandler);

export { router as authRouter };
