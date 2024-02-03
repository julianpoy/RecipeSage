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
    return this.httpService.requestWithWrapper<MealPlans>(
      "mealPlans",
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  fetchById(mealPlanId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<MealPlan>(
      `mealPlans/${mealPlanId}`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  create(
    payload: {
      title: string;
      collaborators: string[];
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{ id: string }>(
      `mealPlans`,
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
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
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}`,
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
  }

  update(
    mealPlanId: string,
    payload: {
      title: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}`,
      "PUT",
      payload,
      undefined,
      errorHandlers,
    );
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
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}/items/bulk`,
      "PUT",
      payload,
      undefined,
      errorHandlers,
    );
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
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}/items/bulk`,
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
  }

  deleteItems(
    mealPlanId: string,
    params: {
      itemIds: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}/items/bulk`,
      "DELETE",
      undefined,
      params,
      errorHandlers,
    );
  }

  deleteItem(
    mealPlanId: string,
    params: {
      itemId: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}/items`,
      "DELETE",
      undefined,
      params,
      errorHandlers,
    );
  }

  delete(mealPlanId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `mealPlans/${mealPlanId}`,
      "DELETE",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  getICalUrl(mealPlanId: string) {
    return `${this.httpService.getBase()}/mealPlans/${mealPlanId}/ical`;
  }
}
