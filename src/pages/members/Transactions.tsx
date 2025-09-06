// src/pages/members/Transactions.tsx
import React, { useMemo, useState } from "react";
import { Loader } from "lucide-react";
import useMemberCustomerId from "./_useMemberCustomer";
import { useMemberTransactions } from "./hooks/useMemberTransactions";

function toJSDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

const formatGBP = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "GBP" }).format(n);

const Transactions: React.FC = () => {
  const { customerId } = useMemberCustomerId();
  const { transactions, loading } = useMemberTransactions(customerId);

  // Filters
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense" | "transfer">("all");

  const filtered = useMemo(() => {
    let rows = transactions;
    if (type !== "all") rows = rows.filter((t) => (t.type || "").toLowerCase() === type);
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((t) =>
        JSON.stringify(t).toLowerCase().includes(s)
      );
    }
    return rows;
  }, [transactions, search, type]);

  const totalIncome = filtered
    .filter((t) => (t.type || "").toLowerCase() === "income")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalExpense = filtered
    .filter((t) => (t.type || "").toLowerCase() === "expense")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">My Transactions</h1>

      {/* Filters */}
      <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anything..."
            className="w-full rounded-md border px-3 py-2"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
          <div className="flex items-center gap-4 text-sm">
            <div>Income: <strong>{formatGBP(totalIncome)}</strong></div>
            <div>Expense: <strong>{formatGBP(totalExpense)}</strong></div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          Loading your transactions…
        </div>
      ) : !customerId ? (
        <div className="rounded-xl border bg-white p-6 text-center text-gray-600">
          We couldn’t link your member login to a customer record yet.<br />
          Please make sure your account email or mobile matches your customer profile.
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const d = toJSDate(t.date ?? t.createdAt);
                return (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2">{d ? d.toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-2 capitalize">{t.type || "-"}</td>
                    <td className="px-4 py-2 text-right">{formatGBP(Number(t.amount || 0))}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={3}>
                    No matching transactions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Transactions;
