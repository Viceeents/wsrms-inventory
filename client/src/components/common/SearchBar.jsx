import { Search } from "lucide-react";
export default function SearchBar({
  value,
  onChange,
  placeholder = "Search parcel code, tracking number, or description…",
  ...props
}) {
  return (
    <div className="search-field">
      <Search size={17} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
}
