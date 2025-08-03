import { Injectable, inject } from "@angular/core";
import { EventName, EventService } from "./event.service";
import {
  ErrorHandlers,
  HttpErrorHandlerService,
} from "./http-error-handler.service";
import { HttpService } from "./http.service";
import { UtilService } from "./util.service";
import { TranslateService } from "@ngx-translate/core";

export interface MealOption {
  id: string;
  title: string;
  mealTime: string;
  createdAt: Date;
  updatedAt: Date;
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
      path: `mealOptions`,
      method: "GET",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  async create(
    payload: {
      title: string;
      mealTime: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.createBulk(
      {
        title: payload.title,
        mealTime: payload.mealTime,
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
      mealTime: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<void>({
      path: `mealOptions/${mealOptionId}`,
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
      path: `mealOptions`,
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });

    this.events.publish(EventName.MealOptionCreated);

    return response;
  }

  async delete(
    mealOptionId: string,
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<void>({
      path: `mealOptions`,
      method: "DELETE",
      payload: undefined,
      query: {
        mealOptionId,
      },
      errorHandlers,
    });

    this.events.publish(EventName.MealOptionDeleted);

    return response;
  }
}
