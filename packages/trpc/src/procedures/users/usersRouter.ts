import { router } from "../../trpc";
import { blockUser } from "./blockUser";
import { createFriendship } from "./createFriendship";
import { deleteFriendship } from "./deleteFriendship";
import { deleteUser } from "./deleteUser";
import { forgotPassword } from "./forgotPassword";
import { getIsHandleAvailable } from "./getIsHandleAvailable";
import { getMe } from "./getMe";
import { getMyBlockedUsers } from "./getMyBlockedUsers";
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
import { reportUser } from "./reportUser";
import { saveFCMToken } from "./saveFCMToken";
import { signInWithGoogle } from "./signInWithGoogle";
import { signInWithDesktopGoogle } from "./signInWithDesktopGoogle";
import { signInWithRedirectGoogle } from "./signInWithRedirectGoogle";
import { signInWithApple } from "./signInWithApple";
import { signInWithRedirectApple } from "./signInWithRedirectApple";
import { unblockUser } from "./unblockUser";
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
  getMyBlockedUsers,
  blockUser,
  unblockUser,
  reportUser,
  updateMyProfile,
  updatePreferences,
  getPreferences,
  signInWithGoogle,
  signInWithDesktopGoogle,
  signInWithRedirectGoogle,
  signInWithApple,
  signInWithRedirectApple,
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
