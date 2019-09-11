import { Injectable } from '@angular/core';
import { Events } from '@ionic/angular';
import { UtilService } from './util.service';
import { HttpService } from './http.service';

export interface Label {
  id: string;
  title: string;
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

  remove(data) {
    const url = this.utilService.getBase() + 'labels/' + this.utilService.getTokenQuery()
                + '&labelId=' + data.id + '&recipeId=' + data.recipeId;

    return this.httpService.request({
      method: 'delete',
      url
    }).then(response => {
      this.events.publish('label:deleted');

      return response.data;
    });
  }
}
