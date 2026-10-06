import { useState, Suspense } from "react";
import { Loading } from "../common/UI";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
export default function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main-shell">
        <Header onMenu={() => setOpen(true)} />
        <main className="page-content">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="app-footer">
          <span>WSRMS · Every parcel, accounted for.</span>
          <span>All times in Philippine Standard Time</span>
        </footer>
      </div>
    </div>
  );
}
