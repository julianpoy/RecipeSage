import { router } from "../../trpc";
import { createFriendship } from "./createFriendship";
import { deleteFriendship } from "./deleteFriendship";
import { deleteUser } from "./deleteUser";
import { forgotPassword } from "./forgotPassword";
import { getIsHandleAvailable } from "./getIsHandleAvailable";
import { getMe } from "./getMe";
import { getMyCapabilities } from "./getMyCapabilities";
import { getMyCreditUsage } from "./getMyCreditUsage";
import { getMyFriends } from "./getMyFriends";
import { getMyStats } from "./getMyStats";
import { getPreferences } from "./getPreferences";
import { getUserProfileByEmail } from "./getUserProfileByEmail";
import { getUserProfileByHandle } from "./getUserProfileByHandle";
import { getVisibleUserProfileItems } from "./getVisibleUserProfileItems";
import { getUserProfilesById } from "./getUserProfilesById";
import { login } from "./login";
import { logout } from "./logout";
import { register } from "./register";
import { removeFCMToken } from "./removeFCMToken";
import { saveFCMToken } from "./saveFCMToken";
import { signInWithGoogle } from "./signInWithGoogle";
import { signInWithDesktopGoogle } from "./signInWithDesktopGoogle";
import { updateMyProfile } from "./updateMyProfile";
import { updatePreferences } from "./updatePreferences";
import { updateUser } from "./updateUser";
import { validateSession } from "./validateSession";

export const usersRouter = router({
  getMe,
  getMyStats,
  getMyCapabilities,
  getMyCreditUsage,
  getMyFriends,
  getUserProfileByEmail,
  getUserProfileByHandle,
  getVisibleUserProfileItems,
  getUserProfilesById,
  getIsHandleAvailable,
  createFriendship,
  deleteFriendship,
  updateMyProfile,
  updatePreferences,
  getPreferences,
  signInWithGoogle,
  signInWithDesktopGoogle,
  login,
  logout,
  register,
  saveFCMToken,
  removeFCMToken,
  forgotPassword,
  deleteUser,
  updateUser,
  validateSession,
});
