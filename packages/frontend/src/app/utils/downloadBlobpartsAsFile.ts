export function downloadBlobpartsAsFile(args: {
  data: BlobPart[];
  mimetype: string;
  filename: string;
}) {
  const blob = new Blob(args.data, {
    type: args.mimetype,
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = args.filename;
  a.click();

  URL.revokeObjectURL(url);
}
