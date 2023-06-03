import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

import { MealPlanBulkPinModalPage } from "./index";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [MealPlanBulkPinModalPage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  entryComponents: [MealPlanBulkPinModalPage],
})
export class MealPlanBulkPinModalPageModule {}
