import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OctopusStudioStateIndicator } from "./OctopusStudioCardPrimitives";

describe("OctopusStudioStateIndicator", () => {
  it("renders warning state with an amber indicator", () => {
    const { container } = render(
      <OctopusStudioStateIndicator
        state="warning"
        warningLabel="Needs attention"
      />,
    );

    expect(screen.getByText("Needs attention")).toBeTruthy();
    expect(container.querySelector(".text-amber-600")).toBeTruthy();
  });
});
