import { ErrorHandlers } from "../httpErrorHandler";
import { ActionsBase, RouterInputs, RouterOutputs } from "./ActionsBase";

class PaymentsActions extends ActionsBase {
  createStripeCheckoutSession(
    input: RouterInputs["payments"]["createStripeCheckoutSession"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["payments"]["createStripeCheckoutSession"] | undefined
  > {
    return this.passThrough(
      () => this.trpc.payments.createStripeCheckoutSession.mutate(input),
      errorHandlers,
    );
  }
}

export const paymentsActions = new PaymentsActions();
