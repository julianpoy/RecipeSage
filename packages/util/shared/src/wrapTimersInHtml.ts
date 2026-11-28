import { findTimersInText } from "./findTimersInText";
import type { ParsedTimer } from "./parsers";

interface VisibleChar {
  start: number;
  end: number;
}

interface HtmlRange {
  start: number;
  end: number;
}

const VOID_ELEMENTS = new Set(["br", "hr", "img", "input", "source", "wbr"]);

const tagRegexp = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
const singleTagRegexp = /^<\/?[a-zA-Z][^>]*>$/;
const tagStartRegexp = /<[a-zA-Z/!]/y;
const entityRegexp = /&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/y;
const NON_BREAKING_SPACE_ENTITIES = new Set(["&nbsp;", "&#160;", "&#xa0;"]);

const isTagStart = (html: string, position: number): boolean => {
  tagStartRegexp.lastIndex = position;
  return tagStartRegexp.test(html);
};

const readVisibleText = (
  html: string,
): { text: string; chars: VisibleChar[] } => {
  let text = "";
  const chars: VisibleChar[] = [];

  let position = 0;
  while (position < html.length) {
    if (html[position] === "<" && isTagStart(html, position)) {
      const tagEnd = html.indexOf(">", position);
      if (tagEnd === -1) break;
      position = tagEnd + 1;
      continue;
    }

    if (html[position] === "&") {
      entityRegexp.lastIndex = position;
      const entityMatch = entityRegexp.exec(html);
      if (entityMatch) {
        const entity = entityMatch[0];
        text += NON_BREAKING_SPACE_ENTITIES.has(entity.toLowerCase())
          ? " "
          : "&";
        chars.push({ start: position, end: position + entity.length });
        position += entity.length;
        continue;
      }
    }

    text += html[position];
    chars.push({ start: position, end: position + 1 });
    position++;
  }

  return { text, chars };
};

const isBalancedHtml = (fragment: string): boolean => {
  const openTags: string[] = [];

  for (const [, closing, rawName, selfClosing] of fragment.matchAll(
    tagRegexp,
  )) {
    const name = rawName.toLowerCase();
    if (selfClosing || VOID_ELEMENTS.has(name)) continue;
    if (!closing) {
      openTags.push(name);
      continue;
    }
    if (openTags.pop() !== name) return false;
  }

  return openTags.length === 0;
};

const getPossibleWrapStarts = (
  html: string,
  position: number,
  limit: number,
): number[] => {
  const starts = [position];

  let current = position;
  while (html.charAt(current - 1) === ">") {
    const tagStart = html.lastIndexOf("<", current - 1);
    if (tagStart < limit) break;
    if (!singleTagRegexp.test(html.slice(tagStart, current))) break;
    current = tagStart;
    starts.push(current);
  }

  return starts;
};

const getPossibleWrapEnds = (
  html: string,
  position: number,
  limit: number,
): number[] => {
  const ends = [position];

  let current = position;
  while (html.charAt(current) === "<" && isTagStart(html, current)) {
    const tagEnd = html.indexOf(">", current);
    if (tagEnd === -1 || tagEnd >= limit) break;
    current = tagEnd + 1;
    ends.push(current);
  }

  return ends;
};

const findBalancedRange = (
  html: string,
  starts: number[],
  ends: number[],
): HtmlRange | null => {
  const maxExpansion = starts.length + ends.length - 2;

  for (let expansion = 0; expansion <= maxExpansion; expansion++) {
    for (let startIdx = 0; startIdx <= expansion; startIdx++) {
      const endIdx = expansion - startIdx;
      if (startIdx >= starts.length || endIdx >= ends.length) continue;

      const range = { start: starts[startIdx], end: ends[endIdx] };
      if (isBalancedHtml(html.slice(range.start, range.end))) return range;
    }
  }

  return null;
};

export const wrapTimersInHtml = (
  html: string,
  className: string,
): { html: string; timers: ParsedTimer[] } => {
  const { text, chars } = readVisibleText(html);
  const matches = findTimersInText(text);

  const timers: ParsedTimer[] = [];
  let output = "";
  let cursor = 0;

  matches.forEach((match, idx) => {
    const nextMatch = matches.at(idx + 1);
    const startLimit = cursor;
    const endLimit = nextMatch ? chars[nextMatch.start].start : html.length;

    const range = findBalancedRange(
      html,
      getPossibleWrapStarts(html, chars[match.start].start, startLimit),
      getPossibleWrapEnds(html, chars[match.end - 1].end, endLimit),
    );
    if (!range) return;

    output += html.slice(cursor, range.start);
    output += `<span class="${className}">`;
    output += html.slice(range.start, range.end);
    output += "</span>";
    cursor = range.end;

    timers.push({
      seconds: match.seconds,
      text: text.slice(match.start, match.end),
    });
  });

  output += html.slice(cursor);

  return { html: output, timers };
};
