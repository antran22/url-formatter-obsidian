import { describe, it, expect } from "vitest";
import { isInLink } from "./selection";

function parseTestCase(stateRepresentation: string) {
  const cursorPos = stateRepresentation.indexOf("|");
  const line =
    stateRepresentation.slice(0, cursorPos) +
    stateRepresentation.slice(cursorPos + 1);

  return { line, cursorPos };
}

describe("isInLink", () => {
  const testCases: { repr: string; expected: boolean; desc?: string }[] = [
    // Markdown links
    {
      repr: "[text](http://example.com|)",
      expected: true,
      desc: "markdown: inside URL",
    },
    { repr: "[text](|url)", expected: true, desc: "markdown: start of URL" },
    { repr: "[text](url|)", expected: true, desc: "markdown: end of URL" },
    { repr: "|[text](url)", expected: false, desc: "markdown: before link" },
    { repr: "[te|xt](url)", expected: true, desc: "markdown: in link text" },
    { repr: "plain |text", expected: false, desc: "no link exists" },
    { repr: "some (te|xt) here", expected: false, desc: "standalone parens" },
    {
      repr: "[text](url) | [text](url)",
      expected: false,
      desc: "markdown: in between links",
    },
    {
      repr: "[text](url)|",
      expected: false,
      desc: "markdown: after closing paren",
    },

    // Wikilinks
    { repr: "[[no|te]]", expected: true, desc: "wikilink: inside content" },
    { repr: "[[|note]]", expected: true, desc: "wikilink: start of content" },
    { repr: "[[note|]]", expected: true, desc: "wikilink: end of content" },
    { repr: "|[[note]]", expected: false, desc: "wikilink: before" },
    { repr: "[[note]]|", expected: false, desc: "wikilink: after" },
    { repr: "[no|te]", expected: false, desc: "single bracket" },
    {
      repr: "text [[no|te]]",
      expected: true,
      desc: "wikilink: at end of line",
    },
    {
      repr: "[[note]] | [[note]]",
      expected: false,
      desc: "wikilink: in between links",
    },
    {
      repr: "[[no|te]] more text",
      expected: true,
      desc: "wikilink: at start of line",
    },

    // Mixed scenarios
    {
      repr: "[[note]] | [text](http://example.com)",
      expected: false,
      desc: "mixed: in between wikilink and markdown",
    },
    {
      repr: "[text](http://example.com) | [[note]]",
      expected: false,
      desc: "mixed: in between markdown and wikilink",
    },
  ];

  it.each(testCases)("$desc", ({ repr, expected }) => {
    const { line, cursorPos } = parseTestCase(repr);
    expect(isInLink(line, cursorPos)).toBe(expected);
  });
});

