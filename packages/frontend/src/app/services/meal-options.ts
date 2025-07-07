import { Injectable, inject } from "@angular/core";
import { EventName, EventService } from "./event.service";
import {
  ErrorHandlers,
  HttpErrorHandlerService,
} from "./http-error-handler.service";
import { HttpService } from "./http.service";
import { UtilService } from "./util.service";

export interface MealOption {
  title: string;
  time: number;
}

@Injectable({
  providedIn: "root",
})
export class MealOptionService {
  events = inject(EventService);
  utilService = inject(UtilService);
  httpService = inject(HttpService);
  httpErrorHandlerService = inject(HttpErrorHandlerService);

  fetch(
    params?: {
      title?: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<MealOption[]>({
      path: `mealoption`,
      method: "GET",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  async create(
    payload: {
      key: string;
      title: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.createBulk(
      {
        title: payload.title,
      },
      errorHandlers,
    );

    this.events.publish(EventName.MealOptionCreated);

    return response;
  }

  async update(
    mealOptionId: string,
    payload: {
      title: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<void>({
      path: `mealoption/${mealOptionId}`,
      method: "PUT",
      payload: payload,
      query: undefined,
      errorHandlers,
    });

    this.events.publish(EventName.MealOptionUpdated);

    return response;
  }

  async createBulk(payload: any, errorHandlers?: ErrorHandlers) {
    const response = await this.httpService.requestWithWrapper<MealOption>({
      path: `mealoption`,
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });

    this.events.publish(EventName.MealOptionCreated);

    return response;
  }

  // Removes label from a single associated recipe
  // async removeFromRecipe(
  //   params: {
  //     labelId: string;
  //     recipeId: string;
  //   },
  //   errorHandlers?: ErrorHandlers,
  // ) {
  //   const response = await this.httpService.requestWithWrapper<void>({
  //     path: `labels`,
  //     method: "DELETE",
  //     payload: undefined,
  //     query: params,
  //     errorHandlers,
  //   });

  //   this.events.publish(EventName.LabelUpdated);

  //   return response;
  // }

  // Deletes label and removes from all associated recipes
  // async delete(
  //   payload: {
  //     labelIds: string[];
  //   },
  //   errorHandlers?: ErrorHandlers,
  // ) {
  //   const response = await this.httpService.requestWithWrapper<void>({
  //     path: `labels/delete-bulk`,
  //     method: "POST",
  //     payload: payload,
  //     query: undefined,
  //     errorHandlers,
  //   });

  //   this.events.publish(EventName.LabelDeleted);

  //   return response;
  // }

  // async merge(
  //   params: {
  //     sourceLabelId: string;
  //     targetLabelId: string;
  //   },
  //   errorHandlers?: ErrorHandlers,
  // ) {
  //   const response = await this.httpService.requestWithWrapper<void>({
  //     path: `labels/merge`,
  //     method: "POST",
  //     payload: undefined,
  //     query: params,
  //     errorHandlers,
  //   });

  //   this.events.publish(EventName.LabelUpdated);

  //   return response;
  // }
}
