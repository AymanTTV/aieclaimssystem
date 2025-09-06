// src/pages/members/MemberDashboard.tsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import useMemberCustomerId from "./_useMemberCustomer";
import { useMemberTransactions } from "./hooks/useMemberTransactions";
import { useMemberInvoices } from "./hooks/useMemberInvoices";
import { useMemberRentals } from "./hooks/useMemberRentals";
import { format, formatDistanceToNow } from "date-fns";

// ---------- helpers ----------
const money = (n: any) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 })
    .format(Number(n || 0));

const toJSDate = (v: any): Date | null => {
  if (!v) return null;
  // Firestore Timestamp
  if (typeof v?.toDate === "function") return v.toDate();
  // string/number/date
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const normStr = (v: any) => String(v || "").trim().toLowerCase();

const isPaidStatus = (s: any) => {
  const t = normStr(s);
  return t === "paid" || t === "complete" || t === "completed" || t === "settled";
};

const isPartiallyPaidStatus = (s: any) => normStr(s) === "partially_paid" || normStr(s) === "partial";

const isActiveStatus = (s: any) => normStr(s) === "active" || normStr(s) === "ongoing" || normStr(s) === "in_progress";

const getInvoiceTotal = (inv: any) =>
  Number(inv?.total ?? inv?.grandTotal ?? inv?.netTotal ?? 0);

const getInvoicePaidSoFar = (inv: any) =>
  Number(inv?.paid ?? inv?.amountPaid ?? inv?.totalPaid ?? 0);

const getRentalTotalDue = (r: any) =>
  Number(r?.totalDue ?? r?.total ?? r?.grandTotal ?? 0);

const getRentalPaid = (r: any) =>
  Number(r?.totalPaid ?? r?.amountPaid ?? r?.paid ?? 0);

const isIncomeTx = (t: any) => {
  const type = normStr(t?.type);
  const amt = Number(t?.amount || 0);
  return type === "income" || amt > 0;
};

const txDate = (t: any) => toJSDate(t?.date) || toJSDate(t?.createdAt);

// ---------- UI atoms ----------
const Card: React.FC<{ title: string; value: React.ReactNode; sub?: string; to?: string }> = ({
  title, value, sub, to
}) => {
  const body = (
    <div className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition h-full">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
};

const Tile: React.FC<{ to: string; title: string; subtitle: string; }> = ({ to, title, subtitle }) => (
  <Link to={to} className="block rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition">
    <div className="text-base font-semibold">{title}</div>
    <div className="text-gray-500 text-sm mt-1">{subtitle}</div>
  </Link>
);

const MemberDashboard: React.FC = () => {
  const { customerId, loading: loadingCustomer } = useMemberCustomerId();
  const { transactions, loading: loadingTx } = useMemberTransactions(customerId);
  const { invoices, loading: loadingInv } = useMemberInvoices(customerId);
  const { rentals, loading: loadingRent } = useMemberRentals(customerId);

  // ===== Derivations (defensive) =====

  // Invoices
  const { unpaidInvoicesTotal, invoiceCount } = useMemo(() => {
    let totalUnpaid = 0;
    const count = invoices.length;

    for (const inv of invoices as any[]) {
      const total = getInvoiceTotal(inv);
      // prefer arithmetic if paid-so-far is available
      const paid = getInvoicePaidSoFar(inv);
      if (paid > 0 || isPaidStatus(inv?.status) || isPartiallyPaidStatus(inv?.status)) {
        const remain = Math.max(0, total - paid);
        totalUnpaid += remain;
      } else {
        // no paid info & not marked paid → consider fully unpaid
        if (!isPaidStatus(inv?.status)) totalUnpaid += total;
      }
    }

    return { unpaidInvoicesTotal: totalUnpaid, invoiceCount: count };
  }, [invoices]);

  // Transactions
  const { totalPaid, txCount, lastPaymentAmount, lastPaymentWhen } = useMemo(() => {
    const paidSum = (transactions as any[]).reduce((sum, t) => {
      return sum + (isIncomeTx(t) ? Math.abs(Number(t?.amount || 0)) : 0);
    }, 0);

    const sortedIncome = (transactions as any[])
      .filter(isIncomeTx)
      .sort((a, b) => {
        const da = txDate(a) || new Date(0);
        const db = txDate(b) || new Date(0);
        return db.getTime() - da.getTime();
      });

    const last = sortedIncome[0];
    const lastAmt = Number(last?.amount || 0);
    const d = last ? (txDate(last) || null) : null;
    const when = d ? `${format(d, "dd/MM/yyyy")} (${formatDistanceToNow(d, { addSuffix: true })})` : "—";

    return {
      totalPaid: paidSum,
      txCount: transactions.length,
      lastPaymentAmount: last ? Math.abs(lastAmt) : 0,
      lastPaymentWhen: when,
    };
  }, [transactions]);

  // Rentals
  const { activeRental, activeOutstanding, activeCount, completedCount } = useMemo(() => {
    const active = (rentals as any[]).find(r => isActiveStatus(r?.status));
    const outstanding = active ? Math.max(0, getRentalTotalDue(active) - getRentalPaid(active)) : 0;

    const activeC = (rentals as any[]).filter(r => isActiveStatus(r?.status)).length;
    const completedC = (rentals as any[]).filter(r => normStr(r?.status) === "completed").length;

    return { activeRental: active, activeOutstanding: outstanding, activeCount: activeC, completedCount: completedC };
  }, [rentals]);

  // ===== UI states =====
  if (loadingCustomer || loadingTx || loadingInv || loadingRent) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-500" />
      </div>
    );
    }

  if (!customerId) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center text-gray-600">
        We couldn’t link your member login to a customer record yet.
        <br />
        Please make sure your account email or mobile matches your customer profile.
      </div>
    );
  }

  // ===== Render =====
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/members/transactions" className="px-3 py-2 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition">View Transactions</Link>
          <Link to="/members/invoices" className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition">View Invoices</Link>
          <Link to="/members/rentals" className="px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 transition">View Rentals</Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Unpaid Invoices"
          value={money(unpaidInvoicesTotal)}
          sub={`${invoiceCount} invoice(s)`}
          to="/members/invoices"
        />
        <Card
          title="Total Paid"
          value={money(totalPaid)}
          sub={`${txCount} transaction(s)`}
          to="/members/transactions"
        />
        <Card
          title="Active Rental"
          value={activeRental ? "Yes" : "No"}
          sub={activeRental ? `Outstanding ${money(activeOutstanding)}` : "—"}
          to="/members/rentals"
        />
        <Card
          title="Last Payment"
          value={money(lastPaymentAmount)}
          sub={lastPaymentWhen}
          to="/members/transactions"
        />
      </div>

      {/* Rentals overview quick glance */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Active Rentals" value={activeCount} to="/members/rentals" />
        <Card title="Completed Rentals" value={completedCount} to="/members/rentals" />
        <Card
          title="Active Rental Outstanding"
          value={money(activeOutstanding)}
          sub={activeRental ? `Started ${(() => {
            const d = toJSDate(activeRental?.startDate) || toJSDate(activeRental?.createdAt);
            return d ? format(d, "dd/MM/yyyy") : "—";
          })()}` : "—"}
          to="/members/rentals"
        />
        <Card
          title="Next Step"
          value="Review latest invoice"
          sub="Check and pay outstanding"
          to="/members/invoices"
        />
      </div>

      {/* Quick actions / tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile to="/members/transactions" title="Transactions" subtitle="View your finance history" />
        <Tile to="/members/invoices"     title="Invoices"     subtitle="All your invoices in one place" />
        <Tile to="/members/rentals"      title="Rentals"      subtitle="Your current & past rentals" />
        <Tile to="/members/profile"      title="Profile"      subtitle="Update your details" />
      </div>
    </div>
  );
};

export default MemberDashboard;
