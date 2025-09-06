import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const tab = (isActive: boolean) =>
  `inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition
   ${isActive ? "bg-rose-50 text-rose-600" : "text-gray-600 hover:bg-gray-100"}`;

const MemberNav: React.FC = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Only show on /members/* routes and for role 'member'
  if (!pathname.startsWith("/members") || user?.role !== "member") return null;

  return (
    <div className="w-full border-b bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar">
          <NavLink to="/members/dashboard" className={({ isActive }) => tab(isActive)}>
            Dashboard
          </NavLink>
          <NavLink to="/members/transactions" className={({ isActive }) => tab(isActive)}>
            Transactions
          </NavLink>
          <NavLink to="/members/invoices" className={({ isActive }) => tab(isActive)}>
            Invoices
          </NavLink>
          <NavLink to="/members/rentals" className={({ isActive }) => tab(isActive)}>
            Rentals
          </NavLink>
          <NavLink to="/members/profile" className={({ isActive }) => tab(isActive)}>
            Profile
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default MemberNav;
