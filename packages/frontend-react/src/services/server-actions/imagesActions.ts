import { ErrorHandlers } from "../httpErrorHandler";
import { ActionsBase, RouterInputs, RouterOutputs } from "./ActionsBase";

class ImagesActions extends ActionsBase {
  createRecipeImageFromUrl(
    input: RouterInputs["images"]["createRecipeImageFromUrl"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["images"]["createRecipeImageFromUrl"] | undefined> {
    return this.passThrough(
      () => this.trpc.images.createRecipeImageFromUrl.mutate(input),
      errorHandlers,
    );
  }
}

export const imagesActions = new ImagesActions();
