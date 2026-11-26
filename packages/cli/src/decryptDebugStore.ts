import { readFile, writeFile } from "fs/promises";

import type { EncryptedOutput } from "@recipesage/util/shared";
import { decryptWithRSAKey } from "@recipesage/util/server/general";

const LEGACY_DEBUG_DUMP_KEY_ID = 1;

export const decryptDebugStore = async (args: {
  input: string;
  output: string;
}) => {
  const encryptedJsonString = await readFile(args.input, "utf8");
  if (!encryptedJsonString) {
    throw new Error("It looks like the input json file does not exist");
  }

  const encryptedDump: EncryptedOutput = JSON.parse(encryptedJsonString);

  const keyId = encryptedDump.kid ?? LEGACY_DEBUG_DUMP_KEY_ID;
  const privateKeyEnvName = `DEBUG_DUMP_PRIVATE_KEY_${keyId}`;
  const privateKey = process.env[privateKeyEnvName];
  if (!privateKey) {
    throw new Error(
      `It looks like env.${privateKeyEnvName} isn't present. You'll need that to decrypt the dump`,
    );
  }

  const decryptedBlob = decryptWithRSAKey(encryptedDump, privateKey);

  const text = decryptedBlob.toString();

  const prettyJson = JSON.stringify(JSON.parse(text), undefined, 2);

  await writeFile(args.output, prettyJson);

  console.log("Done!");
};
