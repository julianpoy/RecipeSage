import { Injectable, inject } from "@angular/core";
import { UtilService } from "./util.service";
import { HttpService } from "./http.service";
import {
  HttpErrorHandlerService,
  ErrorHandlers,
} from "./http-error-handler.service";

import { Recipe } from "./recipe.service";
import { Label } from "./label.service";

export interface ProfileItem {
  title: string;
  type: "all-recipes" | "label" | "recipe";
  visibility: "public" | "friends-only";
  order: number;
  recipe: Partial<Recipe>;
  label: Partial<Label>;
}

export interface EditProfileItem {
  title?: string;
  type?: "all-recipes" | "label" | "recipe";
  recipeId?: string;
  labelId?: string;
  visibility?: "public" | "friends-only";
}

export interface ProfileImage {
  id: string;
  location: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  enableProfile?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  handle?: string;
  incomingFriendship: boolean;
  outgoingFriendship: boolean;
  isMe: boolean;
  profileImages: ProfileImage[];
  enableProfile: boolean;
  profileVisibility: "public" | "friends-only";
  profileItems: ProfileItem[];
}

export interface EditUserProfile {
  name?: string;
  handle?: string;
  profileImageIds?: string[];
  enableProfile?: boolean;
  profileVisibility?: "public" | "friends-only";
  profileItems?: EditProfileItem[];
}

export interface HandleInfo {
  available: boolean;
}

export interface Capabilities {
  highResImages: boolean;
  multipleImages: boolean;
  expandablePreviews: boolean;
  assistantMoreMessages: boolean;
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  private httpService = inject(HttpService);

  register(
    payload: {
      name: string;
      email: string;
      password: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{ token: string }>({
      path: "users/register",
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  login(
    payload: {
      email: string;
      password: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{ token: string }>({
      path: "users/login",
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  logout(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>({
      path: "users/logout",
      method: "POST",
      payload: {},
      query: undefined,
      errorHandlers,
    });
  }

  forgot(
    payload: {
      email: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: "users/forgot",
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  update(
    payload: {
      name?: string;
      email?: string;
      password?: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: "users/",
      method: "PUT",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  saveFCMToken(
    payload: {
      fcmToken: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: "users/fcm/token",
      method: "POST",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  removeFCMToken(
    params: {
      fcmToken: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: "users/fcm/token",
      method: "DELETE",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  getUserByEmail(
    params: {
      email: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<User>({
      path: "users/by-email",
      method: "GET",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  me(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<User>({
      path: "users/",
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  getMyProfile(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<UserProfile>({
      path: "users/profile",
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  getUserById(userId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<User>({
      path: `users/${userId}`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  updateMyProfile(
    payload: Partial<EditUserProfile>,
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>({
      path: "users/profile",
      method: "PUT",
      payload: payload,
      query: undefined,
      errorHandlers,
    });
  }

  getProfileByUserId(userId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<UserProfile>({
      path: `users/profile/${userId}`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  getProfileByHandle(handle: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<UserProfile>({
      path: `users/profile/by-handle/${encodeURIComponent(handle)}`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  getHandleInfo(handle: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<HandleInfo>({
      path: `users/handle-info/${encodeURIComponent(handle)}`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  getMyFriends(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>({
      path: `users/friends`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  addFriend(friendId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>({
      path: `users/friends/${friendId}`,
      method: "POST",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  deleteFriend(friendId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>({
      path: `users/friends/${friendId}`,
      method: "DELETE",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  myStats(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>({
      path: `users/stats`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  capabilities(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Capabilities>({
      path: `users/capabilities`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  delete(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>({
      path: `users/`,
      method: "DELETE",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }
}
