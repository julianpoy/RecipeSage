import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { PeoplePage } from "./people.page";
import { NullStateModule } from "~/components/null-state/null-state.module";
import { AddFriendModalPageModule } from "../add-friend-modal/add-friend-modal.module";
import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [PeoplePage],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: PeoplePage,
      },
    ]),
    FormsModule,
    ReactiveFormsModule,
    NullStateModule,
    AddFriendModalPageModule,
    GlobalModule,
  ],
})
export class PeoplePageModule {}
