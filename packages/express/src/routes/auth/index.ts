import express from "express";
import { desktopGoogleInitiateHandler } from "./desktopGoogleInitiate";
import { desktopGoogleCallbackHandler } from "./desktopGoogleCallback";
import { redirectGoogleInitiateHandler } from "./redirectGoogleInitiate";
import { redirectGoogleCallbackHandler } from "./redirectGoogleCallback";
import { redirectAppleInitiateHandler } from "./redirectAppleInitiate";
import { redirectAppleCallbackHandler } from "./redirectAppleCallback";

const router = express.Router();

router.get("/desktop-google", ...desktopGoogleInitiateHandler);
router.get("/desktop-google/callback", ...desktopGoogleCallbackHandler);

router.get("/redirect-google", ...redirectGoogleInitiateHandler);
router.get("/redirect-google/callback", ...redirectGoogleCallbackHandler);

router.get("/redirect-apple", ...redirectAppleInitiateHandler);
router.post("/redirect-apple/callback", ...redirectAppleCallbackHandler);

export { router as authRouter };
