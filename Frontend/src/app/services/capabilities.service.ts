import { Injectable } from '@angular/core';
import { UserService } from './user.service';
import { UtilService } from './util.service';

const CAPABILITY_REFRESH_RATE = 60000;
const CAPABILITY_RETRY_RATE = 2000;

@Injectable({
  providedIn: 'root'
})
export class CapabilitiesService {
  retryTimeout;

  capabilities = {
    highResImages: false,
    multipleImages: false,
    expandablePreviews: false,
  };

  constructor(
    private userService: UserService,
    private utilService: UtilService,
  ) {
    this.updateCapabilities();

    setInterval(() => this.updateCapabilities(), CAPABILITY_REFRESH_RATE);
  }

  async updateCapabilities() {
    try {
      if (!this.utilService.isLoggedIn()) throw new Error('User is not logged in');
      this.capabilities = await this.userService.capabilities();
    } catch (e) {
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }

      this.retryTimeout = setTimeout(() => {
        this.updateCapabilities();
      }, CAPABILITY_RETRY_RATE);
    }
  }
}
