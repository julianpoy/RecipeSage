import { Injectable } from '@angular/core';
import { UserService } from './user.service';
import { UtilService } from './util.service';

@Injectable({
  providedIn: 'root'
})
export class CapabilitiesService {
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
  }

  async updateCapabilities() {
    try {
      if (!this.utilService.isLoggedIn()) throw new Error('User is not logged in');
      this.capabilities = await this.userService.capabilities();
    } catch (e) {
      setTimeout(() => {
        this.updateCapabilities();
      }, 1000);
    }
  }
}
