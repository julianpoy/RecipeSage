import { Injectable } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";

@Injectable({
  providedIn: "root",
})
export class IapActionsService extends ActionsBase {
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
