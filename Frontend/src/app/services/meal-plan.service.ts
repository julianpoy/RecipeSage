import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@angular/core';
import { UtilService } from './util.service';

@Injectable({
  providedIn: 'root'
})
export class MealPlanService {

  base: any;

  axiosClient: AxiosInstance;

  constructor(public utilService: UtilService) {
    this.axiosClient = axios.create({
      timeout: 3000,
      headers: {
        'X-Initialized-At': Date.now().toString(),
        'Content-Type': 'application/json'
      }
    });
  }

  fetch() {
    const url = this.utilService.getBase() + 'mealPlans/' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  fetchById(mealPlanId) {
    const url = this.utilService.getBase() + 'mealPlans/' + mealPlanId + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  create(data) {
    const url = this.utilService.getBase() + 'mealPlans/' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  addItem(data) {
    const url = this.utilService.getBase() + 'mealPlans/' + data.id + this.utilService.getTokenQuery();

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
    const url = this.utilService.getBase() + `mealPlans/${data.id}/items${this.utilService.getTokenQuery()}&itemId=${data.itemId}`;

    return this.axiosClient.request({
      method: 'delete',
      url
    }).then(response => response.data);
  }

  unlink(data) {
    const url = this.utilService.getBase() + 'mealPlans/' + data.id + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'delete',
      url
    }).then(response => response.data);
  }
}
