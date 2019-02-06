import { Component, Input } from '@angular/core';

@Component({
  selector: 'logo-icon',
  templateUrl: 'logo-icon.html'
})
export class LogoIconComponent {

  @Input('href') href

  constructor() {}
}
