import { recipesActions } from "./server-actions/recipesActions";
import { shoppingListsActions } from "./server-actions/shoppingListsActions";
import { mealPlansActions } from "./server-actions/mealPlansActions";
import { labelsActions } from "./server-actions/labelsActions";
import { labelGroupsActions } from "./server-actions/labelGroupsActions";
import { usersActions } from "./server-actions/usersActions";
import { jobsActions } from "./server-actions/jobsActions";
import { assistantActions } from "./server-actions/assistantActions";
import { mlActions } from "./server-actions/mlActions";
import { imagesActions } from "./server-actions/imagesActions";
import { paymentsActions } from "./server-actions/paymentsActions";
import { iapActions } from "./server-actions/iapActions";
import { messagesActions } from "./server-actions/messagesActions";
import { discoverActions } from "./server-actions/discoverActions";

export const serverActions = {
  discover: discoverActions,
  recipes: recipesActions,
  shoppingLists: shoppingListsActions,
  mealPlans: mealPlansActions,
  labels: labelsActions,
  labelGroups: labelGroupsActions,
  users: usersActions,
  jobs: jobsActions,
  assistant: assistantActions,
  ml: mlActions,
  images: imagesActions,
  payments: paymentsActions,
  iap: iapActions,
  messages: messagesActions,
};
