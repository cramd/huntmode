import { Suspense } from "react";
import ExtensionConnectPage from "./page";

export default function ExtensionConnectLayout() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
          Loading…
        </div>
      }
    >
      <ExtensionConnectPage />
    </Suspense>
  );
}
