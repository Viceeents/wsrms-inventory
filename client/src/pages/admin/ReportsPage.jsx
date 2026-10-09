import { Download, Package, Truck, Boxes, PackageCheck } from "lucide-react";
import useApi from "../../hooks/useApi";
import { neutralColor } from "../../utils/neutralColor";
import {
  PageTitle,
  Card,
  LoadState,
  Progress,
} from "../../components/common/UI";
import ActivityChart, {
  CategoryChart,
} from "../../components/charts/ActivityChart";
export default function ReportsPage() {
  const reports = useApi("/reports", { poll: true }),
    r = reports.data;
  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRATION · OPERATIONAL INSIGHTS"
        title="Warehouse reports"
        description="Understand your inventory, storage usage, and parcel movement."
      />
      <LoadState {...reports} />
      {r && (
        <>
          <div className="stats-grid">
            {[
              [Package, "Current inventory", r.total],
              [Truck, "Total dispatched", r.dispatched],
              [PackageCheck, "Awaiting dispatch", r.retrieved],
              [
                Boxes,
                "Occupied storage",
                `${r.capacity ? Math.round((r.occupancy / r.capacity) * 100) : 0}%`,
              ],
            ].map(([Icon, label, value]) => (
              <Card className="stat-card" key={label}>
                <div className="stat-top">
                  <span>{label}</span>
                  <Icon size={20} />
                </div>
                <strong className="stat-value">{value}</strong>
              </Card>
            ))}
          </div>
          <div className="detail-layout">
            <Card
              title="Warehouse movement"
              description="Check-ins and dispatches · last 7 days"
            >
              <ActivityChart days={r.days} />
            </Card>
            <Card
              title="Inventory by category"
              description="Parcels currently in the warehouse"
            >
              <div className="category-report">
                <CategoryChart categories={r.categories} />
                <div>
                  {r.categories.map((c) => (
                    <div className="category-report-row" key={c.name}>
                      <span>
                        <i style={{ background: neutralColor(c.color) }} />
                        {c.name}
                      </span>
                      <strong>{c.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
          <Card
            title="Export records"
            description="Download complete CSV records for your reports and analysis."
            className="mt-6"
          >
            <div className="export-options">
              {[
                [
                  "parcels",
                  "Parcel inventory",
                  "Complete parcel records and statuses",
                ],
                [
                  "transactions",
                  "Transaction history",
                  "Activity, staff, status changes, and verification",
                ],
                [
                  "locations",
                  "Storage utilization",
                  "Rack capacity, occupancy, and weight",
                ],
              ].map(([kind, title, description]) => (
                <a
                  key={kind}
                  href={`/api/reports/export/${kind}`}
                  className="export-card"
                  download
                >
                  <Download size={22} />
                  <div>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </div>
                  <span>CSV</span>
                </a>
              ))}
            </div>
          </Card>
          <Card title="Storage utilization" className="mt-6">
            <div className="utilization-list">
              {r.locations.map((rack) => (
                <div key={rack.id}>
                  <strong>{rack.code}</strong>
                  <Progress value={rack.utilization * 100} />
                  <span>
                    {rack.occupancy}/{rack.capacity}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
