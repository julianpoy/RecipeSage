import express from "express";
import { printShoppingListHandler } from "./printShoppingList";

const router = express.Router();

router.get("/shoppingList/:shoppingListId", ...printShoppingListHandler);

export { router as printRouter };
