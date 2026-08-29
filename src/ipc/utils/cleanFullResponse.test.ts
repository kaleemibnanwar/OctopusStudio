import { cleanFullResponse } from "@/ipc/utils/cleanFullResponse";
import { describe, it, expect } from "vitest";

describe("cleanFullResponse", () => {
  it("should replace < characters in octopus-studio-write attributes", () => {
    const input = `<octopus-studio-write path="src/file.tsx" description="Testing <a> tags.">content</octopus-studio-write>`;
    const expected = `<octopus-studio-write path="src/file.tsx" description="Testing ＜a＞ tags.">content</octopus-studio-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should replace < characters in multiple attributes", () => {
    const input = `<octopus-studio-write path="src/<component>.tsx" description="Testing <div> tags.">content</octopus-studio-write>`;
    const expected = `<octopus-studio-write path="src/＜component＞.tsx" description="Testing ＜div＞ tags.">content</octopus-studio-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle multiple nested HTML tags in a single attribute", () => {
    const input = `<octopus-studio-write path="src/file.tsx" description="Testing <div> and <span> and <a> tags.">content</octopus-studio-write>`;
    const expected = `<octopus-studio-write path="src/file.tsx" description="Testing ＜div＞ and ＜span＞ and ＜a＞ tags.">content</octopus-studio-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle complex example with mixed content", () => {
    const input = `
      BEFORE TAG
  <octopus-studio-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use <a> tags.">
import React from 'react';
</octopus-studio-write>
AFTER TAG
    `;

    const expected = `
      BEFORE TAG
  <octopus-studio-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use ＜a＞ tags.">
import React from 'react';
</octopus-studio-write>
AFTER TAG
    `;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle other octopus-studio tag types", () => {
    const input = `<octopus-studio-rename from="src/<old>.tsx" to="src/<new>.tsx"></octopus-studio-rename>`;
    const expected = `<octopus-studio-rename from="src/＜old＞.tsx" to="src/＜new＞.tsx"></octopus-studio-rename>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle octopus-studio-delete tags", () => {
    const input = `<octopus-studio-delete path="src/<component>.tsx"></octopus-studio-delete>`;
    const expected = `<octopus-studio-delete path="src/＜component＞.tsx"></octopus-studio-delete>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should not affect content outside octopus-studio tags", () => {
    const input = `Some text with <regular> HTML tags. <octopus-studio-write path="test.tsx" description="With <nested> tags.">content</octopus-studio-write> More <html> here.`;
    const expected = `Some text with <regular> HTML tags. <octopus-studio-write path="test.tsx" description="With ＜nested＞ tags.">content</octopus-studio-write> More <html> here.`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle empty attributes", () => {
    const input = `<octopus-studio-write path="src/file.tsx">content</octopus-studio-write>`;
    const expected = `<octopus-studio-write path="src/file.tsx">content</octopus-studio-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle attributes without < characters", () => {
    const input = `<octopus-studio-write path="src/file.tsx" description="Normal description">content</octopus-studio-write>`;
    const expected = `<octopus-studio-write path="src/file.tsx" description="Normal description">content</octopus-studio-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });
});
