import express from "express";
import { healthHandler } from "./health";
import { healthzHandler } from "./healthz";

const router = express.Router();

router.get("/health", ...healthHandler);
router.get("/healthz", ...healthzHandler);

export { router as healthRouter };
