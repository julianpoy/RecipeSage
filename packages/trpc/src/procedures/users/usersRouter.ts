import { router } from "../../trpc";
import { deleteUser } from "./deleteUser";
import { forgotPassword } from "./forgotPassword";
import { getMe } from "./getMe";
import { getMyFriends } from "./getMyFriends";
import { getMyStats } from "./getMyStats";
import { getPreferences } from "./getPreferences";
import { getUserProfileByEmail } from "./getUserProfileByEmail";
import { getUserProfileByHandle } from "./getUserProfileByHandle";
import { getUserProfilesById } from "./getUserProfilesById";
import { login } from "./login";
import { register } from "./register";
import { signInWithGoogle } from "./signInWithGoogle";
import { updatePreferences } from "./updatePreferences";
import { updateUser } from "./updateUser";
import { validateSession } from "./validateSession";

export const usersRouter = router({
  getMe,
  getMyStats,
  getMyFriends,
  getUserProfileByEmail,
  getUserProfileByHandle,
  getUserProfilesById,
  updatePreferences,
  getPreferences,
  signInWithGoogle,
  login,
  register,
  forgotPassword,
  deleteUser,
  updateUser,
  validateSession,
});
