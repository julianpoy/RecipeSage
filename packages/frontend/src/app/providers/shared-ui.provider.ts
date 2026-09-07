import { CommonModule } from "@angular/common";
import { TranslateDirective, TranslatePipe } from "@ngx-translate/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { CachedImageDirective } from "../directives/cached-image.directive";

export const SHARED_UI_IMPORTS = [
  CommonModule,
  TranslatePipe,
  TranslateDirective,
  FormsModule,
  RouterModule,
  CachedImageDirective,
];
