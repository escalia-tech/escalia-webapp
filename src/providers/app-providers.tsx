"use client";

import { type ReactNode, useEffect, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { STORAGE_KEYS } from "@/lib/cookies";
import { configureClientLogger } from "@/lib/observability/logger/logger.client";
import type { LogLevel } from "@/lib/observability/logger/logger.types";
import { WebVitalsReporter } from "@/lib/observability/metrics/web-vitals";

interface AppProvidersProps {
  children: ReactNode;
  nonce?: string;
  clientLogging: { enabled: boolean; level: LogLevel; environment: string; correlationId?: string };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Only idempotent reads are retried, and only when the BFF flags the failure as retryable.
        retry: (failureCount, error) =>
          failureCount < 2 &&
          typeof error === "object" &&
          error !== null &&
          "retryable" in error &&
          error.retryable === true,
      },
      mutations: { retry: false },
    },
  });
}

export function AppProviders({ children, nonce, clientLogging }: AppProvidersProps) {
  // One QueryClient per browser session; never shared between requests on the server.
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    configureClientLogger(clientLogging);
  }, [clientLogging]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={STORAGE_KEYS.theme}
      nonce={nonce}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
          <WebVitalsReporter />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
