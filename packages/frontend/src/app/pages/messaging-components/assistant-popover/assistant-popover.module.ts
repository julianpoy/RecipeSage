import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

import { AssistantPopoverPage } from "./assistant-popover.page";
import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [AssistantPopoverPage],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    GlobalModule,
    ReactiveFormsModule,
  ],
})
export class AssistantPopoverPageModule {}
