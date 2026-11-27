import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import {
  ID,
  type ImportJob,
  type ImportRefusalKey,
  importJobSchema,
  importListSchema,
  importRefusalKey,
  parseMapping,
  parseUpload,
  type UploadReason,
} from "../schemas/imports.schema";

export async function fetchImports(language: string) {
  return fetchBffPage("imports.list", "/pages/imports", importListSchema, { language });
}

export async function fetchImport(jobId: string, language: string) {
  return fetchBffPage("imports.one", `/pages/imports/${encodeURIComponent(jobId)}`, importJobSchema, { language });
}

export type ImportOutcome =
  | { status: "done"; job: ImportJob | undefined }
  | { status: "invalid"; reason: "id" | UploadReason }
  | { status: "refused"; reason: ImportRefusalKey | undefined; message: string | undefined };

async function send(operation: string, path: `/actions/${string}`, body: unknown, language: string) {
  const result = await postBffAction(operation, path, body, language);
  if (!result.ok) {
    return { status: "refused", reason: importRefusalKey(result.code), message: result.message } as const;
  }
  const job = importJobSchema.safeParse(result.body);
  return { status: "done", job: job.success ? job.data : undefined } as const;
}

/** Sends the CSV file; the core reads it, proposes the mapping and keeps the text until the import is done. */
export async function uploadImport(form: FormData, language: string): Promise<ImportOutcome> {
  const parsed = await parseUpload(form);
  if (!parsed.ok) return { status: "invalid", reason: parsed.reason };
  return send("imports.upload", "/actions/upload-import-file", parsed.body, language);
}

/** Saves the mapping; the core checks every row with the rules of manual entry. */
export async function saveImportMapping(jobId: string, form: FormData, language: string): Promise<ImportOutcome> {
  if (!ID.test(jobId)) return { status: "invalid", reason: "id" };
  return send("imports.mapping", `/actions/save-import-mapping/${jobId}`, { mapping: parseMapping(form) }, language);
}

export async function runImport(jobId: string, language: string): Promise<ImportOutcome> {
  if (!ID.test(jobId)) return { status: "invalid", reason: "id" };
  return send("imports.run", `/actions/run-import/${jobId}`, {}, language);
}
