import { Injectable } from '@angular/core';
import axios, { AxiosInstance } from 'axios';
import { UtilService } from './util.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  base: String;

  axiosClient: AxiosInstance;

  constructor(public utilService: UtilService) {
    this.axiosClient = axios.create({
      timeout: 3000,
      headers: {
        'X-Initialized-At': Date.now().toString(),
        'Content-Type': 'application/json'
      }
    });
  }

  register(data) {
    const url = this.utilService.getBase() + 'users/register';

    return this.axiosClient.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  login(data) {
    const url = this.utilService.getBase() + 'users/login';

    return this.axiosClient.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  logout() {
    const url = this.utilService.getBase() + 'users/logout' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'post',
      url,
      data: {}
    }).then(response => response.data);
  }

  forgot(data) {
    const url = this.utilService.getBase() + 'users/forgot';

    return this.axiosClient.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  update(data) {
    const url = this.utilService.getBase() + 'users/' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'put',
      url,
      data
    }).then(response => response.data);
  }

  saveFCMToken(key) {
    console.log("attempting save")
    const data = {
      fcmToken: key
    };

    const url = this.utilService.getBase() + 'users/fcm/token' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }

  removeFCMToken(key) {
    console.log("attempting delete")
    const url = this.utilService.getBase() + 'users/fcm/token' + this.utilService.getTokenQuery() + '&fcmToken=' + encodeURIComponent(key);

    return this.axiosClient.request({
      method: 'delete',
      url
    }).then(response => response.data);
  }

  getUserByEmail(email) {
    const url = this.utilService.getBase() + 'users/by-email' + this.utilService.getTokenQuery() + '&email=' + encodeURIComponent(email);

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  me() {
    const url = this.utilService.getBase() + 'users/' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  checkForUpdate(params) {
    const url = this.utilService.getBase() + 'info/' + this.utilService.getTokenQuery() + '&version=' + encodeURIComponent(params.version);

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }
}
