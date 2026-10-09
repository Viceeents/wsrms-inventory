import { NavLink } from "react-router-dom";
import { Home, PackagePlus, Search, Truck, Warehouse } from "lucide-react";
const items = [
  ["/", "Home", Home],
  ["/check-in", "In", PackagePlus],
  ["/find", "Find", Search],
  ["/dispatch", "Out", Truck],
  ["/warehouse", "Map", Warehouse],
];
export default function MobileNavigation() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Main mobile navigation">
      {items.map(([to, label, Icon]) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
