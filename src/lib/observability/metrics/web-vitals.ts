"use client";

import { useReportWebVitals } from "next/web-vitals";

import { getClientLogger } from "../logger/logger.client";

const logger = getClientLogger("web-vitals");

/**
 * Reports Core Web Vitals to the browser logger only (debug for good/needs-improvement, warn for
 * poor). Nothing is sent to a remote collector. Renders nothing.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const metadata = {
      metric: metric.name,
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      rating: metric.rating,
      navigationType: metric.navigationType,
    };
    if (metric.rating === "poor") {
      logger.warn("ui.vitals.degraded", metadata);
    } else {
      logger.debug("ui.vitals.measured", metadata);
    }
  });
  return null;
}
