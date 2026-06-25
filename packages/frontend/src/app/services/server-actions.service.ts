import { Injectable, inject } from "@angular/core";

import { RecipesActionsService } from "./server-actions/recipes-actions.service";
import { ShoppingListsActionsService } from "./server-actions/shopping-lists-actions.service";
import { MealPlansActionsService } from "./server-actions/meal-plans-actions.service";
import { LabelsActionsService } from "./server-actions/labels-actions.service";
import { LabelGroupsActionsService } from "./server-actions/label-groups-actions.service";
import { UsersActionsService } from "./server-actions/users-actions.service";
import { JobsActionsService } from "./server-actions/jobs-actions.service";
import { AssistantActionsService } from "./server-actions/assistant-actions.service";
import { MlActionsService } from "./server-actions/ml-actions.service";
import { ImagesActionsService } from "./server-actions/images-actions.service";
import { PaymentsActionsService } from "./server-actions/payments-actions.service";
import { MessagesActionsService } from "./server-actions/messages-actions.service";
import { DiscoverActionsService } from "./server-actions/discover-actions.service";

@Injectable({
  providedIn: "root",
})
export class ServerActionsService {
  discover = inject(DiscoverActionsService);
  recipes = inject(RecipesActionsService);
  shoppingLists = inject(ShoppingListsActionsService);
  mealPlans = inject(MealPlansActionsService);
  labels = inject(LabelsActionsService);
  labelGroups = inject(LabelGroupsActionsService);
  users = inject(UsersActionsService);
  jobs = inject(JobsActionsService);
  assistant = inject(AssistantActionsService);
  ml = inject(MlActionsService);
  images = inject(ImagesActionsService);
  payments = inject(PaymentsActionsService);
  messages = inject(MessagesActionsService);
}
