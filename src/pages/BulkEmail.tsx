import React, { useState, useEffect } from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import { Customer, Vehicle, Rental, Invoice, MaintenanceLog } from '../types';
import { sendEmail, generateRentalEmailContent, generateMaintenanceEmailContent, generateInvoiceEmailContent } from '../utils/emailService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, Mail } from 'lucide-react';
import { fetchServiceCenters, ServiceCenter } from '../utils/serviceCenters';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

type EmailType = 'rental' | 'maintenance' | 'invoice' | 'custom';

interface RelatedRecord {
  id: string;
  type: 'rental' | 'maintenance' | 'invoice';
  title: string;
  date: Date;
  startDate?: Date;
  endDate?: Date;
  rentalType?: string;
  documentUrl?: string;
  amount?: number;
  paidAmount?: number;
  remainingAmount?: number;
}

const BulkEmail = () => {
  const { customers } = useCustomers();
  const { vehicles } = useVehicles();
  const { rentals } = useRentals();
  
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [emailType, setEmailType] = useState<EmailType>('custom');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<RelatedRecord | null>(null);
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    const loadServiceCenters = async () => {
      const centers = await fetchServiceCenters();
      setServiceCenters(centers);
    };

    if (emailType === 'maintenance') {
      loadServiceCenters();
    }
  }, [emailType]);

  useEffect(() => {
    const fetchMaintenanceLogs = async () => {
      const q = query(collection(db, 'maintenanceLogs'));
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      })) as MaintenanceLog[];
      setMaintenanceLogs(logs);
    };

    if (emailType === 'maintenance') {
      fetchMaintenanceLogs();
    }
  }, [emailType]);

  useEffect(() => {
    const fetchInvoices = async () => {
      const q = query(collection(db, 'invoices'));
      const snapshot = await getDocs(q);
      const invoiceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        dueDate: doc.data().dueDate.toDate()
      })) as Invoice[];
      setInvoices(invoiceData);
    };

    if (emailType === 'invoice') {
      fetchInvoices();
    }
  }, [emailType]);

  const filteredRecipients = React.useMemo(() => {
    if (emailType === 'maintenance') {
      let filtered = serviceCenters;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(center => 
          center.name.toLowerCase().includes(query) ||
          center.address.toLowerCase().includes(query) ||
          center.email?.toLowerCase().includes(query)
        );
      }
      return filtered;
    } else {
      let filtered = customers;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(customer => 
          customer.name.toLowerCase().includes(query) ||
          customer.mobile.includes(query) ||
          customer.email.toLowerCase().includes(query)
        );
      }

      // Filter based on email type
      if (emailType === 'rental') {
        filtered = filtered.filter(customer =>
          rentals.some(rental => rental.customerId === customer.id)
        );
      } else if (emailType === 'invoice') {
        filtered = filtered.filter(customer =>
          invoices.some(invoice => invoice.customerId === customer.id)
        );
      }

      return filtered;
    }
  }, [emailType, searchQuery, customers, serviceCenters, rentals, invoices]);

  const handleEmailTypeChange = (type: EmailType) => {
    setEmailType(type);
    setSelectedRecord(null);
    setSelectedRecipients([]);
    setSubject('');
    setMessage('');
  };

  const handleRecipientSelect = (id: string) => {
    if (emailType === 'maintenance') {
      const center = serviceCenters.find(c => c.id === id);
      if (!center) return;

      if (!center.email) {
        toast.error(`${center.name} does not have an email address configured`);
        return;
      }
    }

    setSelectedRecipients(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const getRelatedRecords = (recipientId: string): RelatedRecord[] => {
    switch (emailType) {
      case 'maintenance':
      const serviceCenter = serviceCenters.find(center => center.id === recipientId);
      if (!serviceCenter) return [];
      return maintenanceLogs
        .filter(log => log.serviceProvider === serviceCenter.name)
        .map(log => {
          const vehicle = vehicles.find(v => v.id === log.vehicleId);
          return {
            id: log.id,
            type: 'maintenance',
            title: `${log.type.replace('-', ' ')} - ${vehicle?.registrationNumber || 'Unknown'} - ${format(log.date, 'dd/MM/yyyy')}`,
            date: log.date,
          };
        });

      case 'rental':
        return rentals
          .filter(rental => rental.customerId === recipientId)
          .map(rental => {
            const vehicle = vehicles.find(v => v.id === rental.vehicleId);
            return {
              id: rental.id,
              type: 'rental',
              title: `Rental - ${vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})` : 'Unknown Vehicle'}`,
              date: rental.startDate,
              startDate: rental.startDate,
              endDate: rental.endDate,
              rentalType: rental.type
            };
          });

      case 'invoice':
        return invoices
          .filter(invoice => invoice.customerId === recipientId)
          .map(invoice => ({
            id: invoice.id,
            type: 'invoice',
            title: `Invoice #${invoice.id.slice(-8).toUpperCase()}`,
            date: invoice.date,
            amount: invoice.amount,
            paidAmount: invoice.paidAmount,
            remainingAmount: invoice.remainingAmount
          }));

      default:
        return [];
    }
  };

  const handleRecordSelect = (record: RelatedRecord) => {
    setSelectedRecord(record);

    // Update email content based on record type
    switch (record.type) {
      case 'rental': {
        const rental = rentals.find(r => r.id === record.id);
        const vehicle = vehicles.find(v => v.id === rental?.vehicleId);
        const customer = customers.find(c => c.id === rental?.customerId);
        
        if (rental && vehicle && customer) {
          const content = generateRentalEmailContent(customer, rental, vehicle);
          setSubject(content.subject);
          setMessage(content.message);
        }
        break;
      }

      case 'maintenance': {
        const log = maintenanceLogs.find(l => l.id === record.id);
        const vehicle = vehicles.find(v => v.id === log?.vehicleId);
        const serviceCenter = serviceCenters.find(c => c.name === log?.serviceProvider);
        
        if (log && vehicle && serviceCenter) {
          const content = generateMaintenanceEmailContent(serviceCenter, log, vehicle);
          setSubject(content.subject);
          setMessage(content.message);
        }
        break;
      }

      case 'invoice': {
        const invoice = invoices.find(i => i.id === record.id);
        const customer = customers.find(c => c.id === invoice?.customerId);
        
        if (invoice && customer) {
          const content = generateInvoiceEmailContent(customer, invoice);
          setSubject(content.subject);
          setMessage(content.message);
        }
        break;
      }
    }
  };

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
          let emailParams;
          
          if (emailType === 'maintenance') {
            const center = serviceCenters.find(c => c.id === recipientId);
            if (!center?.email) continue;

            emailParams = {
              to_name: center.name,
              to_email: center.email,
              subject,
              message,
              reply_to: 'admin@aieskyline.co.uk'
            };
          } else {
            const customer = customers.find(c => c.id === recipientId);
            if (!customer) continue;

            let showBankDetails = false;
            let reference = '';

            if (selectedRecord) {
              switch (selectedRecord.type) {
                case 'rental': {
                  const rental = rentals.find(r => r.id === selectedRecord.id);
                  const vehicle = vehicles.find(v => v.id === rental?.vehicleId);
                  showBankDetails = rental?.remainingAmount > 0;
                  reference = vehicle?.registrationNumber || '';
                  break;
                }
                case 'invoice': {
                  const invoice = invoices.find(i => i.id === selectedRecord.id);
                  showBankDetails = invoice?.remainingAmount > 0;
                  reference = `INV-${invoice?.id.slice(-8).toUpperCase()}`;
                  break;
                }
              }
            }

            emailParams = {
              to_name: customer.name,
              to_email: customer.email,
              subject,
              message,
              show_bank_details: showBankDetails,
              reference,
              reply_to: 'admin@aieskyline.co.uk'
            };
          }

          await sendEmail(emailParams);
          successCount++;
        } catch (error) {
          console.error(`Failed to send email to recipient ${recipientId}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} email${successCount > 1 ? 's' : ''}`);
        setSelectedRecipients([]);
        setSubject('');
        setMessage('');
        setSelectedRecord(null);
      }
      if (failCount > 0) {
        toast.error(`Failed to send ${failCount} email${failCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Email</h1>
      </div>

      {/* Email Type Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Email Type</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['custom', 'rental', 'maintenance', 'invoice'].map(type => (
            <button
              key={type}
              onClick={() => handleEmailTypeChange(type as EmailType)}
              className={`px-4 py-2 rounded-md ${
                emailType === type 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Recipients Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Select {emailType === 'maintenance' ? 'Service Centers' : 'Recipients'}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${emailType === 'maintenance' ? 'service centers' : 'recipients'}...`}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredRecipients.map(recipient => {
            const isServiceCenter = emailType === 'maintenance';
            const name = isServiceCenter ? (recipient as ServiceCenter).name : (recipient as Customer).name;
            const email = isServiceCenter ? (recipient as ServiceCenter).email : (recipient as Customer).email;
            const phone = isServiceCenter ? (recipient as ServiceCenter).phone : (recipient as Customer).mobile;
            
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
                    <div className="text-sm text-gray-500">{email || 'No email configured'}</div>
                    <div className="text-sm text-gray-500">{phone}</div>
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
                      {emailType === 'maintenance' ? 'Assigned Maintenance' : 'Related Records'}:
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
                              {format(record.startDate, 'dd/MM/yyyy')} - {format(record.endDate, 'dd/MM/yyyy')}
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

      {/* Email Content */}
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
        </div>
      </div>

      {/* Send Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSendEmails}
          disabled={loading || !selectedRecipients.length}
          className="px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading 
            ? 'Sending...' 
            : `Send Email${selectedRecipients.length > 1 ? 's' : ''} (${selectedRecipients.length} selected)`
          }
        </button>
      </div>
    </div>
  );
};

export default BulkEmail;