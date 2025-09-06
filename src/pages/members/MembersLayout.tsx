// src/pages/members/MembersLayout.tsx
import React, { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { linkExistingCustomerIfMissing } from "./_linkExistingCustomer";

export default function MembersLayout() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (!user?.uid) return;
      try {
        await linkExistingCustomerIfMissing({
          uid: user.uid,
          email: user.email ?? null,
          mobile: (user as any)?.mobile ?? null,
        });
      } catch {
        // no-op; this is best-effort
      }
    })();
  }, [user?.uid]);

  return <Outlet />;
}
