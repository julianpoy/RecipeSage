import express from "express";
const router = express.Router();

if (process.env.STORAGE_TYPE === "filesystem") {
  router.use(
    "/filesystem",
    express.static(process.env.FILESYSTEM_STORAGE_PATH),
  );
}

export default router;
