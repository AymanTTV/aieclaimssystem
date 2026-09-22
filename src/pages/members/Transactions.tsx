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
      rows = rows.filter((t) => {
        const text = `${t.id || ''} ${t.type || ''} ${t.amount || ''} ${t.category || ''} ${t.description || ''} ${t.reference || ''} ${t.notes || ''}`.toLowerCase();
        return text.includes(s);
      });
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
      <div className="mb-4 rounded-2xl border border-[#2B314E] bg-[#16192B] p-4 sm:p-5 shadow-xl text-white">
        <div className="grid gap-3 md:grid-cols-3 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anything..."
            className="w-full rounded-xl border border-[#2B314E] bg-[#0F111A] text-white placeholder-slate-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full rounded-xl border border-[#2B314E] bg-[#0F111A] text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-300">
            <div>Income: <span className="text-emerald-400 font-mono text-sm">{formatGBP(totalIncome)}</span></div>
            <div>Expense: <span className="text-rose-400 font-mono text-sm">{formatGBP(totalExpense)}</span></div>
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
        <div className="rounded-2xl border border-[#2B314E] shadow-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#16192B] text-white">
                <tr className="border-b border-[#2B314E]">
                  <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider text-left select-none">Date</th>
                  <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider text-left select-none">Type</th>
                  <th className="px-5 py-4 text-xs font-bold text-white uppercase tracking-wider text-right select-none">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => {
                  const d = toJSDate(t.date ?? t.createdAt);
                  const isEven = idx % 2 === 1;
                  const rowBg = isEven ? 'bg-[#EEF5FD]' : 'bg-white';
                  return (
                    <tr
                      key={t.id}
                      className={`group border-b border-[#E2E8F0] ${rowBg} hover:bg-[#DCEBFA] transition-all duration-150 ease-in-out`}
                    >
                      <td className="px-5 py-3.5 text-slate-800 font-medium">{d ? d.toLocaleDateString() : "-"}</td>
                      <td className="px-5 py-3.5 capitalize text-slate-800 font-medium">{t.type || "-"}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">{formatGBP(Number(t.amount || 0))}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-center text-slate-500 font-medium" colSpan={3}>
                      No matching transactions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Consistent Dark Navy Footer */}
          <div className="bg-[#16192B] border-t border-[#2B314E] px-5 py-3.5 flex items-center justify-between text-xs text-slate-300">
            <div>
              Showing <span className="font-bold text-white">{filtered.length}</span> transaction{filtered.length === 1 ? '' : 's'}
            </div>
            <div className="text-slate-400">
              Account Activity
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
