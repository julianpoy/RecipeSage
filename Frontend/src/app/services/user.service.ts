import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { HttpService } from './http.service';
import { HttpErrorHandlerService } from './http-error-handler.service';

export interface ProfileItem {
  title: string,
  type: 'all-recipes' | 'label' | 'recipe',
  recipeId?: string,
  labelId?: string,
  visibility: 'public' | 'friends-only',
  order: number,
}

export interface ProfileImage {
  id: string,
  location: string,
}

export interface UserProfile {
  name: string,
  handle?: string,
  profileImages: ProfileImage[],
  enableProfile: boolean,
  profileVisibility: 'public' | 'friends-only',
  profileItems: ProfileItem[],
}

export interface UserProfileUpdate {
  name?: string,
  handle?: string,
  profileImageIds?: string[],
  enableProfile?: boolean,
  profileItems?: ProfileItem[],
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

  register(data) {
    const url = this.utilService.getBase() + 'users/register';

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  login(data) {
    const url = this.utilService.getBase() + 'users/login';

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  logout() {
    const url = this.utilService.getBase() + 'users/logout' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data: {}
    }).then(response => response.data);
  }

  forgot(data) {
    const url = this.utilService.getBase() + 'users/forgot';

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
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

  getUserByEmail(email) {
    const url = this.utilService.getBase() + 'users/by-email' + this.utilService.getTokenQuery() + '&email=' + encodeURIComponent(email);

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  me() {
    const url = this.utilService.getBase() + 'users/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  async getMyProfile(): Promise<UserProfile> {
    const url = this.utilService.getBase() + 'users/profile' + this.utilService.getTokenQuery();

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

  async updateMyProfile(profile: Partial<UserProfileUpdate>): Promise<boolean> {
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

  async getProfileByUserIdOrHandle(identifier: string): Promise<UserProfile> {
    const url = this.utilService.getBase() + 'users/profile/' + identifier + this.utilService.getTokenQuery();

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

  async getMyFriends() {
    const url = this.utilService.getBase() + 'users/friends' + this.utilService.getTokenQuery();

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

  addFriend(friendId: string) {
    const url = this.utilService.getBase() + 'users/friends/' + friendId + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url
    }).then(response => response.data);
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
