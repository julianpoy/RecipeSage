import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export async function downloadBlobpartsAsFile(args: {
  data: BlobPart[];
  mimetype: string;
  filename: string;
}) {
  const blob = new Blob(args.data, {
    type: args.mimetype,
  });

  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);

    await Filesystem.writeFile({
      path: args.filename,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });

    const { uri } = await Filesystem.getUri({
      path: args.filename,
      directory: Directory.Cache,
    });

    await Share.share({ files: [uri] });
    return;
  }

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = args.filename;
  a.click();

  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read blob as data URL"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}
