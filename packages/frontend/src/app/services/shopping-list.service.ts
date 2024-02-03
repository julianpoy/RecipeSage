import { Injectable } from "@angular/core";
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
  constructor(
    public events: EventService,
    public utilService: UtilService,
    public httpService: HttpService,
  ) {}

  fetch(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<ShoppingLists>(
      `shoppingLists`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  fetchById(listId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<ShoppingList>(
      `shoppingLists/${listId}`,
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
    return this.httpService.requestWithWrapper<ShoppingList>(
      `shoppingLists`,
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
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
    return this.httpService.requestWithWrapper<void>(
      `shoppingLists/${shoppingListId}`,
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
  }

  update(
    shoppingListId: string,
    payload: {
      title: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>(
      `shoppingLists/${shoppingListId}`,
      "PUT",
      payload,
      undefined,
      errorHandlers,
    );
  }

  updateItems(
    shoppingListId: string,
    query: {
      itemIds: string;
    },
    payload: {
      title?: string;
      completed?: boolean;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{ reference: string }>(
      `shoppingLists/${shoppingListId}/items`,
      "PUT",
      payload,
      query,
      errorHandlers,
    );
  }

  deleteItems(
    shoppingListId: string,
    query: {
      itemIds: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>(
      `shoppingLists/${shoppingListId}/items`,
      "DELETE",
      undefined,
      query,
      errorHandlers,
    );
  }

  delete(shoppingListId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `shoppingLists/${shoppingListId}`,
      "DELETE",
      undefined,
      undefined,
      errorHandlers,
    );
  }
}
