import { Injectable, inject } from "@angular/core";
import { UtilService } from "./util.service";
import { HttpService } from "./http.service";
import { EventService } from "./event.service";
import { ErrorHandlers } from "./http-error-handler.service";

export interface ShoppingListCollaborator {
  id: string;
  name: string;
  email: string;
}

export type ShoppingLists = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  itemCount: string;
  myUserId: string;
  collaborators: ShoppingListCollaborator[];
  owner: ShoppingListCollaborator;
}[];

export interface ShoppingList {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  collaborators: ShoppingListCollaborator[];
  owner: ShoppingListCollaborator;
  items: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: string;
  title: string;
  completed: boolean;
  updatedAt: string;
  createdAt: string;
  owner: ShoppingListCollaborator;
  recipe: null | {
    id: string;
    title: string;
  };
  groupTitle: string;
  categoryTitle: string;
}

@Injectable({
  providedIn: "root",
})
export class ShoppingListService {
  events = inject(EventService);
  utilService = inject(UtilService);
  httpService = inject(HttpService);

  fetch(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<ShoppingLists>({
      path: `shoppingLists`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  fetchById(listId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<ShoppingList>({
      path: `shoppingLists/${listId}`,
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
    return this.httpService.requestWithWrapper<ShoppingList>({
      path: `shoppingLists`,
      method: "POST",
      payload,
      query: undefined,
      errorHandlers,
    });
  }

  addItems(
    shoppingListId: string,
    payload: {
      items: {
        title: string;
        recipeId: string;
        reference: string;
      }[];
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: `shoppingLists/${shoppingListId}`,
      method: "POST",
      payload,
      query: undefined,
      errorHandlers,
    });
  }

  update(
    shoppingListId: string,
    payload: {
      title: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: `shoppingLists/${shoppingListId}`,
      method: "PUT",
      payload,
      query: undefined,
      errorHandlers,
    });
  }

  updateItems(
    shoppingListId: string,
    query: {
      itemIds: string;
    },
    payload: {
      title?: string;
      completed?: boolean;
      categoryTitle?: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{ reference: string }>({
      path: `shoppingLists/${shoppingListId}/items`,
      method: "PUT",
      payload,
      query,
      errorHandlers,
    });
  }

  deleteItems(
    shoppingListId: string,
    query: {
      itemIds: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: `shoppingLists/${shoppingListId}/items`,
      method: "DELETE",
      payload: undefined,
      query,
      errorHandlers,
    });
  }

  delete(shoppingListId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>({
      path: `shoppingLists/${shoppingListId}`,
      method: "DELETE",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }
}
