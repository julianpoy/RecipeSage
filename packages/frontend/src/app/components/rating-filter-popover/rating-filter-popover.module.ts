import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

import { RatingFilterPopoverComponent } from "./rating-filter-popover.component";
import { GlobalModule } from "~/global.module";
import { RatingModule } from "../rating/rating.module";

@NgModule({
  declarations: [RatingFilterPopoverComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    GlobalModule,
    RatingModule,
  ],
})
export class RatingFilterPopoverModule {}
