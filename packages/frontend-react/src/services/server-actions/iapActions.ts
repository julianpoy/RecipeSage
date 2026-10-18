import { ErrorHandlers } from "../httpErrorHandler";
import { ActionsBase, RouterInputs, RouterOutputs } from "./ActionsBase";

class IapActions extends ActionsBase {
  getIapProducts(
    input: RouterInputs["iap"]["getIapProducts"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["iap"]["getIapProducts"] | undefined> {
    return this.passThrough(
      () => this.trpc.iap.getIapProducts.query(input),
      errorHandlers,
    );
  }

  registerApplePurchase(
    input: RouterInputs["iap"]["registerApplePurchase"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["iap"]["registerApplePurchase"] | undefined> {
    return this.passThrough(
      () => this.trpc.iap.registerApplePurchase.mutate(input),
      errorHandlers,
    );
  }

  registerGooglePurchase(
    input: RouterInputs["iap"]["registerGooglePurchase"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["iap"]["registerGooglePurchase"] | undefined> {
    return this.passThrough(
      () => this.trpc.iap.registerGooglePurchase.mutate(input),
      errorHandlers,
    );
  }
}

export const iapActions = new IapActions();
