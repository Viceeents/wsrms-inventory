import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Printer, CheckSquare } from "lucide-react";
import useApi from "../hooks/useApi";
import { PageTitle, Card, LoadState, Empty } from "../components/common/UI";
import Button from "../components/common/Button";
import SearchBar from "../components/common/SearchBar";
import ParcelTable from "../components/parcel/ParcelTable";
import LabelPreview from "../components/qr/LabelPreview";
export default function LabelPrintPage() {
  const parcels = useApi("/parcels"),
    [params] = useSearchParams(),
    [selected, setSelected] = useState(() =>
      params.get("parcel") ? [Number(params.get("parcel"))] : [],
    ),
    [q, setQ] = useState(""),
    [ready, setReady] = useState(() => new Set());
  const onReady = useCallback(
    (code) => setReady((values) => new Set([...values, code])),
    [],
  );
  const rows = parcels.data?.filter((p) => selected.includes(p.id)) || [],
    filtered =
      parcels.data?.filter((p) =>
        `${p.code} ${p.description}`.toLowerCase().includes(q.toLowerCase()),
      ) || [];
  function toggle(id) {
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  }
  return (
    <>
      <div className="no-print">
        <PageTitle
          title="Print parcel labels"
          description="Select one or more parcels, preview their labels, and print."
        >
          <Button
            disabled={!rows.length || rows.some((p) => !ready.has(p.code))}
            onClick={() => window.print()}
          >
            <Printer size={17} />
            Print{" "}
            {rows.length
              ? `${rows.length} label${rows.length > 1 ? "s" : ""}`
              : "labels"}
          </Button>
        </PageTitle>
        <Card
          title="Select parcels"
          actions={
            <Button
              variant="secondary"
              onClick={() =>
                setSelected(filtered.slice(0, 50).map((p) => p.id))
              }
            >
              <CheckSquare size={16} />
              Select visible
            </Button>
          }
        >
          <div className="filter-bar">
            <SearchBar value={q} onChange={setQ} />
            <Button variant="secondary" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </div>
          <LoadState {...parcels} />
          {parcels.data && (
            <ParcelTable
              parcels={filtered.slice(0, 50)}
              selected={selected}
              onToggle={toggle}
            />
          )}
        </Card>
        <h2 className="mt-8 mb-4">
          Label preview{" "}
          <span className="muted text-sm">· {rows.length} selected</span>
        </h2>
        {!rows.length && (
          <Empty
            title="Select parcels to preview their labels"
            description="Labels contain a QR code, CODE128 barcode, and storage information."
          />
        )}
      </div>
      <div className="print-labels">
        {rows.map((p) => (
          <LabelPreview key={p.id} parcel={p} onReady={onReady} />
        ))}
      </div>
    </>
  );
}
