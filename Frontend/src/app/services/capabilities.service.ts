import { Injectable } from '@angular/core';
import { UserService } from './user.service';

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
    private userService: UserService
  ) {
    this.updateCapabilities();
  }

  async updateCapabilities() {
    try {
      this.capabilities = await this.userService.capabilities();
    } catch (e) {
      setTimeout(() => {
        this.updateCapabilities();
      }, 1000);
    }
  }
}
