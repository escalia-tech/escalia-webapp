"use client";

import { useActionState, useTransition } from "react";

import { useFormatter, useTranslations } from "next-intl";

import { Callout } from "@/components/feedback/callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { CATEGORIES, type DocumentSummary, type DocumentsPage } from "../schemas/documents.schema";
import {
  type DocumentFormState,
  downloadAction,
  liftHoldAction,
  placeHoldAction,
  uploadDocumentAction,
} from "../server/documents.actions";

const megabytes = (bytes: number) => Math.max(1, Math.round(bytes / (1024 * 1024)));

function Outcome({ state }: { state: DocumentFormState }) {
  const t = useTranslations("documents");
  if (state === undefined) return null;
  if (state.status === "done") return <Callout tone="success">{t("done")}</Callout>;
  if (state.status === "invalid") return <Callout tone="danger">{t(`invalid.${state.reason ?? "file"}`)}</Callout>;
  if (state.status === "refused") return <Callout tone="danger">{state.message ?? t("refused")}</Callout>;
  return null;
}

function UploadForm({ page }: { page: DocumentsPage }) {
  const t = useTranslations("documents");
  const [state, action, pending] = useActionState<DocumentFormState, FormData>(
    uploadDocumentAction.bind(null, page.subjectType, page.subjectId),
    undefined,
  );
  return (
    <form action={action} className="grid gap-3">
      <div aria-live="polite">
        <Outcome state={state} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          {t("upload.file")}
          <input type="file" name="file" required accept="application/pdf,image/jpeg,image/png" />
        </label>
        <label className="grid gap-1 text-sm">
          {t("upload.category")}
          <select
            name="category"
            defaultValue="OTHER"
            className="border-input h-9 rounded-md border bg-transparent px-2"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          {t("upload.title")}
          <input name="title" maxLength={120} className="border-input h-9 rounded-md border bg-transparent px-2" />
        </label>
      </div>
      <p className="text-muted-foreground text-xs">{t("upload.hint")}</p>
      <div>
        <Button type="submit" disabled={pending}>
          {t("upload.submit")}
        </Button>
      </div>
    </form>
  );
}

function Row({ document }: { document: DocumentSummary }) {
  const t = useTranslations("documents");
  const format = useFormatter();
  const [pending, start] = useTransition();
  const download = () =>
    start(async () => {
      const outcome = await downloadAction(document.id);
      if (outcome.status === "link") window.location.assign(outcome.url);
    });
  return (
    <TableRow>
      <TableCell className="font-medium">
        {document.title}
        {document.onLegalHold ? (
          <Badge variant="secondary" className="ml-2">
            {t("holdBadge")}
          </Badge>
        ) : null}
        {document.contentDestroyed ? (
          <Badge variant="outline" className="ml-2">
            {t("removed")}
          </Badge>
        ) : null}
      </TableCell>
      <TableCell>{t(`categories.${document.category}`)}</TableCell>
      <TableCell className="tabular-nums">v{document.currentVersion}</TableCell>
      <TableCell>{format.dateTime(new Date(document.createdAt), { dateStyle: "medium" })}</TableCell>
      <TableCell className="text-right">
        {document.contentDestroyed ? null : (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={download}>
            {t("download")}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function Holds({ page }: { page: DocumentsPage }) {
  const t = useTranslations("documents");
  const format = useFormatter();
  const [state, action, pending] = useActionState<DocumentFormState, FormData>(
    placeHoldAction.bind(null, page.subjectType, page.subjectId),
    undefined,
  );
  const [lifting, start] = useTransition();
  const active = page.holds.filter((hold) => !hold.liftedAt);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("holds.title")}</CardTitle>
        <CardDescription>{t("holds.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {active.length === 0 ? <p className="text-muted-foreground text-sm">{t("holds.none")}</p> : null}
        <ul className="grid gap-2">
          {active.map((hold) => (
            <li key={hold.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {hold.reason} ·{" "}
                {t("holds.until", { date: format.dateTime(new Date(hold.expiresOn), { dateStyle: "medium" }) })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={lifting}
                onClick={() => start(async () => void (await liftHoldAction(hold.id)))}
              >
                {t("holds.lift")}
              </Button>
            </li>
          ))}
        </ul>
        <form action={action} className="grid gap-2">
          <div aria-live="polite">
            <Outcome state={state} />
          </div>
          <label className="grid gap-1 text-sm">
            {t("holds.reason")}
            <input
              name="reason"
              required
              maxLength={300}
              className="border-input h-9 rounded-md border bg-transparent px-2"
            />
          </label>
          <div>
            <Button type="submit" variant="outline" disabled={pending}>
              {t("holds.place")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** The documents of a building or a unit: list, upload, download, and legal holds (FR-DOC-01). */
export function DocumentsPanel({ page }: { page: DocumentsPage }) {
  const t = useTranslations("documents");
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("usage", { used: megabytes(page.usage.usedBytes), quota: megabytes(page.usage.quotaBytes) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {page.usage.warning ? <Callout tone="warning">{t("quotaWarning")}</Callout> : null}
          {page.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.title")}</TableHead>
                  <TableHead>{t("columns.category")}</TableHead>
                  <TableHead>{t("columns.version")}</TableHead>
                  <TableHead>{t("columns.added")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((document) => (
                  <Row key={document.id} document={document} />
                ))}
              </TableBody>
            </Table>
          )}
          <UploadForm page={page} />
        </CardContent>
      </Card>
      <Holds page={page} />
    </div>
  );
}
