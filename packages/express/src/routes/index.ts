import * as express from "express";
import { importRouter } from "./import";

const router = express.Router();

router.use("/import", importRouter);

export { router as typesafeExpressIndexRouter };
