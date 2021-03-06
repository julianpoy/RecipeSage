import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { HttpService } from './http.service';
import { EventService } from './event.service';
import { HttpErrorHandlerService } from './http-error-handler.service';

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

  fetch(options: {
    title?: string
  } = {}) {
    const titleQuery = options.title ? `&title=${encodeURIComponent(options.title)}` : '';

    const url = this.utilService.getBase() + 'labels/' + this.utilService.getTokenQuery() + titleQuery;

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  async getMyLabels(
    options: {
      title?: string
    } = {}
  ) {
    const titleQuery = options.title ? `&title=${encodeURIComponent(options.title)}` : '';

    const url = this.utilService.getBase() + 'labels/' + this.utilService.getTokenQuery() + titleQuery;

    try {
      const { data } = await this.httpService.request({
        method: 'get',
        url
      });

      return data;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err);
    }
  }

  create(data) {
    return this.createBulk({
      title: data.title,
      recipeIds: [data.recipeId]
    }).then(response => response.data);
  }

  update(labelId: string, props: Partial<Label>) {
    const url = this.utilService.getBase() + 'labels/' + labelId + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'put',
      url,
      data: props
    }).then(response => {
      this.events.publish('label:updated');

      return response.data;
    });
  }

  createBulk(data) {
    const url = this.utilService.getBase() + 'labels/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => {
      this.events.publish('label:created');

      return response.data;
    });
  }

  // Removes label from a single associated recipe
  removeFromRecipe(labelId: string, recipeId: string) {
    if (!labelId || !recipeId) throw new Error(`Invalid recipeId or labelId`);

    const url = this.utilService.getBase() + 'labels/' + this.utilService.getTokenQuery()
                + '&labelId=' + labelId + '&recipeId=' + recipeId;

    return this.httpService.request({
      method: 'delete',
      url
    }).then(response => {
      this.events.publish('label:deleted');

      return response.data;
    });
  }

  // Deletes label and removes from all associated recipes
  delete(labelIds: string[]) {
    const url = this.utilService.getBase() + 'labels/delete-bulk' + this.utilService.getTokenQuery();

    const data = {
      labelIds
    };

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => {
      this.events.publish('label:deleted');

      return response.data;
    });
  }

  merge(sourceLabelId: string, targetLabelId: string) {
    const url = this.utilService.getBase() + 'labels/merge' + this.utilService.getTokenQuery() +
      `&sourceLabelId=${sourceLabelId}&targetLabelId=${targetLabelId}`;

    return this.httpService.request({
      method: 'post',
      url
    }).then(response => response.data);
  }
}
