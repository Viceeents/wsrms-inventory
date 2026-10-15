import { useEffect, useState, Suspense } from "react";
import useApi from "../../hooks/useApi";
import { Loading } from "../common/UI";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNavigation from "./MobileNavigation";
import ChatLauncher from "./ChatLauncher";
export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const warehouse = useApi("/warehouse", { poll: true });
  useEffect(() => {
    const update = (event) => warehouse.setData(event.detail);
    window.addEventListener("warehouse-updated", update);
    return () => window.removeEventListener("warehouse-updated", update);
  }, [warehouse.setData]);
  const warehouseName = warehouse.data?.name || "Warehouse";
  return (
    <div className="app-shell">
      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        warehouseName={warehouseName}
      />
      <div className="main-shell">
        <Header
          onMenu={() => setOpen(true)}
          warehouse={warehouse}
          warehouseName={warehouseName}
        />
        <main className="page-content">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="app-footer">
          <span>Storix · Every parcel, accounted for.</span>
          <span>All times in Philippine Standard Time</span>
        </footer>
      </div>
      <MobileNavigation />
      <ChatLauncher />
    </div>
  );
}
