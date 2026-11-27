import { fetchImportErrorsCsv } from "@/features/imports/server/imports.csv";

/** The rows of one import that were not imported, as a CSV for the landlord who owns it. */
export async function GET(request: Request): Promise<Response> {
  return fetchImportErrorsCsv(new URL(request.url).searchParams);
}
