import express from "express";
import { importRouter } from "./import";
import { mealPlansRouter } from "./mealPlans";
import { wsRouter } from "./ws";

const router = express.Router();

router.use("/import", importRouter);
router.use("/mealplans", mealPlansRouter);
router.use("/ws", wsRouter);

export { router as typesafeExpressIndexRouter };
