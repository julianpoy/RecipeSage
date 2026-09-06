import { router } from "../../trpc";
import { getIapProducts } from "./getIapProducts";
import { registerApplePurchase } from "./registerApplePurchase";
import { registerGooglePurchase } from "./registerGooglePurchase";

export const iapRouter = router({
  getIapProducts,
  registerApplePurchase,
  registerGooglePurchase,
});
