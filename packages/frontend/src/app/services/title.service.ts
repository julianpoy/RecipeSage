import { inject, Injectable } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { RouterStateSnapshot, TitleStrategy } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";

@Injectable()
export class CustomTitleStrategy extends TitleStrategy {
  private translate = inject(TranslateService);
  private title = inject(Title);

  constructor() {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot) {
    const title = this.buildTitle(routerState);
    if (!title) return;

    this.translate
      .get(title)
      .toPromise()
      .then((translatedTitle: string) => {
        this.title.setTitle(translatedTitle);
      });
  }
}

