import "server-only";

import { fetchBffPage } from "@/server/bff-pages/client";

import { type DashboardPage, dashboardPageSchema } from "../schemas/dashboard.schema";

export function fetchDashboard(language: string): Promise<DashboardPage> {
  return fetchBffPage("dashboard.get", "/pages/dashboard", dashboardPageSchema, { language });
}
