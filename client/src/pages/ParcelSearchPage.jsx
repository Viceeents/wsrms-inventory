import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { PackagePlus, ScanLine } from "lucide-react";
import useApi from "../hooks/useApi";
import { queryString } from "../services/api";
import { PageTitle, Card, LoadState } from "../components/common/UI";
import SearchBar from "../components/common/SearchBar";
import ParcelTable from "../components/parcel/ParcelTable";
export default function ParcelSearchPage({ find = false }) {
  const [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(params.get("q") || ""),
    [page, setPage] = useState(1);
  const filters = {
      q: params.get("q") || "",
      status: params.get("status") || "",
      category: params.get("category") || "",
      location: params.get("location") || "",
    },
    parcels = useApi(`/parcels${queryString(filters)}`, { poll: true }),
    categories = useApi("/categories");
  function filter(key, value) {
    setPage(1);
    setParams({ ...filters, [key]: value });
  }
  return (
    <>
      <PageTitle
        title={find ? "Find a parcel" : "All parcels"}
        description={
          find
            ? "Search, locate, and retrieve the parcel you need."
            : "Every parcel, from check-in to its next destination."
        }
      >
        <Link className="btn btn-secondary" to="/scan">
          <ScanLine size={16} />
          Scan label
        </Link>
        <Link className="btn btn-primary" to="/check-in">
          <PackagePlus size={16} />
          Check-in parcel
        </Link>
      </PageTitle>
      <Card>
        <form
          className="filter-bar"
          onSubmit={(e) => {
            e.preventDefault();
            filter("q", search);
          }}
        >
          <SearchBar value={search} onChange={setSearch} />
          <button className="btn btn-secondary" type="submit">
            Search
          </button>
          <select
            aria-label="Filter by status"
            value={filters.status}
            onChange={(e) => filter("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {["Stored", "Retrieved", "Dispatched"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Filter by category"
            value={filters.category}
            onChange={(e) => filter("category", e.target.value)}
          >
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {filters.location && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => filter("location", "")}
            >
              Clear location filter
            </button>
          )}
        </form>
        {parcels.error || (!parcels.data && parcels.loading) ? (
          <LoadState {...parcels} />
        ) : (
          <>
            <ParcelTable
              parcels={parcels.data?.slice((page - 1) * 12, page * 12)}
            />
            <div className="table-footer">
              <span>{parcels.data?.length || 0} parcel records</span>
              <div className="flex items-center gap-3">
                <button
                  className="btn btn-secondary btn-small"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="btn btn-secondary btn-small"
                  disabled={page * 12 >= (parcels.data?.length || 0)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
