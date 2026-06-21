import { Injectable, inject } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import { EventName, EventService } from "../event.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";
import {
  getLocalDb,
  KVStoreKeys,
  ObjectStoreName,
  getKvStoreEntry,
} from "../../utils/localDb";
import { appIdbStorageManager } from "../../utils/appIdbStorageManager";

@Injectable({
  providedIn: "root",
})
export class LabelsActionsService extends ActionsBase {
  private events = inject(EventService);

  getLabels(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labels"]["getLabels"] | undefined> {
    return this.executeQuery(
      () => this.trpc.labels.getLabels.query(),
      async () => {
        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const labels = await localDb.getAll(ObjectStoreName.Labels);
        return labels.filter((label) => label.userId === session.userId);
      },
      errorHandlers,
    );
  }

  getLabelsByUserId(
    input: RouterInputs["labels"]["getLabelsByUserId"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labels"]["getLabelsByUserId"] | undefined> {
    return this.executeQuery(
      () => this.trpc.labels.getLabelsByUserId.query(input),
      async () => {
        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const friendships = await getKvStoreEntry(KVStoreKeys.MyFriends);
        const friendUserIds = new Set(
          friendships?.friends.map((friend) => friend.id) || [],
        );
        const allQueriedAreKnown = input.userIds.every(
          (userId) => userId === session.userId || friendUserIds.has(userId),
        );
        if (!allQueriedAreKnown) return undefined;

        const userIdsSet = new Set(input.userIds);
        const labels = await localDb.getAll(ObjectStoreName.Labels);
        return labels.filter((label) => userIdsSet.has(label.userId));
      },
      errorHandlers,
    );
  }

  getAllVisibleLabels(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labels"]["getAllVisibleLabels"] | undefined> {
    return this.executeQuery(
      () => this.trpc.labels.getAllVisibleLabels.query(),
      async () => {
        const localDb = await getLocalDb();
        return localDb.getAll(ObjectStoreName.Labels);
      },
      errorHandlers,
    );
  }

  getLabelByTitle(
    input: RouterInputs["labels"]["getLabelByTitle"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labels"]["getLabelByTitle"] | undefined> {
    return this.executeQuery(
      () => this.trpc.labels.getLabelByTitle.query(input),
      async () => {
        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const labels = await localDb.getAll(ObjectStoreName.Labels);
        return labels.find(
          (label) =>
            label.userId === session.userId && label.title === input.title,
        );
      },
      errorHandlers,
    );
  }

  createLabel(
    input: RouterInputs["labels"]["createLabel"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labels"]["createLabel"] | undefined> {
    return this.executeMutation(
      () => this.trpc.labels.createLabel.mutate(input),
      () => {
        void this.syncService.syncLabels();
        void this.syncService.syncLabelGroups();
        this.events.publish(EventName.LabelCreated);
      },
      errorHandlers,
    );
  }

  updateLabel(
    input: RouterInputs["labels"]["updateLabel"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labels"]["updateLabel"] | undefined> {
    return this.executeMutation(
      () => this.trpc.labels.updateLabel.mutate(input),
      () => {
        void this.syncService.syncLabels();
        void this.syncService.syncLabelGroups();
        void this.syncService.syncRecipes();
        this.events.publish(EventName.LabelUpdated);
      },
      errorHandlers,
    );
  }

  upsertLabel(
    input: RouterInputs["labels"]["upsertLabel"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labels"]["upsertLabel"] | undefined> {
    return this.executeMutation(
      () => this.trpc.labels.upsertLabel.mutate(input),
      () => {
        void this.syncService.syncLabels();
        void this.syncService.syncLabelGroups();
        void this.syncService.syncRecipes();
        this.events.publish(EventName.LabelUpdated);
      },
      errorHandlers,
    );
  }

  deleteLabel(
    input: RouterInputs["labels"]["deleteLabel"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labels"]["deleteLabel"] | undefined> {
    return this.executeMutation(
      () => this.trpc.labels.deleteLabel.mutate(input),
      () => {
        void this.syncService.syncLabels();
        void this.syncService.syncLabelGroups();
        void this.syncService.syncRecipes();
        this.events.publish(EventName.LabelDeleted);
      },
      errorHandlers,
    );
  }

  deleteLabels(
    input: RouterInputs["labels"]["deleteLabels"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labels"]["deleteLabels"] | undefined> {
    return this.executeMutation(
      () => this.trpc.labels.deleteLabels.mutate(input),
      () => {
        void this.syncService.syncLabels();
        void this.syncService.syncLabelGroups();
        void this.syncService.syncRecipes();
        this.events.publish(EventName.LabelDeleted);
      },
      errorHandlers,
    );
  }

  mergeLabels(
    input: RouterInputs["labels"]["mergeLabels"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labels"]["mergeLabels"] | undefined> {
    return this.executeMutation(
      () => this.trpc.labels.mergeLabels.mutate(input),
      () => {
        void this.syncService.syncLabels();
        void this.syncService.syncLabelGroups();
        void this.syncService.syncRecipes();
        this.events.publish(EventName.LabelDeleted);
      },
      errorHandlers,
    );
  }
}
