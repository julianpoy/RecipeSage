import type { Content, TableCell } from "pdfmake/interfaces";

const CJK_CHARACTERS_REGEX =
  /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u30ff\u3130-\u318f\u3190-\u31ff\u3200-\u33ff\ufe30-\ufe4f\uff00-\uffef]+)/u;

const splitCJKParts = (text: string) =>
  text
    .split(CJK_CHARACTERS_REGEX)
    .map((part, index) => ({ text: part, isCJK: index % 2 === 1 }))
    .filter((part) => part.text !== "");

const applyCJKPDFFontToInlines = (
  inlines: Content,
  cjkFont: string,
): Content[] => {
  if (typeof inlines === "string") {
    if (!CJK_CHARACTERS_REGEX.test(inlines)) return [inlines];
    return splitCJKParts(inlines).map((part) =>
      part.isCJK ? { text: part.text, font: cjkFont } : part.text,
    );
  }
  if (typeof inlines === "number") return [inlines];
  if (Array.isArray(inlines)) {
    return inlines.flatMap((inline) =>
      applyCJKPDFFontToInlines(inline, cjkFont),
    );
  }
  if (inlines.text === undefined) return [inlines];

  const text = inlines.text;
  if (typeof text !== "string") {
    return [{ ...inlines, text: applyCJKPDFFontToInlines(text, cjkFont) }];
  }
  if (!CJK_CHARACTERS_REGEX.test(text)) return [inlines];
  return splitCJKParts(text).map((part) =>
    part.isCJK
      ? { ...inlines, text: part.text, font: cjkFont }
      : { ...inlines, text: part.text },
  );
};

const applyCJKPDFFontToTableCell = (
  cell: TableCell,
  cjkFont: string,
): TableCell => {
  if (
    typeof cell === "string" ||
    typeof cell === "number" ||
    Array.isArray(cell)
  ) {
    return applyCJKPDFFont(cell, cjkFont);
  }
  if (
    cell.text !== undefined ||
    cell.stack !== undefined ||
    cell.columns !== undefined ||
    cell.ul !== undefined ||
    cell.ol !== undefined ||
    cell.table !== undefined
  ) {
    return applyCJKPDFFont(cell, cjkFont);
  }
  return cell;
};

export const applyCJKPDFFont = (content: Content, cjkFont: string): Content => {
  if (typeof content === "string") {
    if (!CJK_CHARACTERS_REGEX.test(content)) return content;
    return { text: applyCJKPDFFontToInlines(content, cjkFont) };
  }
  if (typeof content === "number") return content;
  if (Array.isArray(content)) {
    return content.map((item) => applyCJKPDFFont(item, cjkFont));
  }

  if (content.text !== undefined) {
    const text = content.text;
    if (typeof text === "string" && !CJK_CHARACTERS_REGEX.test(text))
      return content;
    return { ...content, text: applyCJKPDFFontToInlines(text, cjkFont) };
  }
  if (content.stack !== undefined) {
    return {
      ...content,
      stack: content.stack.map((item) => applyCJKPDFFont(item, cjkFont)),
    };
  }
  if (content.columns !== undefined) {
    return {
      ...content,
      columns: content.columns.map((item) => applyCJKPDFFont(item, cjkFont)),
    };
  }
  if (content.ul !== undefined) {
    return {
      ...content,
      ul: content.ul.map((item) => applyCJKPDFFont(item, cjkFont)),
    };
  }
  if (content.ol !== undefined) {
    return {
      ...content,
      ol: content.ol.map((item) => applyCJKPDFFont(item, cjkFont)),
    };
  }
  if (content.table !== undefined) {
    return {
      ...content,
      table: {
        ...content.table,
        body: content.table.body.map((row) =>
          row.map((cell) => applyCJKPDFFontToTableCell(cell, cjkFont)),
        ),
      },
    };
  }
  if (content.toc !== undefined && content.toc.title !== undefined) {
    return {
      ...content,
      toc: {
        ...content.toc,
        title: applyCJKPDFFont(content.toc.title, cjkFont),
      },
    };
  }

  return content;
};
