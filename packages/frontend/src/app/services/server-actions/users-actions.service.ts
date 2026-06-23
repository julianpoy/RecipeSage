import { Injectable } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import {
  ActionsBase,
  RefreshableSignal,
  RouterInputs,
  RouterOutputs,
} from "./actions-base";
import { getKvStoreEntry, KVStoreKeys } from "../../utils/localDb";

@Injectable({
  providedIn: "root",
})
export class UsersActionsService extends ActionsBase {
  getMe(
    errorHandlers?: ErrorHandlers,
  ): RefreshableSignal<RouterOutputs["users"]["getMe"]> {
    return this.executeQueryAsSignal(
      () => this.trpc.users.getMe.query(),
      async () => getKvStoreEntry(KVStoreKeys.MyUserProfile),
      errorHandlers,
    );
  }

  getMyFriends(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["getMyFriends"] | undefined> {
    return this.executeQuery(
      () => this.trpc.users.getMyFriends.query(),
      async () => getKvStoreEntry(KVStoreKeys.MyFriends),
      errorHandlers,
    );
  }

  getMyStats(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["getMyStats"] | undefined> {
    return this.executeQuery(
      () => this.trpc.users.getMyStats.query(),
      async () => getKvStoreEntry(KVStoreKeys.MyStats),
      errorHandlers,
    );
  }

  login(
    input: RouterInputs["users"]["login"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["login"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.login.mutate(input),
      errorHandlers,
    );
  }

  register(
    input: RouterInputs["users"]["register"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["register"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.register.mutate(input),
      errorHandlers,
    );
  }

  logout(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["logout"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.logout.mutate(),
      errorHandlers,
    );
  }

  saveFCMToken(
    input: RouterInputs["users"]["saveFCMToken"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["saveFCMToken"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.saveFCMToken.mutate(input),
      errorHandlers,
    );
  }

  removeFCMToken(
    input: RouterInputs["users"]["removeFCMToken"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["removeFCMToken"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.removeFCMToken.mutate(input),
      errorHandlers,
    );
  }

  forgotPassword(
    input: RouterInputs["users"]["forgotPassword"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["forgotPassword"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.forgotPassword.mutate(input),
      errorHandlers,
    );
  }

  signInWithGoogle(
    input: RouterInputs["users"]["signInWithGoogle"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["signInWithGoogle"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.signInWithGoogle.mutate(input),
      errorHandlers,
    );
  }

  signInWithDesktopGoogle(
    input: RouterInputs["users"]["signInWithDesktopGoogle"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["signInWithDesktopGoogle"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.signInWithDesktopGoogle.mutate(input),
      errorHandlers,
    );
  }

  updateUser(
    input: RouterInputs["users"]["updateUser"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["updateUser"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.updateUser.mutate(input),
      errorHandlers,
    );
  }

  deleteUser(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["deleteUser"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.deleteUser.mutate(),
      errorHandlers,
    );
  }

  validateSession(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["validateSession"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.validateSession.query(),
      errorHandlers,
    );
  }

  getPreferences(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["getPreferences"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.getPreferences.query(),
      errorHandlers,
    );
  }

  updatePreferences(
    input: RouterInputs["users"]["updatePreferences"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["updatePreferences"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.updatePreferences.mutate(input),
      errorHandlers,
    );
  }

  getMyCreditUsage(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["getMyCreditUsage"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.getMyCreditUsage.query(),
      errorHandlers,
    );
  }

  getMyCapabilities(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["getMyCapabilities"] | undefined> {
    return this.executeQuery(
      () => this.trpc.users.getMyCapabilities.query(),
      async () => getKvStoreEntry(KVStoreKeys.MyCapabilities),
      errorHandlers,
    );
  }

  getUserProfilesById(
    input: RouterInputs["users"]["getUserProfilesById"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["getUserProfilesById"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.getUserProfilesById.query(input),
      errorHandlers,
    );
  }

  getUserProfileByHandle(
    input: RouterInputs["users"]["getUserProfileByHandle"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["getUserProfileByHandle"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.getUserProfileByHandle.query(input),
      errorHandlers,
    );
  }

  getUserProfileByEmail(
    input: RouterInputs["users"]["getUserProfileByEmail"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["getUserProfileByEmail"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.getUserProfileByEmail.query(input),
      errorHandlers,
    );
  }

  getVisibleUserProfileItems(
    input: RouterInputs["users"]["getVisibleUserProfileItems"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["getVisibleUserProfileItems"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.getVisibleUserProfileItems.query(input),
      errorHandlers,
    );
  }

  getIsHandleAvailable(
    input: RouterInputs["users"]["getIsHandleAvailable"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["getIsHandleAvailable"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.getIsHandleAvailable.query(input),
      errorHandlers,
    );
  }

  updateMyProfile(
    input: RouterInputs["users"]["updateMyProfile"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["updateMyProfile"] | undefined> {
    return this.passThrough(
      () => this.trpc.users.updateMyProfile.mutate(input),
      errorHandlers,
    );
  }

  createFriendship(
    input: RouterInputs["users"]["createFriendship"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["createFriendship"] | undefined> {
    return this.executeMutation(
      () => this.trpc.users.createFriendship.mutate(input),
      () => {
        void this.syncService.syncMyFriends();
      },
      errorHandlers,
    );
  }

  deleteFriendship(
    input: RouterInputs["users"]["deleteFriendship"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["users"]["deleteFriendship"] | undefined> {
    return this.executeMutation(
      () => this.trpc.users.deleteFriendship.mutate(input),
      () => {
        void this.syncService.syncMyFriends();
      },
      errorHandlers,
    );
  }
}
