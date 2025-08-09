// src/pages/members/MembersLayout.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';

export default function MembersLayout() {
  // All member pages (transactions, profile) render here,
  // with the global <Layout> providing the top‐bar nav.
  return <Outlet />;
}
