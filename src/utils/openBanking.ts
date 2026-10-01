// src/utils/openBanking.ts

export interface UKBankInfo {
  id: string;
  name: string;
  brandName: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  badge?: string;
  popular?: boolean;
  appScheme: string; // iOS / Android custom URI scheme
  universalUrl: string; // Web / Universal link
  trueLayerProviderId: string;
  plaidInstitutionId: string;
  features: string[];
}

export interface OpenBankingPaymentDetails {
  invoiceId: string;
  invoiceNumber: string;
  reference: string;
  amount: number;
  currency?: string;
  payeeName: string;
  payeeBankName: string;
  accountNumber: string;
  sortCode: string;
  customerName?: string;
  customerEmail?: string;
}

export interface OpenBankingIntentResult {
  bank: UKBankInfo;
  appDeepLink: string;
  openBankingUrl: string;
  truelayerUrl: string;
  revolutPayUrl?: string;
  qrPayload: string;
  formattedReference: string;
  formattedSortCode: string;
  cleanSortCode: string;
  displayAmount: string;
}

/**
 * 10 Major UK Banks supported for instant Pay by Bank mobile handoff
 */
export const UK_BANKS: UKBankInfo[] = [
  {
    id: 'barclays',
    name: 'Barclays Bank UK',
    brandName: 'Barclays',
    primaryColor: '#00395D',
    accentColor: '#00AEEF',
    textColor: '#FFFFFF',
    badge: 'Instant Transfer',
    popular: true,
    appScheme: 'barclays://',
    universalUrl: 'https://bank.barclays.co.uk/olb/',
    trueLayerProviderId: 'uk-ob-barclays',
    plaidInstitutionId: 'ins_109508',
    features: ['FaceID / TouchID', 'Open Banking Approved', 'Zero Surcharge'],
  },
  {
    id: 'lloyds',
    name: 'Lloyds Bank',
    brandName: 'Lloyds Bank',
    primaryColor: '#006A4E',
    accentColor: '#008450',
    textColor: '#FFFFFF',
    badge: 'Popular',
    popular: true,
    appScheme: 'lloydsbank://',
    universalUrl: 'https://online.lloydsbank.co.uk/personal/logon/login.jsp',
    trueLayerProviderId: 'uk-ob-lloyds',
    plaidInstitutionId: 'ins_109509',
    features: ['Fast Biometric Login', 'Official Pay by Bank', 'Instant FPS'],
  },
  {
    id: 'natwest',
    name: 'NatWest Bank',
    brandName: 'NatWest',
    primaryColor: '#4A154B',
    accentColor: '#5A287D',
    textColor: '#FFFFFF',
    badge: 'Instant Transfer',
    popular: true,
    appScheme: 'natwest://',
    universalUrl: 'https://www.natwest.com/online-banking.html',
    trueLayerProviderId: 'uk-ob-natwest',
    plaidInstitutionId: 'ins_109511',
    features: ['Biometric Handoff', 'UK Open Banking Certified', 'Instant Clearance'],
  },
  {
    id: 'hsbc',
    name: 'HSBC UK',
    brandName: 'HSBC',
    primaryColor: '#DB0011',
    accentColor: '#B0000D',
    textColor: '#FFFFFF',
    badge: 'Instant Settlement',
    popular: true,
    appScheme: 'hsbcuk://',
    universalUrl: 'https://www.hsbc.co.uk/ways-to-bank/online-banking/',
    trueLayerProviderId: 'uk-ob-hsbc',
    plaidInstitutionId: 'ins_109512',
    features: ['Digital Secure Key / FaceID', 'Faster Payments 24/7', 'Verified Payee'],
  },
  {
    id: 'santander',
    name: 'Santander UK',
    brandName: 'Santander',
    primaryColor: '#EC0000',
    accentColor: '#CC0000',
    textColor: '#FFFFFF',
    badge: 'Instant Transfer',
    popular: true,
    appScheme: 'santanderuk://',
    universalUrl: 'https://retail.santander.co.uk/',
    trueLayerProviderId: 'uk-ob-santander',
    plaidInstitutionId: 'ins_109513',
    features: ['One-Tap App Authorization', 'Secure Confirmation', 'Zero Fees'],
  },
  {
    id: 'halifax',
    name: 'Halifax',
    brandName: 'Halifax',
    primaryColor: '#00488F',
    accentColor: '#002E5D',
    textColor: '#FFFFFF',
    badge: 'Popular',
    popular: true,
    appScheme: 'halifax://',
    universalUrl: 'https://online.halifax.co.uk/personal/logon/login.jsp',
    trueLayerProviderId: 'uk-ob-halifax',
    plaidInstitutionId: 'ins_109510',
    features: ['FaceID / Fingerprint Sign-in', 'Instant Pay by Bank', 'Instant Notification'],
  },
  {
    id: 'monzo',
    name: 'Monzo Bank',
    brandName: 'Monzo',
    primaryColor: '#14233C',
    accentColor: '#FF3B30',
    textColor: '#FFFFFF',
    badge: 'Ultra Fast',
    popular: true,
    appScheme: 'monzo://',
    universalUrl: 'https://monzo.me/',
    trueLayerProviderId: 'uk-ob-monzo',
    plaidInstitutionId: 'ins_109514',
    features: ['One-Tap Deep Link', 'Instant In-App Approval', 'Immediate Confirmation'],
  },
  {
    id: 'starling',
    name: 'Starling Bank',
    brandName: 'Starling',
    primaryColor: '#253B80',
    accentColor: '#6935D3',
    textColor: '#FFFFFF',
    badge: 'Ultra Fast',
    popular: true,
    appScheme: 'starlingbank://',
    universalUrl: 'https://pay.starlingbank.com/',
    trueLayerProviderId: 'uk-ob-starling',
    plaidInstitutionId: 'ins_109515',
    features: ['Direct App Launch', 'FaceID Authentication', 'Real-time Receipt'],
  },
  {
    id: 'revolut',
    name: 'Revolut UK',
    brandName: 'Revolut',
    primaryColor: '#191C1F',
    accentColor: '#0075FF',
    textColor: '#FFFFFF',
    badge: 'Revolut Pay',
    popular: true,
    appScheme: 'revolut://',
    universalUrl: 'https://revolut.me/',
    trueLayerProviderId: 'uk-ob-revolut',
    plaidInstitutionId: 'ins_109516',
    features: ['Revolut Pay 1-Click', 'FaceID Authorization', 'Instant GBP Transfer'],
  },
  {
    id: 'nationwide',
    name: 'Nationwide Building Society',
    brandName: 'Nationwide',
    primaryColor: '#00174F',
    accentColor: '#D4143D',
    textColor: '#FFFFFF',
    badge: 'Instant Transfer',
    popular: true,
    appScheme: 'nationwide://',
    universalUrl: 'https://onlinebanking.nationwide.co.uk/',
    trueLayerProviderId: 'uk-ob-nationwide',
    plaidInstitutionId: 'ins_109517',
    features: ['Biometric App Security', 'Faster Payments', 'Instant Settlement'],
  },
];

/**
 * Clean & format UK Bank Sort Code (e.g. 200000 -> 20-00-00)
 */
export const formatSortCode = (raw?: string): string => {
  if (!raw) return '00-00-00';
  const clean = raw.replace(/\D/g, '').slice(0, 6);
  if (clean.length === 6) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
  }
  return raw;
};

/**
 * Format UK Faster Payments Payment Reference.
 * Faster Payments reference must be alphanumeric + dashes, maximum 18 characters.
 */
export const formatUKReference = (rawRef?: string, invoiceNumber?: string): string => {
  let ref = (rawRef || invoiceNumber || 'INV-PAY').trim();
  ref = ref.replace(/[^a-zA-Z0-9\-_#]/g, '');
  if (!ref) ref = 'AIE-INVOICE';
  return ref.slice(0, 18);
};

/**
 * Detects if the current user agent is iOS or Android mobile
 */
export const detectPlatform = (): { isMobile: boolean; isIOS: boolean; isAndroid: boolean } => {
  if (typeof navigator === 'undefined') {
    return { isMobile: false, isIOS: false, isAndroid: false };
  }
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /android/i.test(ua);
  const isMobile = isIOS || isAndroid || /mobile|blackberry|iemobile|kindle|silk/i.test(ua);
  return { isMobile, isIOS, isAndroid };
};

/**
 * Builds the comprehensive Open Banking intent and deep link URLs
 * conforming to Open Banking Implementation Entity (OBIE) / TrueLayer / Plaid / Revolut Pay standards.
 */
export const buildOpenBankingIntent = (
  bank: UKBankInfo,
  details: OpenBankingPaymentDetails
): OpenBankingIntentResult => {
  const cleanSort = details.sortCode.replace(/\D/g, '');
  const formattedSort = formatSortCode(details.sortCode);
  const cleanAcc = details.accountNumber.replace(/\D/g, '');
  const formattedRef = formatUKReference(details.reference, details.invoiceNumber);
  const amountStr = Number(details.amount || 0).toFixed(2);
  const currency = details.currency || 'GBP';
  const payee = (details.payeeName || 'AIE Skyline Limited').trim();

  // 1. Bank-specific Deep Link for direct app launch
  let appDeepLink = '';
  switch (bank.id) {
    case 'monzo':
      appDeepLink = `monzo://pay?recipient=${encodeURIComponent(payee)}&sort_code=${cleanSort}&account_number=${cleanAcc}&amount=${amountStr}&reference=${encodeURIComponent(formattedRef)}`;
      break;
    case 'revolut':
      appDeepLink = `revolut://pay?amount=${amountStr}&currency=${currency}&recipient=${encodeURIComponent(payee)}&reference=${encodeURIComponent(formattedRef)}`;
      break;
    case 'starling':
      appDeepLink = `starlingbank://transfer?sortCode=${cleanSort}&accountNumber=${cleanAcc}&amount=${amountStr}&reference=${encodeURIComponent(formattedRef)}`;
      break;
    case 'barclays':
      appDeepLink = `barclays://pay?sortcode=${cleanSort}&account=${cleanAcc}&amount=${amountStr}&ref=${encodeURIComponent(formattedRef)}`;
      break;
    case 'lloyds':
      appDeepLink = `lloydsbank://pay?sortcode=${cleanSort}&account=${cleanAcc}&amount=${amountStr}&ref=${encodeURIComponent(formattedRef)}`;
      break;
    case 'natwest':
      appDeepLink = `natwest://pay?sortcode=${cleanSort}&account=${cleanAcc}&amount=${amountStr}&ref=${encodeURIComponent(formattedRef)}`;
      break;
    case 'hsbc':
      appDeepLink = `hsbcuk://transfer?sortCode=${cleanSort}&accountNumber=${cleanAcc}&amount=${amountStr}&reference=${encodeURIComponent(formattedRef)}`;
      break;
    case 'santander':
      appDeepLink = `santanderuk://pay?sortcode=${cleanSort}&account=${cleanAcc}&amount=${amountStr}&ref=${encodeURIComponent(formattedRef)}`;
      break;
    case 'halifax':
      appDeepLink = `halifax://pay?sortcode=${cleanSort}&account=${cleanAcc}&amount=${amountStr}&ref=${encodeURIComponent(formattedRef)}`;
      break;
    case 'nationwide':
      appDeepLink = `nationwide://pay?sortcode=${cleanSort}&account=${cleanAcc}&amount=${amountStr}&ref=${encodeURIComponent(formattedRef)}`;
      break;
    default:
      appDeepLink = `${bank.appScheme}pay?sortcode=${cleanSort}&account=${cleanAcc}&amount=${amountStr}&ref=${encodeURIComponent(formattedRef)}`;
  }

  // 2. Open Banking TrueLayer / Plaid / PISP universal intent URL
  const consentId = `OBP-${details.invoiceNumber}-${Date.now().toString(36)}`;
  const truelayerParams = new URLSearchParams({
    provider_id: bank.trueLayerProviderId,
    client_id: 'aie-skyline-open-banking',
    account_number: cleanAcc,
    sort_code: cleanSort,
    beneficiary_name: payee,
    amount: amountStr,
    currency: currency,
    reference: formattedRef,
    consent_id: consentId,
    redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/invoice-pay?id=${encodeURIComponent(details.invoiceId)}&status=complete` : '',
  });
  const truelayerUrl = `https://pay.truelayer.com/payments#${truelayerParams.toString()}`;

  // 3. Revolut Pay integration URL if Revolut
  let revolutPayUrl: string | undefined = undefined;
  if (bank.id === 'revolut') {
    revolutPayUrl = `https://revolut.me/pay?amount=${amountStr}&currency=GBP&recipient=${encodeURIComponent(payee)}&reference=${encodeURIComponent(formattedRef)}`;
  }

  // 4. Standard Open Banking Intent URI scheme for mobile OS app handling
  const openBankingUrl = `intent://openbanking.org.uk/pisp?provider=${bank.trueLayerProviderId}&sortCode=${cleanSort}&accountNumber=${cleanAcc}&payee=${encodeURIComponent(payee)}&amount=${amountStr}&currency=${currency}&ref=${encodeURIComponent(formattedRef)}#Intent;scheme=openbanking;package=${bank.appScheme.replace('://', '')};end`;

  // 5. Scannable UK Banking / Faster Payments standard payload
  const qrPayload = [
    'UK FASTER PAYMENTS TRANSFER',
    `Payee: ${payee}`,
    `Bank: ${details.payeeBankName || bank.name}`,
    `Sort Code: ${formattedSort}`,
    `Account: ${cleanAcc}`,
    `Amount: £${amountStr} ${currency}`,
    `Reference: ${formattedRef}`,
    `Invoice: ${details.invoiceNumber}`,
  ].join('\n');

  return {
    bank,
    appDeepLink,
    openBankingUrl,
    truelayerUrl,
    revolutPayUrl,
    qrPayload,
    formattedReference: formattedRef,
    formattedSortCode: formattedSort,
    cleanSortCode: cleanSort,
    displayAmount: `£${Number(amountStr).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
};

/**
 * Triggers one-tap mobile handoff to the selected bank app
 */
export const launchBankAppHandoff = (
  intent: OpenBankingIntentResult,
  onFallback?: () => void
): { success: boolean; launchedApp: boolean } => {
  const { isMobile } = detectPlatform();

  // Try opening native app scheme
  try {
    if (isMobile) {
      // Primary attempt: Native banking app URI scheme
      const link = document.createElement('a');
      link.href = intent.appDeepLink;
      link.rel = 'noopener noreferrer';
      link.click();

      // Fallback timer: if the app is not installed, route to web / universal link
      const start = Date.now();
      setTimeout(() => {
        if (Date.now() - start < 1800) {
          // If execution returned immediately, app might not have opened
          if (onFallback) onFallback();
        }
      }, 1200);

      return { success: true, launchedApp: true };
    } else {
      // Desktop / Tablet: Open universal open banking flow or banking web portal in new window
      window.open(intent.universalUrl, '_blank', 'noopener,noreferrer');
      return { success: true, launchedApp: false };
    }
  } catch (err) {
    console.warn('[OpenBanking] Could not launch app scheme directly:', err);
    if (onFallback) onFallback();
    return { success: false, launchedApp: false };
  }
};
