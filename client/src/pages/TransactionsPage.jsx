import { useState } from "react";
import useApi from "../hooks/useApi";
import { queryString } from "../services/api";
import { PageTitle, Card, LoadState } from "../components/common/UI";
import SearchBar from "../components/common/SearchBar";
import Modal from "../components/common/Modal";
import TransactionTable from "../components/transaction/TransactionTable";
import TransactionDetails from "../components/transaction/TransactionDetails";
export default function TransactionsPage() {
  const [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [selected, setSelected] = useState(null),
    [page, setPage] = useState(1),
    transactions = useApi(`/transactions${queryString({ q, type })}`, {
      poll: true,
    });
  return (
    <>
      <PageTitle
        eyebrow="TRACEABILITY & ACCOUNTABILITY"
        title="Transaction history"
        description="Who did what, where, and when. A transparent record of every action."
      />
      <Card>
        <form
          className="filter-bar"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search);
            setPage(1);
          }}
        >
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search transaction, parcel, or team member…"
          />
          <button className="btn btn-secondary">Search</button>
          <select
            aria-label="Filter transaction type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All activities</option>
            {[
              "Check-in",
              "Storage assignment",
              "Storage transfer",
              "Retrieval",
              "Dispatch",
              "Layout change",
              "User created",
              "User updated",
              "Category created",
              "Category updated",
              "Sign-in",
              "Manual correction",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </form>
        {transactions.error || (!transactions.data && transactions.loading) ? (
          <LoadState {...transactions} />
        ) : (
          <>
            <TransactionTable
              transactions={transactions.data?.slice(
                (page - 1) * 12,
                page * 12,
              )}
              onSelect={setSelected}
            />
            <div className="table-footer">
              <span>{transactions.data?.length || 0} transactions</span>
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
                  disabled={page * 12 >= (transactions.data?.length || 0)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
      {selected && (
        <Modal title="Transaction record" onClose={() => setSelected(null)}>
          <TransactionDetails transaction={selected} />
        </Modal>
      )}
    </>
  );
}
