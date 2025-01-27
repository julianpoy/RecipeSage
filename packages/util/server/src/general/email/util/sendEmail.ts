import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_REGION || "us-west-2";

const ENABLE = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY;

const ses = new SESClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

export const sendEmail = async (args: {
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  html: string;
  plain: string;
}) => {
  if (!ENABLE) return;

  const params: SendEmailCommandInput = {
    Destination: {
      CcAddresses: args.ccAddresses,
      ToAddresses: args.toAddresses,
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: args.html,
        },
        Text: {
          Charset: "UTF-8",
          Data: args.plain,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: args.subject,
      },
    },
    Source: '"RecipeSage" <noreply@recipesage.com>',
    ReplyToAddresses: ["julian@recipesage.com"],
  };

  await ses.send(
    new SendEmailCommand({
      ...params,
    }),
  );
};
