import { androidpublisher, auth } from "@googleapis/androidpublisher";
import { config } from "../../general/config";

let publisher: ReturnType<typeof androidpublisher> | undefined;

export const getGooglePublisher = () => {
  if (publisher) {
    return publisher;
  }

  const googleAuth = new auth.GoogleAuth({
    credentials: {
      client_email: config.google.iap.clientEmail,
      private_key: config.google.iap.privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  publisher = androidpublisher({ version: "v3", auth: googleAuth });

  return publisher;
};
