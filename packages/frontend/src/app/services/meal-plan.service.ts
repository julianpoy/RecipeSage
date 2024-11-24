import { Injectable } from "@angular/core";
import { HttpService } from "./http.service";
import { ErrorHandlers } from "./http-error-handler.service";

export enum MealName {
  Breakfast = "breakfast",
  Lunch = "lunch",
  Dinner = "dinner",
  Snacks = "snacks",
  Other = "other",
}

export interface MealPlanCollaborator {
  id: string;
  name: string;
  email: string;
}

export type MealPlans = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  itemCount: string;
  myUserId: string;
  collaborators: MealPlanCollaborator[];
  owner: MealPlanCollaborator;
}[];

export interface MealPlan {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  collaborators: MealPlanCollaborator[];
  owner: MealPlanCollaborator;
  items: MealPlanItem[];
}

export interface MealPlanItem {
  id: string;
  title: string;
  scheduled: string;
  meal: MealName;
  updatedAt: string;
  createdAt: string;
  owner: MealPlanCollaborator;
  recipe: null | {
    id: string;
    title: string;
    ingredients: string;
    images: {
      id: string;
      location: string;
    }[];
  };
  recipeId?: string;
}

@Injectable({
  providedIn: "root",
})
export class MealPlanService {
  constructor(private httpService: HttpService) {}

  fetch(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<MealPlans>({
      path: "mealPlans",
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  fetchById(mealPlanId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<MealPlan>({
      path: `mealPlans/${mealPlanId}`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  create(
    payload: {
      title: string;
      collaborators: string[];
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{ id: string }>({
      path: `mealPlans`,
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  addItem(
    mealPlanId: string,
    payload: {
      title: string;
      recipeId: string | null;
      meal: string;
      scheduled: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: `mealPlans/${mealPlanId}`,
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  update(
    mealPlanId: string,
    payload: {
      title: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: `mealPlans/${mealPlanId}`,
      method: "PUT",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  updateItems(
    mealPlanId: string,
    payload: {
      items: {
        id: string;
        title: string;
        recipeId?: string;
        meal: string;
        scheduled: string;
      }[];
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: `mealPlans/${mealPlanId}/items/bulk`,
      method: "PUT",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  addItems(
    mealPlanId: string,
    payload: {
      items: {
        title: string;
        recipeId?: string;
        meal: string;
        scheduled: string;
      }[];
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: `mealPlans/${mealPlanId}/items/bulk`,
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  deleteItems(
    mealPlanId: string,
    params: {
      itemIds: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: `mealPlans/${mealPlanId}/items/bulk`,
      method: "DELETE",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  deleteItem(
    mealPlanId: string,
    params: {
      itemId: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: `mealPlans/${mealPlanId}/items`,
      method: "DELETE",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  delete(mealPlanId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>({
      path: `mealPlans/${mealPlanId}`,
      method: "DELETE",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  getICalUrl(mealPlanId: string) {
    return `${this.httpService.getBase()}/mealPlans/${mealPlanId}/ical`;
  }
}
