import { Events } from '@ionic/angular';
import { Injectable } from '@angular/core';
import axios, { AxiosInstance } from 'axios';
import { UtilService } from './util.service';

@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {

  base: any;

  axiosClient: AxiosInstance;

  constructor(public events: Events, public utilService: UtilService) {
    this.axiosClient = axios.create({
      timeout: 3000,
      headers: {
        'X-Initialized-At': Date.now().toString(),
        'Content-Type': 'application/json'
      }
    });
  }

  fetch() {
    let url = this.utilService.getBase() + 'shoppingLists/' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  fetchById(listId) {
    const url = this.utilService.getBase() + 'shoppingLists/' + listId + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  create(data) {
    const url = this.utilService.getBase() + 'shoppingLists/' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
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

    return this.axiosClient.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  update(data) {
    const url = this.utilService.getBase() + 'shoppingLists/' + data.id + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'put',
      url,
      data
    }).then(response => response.data);
  }

  remove(data) {
    let recipeQuery = data.recipeId ? '&recipeId=' + data.recipeId : '';

    const url = this.utilService.getBase() + `shoppingLists/${data.id}/items${this.utilService.getTokenQuery()}&items=${data.items.join(',')}${recipeQuery}`;

    return this.axiosClient.request({
      method: 'delete',
      url
    }).then(response => response.data);
  }

  unlink(data) {
    const url = this.utilService.getBase() + 'shoppingLists/' + data.id + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'delete',
      url
    }).then(response => response.data);
  }
}
