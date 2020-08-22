import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export enum GlobalFeatureFlagKeys {
  EnableExperimentalOfflineCache = 'enableExperimentalOfflineCache'
}

export interface FeatureFlagTypes {
  [GlobalFeatureFlagKeys.EnableExperimentalOfflineCache]: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagService {
  // TODO: This should come from tenant-specific API endpoint
  betaFlags = {
    [GlobalFeatureFlagKeys.EnableExperimentalOfflineCache]: true,
  }

  flags = {
    [GlobalFeatureFlagKeys.EnableExperimentalOfflineCache]: false,
  }

  constructor() {
    // TODO: Remove this, replace with tenant specific API endpoint
    if (['beta.recipesage.com'].includes(window.location.hostname) || !environment.production) {
      Object.assign(this.flags, this.betaFlags);
    }
  }
}
