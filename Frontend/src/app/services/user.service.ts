import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { HttpService } from './http.service';
import { HttpErrorHandlerService, ErrorHandlers } from './http-error-handler.service';

import { Recipe } from './recipe.service';
import { Label } from './label.service';

export interface ProfileItem {
  title: string,
  type: 'all-recipes' | 'label' | 'recipe',
  visibility: 'public' | 'friends-only',
  order: number,
  recipe: Partial<Recipe>,
  label: Partial<Label>,
}

export interface EditProfileItem {
  title?: string,
  type?: 'all-recipes' | 'label' | 'recipe',
  recipeId?: string,
  labelId?: string,
  visibility?: 'public' | 'friends-only',
}

export interface ProfileImage {
  id: string,
  location: string,
}

export interface User {
  id: string,
  name: string,
  email: string,
}

export interface UserProfile {
  id: string,
  name: string,
  handle?: string,
  incomingFriendship: boolean,
  outgoingFriendship: boolean,
  isMe: boolean,
  profileImages: ProfileImage[],
  enableProfile: boolean,
  profileVisibility: 'public' | 'friends-only',
  profileItems: ProfileItem[],
}

export interface EditUserProfile {
  name?: string,
  handle?: string,
  profileImageIds?: string[],
  enableProfile?: boolean,
  profileVisibility?: 'public' | 'friends-only',
  profileItems?: EditProfileItem[],
}

export interface HandleInfo {
  available: boolean,
}

export interface Capabilities {
  highResImages: boolean,
  multipleImages: boolean,
  expandablePreviews: boolean,
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private utilService: UtilService,
    private httpService: HttpService,
    private httpErrorHandlerService: HttpErrorHandlerService,
  ) {}

  register(payload: {
    name: string,
    email: string,
    password: string
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<{ token: string }>(
      'users/register',
      'POST',
      payload,
      errorHandlers
    );
  }

  login(payload: {
    email: string,
    password: string
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<{ token: string }>(
      'users/login',
      'POST',
      payload,
      errorHandlers
    );
  }

  logout(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      'users/logout',
      'POST',
      {},
      errorHandlers
    );
  }

  forgot(payload: {
    email: string
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      'users/forgot',
      'POST',
      payload,
      errorHandlers
    );
  }

  update(payload: {
    name?: string,
    email?: string,
    password?: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      'users/',
      'PUT',
      payload,
      errorHandlers
    );
  }

  saveFCMToken(payload: {
    fcmToken: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      'users/fcm/token',
      'POST',
      payload,
      errorHandlers
    );
  }

  removeFCMToken(payload: {
    fcmToken: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      'users/fcm/token',
      'DELETE',
      payload,
      errorHandlers
    );
  }

  getUserByEmail(payload: {
    email: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<User>(
      'users/by-email',
      'GET',
      payload,
      errorHandlers
    );
  }

  me(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<User>(
      'users/',
      'GET',
      {},
      errorHandlers
    );
  }

  getMyProfile(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<UserProfile>(
      'users/profile',
      'GET',
      {},
      errorHandlers
    );
  }

  getUserById(userId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<User>(
      `users/${userId}`,
      'GET',
      {},
      errorHandlers
    );
  }

  updateMyProfile(payload: Partial<EditUserProfile>, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      'users/profile',
      'PUT',
      payload,
      errorHandlers
    );
  }

  getProfileByUserId(userId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<UserProfile>(
      `users/profile/${userId}`,
      'GET',
      {},
      errorHandlers
    );
  }

  getProfileByHandle(handle: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<UserProfile>(
      `users/profile/by-handle/${handle}`,
      'GET',
      {},
      errorHandlers
    );
  }

  getHandleInfo(handle: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<HandleInfo>(
      `users/handle-info/${handle}`,
      'GET',
      {},
      errorHandlers
    );
  }

  getMyFriends(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>(
      `users/friends`,
      'GET',
      {},
      errorHandlers
    );
  }

  addFriend(friendId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>(
      `users/friends/${friendId}`,
      'POST',
      {},
      errorHandlers
    );
  }

  deleteFriend(friendId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `users/friends/${friendId}`,
      'DELETE',
      {},
      errorHandlers
    );
  }

  myStats(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>(
      `users/stats`,
      'GET',
      {},
      errorHandlers
    );
  }

  capabilities(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Capabilities>(
      `users/capabilities`,
      'GET',
      {},
      errorHandlers
    );
  }

  checkForUpdate(payload: {
    version: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>(
      'info',
      'GET',
      {},
      errorHandlers
    );
  }
}
