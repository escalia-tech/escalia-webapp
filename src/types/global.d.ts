import type { AppLocale } from "@/i18n/routing";

import type assist from "../../messages/fr-CA/assist.json";
import type auth from "../../messages/fr-CA/auth.json";
import type buildings from "../../messages/fr-CA/buildings.json";
import type common from "../../messages/fr-CA/common.json";
import type dashboard from "../../messages/fr-CA/dashboard.json";
import type documents from "../../messages/fr-CA/documents.json";
import type feedback from "../../messages/fr-CA/feedback.json";
import type gallery from "../../messages/fr-CA/gallery.json";
import type imports from "../../messages/fr-CA/imports.json";
import type leases from "../../messages/fr-CA/leases.json";
import type legal from "../../messages/fr-CA/legal.json";
import type modules from "../../messages/fr-CA/modules.json";
import type portfolio from "../../messages/fr-CA/portfolio.json";
import type rules from "../../messages/fr-CA/rules.json";
import type settings from "../../messages/fr-CA/settings.json";
import type shell from "../../messages/fr-CA/shell.json";
import type signing from "../../messages/fr-CA/signing.json";

/** fr-CA is the reference catalogue: its JSON files define the typed message keys (en-CA must match). */
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: {
      common: typeof common;
      assist: typeof assist;
      shell: typeof shell;
      auth: typeof auth;
      legal: typeof legal;
      dashboard: typeof dashboard;
      buildings: typeof buildings;
      rules: typeof rules;
      portfolio: typeof portfolio;
      documents: typeof documents;
      leases: typeof leases;
      imports: typeof imports;
      signing: typeof signing;
      settings: typeof settings;
      feedback: typeof feedback;
      modules: typeof modules;
      gallery: typeof gallery;
    };
  }
}
