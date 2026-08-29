import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { WorkersPage } from "../components/workers/WorkersPage";

export const workersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workers",
  component: WorkersPage,
});
