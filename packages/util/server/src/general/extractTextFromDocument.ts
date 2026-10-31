import { spawn } from "node:child_process";
import { mkdtempDisposable, writeFile } from "node:fs/promises";
import path from "node:path";

export class ExtractTextFromDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractTextFromDocumentError";
  }
}

export class ExtractTextFromDocumentTimeoutError extends ExtractTextFromDocumentError {
  constructor(message: string) {
    super(message);
    this.name = "ExtractTextFromDocumentTimeoutError";
  }
}

export class UnsupportedDocumentFormatError extends ExtractTextFromDocumentError {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedDocumentFormatError";
  }
}

const MAX_EXTRACT_TIME = 30000;

const PANDOC_FORMAT_BY_EXTENSION: Record<string, string> = {
  ".rtf": "rtf",
  ".odt": "odt",
  ".docx": "docx",
  ".md": "gfm",
  ".markdown": "gfm",
  ".html": "html",
  ".htm": "html",
  ".org": "org",
};

const PANDOC_FORMATS_WITH_FRONT_MATTER = new Set(["gfm", "org"]);

const FRONT_MATTER_TO_TEXT_LUA_FILTER = `
local function metadataValueToText(value)
  local valueType = pandoc.utils.type(value)
  if valueType == "List" then
    local items = {}
    for _, item in ipairs(value) do
      table.insert(items, metadataValueToText(item))
    end
    return table.concat(items, ", ")
  end
  if valueType == "table" then
    local fields = {}
    for key, item in pairs(value) do
      table.insert(fields, key .. ": " .. metadataValueToText(item))
    end
    table.sort(fields)
    return table.concat(fields, ", ")
  end
  return pandoc.utils.stringify(value)
end

function Pandoc(doc)
  local keys = {}
  for key in pairs(doc.meta) do
    if key ~= "title" then
      table.insert(keys, key)
    end
  end
  table.sort(keys)
  if doc.meta.title then
    table.insert(keys, 1, "title")
  end
  local blocks = pandoc.Blocks({})
  for _, key in ipairs(keys) do
    blocks:insert(pandoc.Para(key .. ": " .. metadataValueToText(doc.meta[key])))
  end
  blocks:extend(doc.blocks)
  doc.blocks = blocks
  return doc
end
`;

const DOCX_READER_KEEPING_METADATA_PARAGRAPHS_LUA = `
local METADATA_STYLE_NAMES = { title = true, subtitle = true, author = true, date = true, abstract = true }

local function renameMetadataStyle(openingTag, content)
  local name = content:match([=[<w:name%s+w:val=["']([^"']*)["']]=])
  if name and METADATA_STYLE_NAMES[name:lower()] then
    content = content:gsub([[(<w:name%s+w:val=["'])[^"']*]], "%1" .. name .. " Text", 1)
  elseif not name then
    local styleId = openingTag:match([=[w:styleId=["']([^"']*)["']]=])
    if styleId and METADATA_STYLE_NAMES[styleId:lower()] then
      content = '<w:name w:val="' .. styleId .. ' Text"/>' .. content
    end
  end
  return openingTag .. content .. "</w:style>"
end

function ByteStringReader(input, opts)
  local entries = {}
  for _, entry in ipairs(pandoc.zip.Archive(input).entries) do
    if entry.path == "word/styles.xml" then
      local styles = entry:contents():gsub("(<w:style%s[^>]-[^/]>)(.-)</w:style>", renameMetadataStyle)
      entry = pandoc.zip.Entry(entry.path, styles, entry.modtime)
    end
    table.insert(entries, entry)
  end
  return pandoc.read(pandoc.zip.Archive(entries):bytestring(), "docx", opts)
end
`;

export const isExtractableDocumentExtension = (extension: string): boolean => {
  return extension.toLowerCase() in PANDOC_FORMAT_BY_EXTENSION;
};

export const extractTextFromDocument = async (
  filePath: string,
): Promise<string> => {
  const extension = path.extname(filePath).toLowerCase();
  const pandocFormat = PANDOC_FORMAT_BY_EXTENSION[extension];
  if (!pandocFormat) {
    throw new UnsupportedDocumentFormatError(
      `Unsupported document extension: ${extension}`,
    );
  }

  const usesDocxReader = pandocFormat === "docx";
  const usesFrontMatterFilter =
    PANDOC_FORMATS_WITH_FRONT_MATTER.has(pandocFormat);
  await using pandocFilesDir =
    usesDocxReader || usesFrontMatterFilter
      ? await mkdtempDisposable("/tmp/")
      : null;

  let pandocReader = pandocFormat;
  const pandocFilterArgs: string[] = [];
  if (pandocFilesDir && usesDocxReader) {
    pandocReader = path.join(pandocFilesDir.path, "docxReader.lua");
    await writeFile(pandocReader, DOCX_READER_KEEPING_METADATA_PARAGRAPHS_LUA);
  }
  if (pandocFilesDir && usesFrontMatterFilter) {
    const filterPath = path.join(pandocFilesDir.path, "frontMatterFilter.lua");
    await writeFile(filterPath, FRONT_MATTER_TO_TEXT_LUA_FILTER);
    pandocFilterArgs.push(`--lua-filter=${filterPath}`);
  }

  return await new Promise((resolve, reject) => {
    const proc = spawn("pandoc", [
      "-f",
      pandocReader,
      "-t",
      "plain",
      ...pandocFilterArgs,
      "--",
      filePath,
    ]);

    let output = "";
    let errorOutput = "";

    const timeout = setTimeout(() => {
      proc.kill();
      reject(
        new ExtractTextFromDocumentTimeoutError(
          "Timeout while waiting for pandoc",
        ),
      );
    }, MAX_EXTRACT_TIME);

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(
        new ExtractTextFromDocumentError(
          `Failed to spawn pandoc: ${err.message}`,
        ),
      );
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(output);
      } else {
        reject(
          new ExtractTextFromDocumentError(
            `pandoc exited with code ${code}: ${errorOutput || output}`,
          ),
        );
      }
    });
  });
};
