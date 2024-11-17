import { Injectable } from "@angular/core";
import { UtilService } from "./util.service";
import { HttpService } from "./http.service";
import { EventName, EventService } from "./event.service";
import {
  HttpErrorHandlerService,
  ErrorHandlers,
} from "./http-error-handler.service";

export interface Label {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  recipeCount?: number;
}

@Injectable({
  providedIn: "root",
})
export class LabelService {
  constructor(
    public events: EventService,
    public utilService: UtilService,
    public httpService: HttpService,
    public httpErrorHandlerService: HttpErrorHandlerService,
  ) {}

  fetch(
    params?: {
      title?: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<Label[]>({
      path: `labels`,
      method: "GET",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  async create(
    payload: {
      title: string;
      recipeId: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.createBulk(
      {
        title: payload.title,
        recipeIds: [payload.recipeId],
      },
      errorHandlers,
    );

    this.events.publish(EventName.LabelCreated);

    return response;
  }

  async update(
    labelId: string,
    payload: {
      title: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<void>({
      path: `labels/${labelId}`,
      method: "PUT",
      payload: payload,
      query: undefined,
      errorHandlers,
    });

    this.events.publish(EventName.LabelUpdated);

    return response;
  }

  async createBulk(payload: any, errorHandlers?: ErrorHandlers) {
    const response = await this.httpService.requestWithWrapper<Label>({
      path: `labels`,
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });

    this.events.publish(EventName.LabelCreated);

    return response;
  }

  // Removes label from a single associated recipe
  async removeFromRecipe(
    params: {
      labelId: string;
      recipeId: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<void>({
      path: `labels`,
      method: "DELETE",
      payload: undefined,
      query: params,
      errorHandlers,
    });

    this.events.publish(EventName.LabelUpdated);

    return response;
  }

  // Deletes label and removes from all associated recipes
  async delete(
    payload: {
      labelIds: string[];
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<void>({
      path: `labels/delete-bulk`,
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });

    this.events.publish(EventName.LabelDeleted);

    return response;
  }

  async merge(
    params: {
      sourceLabelId: string;
      targetLabelId: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<void>({
      path: `labels/merge`,
      method: "POST",
      payload: undefined,
      query: params,
      errorHandlers,
    });

    this.events.publish(EventName.LabelUpdated);

    return response;
  }
}
