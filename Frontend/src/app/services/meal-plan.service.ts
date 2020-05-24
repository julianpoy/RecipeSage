import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class MealPlanService {

  constructor(public utilService: UtilService, public httpService: HttpService) {}

  fetch() {
    const url = this.utilService.getBase() + 'mealPlans/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  fetchById(mealPlanId) {
    const url = this.utilService.getBase() + 'mealPlans/' + mealPlanId + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  create(data) {
    const url = this.utilService.getBase() + 'mealPlans/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  addItem(data) {
    const url = this.utilService.getBase() + 'mealPlans/' + data.id + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  update(data) {
    const url = this.utilService.getBase() + 'mealPlans/' + data.id + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'put',
      url,
      data
    }).then(response => response.data);
  }

  remove(data) {
    const url = this.utilService.getBase() + `mealPlans/${data.id}/items${this.utilService.getTokenQuery()}&itemId=${data.itemId}`;

    return this.httpService.request({
      method: 'delete',
      url
    }).then(response => response.data);
  }

  unlink(data) {
    const url = this.utilService.getBase() + 'mealPlans/' + data.id + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'delete',
      url
    }).then(response => response.data);
  }
}
