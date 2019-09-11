import { Events } from '@ionic/angular';
import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {

  constructor(public events: Events, public utilService: UtilService, public httpService: HttpService) {}

  fetch() {
    const url = this.utilService.getBase() + 'shoppingLists/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  fetchById(listId) {
    const url = this.utilService.getBase() + 'shoppingLists/' + listId + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  create(data) {
    const url = this.utilService.getBase() + 'shoppingLists/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  addItems(data: {
    id: string,
    items: {
      title: string,
      recipeId: string,
      reference: string
    }[]
  }) {
    const url = this.utilService.getBase() + 'shoppingLists/' + data.id + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  update(data) {
    const url = this.utilService.getBase() + 'shoppingLists/' + data.id + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'put',
      url,
      data
    }).then(response => response.data);
  }

  remove(data) {
    const recipeQuery = data.recipeId ? '&recipeId=' + data.recipeId : '';

    const url = `${this.utilService.getBase()}shoppingLists/${data.id}/items
                ${this.utilService.getTokenQuery()}
                &items=${data.items.join(',')}${recipeQuery}`;

    return this.httpService.request({
      method: 'delete',
      url
    }).then(response => response.data);
  }

  unlink(data) {
    const url = this.utilService.getBase() + 'shoppingLists/' + data.id + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'delete',
      url
    }).then(response => response.data);
  }
}
