"use client";

import { GloveProvider } from "glove-react";
import type { GloveClient } from "glove-react";

interface ProvidersProps {
  client: GloveClient;
  children: React.ReactNode;
}

/**
 * Provides the Glove chat context. TelemetryProvider is wrapped at
 * the page level (above this) so that telemetry callbacks can be
 * wired into the GloveClient before it is created.
 */
export function Providers({ client, children }: ProvidersProps) {
  return <GloveProvider client={client}>{children}</GloveProvider>;
}
