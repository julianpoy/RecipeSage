import { Injectable } from '@angular/core';
import { Events } from '@ionic/angular';
import { UtilService } from './util.service';
import { HttpService } from './http.service';

export interface Label {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class LabelService {

  constructor(public events: Events, public utilService: UtilService, public httpService: HttpService) {}

  fetch(populate?: boolean) {
    const populateQuery = populate ? '&populate=true' : '';

    const url = this.utilService.getBase() + 'labels/' + this.utilService.getTokenQuery() + populateQuery;

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
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
    const url = this.utilService.getBase() + 'labels/delete' + this.utilService.getTokenQuery() + '&labelIds=' + labelIds.join(',');

    return this.httpService.request({
      method: 'post',
      url
    }).then(response => {
      this.events.publish('label:deleted');

      return response.data;
    });
  }
}
