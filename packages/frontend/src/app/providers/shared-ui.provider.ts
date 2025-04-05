import { IonicModule } from "@ionic/angular";
import { CommonModule } from "@angular/common";
import { TranslateDirective, TranslatePipe } from "@ngx-translate/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

export const SHARED_UI_IMPORTS = [
  IonicModule,
  CommonModule,
  TranslatePipe,
  TranslateDirective,
  FormsModule,
  RouterModule,
];
