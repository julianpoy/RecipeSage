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

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private utilService: UtilService,
    private httpService: HttpService,
    private httpErrorHandlerService: HttpErrorHandlerService,
  ) {}

  async register(payload: {
    name: string,
    email: string,
    password: string
  }, errorHandlers?: ErrorHandlers) {
    const url = this.utilService.getBase() + 'users/register';

    try {
      const { data } = await this.httpService.request<{ token: string }>({
        method: 'post',
        url,
        data: payload
      });

      return data.token;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err, errorHandlers);
    }
  }

  async login(payload: {
    email: string,
    password: string
  }, errorHandlers?: ErrorHandlers) {
    const url = this.utilService.getBase() + 'users/login';

    try {
      const { data } = await this.httpService.request<{ token: string }>({
        method: 'post',
        url,
        data: payload
      });

      return data.token;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err, errorHandlers);
    }
  }

  logout() {
    const url = this.utilService.getBase() + 'users/logout' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data: {}
    }).then(response => response.data);
  }

  async forgot(payload: {
    email: string
  }, errorHandlers?: ErrorHandlers) {
    try {
      const url = this.utilService.getBase() + 'users/forgot';

      await this.httpService.request<void>({
        method: 'post',
        url,
        data: payload
      });

      return true;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err, errorHandlers);
    }
  }

  update(data) {
    const url = this.utilService.getBase() + 'users/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'put',
      url,
      data
    }).then(response => response.data);
  }

  saveFCMToken(key) {
    console.log('attempting save');
    const data = {
      fcmToken: key
    };

    const url = this.utilService.getBase() + 'users/fcm/token' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  removeFCMToken(key) {
    console.log('attempting delete');
    const url = this.utilService.getBase() + 'users/fcm/token' + this.utilService.getTokenQuery() + '&fcmToken=' + encodeURIComponent(key);

    return this.httpService.request({
      method: 'delete',
      url
    }).then(response => response.data);
  }

  async getUserByEmail(email, errorHandlers?: ErrorHandlers): Promise<any> {
    const url = this.utilService.getBase() + 'users/by-email' + this.utilService.getTokenQuery() + '&email=' + encodeURIComponent(email);

    try {
      const { data } = await this.httpService.request({
        method: 'get',
        url
      });

      return data;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err, errorHandlers);
    }
  }

  me() {
    const url = this.utilService.getBase() + 'users/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  async getMyProfile(errorHandlers?: ErrorHandlers): Promise<UserProfile> {
    const url = this.utilService.getBase() + 'users/profile' + this.utilService.getTokenQuery();

    try {
      const { data } = await this.httpService.request({
        method: 'get',
        url
      });

      return data;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err, errorHandlers);
    }
  }

  async getUserById(userId: string): Promise<any> {
    const url = this.utilService.getBase() + 'users/' + userId + this.utilService.getTokenQuery();

    try {
      const { data } = await this.httpService.request({
        method: 'get',
        url
      });

      return data;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err);
    }
  }

  async updateMyProfile(profile: Partial<EditUserProfile>): Promise<boolean> {
    const url = this.utilService.getBase() + 'users/profile' + this.utilService.getTokenQuery();

    try {
      await this.httpService.request({
        method: 'put',
        url,
        data: profile,
      });

      return true;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err);

      return false;
    }
  }

  async getProfileByUserId(userId: string, errorHandlers?: ErrorHandlers): Promise<UserProfile> {
    const url = this.utilService.getBase() + 'users/profile/' + userId + this.utilService.getTokenQuery();

    try {
      const { data } = await this.httpService.request({
        method: 'get',
        url
      });

      return data;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err, errorHandlers);
    }
  }

  async getProfileByHandle(handle: string, errorHandlers?: ErrorHandlers): Promise<UserProfile> {
    const url = this.utilService.getBase() + 'users/profile/by-handle/' + handle + this.utilService.getTokenQuery();

    try {
      const { data } = await this.httpService.request({
        method: 'get',
        url
      });

      return data;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err, errorHandlers);
    }
  }

  async getHandleInfo(handle: string): Promise<HandleInfo> {
    const url = this.utilService.getBase() + 'users/handle-info/' + handle + this.utilService.getTokenQuery();

    try {
      const { data } = await this.httpService.request({
        method: 'get',
        url
      });

      return data;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err);
    }
  }

  async getMyFriends(errorHandlers?: ErrorHandlers) {
    const url = this.utilService.getBase() + 'users/friends' + this.utilService.getTokenQuery();

    try {
      const { data } = await this.httpService.request({
        method: 'get',
        url
      });

      return data;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err, errorHandlers);
    }
  }

  async addFriend(friendId: string): Promise<boolean> {
    const url = this.utilService.getBase() + 'users/friends/' + friendId + this.utilService.getTokenQuery();

    try {
      await this.httpService.request({
        method: 'post',
        url,
      });

      return true;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err);

      return false;
    }
  }

  async deleteFriend(friendId: string): Promise<boolean> {
    const url = this.utilService.getBase() + 'users/friends/' + friendId + this.utilService.getTokenQuery();

    try {
      await this.httpService.request({
        method: 'delete',
        url,
      });

      return true;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err);

      return false;
    }
  }

  myStats() {
    const url = this.utilService.getBase() + 'users/stats' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  capabilities() {
    const url = this.utilService.getBase() + 'users/capabilities' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  checkForUpdate(params) {
    const url = this.utilService.getBase() + 'info/' + this.utilService.getTokenQuery() + '&version=' + encodeURIComponent(params.version);

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }
}
