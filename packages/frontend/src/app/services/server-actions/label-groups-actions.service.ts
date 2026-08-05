import { Injectable } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";
import { getLocalDb, ObjectStoreName } from "../../utils/localDb";
import { appIdbStorageManager } from "../../utils/appIdbStorageManager";

@Injectable({
  providedIn: "root",
})
export class LabelGroupsActionsService extends ActionsBase {
  getLabelGroups(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labelGroups"]["getLabelGroups"] | undefined> {
    return this.executeQuery(
      () => this.trpc.labelGroups.getLabelGroups.query(),
      async () => {
        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const labelGroups = await localDb.getAll(ObjectStoreName.LabelGroups);
        return labelGroups.filter(
          (labelGroup) => labelGroup.userId === session.userId,
        );
      },
      errorHandlers,
    );
  }

  createLabelGroup(
    input: RouterInputs["labelGroups"]["createLabelGroup"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labelGroups"]["createLabelGroup"] | undefined> {
    return this.executeMutation(
      () => this.trpc.labelGroups.createLabelGroup.mutate(input),
      () => {
        void this.syncService.syncLabels();
        void this.syncService.syncLabelGroups();
      },
      errorHandlers,
    );
  }

  updateLabelGroup(
    input: RouterInputs["labelGroups"]["updateLabelGroup"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labelGroups"]["updateLabelGroup"] | undefined> {
    return this.executeMutation(
      () => this.trpc.labelGroups.updateLabelGroup.mutate(input),
      () => {
        void this.syncService.syncLabels();
        void this.syncService.syncLabelGroups();
      },
      errorHandlers,
    );
  }

  deleteLabelGroup(
    input: RouterInputs["labelGroups"]["deleteLabelGroup"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["labelGroups"]["deleteLabelGroup"] | undefined> {
    return this.executeMutation(
      () => this.trpc.labelGroups.deleteLabelGroup.mutate(input),
      () => {
        void this.syncService.syncLabels();
        void this.syncService.syncLabelGroups();
      },
      errorHandlers,
    );
  }
}
