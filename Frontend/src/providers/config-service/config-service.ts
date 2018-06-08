import { Injectable } from '@angular/core';

@Injectable()
export class ConfigServiceProvider {

  public config: any = {
    enableSplitPane: false
  }

  constructor() {
    console.log('Hello ConfigServiceProvider Provider');

    this.loadConfig();
  }

  getConfig() {
    return this.config;
  }

  saveConfig() {
    console.log("loadin in", this.config, this.config.enableSplitPane)
    for (var key in this.config) {
      if (this.config.hasOwnProperty(key)) {
        localStorage.setItem('config-' + key, this.config[key]);
      }
    }
  }

  loadConfig() {
    for (var key in this.config) {
      if (this.config.hasOwnProperty(key) && localStorage.getItem('config-' + key)) {
        let val = localStorage.getItem('config-' + key);

        if (val === 'true' || val === 'false') val = JSON.parse(val);

        this.config[key] = val;
      }
    }
  }
}
