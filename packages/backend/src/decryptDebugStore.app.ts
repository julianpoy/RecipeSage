import { readFile, writeFile } from "fs/promises";
import "./services/sentry-init";
import { program } from "commander";
import { decryptWithRSAKey } from "@recipesage/util/server/general";

program
  .requiredOption("--input <input>", "Input filename")
  .requiredOption("--output <output>", "Output filename")
  .parse(process.argv)
  .action((options) => {
    return run({
      input: options.input,
      output: options.output,
    }).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  });

const run = async (options: { input: string; output: string }) => {
  if (!process.env.DEBUG_DUMP_PRIVATE_KEY) {
    throw new Error(
      "It looks like env.DEBUG_DUMP_PRIVATE_KEY isn't present. You'll need that to decrypt the dump",
    );
  }

  console.log(options);
  const encryptedJsonString = await readFile(options.input, "utf8");
  if (!encryptedJsonString) {
    throw new Error("It looks like the input json file does not exist");
  }

  const decryptedBlob = decryptWithRSAKey(
    encryptedJsonString,
    process.env.DEBUG_DUMP_PRIVATE_KEY,
  );

  const text = decryptedBlob.toString();

  const prettyJson = JSON.stringify(JSON.parse(text), undefined, 2);

  await writeFile(options.output, prettyJson);

  console.log("Done!");

  process.exit(0);
};

process.on("SIGTERM", () => {
  console.log("RECEIVED SIGTERM - STOPPING JOB");
  process.exit(0);
});

program.parse(process.argv);
