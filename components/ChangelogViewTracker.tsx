"use client";

import { useEffect } from "react";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";
import { CHANGELOG } from "@/lib/changelog";

/** Fires once when the public changelog page mounts. */
export function ChangelogViewTracker() {
  useEffect(() => {
    const latest = CHANGELOG[0];
    captureEvent(AnalyticsEvents.CHANGELOG_VIEWED, {
      release_count: CHANGELOG.length,
      latest_date: latest?.date,
      latest_title: latest?.title,
    });
  }, []);

  return null;
}
