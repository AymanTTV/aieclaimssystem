import React, { useState, useEffect } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import {
  Customer,
  Vehicle,
  Rental,
  Invoice,
  MaintenanceLog,
  Claim
} from '../types';
import { LegalHandler } from '../types/legalHandler';
import {
  sendEmail,
  generateRentalEmailContent,
  generateMaintenanceEmailContent,
  generateInvoiceEmailContent,
  generateClaimEmailContent
} from '../utils/emailService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, Mail } from 'lucide-react';
import { useServiceCenters } from '../hooks/useServiceCenters'; // Corrected import: Use the new hook
import { fetchLegalHandlers } from '../utils/legalHandlers';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

type EmailType = 'rental' | 'maintenance' | 'invoice' | 'custom' | 'claim';

interface RelatedRecord {
  id: string;
  type: 'rental' | 'maintenance' | 'invoice' | 'claim';
  title: string;
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  rentalType?: string;
  documentUrl?: string;
  amount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  claimStatus?: string;
  claimAmount?: number;
  claimDescription?: string;
}

const safeToDate = (timestamp: any): Date | null => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return null;
};

const BulkEmail = () => {
  const { customers } = useCustomers();
  const { vehicles } = useVehicles();
  const { rentals } = useRentals();
  // Use the new useServiceCenters hook for real-time data
  const { serviceCenters, loading: loadingServiceCenters } = useServiceCenters();

  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [emailType, setEmailType] = useState<EmailType>('custom');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<RelatedRecord | null>(null);
  const [legalHandlers, setLegalHandlers] = useState<LegalHandler[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [showBankDetails, setShowBankDetails] = useState(false); // State for bank details checkbox


  // ── Load legal handlers if we’re sending claim emails ──
  useEffect(() => {
    const loadLegalHandlers = async () => {
      try {
        const handlers = await fetchLegalHandlers();
        setLegalHandlers(handlers);
      } catch (error) {
        console.error('Error fetching legal handlers:', error);
        toast.error('Failed to load legal handlers');
      }
    };
    if (emailType === 'claim') {
      loadLegalHandlers();
    }
  }, [emailType]);

  // ── Fetch maintenance logs ──
  useEffect(() => {
    const fetchMaintenanceLogs = async () => {
      const q = query(collection(db, 'maintenanceLogs'));
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: safeToDate(doc.data().date)
      })) as MaintenanceLog[];
      setMaintenanceLogs(logs);
    };
    if (emailType === 'maintenance') {
      fetchMaintenanceLogs();
    }
  }, [emailType]);

  // ── Fetch invoices ──
  useEffect(() => {
    const fetchInvoices = async () => {
      const q = query(collection(db, 'invoices'));
      const snapshot = await getDocs(q);
      const invoiceData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: safeToDate(doc.data().date),
        dueDate: safeToDate(doc.data().dueDate)
      })) as Invoice[];
      setInvoices(invoiceData);
    };
    if (emailType === 'invoice') {
      fetchInvoices();
    }
  }, [emailType]);

  // ── Fetch claims ──
  useEffect(() => {
    const fetchClaims = async () => {
      const q = query(collection(db, 'claims'));
      const snapshot = await getDocs(q);
      const claimData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: safeToDate(data.createdAt),
          updatedAt: safeToDate(data.updatedAt),
          dateOfEvent: safeToDate(data.dateOfEvent),
          submitter: {
            ...data.submitter,
            dob: safeToDate(data.submitter?.dob)
          },
          driver: {
            ...data.driver,
            dob: safeToDate(data.driver?.dob)
          },
          vehicle: {
            ...data.vehicle,
            motExpiry: safeToDate(data.vehicle?.motExpiry)
          },
          gpInformation: {
            ...data.gpInformation,
            gpDate: safeToDate(data.gpInformation?.gpDate)
          },
          hospitalInformation: {
            ...data.hospitalInformation,
            hospitalDate: safeToDate(data.hospitalInformation?.hospitalDate)
          },
          hireDetails: data.hireDetails
            ? {
                ...data.hireDetails,
                startDate: safeToDate(data.hireDetails?.startDate),
                endDate: safeToDate(data.hireDetails?.endDate)
              }
            : undefined,
          recovery: data.recovery
            ? {
                ...data.recovery,
                date: safeToDate(data.recovery?.date)
              }
            : undefined,
          storage: data.storage
            ? {
                ...data.storage,
                startDate: safeToDate(data.storage?.startDate),
                endDate: safeToDate(data.storage?.endDate)
              }
            : undefined,
          progressHistory:
            data.progressHistory?.map((item: any) => ({
              ...item,
              date: safeToDate(item.date)
            })) || [],
          fileHandlers: {
            aieHandler: data.fileHandlers?.aieHandler || '',
            legalHandler: data.fileHandlers?.legalHandler
              ? ({
                  id:
                    typeof data.fileHandlers.legalHandler === 'string'
                      ? data.fileHandlers.legalHandler
                      : data.fileHandlers.legalHandler.id
                } as LegalHandler)
              : null
          }
        } as Claim;
      });
      setClaims(claimData);
    };
    if (emailType === 'claim') {
      fetchClaims();
    }
  }, [emailType]);

  // ─────────────── Filter Recipients ───────────────
  const filteredRecipients = React.useMemo(() => {
    const q = searchQuery.toLowerCase();

    if (emailType === 'maintenance') {
      let filtered = serviceCenters; // Use serviceCenters from the hook
      if (searchQuery) {
        filtered = filtered.filter(
          (center) =>
            center.name.toLowerCase().includes(q) ||
            center.address.toLowerCase().includes(q) ||
            center.email?.toLowerCase().includes(q)
        );
      }
      return filtered;
    } else if (emailType === 'claim') {
      let filtered = legalHandlers;
      if (searchQuery) {
        filtered = filtered.filter(
          (handler) =>
            handler.name.toLowerCase().includes(q) ||
            handler.email?.toLowerCase().includes(q) ||
            handler.phone?.toLowerCase().includes(q)
        );
      }
      return filtered;
    } else {
      let filtered = customers;
      if (searchQuery) {
        filtered = filtered.filter(
          (customer) =>
            customer.fullName.toLowerCase().includes(q) || // Assuming customers have fullName for searching
            customer.mobile.includes(q) ||
            customer.email.toLowerCase().includes(q)
        );
      }
      if (emailType === 'rental') {
        filtered = filtered.filter((cust) =>
          rentals.some((r) => r.customerId === cust.id)
        );
      } else if (emailType === 'invoice') {
        filtered = filtered.filter((cust) =>
          invoices.some((inv) => inv.customerId === cust.id)
        );
      }
      return filtered;
    }
  }, [
    emailType,
    searchQuery,
    customers,
    serviceCenters, // Dependency for the hook's data
    rentals,
    invoices,
    legalHandlers
  ]);

  const handleEmailTypeChange = (type: EmailType) => {
    setEmailType(type);
    setSelectedRecord(null);
    setSelectedRecipients([]);
    setSubject('');
    setMessage('');
    setShowBankDetails(false); // Reset bank details on type change
  };

  // ─────────────── Select/Deselect a Recipient ───────────────
  const handleRecipientSelect = (id: string) => {
    let recipientEmail: string | undefined;

    if (emailType === 'maintenance') {
      const center = serviceCenters.find((c) => c.id === id);
      if (!center) return;
      recipientEmail = center.email;
    } else if (emailType === 'claim') {
      const handler = legalHandlers.find((h) => h.id === id);
      if (!handler) return;
      recipientEmail = handler.email;
    } else {
      const customer = customers.find((c) => c.id === id);
      if (!customer) return;
      recipientEmail = customer.email;
    }

    if (!recipientEmail) {
      toast.error(`Selected recipient does not have an email address configured.`);
      return;
    }

    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  // ─────────────── Return “Related Records” for a given recipient ───────────────
  const getRelatedRecords = (recipientId: string): RelatedRecord[] => {
    switch (emailType) {
      case 'maintenance': {
        const serviceCenter = serviceCenters.find((c) => c.id === recipientId);
        if (!serviceCenter) return [];
        return maintenanceLogs
          .filter((log) => log.serviceProvider === serviceCenter.name)
          .map((log) => {
            const vehicle = vehicles.find((v) => v.id === log.vehicleId);
            return {
              id: log.id,
              type: 'maintenance',
              title: `${log.type
                .replace('-', ' ')
                .trim()} – ${vehicle?.registrationNumber || 'Unknown'} – ${format(
                log.date!,
                'dd/MM/yyyy'
              )}`,
              date: log.date!
            };
          });
      }

      case 'rental':
        return rentals
          .filter((r) => r.customerId === recipientId)
          .map((rental) => {
            const vehicle = vehicles.find((v) => v.id === rental.vehicleId);
            return {
              id: rental.id,
              type: 'rental',
              title: `Rental – ${
                vehicle
                  ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
                  : 'Unknown Vehicle'
              }`,
              date: rental.startDate,
              startDate: rental.startDate,
              endDate: rental.endDate,
              rentalType: rental.type
            };
          });

      case 'invoice':
        return invoices
          .filter((inv) => inv.customerId === recipientId)
          .map((inv) => ({
            id: inv.id,
            type: 'invoice',
            title: `Invoice #${inv.id.slice(-8).toUpperCase()}`,
            date: inv.date!,
            amount: inv.amount,
            paidAmount: inv.paidAmount,
            remainingAmount: inv.remainingAmount
          }));

      case 'claim':
        return claims
          .filter((c) => {
            const handlerId = c.fileHandlers?.legalHandler?.id;
            return handlerId === recipientId;
          })
          .map((c) => ({
            id: c.id,
            type: 'claim',
            title: `Claim Ref: ${c.claimId || c.id.slice(-8).toUpperCase()}`,
            date: c.dateOfEvent || c.createdAt!,
            claimStatus: c.progress,
            claimAmount: c.claimAmount,
            claimDescription: c.accidentDetails?.cause || 'No description available'
          }));

      default:
        return [];
    }
  };

  // ─────────────── Called when a “Related Record” is clicked ───────────────
  const handleRecordSelect = (record: RelatedRecord) => {
    setSelectedRecord(record);

    // Reset subject and message to default for the selected type, then generate
    setSubject('');
    setMessage('');

    // Logic to set subject and message based on the selected record type
    switch (record.type) {
      case 'rental': {
        const rental = rentals.find((r) => r.id === record.id);
        const vehicle = rental ? vehicles.find((v) => v.id === rental.vehicleId) : undefined;
        const customer = rental ? customers.find((c) => c.id === rental.customerId) : undefined;
        if (customer && rental && vehicle) {
          const content = generateRentalEmailContent(customer, rental, vehicle);
          setSubject(content.subject);
          setMessage(content.message);
        }
        break;
      }

      case 'maintenance': {
        const log = maintenanceLogs.find((l) => l.id === record.id);
        const vehicle = log ? vehicles.find((v) => v.id === log.vehicleId) : undefined;
        const serviceCenter = log ? serviceCenters.find(
          (c) => c.name === log.serviceProvider
        ) : undefined;
        if (serviceCenter && log && vehicle) {
          const content = generateMaintenanceEmailContent(
            serviceCenter,
            log,
            vehicle
          );
          setSubject(content.subject);
          setMessage(content.message);
        }
        break;
      }

      case 'invoice': {
        const inv = invoices.find((i) => i.id === record.id);
        const customer = inv ? customers.find((c) => c.id === inv.customerId) : undefined;
        if (customer && inv) {
          const content = generateInvoiceEmailContent(customer, inv);
          setSubject(content.subject);
          setMessage(content.message);
        }
        break;
      }

      case 'claim': {
        const c = claims.find((c2) => c2.id === record.id);
        if (!c) break;
        // Find “legal handler” object for this claim
        const handlerForThisClaim = legalHandlers.find(
          (h) => h.id === c.fileHandlers?.legalHandler?.id
        );

        // Figure out which “client” to show (driver if isClaimant=true, else submitter)
        let client: Customer | null = null;
        if (c.driver?.isClaimant) {
          client = {
            id: '', // Dummy ID
            fullName: c.driver.fullName || '',
            mobile: c.driver.contactNumber || '',
            email: c.driver.email || ''
          } as Customer; // Cast to Customer to match interface
        } else if (c.submitter) {
          client = {
            id: '', // Dummy ID
            fullName: c.submitter.fullName || '',
            mobile: '', // Assuming submitter doesn't have a mobile in this context
            email: c.submitter.email || ''
          } as Customer; // Cast to Customer to match interface
        }

        const content = generateClaimEmailContent(c, client, handlerForThisClaim);
        setSubject(content.subject);
        setMessage(content.message);
        break;
      }
    }
  };

  // ─────────────── Send the emails ───────────────
  const handleSendEmails = async () => {
    if (!selectedRecipients.length) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (!subject || !message) {
      toast.error('Please provide both subject and message');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const recipientId of selectedRecipients) {
        try {
          let toName: string;
          let toEmail: string;

          if (emailType === 'maintenance') {
            const center = serviceCenters.find((c) => c.id === recipientId);
            if (!center) throw new Error('Service center not found');
            toName = center.name;
            toEmail = center.email;
          } else if (emailType === 'claim') {
            const handler = legalHandlers.find((h) => h.id === recipientId);
            if (!handler) throw new Error('Legal handler not found');
            toName = handler.name;
            toEmail = handler.email;
          } else {
            const cust = customers.find((c) => c.id === recipientId);
            if (!cust) throw new Error('Customer not found');
            toName = cust.fullName; // Use fullName for customers
            toEmail = cust.email;
          }

          // Decide “showBankDetails” and “reference” based on selectedRecord and emailType
          let currentShowBankDetails = showBankDetails; // Start with the checkbox state
          let reference = '';

          if (selectedRecord && selectedRecord.id === recipientId) { // Apply record-specific details only if this record is selected for THIS recipient
            switch (selectedRecord.type) {
              case 'rental': {
                const r = rentals.find((r2) => r2.id === selectedRecord.id);
                const v = r ? vehicles.find((v2) => v2.id === r.vehicleId) : undefined;
                if (r) currentShowBankDetails = (r.remainingAmount || 0) > 0;
                if (v) reference = v.registrationNumber;
                break;
              }
              case 'invoice': {
                const inv = invoices.find((i) => i.id === selectedRecord.id);
                if (inv) currentShowBankDetails = (inv.remainingAmount || 0) > 0;
                if (inv) reference = `INV-${inv.id.slice(-8).toUpperCase()}`;
                break;
              }
              case 'claim': {
                const c = claims.find((c2) => c2.id === selectedRecord.id);
                currentShowBankDetails = false; // Claims usually don't involve bank details for payment
                if (c) reference = `CLAIM-${c.claimId || c.id.slice(-8).toUpperCase()}`;
                break;
              }
            }
          }

          const emailParams = {
            to_name: toName,
            to_email: toEmail,
            subject,
            message,
            show_bank_details: currentShowBankDetails,
            reference,
            reply_to: 'admin@aieskyline.co.uk'
          };

          await sendEmail(emailParams);
          successCount++;
        } catch (err) {
          console.error(`Failed to send to ${recipientId}`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `Successfully sent ${successCount} email${
            successCount > 1 ? 's' : ''
          }`
        );
        setSelectedRecipients([]);
        setSubject('');
        setMessage('');
        setSelectedRecord(null);
        setShowBankDetails(false);
      }
      if (failCount > 0) {
        toast.error(
          `Failed to send ${failCount} email${failCount > 1 ? 's' : ''}`
        );
      }
    } catch (err) {
      console.error('Error sending emails:', err);
      toast.error('Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ───────────────────────── Page Header ───────────────────────── */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Email</h1>
      </div>

      {/* ───────────────────────── Email Type Selection ───────────────────────── */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Email Type</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['custom', 'rental', 'maintenance', 'invoice', 'claim'] as EmailType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => handleEmailTypeChange(type)}
                className={`px-4 py-2 rounded-md ${
                  emailType === type
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* ───────────────────────── Recipients Selection ───────────────────────── */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Select{' '}
            {emailType === 'maintenance'
              ? 'Service Centers'
              : emailType === 'claim'
              ? 'Legal Handlers'
              : 'Recipients'}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${
                  emailType === 'maintenance'
                    ? 'service centers'
                    : emailType === 'claim'
                    ? 'legal handlers'
                    : 'recipients'
                }...`}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredRecipients.map((recipient: any) => { // Use 'any' here for flexibility with different types
            const name = recipient.fullName || recipient.name; // Prioritize fullName for customers
            const email = recipient.email || '';
            const phone =
              'phone' in recipient
                ? recipient.phone
                : 'mobile' in recipient
                ? recipient.mobile
                : undefined;

            return (
              <div
                key={recipient.id}
                className={`p-4 rounded-lg border ${
                  selectedRecipients.includes(recipient.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-sm text-gray-500">
                      {email || 'No email configured'}
                    </div>
                    {phone && (
                      <div className="text-sm text-gray-500">{phone}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRecipientSelect(recipient.id)}
                    className={`p-2 rounded-full ${
                      selectedRecipients.includes(recipient.id)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                    disabled={!email}
                  >
                    <Mail className="h-4 w-4" />
                  </button>
                </div>

                {selectedRecipients.includes(recipient.id) && (
                  <div className="mt-3 border-t pt-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {emailType === 'maintenance'
                        ? 'Assigned Maintenance'
                        : emailType === 'claim'
                        ? 'Assigned Claims'
                        : 'Related Records'}
                      :
                    </div>
                    <div className="space-y-2">
                      {getRelatedRecords(recipient.id).map((record) => (
                        <button
                          key={record.id}
                          onClick={() => handleRecordSelect(record)}
                          className={`w-full text-left px-3 py-2 rounded text-sm ${
                            selectedRecord?.id === record.id
                              ? 'bg-primary text-white'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="font-medium">{record.title}</div>
                          {record.type === 'rental' && record.startDate && record.endDate && (
                            <div className="text-xs opacity-75">
                              {format(record.startDate, 'dd/MM/yyyy')} -{' '}
                              {format(record.endDate, 'dd/MM/yyyy')}
                              <br />
                              Type: {record.rentalType}
                            </div>
                          )}
                          {record.type === 'invoice' && (
                            <div className="text-xs opacity-75">
                              Amount: £{record.amount?.toFixed(2)}
                              <br />
                              Remaining: £{record.remainingAmount?.toFixed(2)}
                            </div>
                          )}
                          {record.type === 'claim' && (
                            <div className="text-xs opacity-75">
                              Status: {record.claimStatus}
                              <br />
                              Amount: £{record.claimAmount?.toFixed(2)}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────── Email Content ───────────────────────── */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Email Content</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="Enter email subject"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="Enter email message"
            />
          </div>
          {emailType === 'invoice' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showBankDetails"
                checked={showBankDetails}
                onChange={(e) => setShowBankDetails(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="showBankDetails" className="ml-2 block text-sm font-medium text-gray-700">
                Include Bank Details
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────── Send Button ───────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleSendEmails}
          disabled={loading || !selectedRecipients.length}
          className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Sending...'
            : `Send Email${selectedRecipients.length > 1 ? 's' : ''} (${
                selectedRecipients.length
              } selected)`}
        </button>
      </div>
    </div>
  );
};

export default BulkEmail;
