import { Injectable } from "@angular/core";
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
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  constructor(private httpService: HttpService) {}

  register(
    payload: {
      name: string;
      email: string;
      password: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{ token: string }>(
      "users/register",
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
  }

  login(
    payload: {
      email: string;
      password: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{ token: string }>(
      "users/login",
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
  }

  logout(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      "users/logout",
      "POST",
      {},
      undefined,
      errorHandlers,
    );
  }

  forgot(
    payload: {
      email: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>(
      "users/forgot",
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
  }

  update(
    payload: {
      name?: string;
      email?: string;
      password?: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>(
      "users/",
      "PUT",
      payload,
      undefined,
      errorHandlers,
    );
  }

  saveFCMToken(
    payload: {
      fcmToken: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>(
      "users/fcm/token",
      "POST",
      payload,
      undefined,
      errorHandlers,
    );
  }

  removeFCMToken(
    params: {
      fcmToken: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>(
      "users/fcm/token",
      "DELETE",
      undefined,
      params,
      errorHandlers,
    );
  }

  getUserByEmail(
    params: {
      email: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<User>(
      "users/by-email",
      "GET",
      undefined,
      params,
      errorHandlers,
    );
  }

  me(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<User>(
      "users/",
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  getMyProfile(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<UserProfile>(
      "users/profile",
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  getUserById(userId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<User>(
      `users/${userId}`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  updateMyProfile(
    payload: Partial<EditUserProfile>,
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<void>(
      "users/profile",
      "PUT",
      payload,
      undefined,
      errorHandlers,
    );
  }

  getProfileByUserId(userId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<UserProfile>(
      `users/profile/${userId}`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  getProfileByHandle(handle: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<UserProfile>(
      `users/profile/by-handle/${encodeURIComponent(handle)}`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  getHandleInfo(handle: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<HandleInfo>(
      `users/handle-info/${encodeURIComponent(handle)}`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  getMyFriends(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>(
      `users/friends`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  addFriend(friendId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>(
      `users/friends/${friendId}`,
      "POST",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  deleteFriend(friendId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `users/friends/${friendId}`,
      "DELETE",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  myStats(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>(
      `users/stats`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  capabilities(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Capabilities>(
      `users/capabilities`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  delete(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `users/`,
      "DELETE",
      undefined,
      undefined,
      errorHandlers,
    );
  }
}
