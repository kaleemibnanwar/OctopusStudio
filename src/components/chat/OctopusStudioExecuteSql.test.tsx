import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OctopusStudioExecuteSql } from "./OctopusStudioExecuteSql";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        changesDatabaseSchema: "Changes database schema",
        destructiveDataChange: "Destructive data change",
      })[key] ?? key,
  }),
}));

describe("OctopusStudioExecuteSql", () => {
  it("shows a schema mutation indicator for DDL", () => {
    render(
      <OctopusStudioExecuteSql>
        CREATE TABLE users (id bigint);
      </OctopusStudioExecuteSql>,
    );

    expect(screen.getByText("Changes database schema")).toBeTruthy();
  });

  it("extracts SQL text from string children mixed with React nodes", () => {
    render(
      <OctopusStudioExecuteSql>
        {"CREATE "}
        <span>ignored</span>
        {"TABLE users (id bigint);"}
      </OctopusStudioExecuteSql>,
    );

    expect(screen.getByText("Changes database schema")).toBeTruthy();
  });

  it("omits the schema mutation indicator for ordinary queries", () => {
    render(
      <OctopusStudioExecuteSql>SELECT * FROM users;</OctopusStudioExecuteSql>,
    );

    expect(screen.queryByText("Changes database schema")).toBeNull();
  });

  it("shows a destructive data indicator for deletes", () => {
    render(
      <OctopusStudioExecuteSql>
        DELETE FROM users WHERE id = 1;
      </OctopusStudioExecuteSql>,
    );

    expect(screen.getByText("Destructive data change")).toBeTruthy();
  });
});
