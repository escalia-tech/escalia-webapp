import "server-only";

import { z } from "zod";

import { fetchBffPage } from "@/server/bff-pages/client";
import { getServerEnv } from "@/server/config/env";

const shellSchema = z.object({ user: z.object({ subject: z.string(), roles: z.array(z.string()) }) });

/**
 * The signed-in person's roles from the BFF shell (`GET /pages/shell`), for the menu only. Null when there is no BFF
 * (the labelled demo) or it did not answer: the menu then keeps its default, and every page still checks access on
 * the server.
 */
export async function fetchShellRoles(language: string): Promise<string[] | null> {
  if (!getServerEnv().bffBaseUrl) return null;
  try {
    const shell = await fetchBffPage("shell.get", "/pages/shell", shellSchema, { language });
    return shell.user.roles;
  } catch {
    return null;
  }
}
