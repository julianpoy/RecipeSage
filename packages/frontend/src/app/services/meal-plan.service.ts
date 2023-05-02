import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { HttpService } from './http.service';
import { HttpErrorHandlerService, ErrorHandlers } from './http-error-handler.service';

interface MealPlanCollaborator {
  id: string,
  name: string,
  email: string,
}

type MealPlans = {
  id: string,
  title: string,
  createdAt: string,
  updatedAt: string,
  itemCount: string,
  myUserId: string,
  collaborators: MealPlanCollaborator[],
  owner: MealPlanCollaborator,
}[];

export interface MealPlan {
  id: string,
  title: string,
  createdAt: string,
  updatedAt: string,
  userId: string,
  collaborators: MealPlanCollaborator[],
  owner: MealPlanCollaborator,
  items: MealPlanItem[],
}

export interface MealPlanItem {
  id: string,
  title: string,
  scheduled: string,
  meal: string,
  updatedAt: string,
  createdAt: string,
  owner: MealPlanCollaborator,
  recipe: null | {
    id: string,
    title: string,
    ingredients: string,
    images: {
      id: string,
      location: string,
    }[],
  },
}

@Injectable({
  providedIn: 'root'
})
export class MealPlanService {

  constructor(
    private utilService: UtilService,
    private httpService: HttpService,
    private httpErrorHandlerService: HttpErrorHandlerService
  ) {}

  fetch(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<MealPlans>(
      'mealPlans',
      'GET',
      null,
      null,
      errorHandlers
    );
  }

  fetchById(mealPlanId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<MealPlan>(
      `mealPlans/${mealPlanId}`,
      'GET',
      null,
      null,
      errorHandlers
    );
  }

  create(payload: {
    title: string,
    collaborators: string[],
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<{ id: string }>(
      `mealPlans`,
      'POST',
      payload,
      null,
      errorHandlers
    );
  }

  addItem(mealPlanId: string, payload: {
    title: string,
    recipeId: string | null,
    meal: string,
    scheduled: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}`,
      'POST',
      payload,
      null,
      errorHandlers
    );
  }

  update(mealPlanId: string, payload: {
    title: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}`,
      'PUT',
      payload,
      null,
      errorHandlers
    );
  }

  updateItems(mealPlanId: string, payload: {
    items: {
      id: string,
      title: string,
      recipeId?: string,
      meal: string,
      scheduled: string
    }[]
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}/items/bulk`,
      'PUT',
      payload,
      null,
      errorHandlers
    );
  }

  addItems(mealPlanId: string, payload: {
    items: {
      title: string,
      recipeId?: string,
      meal: string,
      scheduled: string
    }[]
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}/items/bulk`,
      'POST',
      payload,
      null,
      errorHandlers
    );
  }

  deleteItems(mealPlanId: string, params: {
    itemIds: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}/items/bulk`,
      'DELETE',
      null,
      params,
      errorHandlers
    );
  }

  deleteItem(mealPlanId: string, params: {
    itemId: string
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}/items`,
      'DELETE',
      null,
      params,
      errorHandlers
    );
  }

  delete(mealPlanId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}`,
      'DELETE',
      null,
      null,
      errorHandlers
    );
  }

  getICalUrl(mealPlanId: string) {
    return `${this.httpService.getBase()}/mealPlans/${mealPlanId}/ical`;
  }
}
