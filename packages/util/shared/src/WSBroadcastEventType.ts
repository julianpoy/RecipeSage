export enum WSBroadcastEventType {
  MealPlanUpdated = "mealplan:updated",
  ShoppingListUpdated = "shoppinglist:updated",
  JobUpdated = "job:updated",
  MessageReceived = "messages:new",
}

type MessageUser = {
  id: string;
  name: string | null;
  handle: string | null;
};

export type WSBroadcastEventData = {
  [WSBroadcastEventType.MealPlanUpdated]: {
    reference: string;
    mealPlanId: string;
  };
  [WSBroadcastEventType.ShoppingListUpdated]: {
    reference: string;
    shoppingListId: string;
  };
  [WSBroadcastEventType.JobUpdated]: {
    jobId: string;
  };
  [WSBroadcastEventType.MessageReceived]: {
    id: string;
    body: string;
    otherUser: MessageUser;
    fromUser: MessageUser;
    toUser: MessageUser;
    recipe?: {
      id: string;
      title: string;
      images: { location: string }[];
    };
  };
};
