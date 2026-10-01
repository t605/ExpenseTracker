"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { decodeShare, isExpired, type DecodeResult } from "@/lib/cloud/share";
import { tableToCSV } from "@/lib/cloud/templates";
import { formatDateTime } from "@/lib/cloud/util";
import { downloadCSV } from "@/lib/csv";
import { LoadingState } from "../ui";
import { useCloud } from "./CloudProvider";
import { ReportTable } from "./ReportTable";
import { primaryButton } from "./ui";

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
        Go to Expense Tracker
      </Link>
    </div>
  );
}

/** Opens a share link: reads the report from the part of the address after "#" and shows it. */
export function SharedViewer() {
  const { loaded, state } = useCloud();
  const [result, setResult] = useState<DecodeResult | null>(null);

  useEffect(() => {
    let current = true;
    const read = () => {
      void decodeShare(window.location.hash).then((r) => {
        if (current) setResult(r);
      });
    };
    read();
    window.addEventListener("hashchange", read);
    return () => {
      current = false;
      window.removeEventListener("hashchange", read);
    };
  }, []);

  if (!result || !loaded) return <LoadingState label="Opening shared report..." />;

  if (!result.ok) {
    if (result.reason === "empty") {
      return <Notice title="Shared report">This page shows a report that someone shared from Expense Tracker. Open a share link to see it here.</Notice>;
    }
    if (result.reason === "too-large") {
      return <Notice title="Report too large">This link holds more data than can be shown safely, so it was not opened.</Notice>;
    }
    return <Notice title="This link does not work">It looks damaged or cut off. Ask the sender for a new link, and make sure the whole link was copied.</Notice>;
  }

  const p = result.payload;
  if (isExpired(p.exp, new Date())) {
    return <Notice title="This link has expired">It was valid until {formatDateTime(p.exp as string)}. Ask the sender for a new one.</Notice>;
  }
  if (state.shares.some((s) => s.id === p.id && s.revoked)) {
    return <Notice title="This link was revoked">The sender revoked it on this browser, so the report is not shown.</Notice>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Shared report</p>
        <h1 className="text-2xl font-bold tracking-tight">{p.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{p.subtitle} &middot; amounts in {p.currency}</p>
      </div>

      <ReportTable columns={p.columns} rows={p.rows} footer={p.footer} caption={p.title} />

      <div className="flex flex-wrap items-center gap-3">
        {p.dl && (
          <button type="button" onClick={() => downloadCSV(`${p.fileBase}.csv`, tableToCSV(p))} className={primaryButton}>
            Download CSV
          </button>
        )}
        <p className="text-xs text-slate-500">
          A snapshot made {formatDateTime(p.created)}. It does not update.{" "}
          {p.exp ? `The link expires ${formatDateTime(p.exp)}.` : "The link does not expire."}
        </p>
      </div>
    </div>
  );
}
