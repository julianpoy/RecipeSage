import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { HttpService } from './http.service';
import { EventService } from './event.service';
import { HttpErrorHandlerService, ErrorHandlers } from './http-error-handler.service';

export interface Label {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  recipeCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LabelService {

  constructor(
    public events: EventService,
    public utilService: UtilService,
    public httpService: HttpService,
    public httpErrorHandlerService: HttpErrorHandlerService,
  ) {}

  fetch(params?: {
    title?: string
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Label[]>(
      `labels`,
      'GET',
      null,
      params,
      errorHandlers
    );
  }

  create(payload: {
    title: string,
    recipeId: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.createBulk({
      title: payload.title,
      recipeIds: [payload.recipeId]
    }, errorHandlers);
  }

  update(labelId: string, payload: {
    title: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `labels/${labelId}`,
      'PUT',
      payload,
      null,
      errorHandlers
    );
  }

  createBulk(payload: any, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Label>(
      `labels`,
      'POST',
      payload,
      null,
      errorHandlers
    );
  }

  // Removes label from a single associated recipe
  removeFromRecipe(params: {
    labelId: string,
    recipeId: string
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `labels`,
      'DELETE',
      null,
      params,
      errorHandlers
    );
  }

  // Deletes label and removes from all associated recipes
  delete(payload: {
    labelIds: string[]
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `labels/delete-bulk`,
      'POST',
      payload,
      null,
      errorHandlers
    );
  }

  merge(params: {
    sourceLabelId: string,
    targetLabelId: string
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `labels/merge`,
      'POST',
      null,
      params,
      errorHandlers
    );
  }
}
