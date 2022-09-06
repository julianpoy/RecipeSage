import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { HttpService } from './http.service';
import { EventService } from './event.service';
import {ErrorHandlers} from './http-error-handler.service';

interface ShoppingListCollaborator {
  id: string,
  name: string,
  email: string,
}

type ShoppingLists = {
  id: string,
  title: string,
  createdAt: string,
  updatedAt: string,
  itemCount: string,
  myUserId: string,
  collaborators: ShoppingListCollaborator[],
  owner: ShoppingListCollaborator,
}[];

interface ShoppingList {
  id: string,
  title: string,
  createdAt: string,
  updatedAt: string,
  userId: string,
  collaborators: ShoppingListCollaborator[],
  owner: ShoppingListCollaborator,
  items: ShoppingListItem[],
}

interface ShoppingListItem {
  id: string,
  title: string,
  completed: boolean,
  updatedAt: string,
  createdAt: string,
  owner: ShoppingListCollaborator,
  recipe: null | {
    id: string,
    title: string,
  },
  groupTitle: string,
  categoryTitle: string,
}

@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {

  constructor(public events: EventService, public utilService: UtilService, public httpService: HttpService) {}

  fetch(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<ShoppingLists>(
      `shoppingLists`,
      'GET',
      null,
      null,
      errorHandlers
    );
  }

  fetchById(listId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<ShoppingList>(
      `shoppingLists/${listId}`,
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
    return this.httpService.requestWithWrapper<ShoppingList>(
      `shoppingLists`,
      'POST',
      payload,
      null,
      errorHandlers
    );
  }

  addItems(shoppingListId: string, payload: {
    items: {
      title: string,
      recipeId: string,
      reference: string
    }[]
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `shoppingLists/${shoppingListId}`,
      'POST',
      payload,
      null,
      errorHandlers
    );
  }

  update(shoppingListId: string, payload: {
    title: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `shoppingLists/${shoppingListId}`,
      'PUT',
      payload,
      null,
      errorHandlers
    );
  }

  deleteItems(shoppingListId: string, params: {
    itemIds: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `shoppingLists/${shoppingListId}/items`,
      'DELETE',
      null,
      params,
      errorHandlers
    );
  }

  delete(shoppingListId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `shoppingLists/${shoppingListId}`,
      'DELETE',
      null,
      null,
      errorHandlers
    );
  }
}
