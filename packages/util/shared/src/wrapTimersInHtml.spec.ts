import { describe, it, expect } from "vitest";
import { wrapTimersInHtml } from "./wrapTimersInHtml";

const wrap = (html: string) => wrapTimersInHtml(html, "timer");

describe("wrapTimersInHtml", () => {
  it("wraps a time in plain text", () => {
    expect(wrap("Bake 10 minutes")).toEqual({
      html: 'Bake <span class="timer">10 minutes</span>',
      timers: [{ seconds: 600, text: "10 minutes" }],
    });
  });

  it("wraps each time in order", () => {
    expect(wrap("Bake 10 minutes, then rest 5 minutes")).toEqual({
      html: 'Bake <span class="timer">10 minutes</span>, then rest <span class="timer">5 minutes</span>',
      timers: [
        { seconds: 600, text: "10 minutes" },
        { seconds: 300, text: "5 minutes" },
      ],
    });
  });

  it("wraps a time inside a tag", () => {
    expect(wrap('Bake <b class="m">20 minutes</b>')).toEqual({
      html: 'Bake <b class="m"><span class="timer">20 minutes</span></b>',
      timers: [{ seconds: 1200, text: "20 minutes" }],
    });
  });

  it("includes a tag that the time starts in", () => {
    expect(wrap('Bake <b class="m">15</b> minutes')).toEqual({
      html: 'Bake <span class="timer"><b class="m">15</b> minutes</span>',
      timers: [{ seconds: 900, text: "15 minutes" }],
    });
  });

  it("includes a tag that the time ends in", () => {
    expect(wrap("Bake 1 hour <i>30 minutes</i> more")).toEqual({
      html: 'Bake <span class="timer">1 hour <i>30 minutes</i></span> more',
      timers: [{ seconds: 5400, text: "1 hour 30 minutes" }],
    });
  });

  it("skips a time that cannot be wrapped without breaking tags", () => {
    expect(wrap("<b>Bake 10</b> minutes and stir 5 minutes")).toEqual({
      html: '<b>Bake 10</b> minutes and stir <span class="timer">5 minutes</span>',
      timers: [{ seconds: 300, text: "5 minutes" }],
    });
  });

  it("includes a tag around the start of the time", () => {
    expect(wrap("Bake <b>10 min</b>utes")).toEqual({
      html: 'Bake <span class="timer"><b>10 min</b>utes</span>',
      timers: [{ seconds: 600, text: "10 minutes" }],
    });
  });

  it("reads a non-breaking space entity as a space", () => {
    expect(wrap("Bake 10&nbsp;minutes")).toEqual({
      html: 'Bake <span class="timer">10&nbsp;minutes</span>',
      timers: [{ seconds: 600, text: "10 minutes" }],
    });
  });

  it("does not match text inside tag attributes", () => {
    expect(wrap('<img src="10 minutes.png" alt="10 minutes">')).toEqual({
      html: '<img src="10 minutes.png" alt="10 minutes">',
      timers: [],
    });
  });

  it("returns the html unchanged when there are no times", () => {
    expect(wrap("Mix <b>2 cups</b> of flour")).toEqual({
      html: "Mix <b>2 cups</b> of flour",
      timers: [],
    });
  });
});
