import { Injectable } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";

@Injectable({
  providedIn: "root",
})
export class DiscoverActionsService extends ActionsBase {
  searchDiscoverRecipes(
    input: RouterInputs["discover"]["searchDiscoverRecipes"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["discover"]["searchDiscoverRecipes"] | undefined> {
    return this.passThrough(
      () => this.trpc.discover.searchDiscoverRecipes.query(input),
      errorHandlers,
    );
  }

  getDiscoverRecipe(
    input: RouterInputs["discover"]["getDiscoverRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["discover"]["getDiscoverRecipe"] | undefined> {
    return this.passThrough(
      () => this.trpc.discover.getDiscoverRecipe.query(input),
      errorHandlers,
    );
  }

  getDiscoverRecipesByAuthor(
    input: RouterInputs["discover"]["getDiscoverRecipesByAuthor"],
    errorHandlers?: ErrorHandlers,
  ): Promise<
    RouterOutputs["discover"]["getDiscoverRecipesByAuthor"] | undefined
  > {
    return this.passThrough(
      () => this.trpc.discover.getDiscoverRecipesByAuthor.query(input),
      errorHandlers,
    );
  }

  publishDiscoverRecipe(
    input: RouterInputs["discover"]["publishDiscoverRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["discover"]["publishDiscoverRecipe"] | undefined> {
    return this.passThrough(
      () => this.trpc.discover.publishDiscoverRecipe.mutate(input),
      errorHandlers,
    );
  }

  updateDiscoverRecipe(
    input: RouterInputs["discover"]["updateDiscoverRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["discover"]["updateDiscoverRecipe"] | undefined> {
    return this.passThrough(
      () => this.trpc.discover.updateDiscoverRecipe.mutate(input),
      errorHandlers,
    );
  }

  unpublishDiscoverRecipe(
    input: RouterInputs["discover"]["unpublishDiscoverRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["discover"]["unpublishDiscoverRecipe"] | undefined> {
    return this.passThrough(
      () => this.trpc.discover.unpublishDiscoverRecipe.mutate(input),
      errorHandlers,
    );
  }

  rateDiscoverRecipe(
    input: RouterInputs["discover"]["rateDiscoverRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["discover"]["rateDiscoverRecipe"] | undefined> {
    return this.passThrough(
      () => this.trpc.discover.rateDiscoverRecipe.mutate(input),
      errorHandlers,
    );
  }

  saveDiscoverRecipe(
    input: RouterInputs["discover"]["saveDiscoverRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["discover"]["saveDiscoverRecipe"] | undefined> {
    return this.passThrough(
      () => this.trpc.discover.saveDiscoverRecipe.mutate(input),
      errorHandlers,
    );
  }

  reportDiscoverRecipe(
    input: RouterInputs["discover"]["reportDiscoverRecipe"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["discover"]["reportDiscoverRecipe"] | undefined> {
    return this.passThrough(
      () => this.trpc.discover.reportDiscoverRecipe.mutate(input),
      errorHandlers,
    );
  }
}
