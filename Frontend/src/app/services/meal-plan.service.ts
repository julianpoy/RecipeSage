import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { HttpService } from './http.service';
import { HttpErrorHandlerService } from './http-error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class MealPlanService {

  constructor(
    private utilService: UtilService,
    private httpService: HttpService,
    private httpErrorHandlerService: HttpErrorHandlerService
  ) {}

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

  async updateMealPlanItems(mealPlanId: string, mealPlanItems: {
    id: string,
    title: string,
    recipeId?: string,
    meal: string,
    scheduled: string
  }[]) {
    const url = this.utilService.getBase() + `mealPlans/${mealPlanId}/items/bulk${this.utilService.getTokenQuery()}`;

    try {
      const requestBody = {
        id: mealPlanId,
        items: mealPlanItems.map(item => ({
          id: item.id,
          title: item.title,
          recipeId: item.recipeId || null,
          meal: item.meal,
          scheduled: item.scheduled
        }))
      };

      const { data } = await this.httpService.request({
        method: 'put',
        url,
        data: requestBody
      });

      return data;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err);
    }
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
