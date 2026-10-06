import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  PackagePlus,
  Truck,
  Boxes,
  ArrowUpRight,
  ArrowRight,
  ScanLine,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import useApi from "../hooks/useApi";
import { PageTitle, Card, LoadState, Progress } from "../components/common/UI";
import ActivityChart from "../components/charts/ActivityChart";
import WarehouseGrid from "../components/warehouse/WarehouseGrid";
import TransactionTable from "../components/transaction/TransactionTable";
import TransactionDetails from "../components/transaction/TransactionDetails";
import Modal from "../components/common/Modal";
import NotificationSummary from "../components/common/NotificationSummary";
export default function DashboardPage() {
  const { user } = useAuth(),
    summary = useApi("/dashboard", { poll: true }),
    warehouse = useApi("/warehouse", { poll: true }),
    [transaction, setTransaction] = useState(null);
  const s = summary.data;
  return (
    <>
      <PageTitle
        eyebrow="YOUR WAREHOUSE, AT A GLANCE"
        title={`Welcome back, ${user.name.split(" ")[0]}.`}
        description="Here’s what’s happening in your warehouse today."
      >
        <Link className="btn btn-secondary" to="/scan">
          <ScanLine size={17} />
          Scan parcel
        </Link>
        <Link className="btn btn-primary" to="/check-in">
          <PackagePlus size={17} />
          Check-in parcel
        </Link>
      </PageTitle>
      {summary.error || (!s && summary.loading) ? (
        <LoadState {...summary} />
      ) : (
        s && (
          <>
            <div className="stats-grid">
              {[
                [
                  Package,
                  "Parcels in warehouse",
                  s.total,
                  `${s.stored} stored · ${s.retrieved} ready for dispatch`,
                ],
                [
                  PackagePlus,
                  "Checked in today",
                  s.todayCheckins,
                  "Arrivals recorded today",
                ],
                [
                  Truck,
                  "Dispatched today",
                  s.todayDispatches,
                  "Verified and on their way",
                ],
                [
                  Boxes,
                  "Storage occupancy",
                  `${s.capacity ? Math.round((s.occupancy / s.capacity) * 100) : 0}%`,
                  `${s.occupancy} of ${s.capacity} parcels stored`,
                ],
              ].map(([Icon, label, value, caption]) => (
                <Card key={label} className="stat-card">
                  <div className="stat-top">
                    <span>{label}</span>
                    <Icon size={19} />
                  </div>
                  <strong className="stat-value">{value}</strong>
                  <p className="stat-caption">{caption}</p>
                </Card>
              ))}
            </div>
            <div className="dashboard-middle">
              <Card
                title="Parcel activity"
                description="Check-ins and dispatches over the last 7 days"
                actions={<span className="chip">Last 7 days</span>}
              >
                <ActivityChart days={s.days} />
              </Card>
              <Card
                title="Keep things moving"
                description="Your daily operations, one click away."
                className="quick-actions-card"
              >
                <div className="quick-actions">
                  {[
                    [
                      "/check-in",
                      PackagePlus,
                      "Check-in a parcel",
                      "Register arrivals and assign storage",
                    ],
                    [
                      "/dispatch",
                      Truck,
                      "Dispatch a parcel",
                      "Retrieve, verify, and release",
                    ],
                    [
                      "/find",
                      Package,
                      "Find a parcel",
                      "Locate any parcel in seconds",
                    ],
                  ].map(([path, Icon, title, caption]) => (
                    <Link key={path} to={path}>
                      <span className="quick-icon">
                        <Icon size={20} />
                      </span>
                      <div>
                        <strong>{title}</strong>
                        <small>{caption}</small>
                      </div>
                      <ArrowUpRight size={18} />
                    </Link>
                  ))}
                </div>
                <div className="operations-note">
                  <span className="online-dot" />
                  Your next move starts here.
                </div>
              </Card>
            </div>
            <div className="dashboard-bottom">
              <Card
                title="Recent activity"
                description="A clear record of every warehouse move."
                actions={
                  <Link to="/transactions" className="text-link">
                    View all
                    <ArrowRight size={15} />
                  </Link>
                }
              >
                <TransactionTable
                  transactions={s.recent.slice(0, 5)}
                  compact
                  onSelect={setTransaction}
                />
              </Card>
              <Card
                title="Warehouse snapshot"
                description={`${s.availableLocations} available locations · ${s.locationCount} total`}
                actions={
                  <Link
                    to="/warehouse"
                    className="icon-button"
                    aria-label="Open warehouse map"
                  >
                    <ArrowUpRight size={19} />
                  </Link>
                }
              >
                <div className="snapshot-map">
                  <WarehouseGrid warehouse={warehouse.data} compact />
                </div>
                <div className="snapshot-footer">
                  <div className="flex justify-between mb-2">
                    <span>Storage utilization</span>
                    <strong>
                      {s.capacity
                        ? Math.round((s.occupancy / s.capacity) * 100)
                        : 0}
                      %
                    </strong>
                  </div>
                  <Progress
                    value={s.capacity ? (s.occupancy / s.capacity) * 100 : 0}
                  />
                </div>
              </Card>
            </div>
          </>
        )
      )}
      {transaction && (
        <Modal title="Transaction record" onClose={() => setTransaction(null)}>
          <TransactionDetails transaction={transaction} />
        </Modal>
      )}
      <NotificationSummary />
    </>
  );
}
