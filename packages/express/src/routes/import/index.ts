import * as express from "express";
import { importInstantRouter } from "./instant";
import { importJobRouter } from "./job";

const router = express.Router();

router.use("/instant", importInstantRouter);
router.use("/job", importJobRouter);

export { router as importRouter };
