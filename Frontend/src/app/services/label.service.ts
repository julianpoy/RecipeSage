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

  fetch(payload?: {
    title?: string
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Label[]>(
      `labels`,
      'GET',
      payload,
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
      errorHandlers
    );
  }

  createBulk(payload: any, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Label>(
      `labels`,
      'POST',
      payload,
      errorHandlers
    );
  }

  // Removes label from a single associated recipe
  removeFromRecipe(payload: {
    labelId: string,
    recipeId: string
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `labels`,
      'DELETE',
      payload,
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
      errorHandlers
    );
  }

  merge(payload: {
    sourceLabelId: string,
    targetLabelId: string
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `labels/merge`,
      'POST',
      payload,
      errorHandlers
    );
  }
}
