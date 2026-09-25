// src/components/seo/MetaUpdater.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Route-specific titles and descriptions for rich social sharing cards and browser tabs
 */
const ROUTE_META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Dashboard – AIE SKYLINE FLEET SYSTEM',
    description: 'Executive fleet overview, vehicle utilisation, live status monitors, and operations metrics.',
  },
  '/dashboard': {
    title: 'Dashboard – AIE SKYLINE FLEET SYSTEM',
    description: 'Executive fleet overview, vehicle utilisation, live status monitors, and operations metrics.',
  },
  '/maintenance': {
    title: 'Maintenance & Service Tracking – AIE SKYLINE FLEET SYSTEM',
    description: 'Track fleet servicing, MOT inspections, repair work orders, service provider logs, and maintenance bookings.',
  },
  '/rentals': {
    title: 'Fleet Rentals & Hire Agreements – AIE SKYLINE FLEET SYSTEM',
    description: 'Manage active vehicle hire agreements, weekly and daily rentals, customer check-outs, and rental communications.',
  },
  '/vehicles': {
    title: 'Fleet Vehicles Registry – AIE SKYLINE FLEET SYSTEM',
    description: 'Comprehensive registry of fleet vehicles, license plates, MOT status, road tax, and vehicle readiness.',
  },
  '/claims': {
    title: 'Insurance Claims Management – AIE SKYLINE FLEET SYSTEM',
    description: 'Accident and credit hire claims tracking, solicitor communications, legal documentation, and case progression.',
  },
  '/accidents': {
    title: 'Accident Logs & Reports – AIE SKYLINE FLEET SYSTEM',
    description: 'Incident reporting, vehicle damage assessments, and emergency replacement fleet dispatch.',
  },
  '/invoices': {
    title: 'Invoices & Billing – AIE SKYLINE FLEET SYSTEM',
    description: 'Automated invoice generation, customer billing, payment reconciliation, and VAT tracking.',
  },
  '/finance': {
    title: 'Financial Management – AIE SKYLINE FLEET SYSTEM',
    description: 'Fleet financial overview, revenue streams, expenses, driver statements, and transaction history.',
  },
  '/driver-pay': {
    title: 'Driver Pay & Disbursements – AIE SKYLINE FLEET SYSTEM',
    description: 'Weekly driver payout calculations, commission settlements, and automated remittance notifications.',
  },
  '/customers': {
    title: 'Customers & Accounts – AIE SKYLINE FLEET SYSTEM',
    description: 'Customer profiles, driving licence verifications, KYC records, and active rental associations.',
  },
  '/automation-settings': {
    title: 'Automation & Template Hub – AIE SKYLINE FLEET SYSTEM',
    description: 'Configure automated WhatsApp and email messaging schedules, notification triggers, and communication templates.',
  },
  '/bulk-email': {
    title: 'Group Messaging & Bulk Dispatch – AIE SKYLINE FLEET SYSTEM',
    description: 'Broadcast company announcements, batch statements, and notifications to fleet drivers and customers.',
  },
  '/login': {
    title: 'Portal Sign In – AIE SKYLINE FLEET SYSTEM',
    description: 'Secure authentication portal for AIE Skyline Fleet Operations and management personnel.',
  },
};

export function MetaUpdater() {
  const location = useLocation();

  useEffect(() => {
    // 1. Get path without trailing slash or hash
    const path = location.pathname.toLowerCase().replace(/\/$/, '') || '/';

    // 2. Find matching meta or use route prefix
    let meta = ROUTE_META[path];
    if (!meta) {
      if (path.startsWith('/maintenance')) {
        meta = ROUTE_META['/maintenance'];
      } else if (path.startsWith('/rentals') || path.startsWith('/rental')) {
        meta = ROUTE_META['/rentals'];
      } else if (path.startsWith('/vehicles') || path.startsWith('/vehicle')) {
        meta = ROUTE_META['/vehicles'];
      } else if (path.startsWith('/claims') || path.startsWith('/claim')) {
        meta = ROUTE_META['/claims'];
      } else if (path.startsWith('/doc/')) {
        meta = {
          title: 'Document Viewer – AIE SKYLINE FLEET SYSTEM',
          description: 'Official verified AIE Skyline Fleet agreement and contract documentation.',
        };
      } else if (path.startsWith('/sign/')) {
        meta = {
          title: 'Digital Signature Portal – AIE SKYLINE FLEET SYSTEM',
          description: 'Complete digital signature and acceptance of AIE Skyline Fleet agreement.',
        };
      } else {
        // Fallback default
        meta = {
          title: 'AIE SKYLINE FLEET SYSTEM – Fleet, Rental & Operations Management',
          description: 'AIE Skyline Fleet System – Comprehensive automotive fleet operations, rentals, maintenance tracking, driver communications, and dispatch management.',
        };
      }
    }

    // 3. Update Document Title
    document.title = meta.title;

    // 4. Update Meta Description
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', meta.description);

    // 5. Update OpenGraph Tags dynamically
    const updateOrCreateMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const updateOrCreateTwitter = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const currentUrl = window.location.href;
    const origin = window.location.origin;
    const shareImageUrl = `${origin}/og-image.jpg`;

    updateOrCreateMeta('og:title', meta.title);
    updateOrCreateMeta('og:description', meta.description);
    updateOrCreateMeta('og:url', currentUrl);
    updateOrCreateMeta('og:image', shareImageUrl);
    updateOrCreateMeta('og:image:secure_url', shareImageUrl);

    updateOrCreateTwitter('twitter:title', meta.title);
    updateOrCreateTwitter('twitter:description', meta.description);
    updateOrCreateTwitter('twitter:image', shareImageUrl);
  }, [location.pathname]);

  return null;
}
