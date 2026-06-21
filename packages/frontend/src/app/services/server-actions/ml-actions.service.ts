import { Injectable, inject } from "@angular/core";
import type { StandardizedRecipeImportEntryForWeb } from "@recipesage/prisma";

import { ErrorHandlers } from "../http-error-handler.service";
import { HttpService } from "../http.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";

@Injectable({
  providedIn: "root",
})
export class MlActionsService extends ActionsBase {
  private httpService = inject(HttpService);

  async clipFromUrl(
    params: {
      url: string;
    },
    errorHandlers?: ErrorHandlers,
  ): Promise<
    | (StandardizedRecipeImportEntryForWeb["recipe"] & { imageURL: string })
    | undefined
  > {
    const response = await this.httpService.requestWithWrapper<
      StandardizedRecipeImportEntryForWeb["recipe"] & { imageURL: string }
    >({
      path: `clip`,
      method: "GET",
      payload: undefined,
      query: params,
      errorHandlers,
    });

    if (!response.success) return undefined;

    return response.data;
  }

  /**
   * TODO: This should be replaced with a call to the express endpoint rather than to tRPC since it
   * uploads a file
   */
  getRecipeFromOCR(
    input: RouterInputs["ml"]["getRecipeFromOCR"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["ml"]["getRecipeFromOCR"] | undefined> {
    return this.passThrough(
      () => this.trpc.ml.getRecipeFromOCR.mutate(input),
      errorHandlers,
    );
  }

  /**
   * TODO: This should be replaced with a call to the express endpoint rather than to tRPC since it
   * uploads a file
   */
  getRecipeFromPDF(
    input: RouterInputs["ml"]["getRecipeFromPDF"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["ml"]["getRecipeFromPDF"] | undefined> {
    return this.passThrough(
      () => this.trpc.ml.getRecipeFromPDF.mutate(input),
      errorHandlers,
    );
  }

  getRecipeFromText(
    input: RouterInputs["ml"]["getRecipeFromText"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["ml"]["getRecipeFromText"] | undefined> {
    return this.passThrough(
      () => this.trpc.ml.getRecipeFromText.mutate(input),
      errorHandlers,
    );
  }

  getNutritionFromText(
    input: RouterInputs["ml"]["getNutritionFromText"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["ml"]["getNutritionFromText"] | undefined> {
    return this.passThrough(
      () => this.trpc.ml.getNutritionFromText.mutate(input),
      errorHandlers,
    );
  }
}
