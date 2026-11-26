import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import {
  type DocumentsPage,
  documentsPageSchema,
  type PanelSubject,
  parseHoldReason,
  parseUploadForm,
} from "../schemas/documents.schema";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The documents filed under a building or a unit (FR-DOC-01). */
export function fetchDocuments(subjectType: PanelSubject, subjectId: string, language: string): Promise<DocumentsPage> {
  return fetchBffPage("documents.list", "/pages/documents", documentsPageSchema, {
    language,
    query: { subjectType, subjectId },
  });
}

export type DocumentOutcome =
  | { status: "done" }
  | { status: "link"; url: string }
  | { status: "invalid"; reason?: "file" | "tooLarge" | "category" | "reason" | "id" }
  | { status: "refused"; message: string | undefined };

async function relay(operation: string, path: `/actions/${string}`, body: unknown, language: string) {
  const result = await postBffAction(operation, path, body, language);
  return result;
}

export async function uploadDocument(
  subjectType: PanelSubject,
  subjectId: string,
  raw: FormData,
  language: string,
): Promise<DocumentOutcome> {
  if (!ID.test(subjectId)) return { status: "invalid", reason: "id" };
  const parsed = parseUploadForm(subjectType, subjectId, raw);
  if (!parsed.ok) return { status: "invalid", reason: parsed.reason };
  const result = await relay("documents.upload", "/actions/upload-document", parsed.form, language);
  return result.ok ? { status: "done" } : { status: "refused", message: result.message };
}

export async function changeSharing(documentId: string, share: boolean, language: string): Promise<DocumentOutcome> {
  if (!ID.test(documentId)) return { status: "invalid", reason: "id" };
  const path = share ? `/actions/share-document/${documentId}` : `/actions/unshare-document/${documentId}`;
  const result = await relay(
    share ? "documents.share" : "documents.unshare",
    path as `/actions/${string}`,
    {},
    language,
  );
  return result.ok ? { status: "done" } : { status: "refused", message: result.message };
}

export async function downloadLink(documentId: string, language: string): Promise<DocumentOutcome> {
  if (!ID.test(documentId)) return { status: "invalid", reason: "id" };
  const result = await relay("documents.download", `/actions/document-download-url/${documentId}`, {}, language);
  if (!result.ok) return { status: "refused", message: result.message };
  const url = (result.body as { url?: unknown }).url;
  return typeof url === "string" ? { status: "link", url } : { status: "refused", message: undefined };
}

export async function placeHold(
  subjectType: PanelSubject,
  subjectId: string,
  raw: FormData,
  language: string,
): Promise<DocumentOutcome> {
  const reason = parseHoldReason(raw);
  if (!ID.test(subjectId) || reason === null) return { status: "invalid", reason: reason === null ? "reason" : "id" };
  const result = await relay(
    "documents.place-hold",
    "/actions/place-legal-hold",
    { subjectType, subjectId, reason },
    language,
  );
  return result.ok ? { status: "done" } : { status: "refused", message: result.message };
}

export async function liftHold(holdId: string, language: string): Promise<DocumentOutcome> {
  if (!ID.test(holdId)) return { status: "invalid", reason: "id" };
  const result = await relay("documents.lift-hold", `/actions/lift-legal-hold/${holdId}`, {}, language);
  return result.ok ? { status: "done" } : { status: "refused", message: result.message };
}
