import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import TasksPage from "../pages/tasks";

export const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TasksPage,
});
