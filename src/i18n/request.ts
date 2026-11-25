import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_CURRENCY, MESSAGE_DOMAINS } from "./config";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const entries = await Promise.all(
    MESSAGE_DOMAINS.map(async (domain) => {
      const module = await import(`../../messages/${locale}/${domain}.json`);
      return [domain, module.default] as const;
    }),
  );

  return {
    locale,
    messages: Object.fromEntries(entries),
    formats: {
      number: {
        currency: { style: "currency", currency: DEFAULT_CURRENCY },
        percent: { style: "percent", maximumFractionDigits: 1 },
      },
      dateTime: {
        short: { dateStyle: "medium" },
        long: { dateStyle: "long" },
      },
    },
  };
});
