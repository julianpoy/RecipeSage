import express from "express";
import { desktopGoogleInitiateHandler } from "./desktopGoogleInitiate";
import { desktopGoogleCallbackHandler } from "./desktopGoogleCallback";
import { redirectGoogleInitiateHandler } from "./redirectGoogleInitiate";
import { redirectGoogleCallbackHandler } from "./redirectGoogleCallback";

const router = express.Router();

router.get("/desktop-google", ...desktopGoogleInitiateHandler);
router.get("/desktop-google/callback", ...desktopGoogleCallbackHandler);

router.get("/redirect-google", ...redirectGoogleInitiateHandler);
router.get("/redirect-google/callback", ...redirectGoogleCallbackHandler);

export { router as authRouter };
