// src/utils/dynamicTagsService.ts
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { DynamicTag } from '../types/dynamicTags';

// Built-in system parameter tags covering all pages and entry cards
export const SYSTEM_DYNAMIC_TAGS: DynamicTag[] = [
  // ─── A. GLOBAL & CONTACT TAGS ───
  {
    id: 'sys_customer_name',
    tag: '{customer_name}',
    label: 'Customer Full Name',
    category: 'global',
    description: 'Full name or company name of the recipient',
    sampleValue: 'John Doe',
    isSystem: true,
  },
  {
    id: 'sys_recipient_name',
    tag: '{recipient_name}',
    label: 'Recipient Name',
    category: 'global',
    description: 'Name of message recipient (driver, client, garage or solicitor)',
    sampleValue: 'John Doe',
    isSystem: true,
  },
  {
    id: 'sys_driver_name',
    tag: '{driver_name}',
    label: 'Driver Name',
    category: 'global',
    description: 'Designated or active driver full name',
    sampleValue: 'John Doe',
    isSystem: true,
  },
  {
    id: 'sys_first_name',
    tag: '{first_name}',
    label: 'Recipient First Name',
    category: 'global',
    description: 'First name derived from recipient name',
    sampleValue: 'John',
    isSystem: true,
  },
  {
    id: 'sys_last_name',
    tag: '{last_name}',
    label: 'Recipient Last Name',
    category: 'global',
    description: 'Last / family name of recipient',
    sampleValue: 'Doe',
    isSystem: true,
  },
  {
    id: 'sys_company_name',
    tag: '{company_name}',
    label: 'Company Name',
    category: 'global',
    description: 'Registered organization or trade name',
    sampleValue: 'AIE Skyline Limited',
    isSystem: true,
  },
  {
    id: 'sys_customer_phone',
    tag: '{customer_phone}',
    label: 'Customer Phone',
    category: 'global',
    description: 'Customer contact phone number',
    sampleValue: '07552 553441',
    isSystem: true,
  },
  {
    id: 'sys_mobile',
    tag: '{mobile}',
    label: 'Mobile / WhatsApp Phone',
    category: 'global',
    description: 'Mobile telephone number',
    sampleValue: '07552 553441',
    isSystem: true,
  },
  {
    id: 'sys_customer_email',
    tag: '{customer_email}',
    label: 'Customer Email',
    category: 'global',
    description: 'Customer primary email contact',
    sampleValue: 'john.doe@example.com',
    isSystem: true,
  },
  {
    id: 'sys_email',
    tag: '{email}',
    label: 'Email Address',
    category: 'global',
    description: 'Recipient primary email contact',
    sampleValue: 'john.doe@example.com',
    isSystem: true,
  },
  {
    id: 'sys_customer_address',
    tag: '{customer_address}',
    label: 'Customer Full Address',
    category: 'global',
    description: 'Customer street, town and postcode address',
    sampleValue: '124 Skyline Way, London E1 6AN',
    isSystem: true,
  },
  {
    id: 'sys_category',
    tag: '{category}',
    label: 'Recipient Category',
    category: 'global',
    description: 'Target segment (Member, Company, or Claim)',
    sampleValue: 'Member',
    isSystem: true,
  },
  {
    id: 'sys_today_date',
    tag: '{today_date}',
    label: "Today's Date",
    category: 'global',
    description: 'Current formatted date (e.g. 25 Sep 2026)',
    sampleValue: format(new Date(), 'dd MMM yyyy'),
    isSystem: true,
  },
  {
    id: 'sys_today',
    tag: '{today}',
    label: "Today's Short Date",
    category: 'global',
    description: 'Current formatted date (e.g. 25/09/2026)',
    sampleValue: format(new Date(), 'dd/MM/yyyy'),
    isSystem: true,
  },
  {
    id: 'sys_date',
    tag: '{date}',
    label: 'Current Standard Date',
    category: 'global',
    description: 'Numeric date format (DD/MM/YYYY)',
    sampleValue: format(new Date(), 'dd/MM/yyyy'),
    isSystem: true,
  },
  {
    id: 'sys_current_time',
    tag: '{current_time}',
    label: 'Current Time',
    category: 'global',
    description: 'Current system time (HH:mm)',
    sampleValue: format(new Date(), 'HH:mm'),
    isSystem: true,
  },

  // ─── B. FLEET & VEHICLE TAGS ───
  {
    id: 'sys_vehicle_reg',
    tag: '{vehicle_reg}',
    label: 'Vehicle VRM Reg',
    category: 'vehicle',
    description: 'Vehicle registration plate number',
    sampleValue: 'BD18 XYZ',
    isSystem: true,
  },
  {
    id: 'sys_make_model',
    tag: '{make_model}',
    label: 'Vehicle Make & Model',
    category: 'vehicle',
    description: 'Vehicle manufacturer and specification',
    sampleValue: 'Toyota Prius Hybrid',
    isSystem: true,
  },
  {
    id: 'sys_vehicle_make',
    tag: '{vehicle_make}',
    label: 'Vehicle Make',
    category: 'vehicle',
    description: 'Vehicle manufacturer brand',
    sampleValue: 'Toyota',
    isSystem: true,
  },
  {
    id: 'sys_vehicle_model',
    tag: '{vehicle_model}',
    label: 'Vehicle Model',
    category: 'vehicle',
    description: 'Vehicle model name',
    sampleValue: 'Prius Hybrid',
    isSystem: true,
  },
  {
    id: 'sys_vehicle_year',
    tag: '{year}',
    label: 'Vehicle Year',
    category: 'vehicle',
    description: 'Year of vehicle manufacture/registration',
    sampleValue: '2023',
    isSystem: true,
  },
  {
    id: 'sys_vehicle_mileage',
    tag: '{mileage}',
    label: 'Current Mileage',
    category: 'vehicle',
    description: 'Latest odometer mileage recorded',
    sampleValue: '45,200',
    isSystem: true,
  },
  {
    id: 'sys_purchased_date',
    tag: '{purchased_date}',
    label: 'Purchase Date',
    category: 'vehicle',
    description: 'Vehicle acquisition date',
    sampleValue: '15/01/2023',
    isSystem: true,
  },
  {
    id: 'sys_insurance_expiry',
    tag: '{insurance_expiry}',
    label: 'Insurance Expiry Date',
    category: 'vehicle',
    description: 'Fleet insurance policy expiration date',
    sampleValue: '31/12/2026',
    isSystem: true,
  },
  {
    id: 'sys_mot_expiry',
    tag: '{mot_expiry}',
    label: 'MOT Expiry Date',
    category: 'vehicle',
    description: 'Vehicle annual MOT certificate deadline',
    sampleValue: '14/10/2026',
    isSystem: true,
  },
  {
    id: 'sys_tax_expiry',
    tag: '{tax_expiry}',
    label: 'Road Tax Expiry',
    category: 'vehicle',
    description: 'DVLA road tax renewal deadline',
    sampleValue: '01/11/2026',
    isSystem: true,
  },
  {
    id: 'sys_last_maintenance',
    tag: '{last_maintenance}',
    label: 'Last Maintenance Date',
    category: 'vehicle',
    description: 'Date of most recent workshop service',
    sampleValue: '10/08/2026',
    isSystem: true,
  },
  {
    id: 'sys_next_maintenance',
    tag: '{next_maintenance}',
    label: 'Next Maintenance Date',
    category: 'vehicle',
    description: 'Scheduled next service date',
    sampleValue: '10/11/2026',
    isSystem: true,
  },

  // ─── C. RENTAL PAGE TAGS ───
  {
    id: 'sys_rental_agreement_number',
    tag: '{rental_agreement_number}',
    label: 'Rental Agreement Number',
    category: 'rental',
    description: 'Unique rental contract / agreement reference',
    sampleValue: 'AGR-7821',
    isSystem: true,
  },
  {
    id: 'sys_agreement_number',
    tag: '{agreement_number}',
    label: 'Agreement Number (Alias)',
    category: 'rental',
    description: 'Agreement reference code',
    sampleValue: 'AGR-7821',
    isSystem: true,
  },
  {
    id: 'sys_rental_order_number',
    tag: '{order_number}',
    label: 'Order Number / Reference',
    category: 'rental',
    description: 'Order reference number for the rental card',
    sampleValue: 'RO-2026-092',
    isSystem: true,
  },
  {
    id: 'sys_rental_reference',
    tag: '{reference}',
    label: 'Rental Reference',
    category: 'rental',
    description: 'Reference code for rental entry card',
    sampleValue: 'AGR-7821',
    isSystem: true,
  },
  {
    id: 'sys_rental_start_date',
    tag: '{start_date}',
    label: 'Rental Start Date',
    category: 'rental',
    description: 'Hire agreement commencement date',
    sampleValue: '01/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_rental_start_time',
    tag: '{start_time}',
    label: 'Rental Start Time',
    category: 'rental',
    description: 'Time vehicle was checked out',
    sampleValue: '09:30 AM',
    isSystem: true,
  },
  {
    id: 'sys_rental_end_date',
    tag: '{end_date}',
    label: 'Rental End / Return Date',
    category: 'rental',
    description: 'Agreed conclusion date for the vehicle hire',
    sampleValue: '30/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_rental_end_time',
    tag: '{end_time}',
    label: 'Rental End Time',
    category: 'rental',
    description: 'Return cutoff time',
    sampleValue: '05:00 PM',
    isSystem: true,
  },
  {
    id: 'sys_rental_expected_return',
    tag: '{expected_return_date}',
    label: 'Expected Return Date',
    category: 'rental',
    description: 'Expected vehicle return date from card',
    sampleValue: '30/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_rental_duration_days',
    tag: '{rental_duration_days}',
    label: 'Duration in Days',
    category: 'rental',
    description: 'Total number of hire days',
    sampleValue: '28',
    isSystem: true,
  },
  {
    id: 'sys_rental_rate_daily',
    tag: '{daily_rate}',
    label: 'Daily Rate',
    category: 'rental',
    description: 'Daily rental tariff',
    sampleValue: '£45.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_rate_weekly',
    tag: '{weekly_rate}',
    label: 'Weekly Rate',
    category: 'rental',
    description: 'Weekly rental tariff',
    sampleValue: '£220.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_net_amount',
    tag: '{net_amount}',
    label: 'Net Amount / Subtotal',
    category: 'rental',
    description: 'Net rental amount before VAT and charges',
    sampleValue: '£880.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_vat_total',
    tag: '{vat_total}',
    label: 'VAT Total',
    category: 'rental',
    description: 'Total VAT amount applied to rental',
    sampleValue: '£176.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_grand_total',
    tag: '{grand_total}',
    label: 'Grand Total Charge',
    category: 'rental',
    description: 'Gross rental total payable',
    sampleValue: '£1,056.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_total_amount',
    tag: '{total_amount}',
    label: 'Total Amount',
    category: 'rental',
    description: 'Total charge amount on rental card',
    sampleValue: '£1,056.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_amount_paid',
    tag: '{amount_paid}',
    label: 'Amount Paid',
    category: 'rental',
    description: 'Total amount paid toward this rental',
    sampleValue: '£500.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_owing_amount',
    tag: '{owing_amount}',
    label: 'Owing Amount / Remaining',
    category: 'rental',
    description: 'Outstanding balance owing on the rental',
    sampleValue: '£556.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_outstanding_balance',
    tag: '{outstanding_balance}',
    label: 'Outstanding Balance',
    category: 'rental',
    description: 'Remaining account balance due',
    sampleValue: '£556.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_last_paid_amount',
    tag: '{last_paid_amount}',
    label: 'Last Payment Amount',
    category: 'rental',
    description: 'Most recent payment received',
    sampleValue: '£250.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_payment_date',
    tag: '{payment_date}',
    label: 'Payment Date',
    category: 'rental',
    description: 'Date of last recorded payment',
    sampleValue: '18/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_rental_payment_type',
    tag: '{payment_type}',
    label: 'Payment Method',
    category: 'rental',
    description: 'Payment method (Cash, Card, Bank Transfer)',
    sampleValue: 'Bank Transfer',
    isSystem: true,
  },
  {
    id: 'sys_rental_payment_status',
    tag: '{payment_status}',
    label: 'Payment Status',
    category: 'rental',
    description: 'Payment status (Paid, Unpaid, Partially Paid)',
    sampleValue: 'Partially Paid',
    isSystem: true,
  },
  {
    id: 'sys_rental_status',
    tag: '{rental_status}',
    label: 'Rental Status',
    category: 'rental',
    description: 'Status (Active, Completed, Reserved, Cancelled)',
    sampleValue: 'Active',
    isSystem: true,
  },
  {
    id: 'sys_rental_extra_charges',
    tag: '{extra_charges}',
    label: 'Extra Charges',
    category: 'rental',
    description: 'Sum of ancillary and extra charges',
    sampleValue: '£50.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_delivery_charge',
    tag: '{delivery_charge}',
    label: 'Delivery Charge',
    category: 'rental',
    description: 'Vehicle delivery tariff',
    sampleValue: '£25.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_discount_amount',
    tag: '{discount_amount}',
    label: 'Discount Amount',
    category: 'rental',
    description: 'Discount applied to rental',
    sampleValue: '£30.00',
    isSystem: true,
  },
  {
    id: 'sys_rental_pdf_doc_link',
    tag: '{pdf_doc_link}',
    label: 'Hire Agreement PDF Link',
    category: 'rental',
    description: 'Direct link to download Hire Agreement PDF',
    sampleValue: 'https://ais-skyline.app/doc/AGR-7821',
    isSystem: true,
  },

  // ─── D. MAINTENANCE PAGE TAGS ───
  {
    id: 'sys_maintenance_order_number',
    tag: '{order_number}',
    label: 'Order Number (Maintenance)',
    category: 'maintenance',
    description: 'Work order reference number (e.g. MaintenanceOrder0001)',
    sampleValue: 'MaintenanceOrder0001',
    isSystem: true,
  },
  {
    id: 'sys_maintenance_order_id',
    tag: '{maintenance_order_id}',
    label: 'Maintenance Order ID',
    category: 'maintenance',
    description: 'Maintenance order identifier',
    sampleValue: 'ORD-9402',
    isSystem: true,
  },
  {
    id: 'sys_maintenance_reference',
    tag: '{reference}',
    label: 'Maintenance Reference',
    category: 'maintenance',
    description: 'Maintenance job reference',
    sampleValue: 'MaintenanceOrder0001',
    isSystem: true,
  },
  {
    id: 'sys_maintenance_invoice_number',
    tag: '{invoice_number}',
    label: 'Maintenance Invoice Number',
    category: 'maintenance',
    description: 'Invoice number linked to maintenance work',
    sampleValue: 'MaintenanceInvoice0001',
    isSystem: true,
  },
  {
    id: 'sys_service_date',
    tag: '{service_date}',
    label: 'Service Date',
    category: 'maintenance',
    description: 'Date service was booked or scheduled',
    sampleValue: '25/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_scheduled_date',
    tag: '{scheduled_date}',
    label: 'Scheduled Booking Date',
    category: 'maintenance',
    description: 'Workshop reservation date',
    sampleValue: '25/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_scheduled_time',
    tag: '{scheduled_time}',
    label: 'Scheduled Booking Time',
    category: 'maintenance',
    description: 'Time booked for vehicle service',
    sampleValue: '10:00 AM',
    isSystem: true,
  },
  {
    id: 'sys_scheduled_date_time',
    tag: '{scheduled_date_time}',
    label: 'Scheduled Date & Time',
    category: 'maintenance',
    description: 'Full combined appointment date & time',
    sampleValue: '25/09/2026 at 10:00 AM',
    isSystem: true,
  },
  {
    id: 'sys_completed_date',
    tag: '{completed_date}',
    label: 'Completed Date',
    category: 'maintenance',
    description: 'Date maintenance work was finished',
    sampleValue: '26/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_next_service_date',
    tag: '{next_service_date}',
    label: 'Next Service Date',
    category: 'maintenance',
    description: 'Upcoming scheduled service date',
    sampleValue: '25/03/2027',
    isSystem: true,
  },
  {
    id: 'sys_service_type',
    tag: '{service_type}',
    label: 'Service Type',
    category: 'maintenance',
    description: 'Type of service (yearly-service, mot, brake-service, etc.)',
    sampleValue: 'Full Service & Brake Inspection',
    isSystem: true,
  },
  {
    id: 'sys_garage_name',
    tag: '{garage_name}',
    label: 'Garage / Service Provider',
    category: 'maintenance',
    description: 'Name of the service workshop or garage',
    sampleValue: 'Apex Auto Services',
    isSystem: true,
  },
  {
    id: 'sys_garage_address',
    tag: '{garage_address}',
    label: 'Garage Address',
    category: 'maintenance',
    description: 'Physical workshop address and location',
    sampleValue: '48 Workshop Rd, London E14 9QA',
    isSystem: true,
  },
  {
    id: 'sys_garage_phone',
    tag: '{garage_phone}',
    label: 'Garage Phone',
    category: 'maintenance',
    description: 'Telephone number of the service workshop',
    sampleValue: '020 7946 0192',
    isSystem: true,
  },
  {
    id: 'sys_garage_email',
    tag: '{garage_email}',
    label: 'Garage Email',
    category: 'maintenance',
    description: 'Email contact for the service workshop',
    sampleValue: 'workshop@apexauto.co.uk',
    isSystem: true,
  },
  {
    id: 'sys_maintenance_cost',
    tag: '{total_cost}',
    label: 'Total Maintenance Cost',
    category: 'maintenance',
    description: 'Total cost on the maintenance card',
    sampleValue: '£280.00',
    isSystem: true,
  },
  {
    id: 'sys_maintenance_paid_amount',
    tag: '{paid_amount}',
    label: 'Paid Amount (Maintenance)',
    category: 'maintenance',
    description: 'Amount paid towards maintenance bill',
    sampleValue: '£280.00',
    isSystem: true,
  },
  {
    id: 'sys_maintenance_remaining',
    tag: '{remaining_amount}',
    label: 'Remaining Amount / Balance',
    category: 'maintenance',
    description: 'Balance remaining on maintenance order',
    sampleValue: '£0.00',
    isSystem: true,
  },
  {
    id: 'sys_maintenance_status',
    tag: '{maintenance_status}',
    label: 'Maintenance Status',
    category: 'maintenance',
    description: 'Status: scheduled, in-progress, completed, cancelled',
    sampleValue: 'Completed',
    isSystem: true,
  },
  {
    id: 'sys_maintenance_notes',
    tag: '{maintenance_notes}',
    label: 'Maintenance Notes',
    category: 'maintenance',
    description: 'Technician notes, diagnosis, or remarks',
    sampleValue: 'Replaced front pads and discs, oil & filter change.',
    isSystem: true,
  },
  {
    id: 'sys_maintenance_parts',
    tag: '{parts_required}',
    label: 'Parts Required',
    category: 'maintenance',
    description: 'List of parts and materials used',
    sampleValue: 'Brake pads, Oil filter, 5W-30 Synthetic',
    isSystem: true,
  },
  {
    id: 'sys_current_mileage',
    tag: '{current_mileage}',
    label: 'Current Mileage',
    category: 'maintenance',
    description: 'Odometer reading at time of service',
    sampleValue: '48,150',
    isSystem: true,
  },
  {
    id: 'sys_invoice_url',
    tag: '{invoice_url}',
    label: 'Maintenance Invoice URL',
    category: 'maintenance',
    description: 'Direct link to maintenance invoice document',
    sampleValue: 'https://ais-skyline.app/view-document?docType=invoice',
    isSystem: true,
  },

  // ─── E. CLAIMS PAGE TAGS ───
  {
    id: 'sys_claim_id',
    tag: '{claim_id}',
    label: 'Claim ID / Number',
    category: 'claim',
    description: 'Unique insurance claim ID',
    sampleValue: 'CLM-10294',
    isSystem: true,
  },
  {
    id: 'sys_client_ref',
    tag: '{client_ref}',
    label: 'Client Reference',
    category: 'claim',
    description: 'Claimant client or internal case reference',
    sampleValue: 'REF-8841',
    isSystem: true,
  },
  {
    id: 'sys_claim_order_number',
    tag: '{order_number}',
    label: 'Claim Order Number',
    category: 'claim',
    description: 'Claim file or order reference number',
    sampleValue: 'CLM-10294',
    isSystem: true,
  },
  {
    id: 'sys_claim_reference',
    tag: '{reference}',
    label: 'Claim Reference (Alias)',
    category: 'claim',
    description: 'Reference code on claim card',
    sampleValue: 'CLM-10294',
    isSystem: true,
  },
  {
    id: 'sys_incident_date',
    tag: '{incident_date}',
    label: 'Incident Date',
    category: 'claim',
    description: 'Date accident or incident occurred',
    sampleValue: '14/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_incident_time',
    tag: '{incident_time}',
    label: 'Incident Time',
    category: 'claim',
    description: 'Time of incident',
    sampleValue: '08:45 AM',
    isSystem: true,
  },
  {
    id: 'sys_incident_location',
    tag: '{incident_location}',
    label: 'Incident Location',
    category: 'claim',
    description: 'Location or street address of incident',
    sampleValue: 'A12 Bow Roundabout, London',
    isSystem: true,
  },
  {
    id: 'sys_claim_type',
    tag: '{claim_type}',
    label: 'Claim Type',
    category: 'claim',
    description: 'Type of claim: Domestic, Taxi, PI, PCO',
    sampleValue: 'PCO',
    isSystem: true,
  },
  {
    id: 'sys_claim_status',
    tag: '{claim_status}',
    label: 'Claim Status',
    category: 'claim',
    description: 'Current status: In Progress, Won, Settled, Awaiting',
    sampleValue: 'In Progress',
    isSystem: true,
  },
  {
    id: 'sys_progress_stage',
    tag: '{progress_stage}',
    label: 'Progress Stage',
    category: 'claim',
    description: 'Active claim lifecycle stage',
    sampleValue: 'Engineering Inspection & Hire',
    isSystem: true,
  },
  {
    id: 'sys_claimant_name',
    tag: '{claimant_name}',
    label: 'Claimant Name',
    category: 'claim',
    description: 'Full name of claimant / submitter',
    sampleValue: 'Mohamed Ali',
    isSystem: true,
  },
  {
    id: 'sys_claimant_phone',
    tag: '{claimant_phone}',
    label: 'Claimant Phone',
    category: 'claim',
    description: 'Telephone number of claimant',
    sampleValue: '07411 234567',
    isSystem: true,
  },
  {
    id: 'sys_claimant_email',
    tag: '{claimant_email}',
    label: 'Claimant Email',
    category: 'claim',
    description: 'Email address of claimant',
    sampleValue: 'm.ali@example.com',
    isSystem: true,
  },
  {
    id: 'sys_tp_name',
    tag: '{tp_name}',
    label: 'Third Party Name',
    category: 'claim',
    description: 'At-fault third party full name',
    sampleValue: 'David Smith',
    isSystem: true,
  },
  {
    id: 'sys_tp_vehicle_reg',
    tag: '{tp_vehicle_reg}',
    label: 'Third Party Registration',
    category: 'claim',
    description: 'Third party vehicle registration number',
    sampleValue: 'EA69 LMN',
    isSystem: true,
  },
  {
    id: 'sys_tp_insurance',
    tag: '{tp_insurance_company}',
    label: 'Third Party Insurance',
    category: 'claim',
    description: 'Third party insurer name',
    sampleValue: 'Aviva Insurance',
    isSystem: true,
  },
  {
    id: 'sys_tp_policy',
    tag: '{tp_policy_number}',
    label: 'Third Party Policy #',
    category: 'claim',
    description: 'Third party policy reference number',
    sampleValue: 'AV-8849201',
    isSystem: true,
  },
  {
    id: 'sys_accident_cause',
    tag: '{accident_cause}',
    label: 'Accident Cause',
    category: 'claim',
    description: 'Description of how accident occurred',
    sampleValue: 'Third party failed to give way at roundabout, colliding into driver side.',
    isSystem: true,
  },
  {
    id: 'sys_at_fault_party',
    tag: '{at_fault_party}',
    label: 'At Fault Party',
    category: 'claim',
    description: 'Assessed liability: Third Party, Claimant, or Unknown',
    sampleValue: 'Third Party',
    isSystem: true,
  },
  {
    id: 'sys_police_report_number',
    tag: '{police_report_number}',
    label: 'Police Incident / CAD Number',
    category: 'claim',
    description: 'Police incident or reference number',
    sampleValue: 'CAD 4921/14SEP',
    isSystem: true,
  },
  {
    id: 'sys_legal_handler_name',
    tag: '{legal_handler_name}',
    label: 'Legal Handler / Solicitor',
    category: 'claim',
    description: 'Assigned solicitor or legal handler name',
    sampleValue: 'Sarah Jenkins',
    isSystem: true,
  },
  {
    id: 'sys_legal_handler_firm',
    tag: '{legal_handler_firm}',
    label: 'Legal Handler Firm',
    category: 'claim',
    description: 'Name of appointed solicitors firm',
    sampleValue: 'Premier Legal Services LLP',
    isSystem: true,
  },
  {
    id: 'sys_legal_handler_email',
    tag: '{legal_handler_email}',
    label: 'Legal Handler Email',
    category: 'claim',
    description: 'Email contact of solicitor',
    sampleValue: 's.jenkins@premierlegal.co.uk',
    isSystem: true,
  },
  {
    id: 'sys_legal_handler_phone',
    tag: '{legal_handler_phone}',
    label: 'Legal Handler Phone',
    category: 'claim',
    description: 'Direct phone number of solicitor',
    sampleValue: '020 8123 4567',
    isSystem: true,
  },
  {
    id: 'sys_latest_update_notes',
    tag: '{latest_update_notes}',
    label: 'Latest Update Notes',
    category: 'claim',
    description: 'Most recent update or milestone summary on claim',
    sampleValue: 'Engineering report received confirming total loss valuation.',
    isSystem: true,
  },
  {
    id: 'sys_next_steps',
    tag: '{next_steps}',
    label: 'Next Steps',
    category: 'claim',
    description: 'Immediate upcoming action item for case progression',
    sampleValue: 'Submitting interim payment pack to third party insurer.',
    isSystem: true,
  },

  // ─── F. DRIVER PAY PAGE TAGS ───
  {
    id: 'sys_payment_id',
    tag: '{payment_id}',
    label: 'Payment ID / Reference',
    category: 'driverPay',
    description: 'Payment transaction reference on driver pay card',
    sampleValue: 'PAY-10023',
    isSystem: true,
  },
  {
    id: 'sys_driver_no',
    tag: '{driver_no}',
    label: 'Driver Number',
    category: 'driverPay',
    description: 'Driver call sign or badge identification number',
    sampleValue: 'DRV-405',
    isSystem: true,
  },
  {
    id: 'sys_tid_no',
    tag: '{tid_no}',
    label: 'TID Terminal ID',
    category: 'driverPay',
    description: 'Payment terminal / TID machine number',
    sampleValue: 'TID-8821',
    isSystem: true,
  },
  {
    id: 'sys_driver_pay_order_number',
    tag: '{order_number}',
    label: 'Pay Order Number',
    category: 'driverPay',
    description: 'Pay record order reference number',
    sampleValue: 'PAY-10023',
    isSystem: true,
  },
  {
    id: 'sys_collection_point',
    tag: '{collection_point}',
    label: 'Collection Point',
    category: 'driverPay',
    description: 'Designated payout point (Office, CC, Abdulaziz)',
    sampleValue: 'OFFICE',
    isSystem: true,
  },
  {
    id: 'sys_period_start',
    tag: '{period_start}',
    label: 'Period Start Date',
    category: 'driverPay',
    description: 'Start of payout accounting cycle',
    sampleValue: '15/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_period_end',
    tag: '{period_end}',
    label: 'Period End Date',
    category: 'driverPay',
    description: 'End of payout accounting cycle',
    sampleValue: '21/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_gross_pay',
    tag: '{gross_pay}',
    label: 'Gross Takings / Amount',
    category: 'driverPay',
    description: 'Total gross driver fares or takings',
    sampleValue: '£1,450.00',
    isSystem: true,
  },
  {
    id: 'sys_commission_a',
    tag: '{commission_a}',
    label: 'Commission A Amount',
    category: 'driverPay',
    description: 'Deducted commission amount A',
    sampleValue: '£145.00',
    isSystem: true,
  },
  {
    id: 'sys_commission_b',
    tag: '{commission_b}',
    label: 'Commission B Amount',
    category: 'driverPay',
    description: 'Deducted commission amount B',
    sampleValue: '£72.50',
    isSystem: true,
  },
  {
    id: 'sys_driver_pay_amount',
    tag: '{driver_pay_amount}',
    label: 'Driver Net Payout',
    category: 'driverPay',
    description: 'Final calculated net amount payable to driver',
    sampleValue: '£1,232.50',
    isSystem: true,
  },
  {
    id: 'sys_driver_net_pay',
    tag: '{net_pay}',
    label: 'Net Pay (Alias)',
    category: 'driverPay',
    description: 'Net driver payout amount',
    sampleValue: '£1,232.50',
    isSystem: true,
  },
  {
    id: 'sys_driver_paid_amount',
    tag: '{paid_amount}',
    label: 'Paid Amount (Driver Pay)',
    category: 'driverPay',
    description: 'Disbursed payout amount',
    sampleValue: '£1,232.50',
    isSystem: true,
  },
  {
    id: 'sys_driver_remaining_amount',
    tag: '{remaining_amount}',
    label: 'Remaining Balance (Driver Pay)',
    category: 'driverPay',
    description: 'Balance remaining unpaid on pay card',
    sampleValue: '£0.00',
    isSystem: true,
  },
  {
    id: 'sys_driver_payment_status',
    tag: '{payment_status}',
    label: 'Payout Status',
    category: 'driverPay',
    description: 'Payment status: Paid, Unpaid, Partially Paid',
    sampleValue: 'Paid',
    isSystem: true,
  },
  {
    id: 'sys_driver_payment_method',
    tag: '{payment_method}',
    label: 'Payout Method',
    category: 'driverPay',
    description: 'Disbursement method: bank_transfer, cash, cheque',
    sampleValue: 'Bank Transfer',
    isSystem: true,
  },
  {
    id: 'sys_driver_pay_notes',
    tag: '{driver_pay_notes}',
    label: 'Driver Pay Notes',
    category: 'driverPay',
    description: 'Accounting notes or special deduction remarks',
    sampleValue: 'Standard weekly settlement with no penalties.',
    isSystem: true,
  },

  // ─── G. INVOICE & FINANCE PAGE TAGS ───
  {
    id: 'sys_invoice_number',
    tag: '{invoice_number}',
    label: 'Invoice Number',
    category: 'invoice',
    description: 'Official tax invoice number (e.g. INV-2026-081)',
    sampleValue: 'INV-2026-081',
    isSystem: true,
  },
  {
    id: 'sys_invoice_order_number',
    tag: '{order_number}',
    label: 'Invoice Order Number',
    category: 'invoice',
    description: 'Order or reference number on invoice card',
    sampleValue: 'INV-2026-081',
    isSystem: true,
  },
  {
    id: 'sys_invoice_reference',
    tag: '{reference}',
    label: 'Invoice Reference',
    category: 'invoice',
    description: 'Payment reference matching invoice',
    sampleValue: 'INV-2026-081',
    isSystem: true,
  },
  {
    id: 'sys_invoice_date',
    tag: '{invoice_date}',
    label: 'Invoice Issue Date',
    category: 'invoice',
    description: 'Date invoice was generated',
    sampleValue: '20/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_invoice_due_date',
    tag: '{invoice_due_date}',
    label: 'Invoice Due Date',
    category: 'invoice',
    description: 'Payment due deadline date',
    sampleValue: '27/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_due_date',
    tag: '{due_date}',
    label: 'Due Date (Alias)',
    category: 'invoice',
    description: 'Payment due date',
    sampleValue: '27/09/2026',
    isSystem: true,
  },
  {
    id: 'sys_invoice_subtotal',
    tag: '{subtotal}',
    label: 'Subtotal / Net',
    category: 'invoice',
    description: 'Subtotal net amount before VAT',
    sampleValue: '£400.00',
    isSystem: true,
  },
  {
    id: 'sys_invoice_net_amount',
    tag: '{net_amount}',
    label: 'Net Amount (Invoice)',
    category: 'invoice',
    description: 'Net total on invoice',
    sampleValue: '£400.00',
    isSystem: true,
  },
  {
    id: 'sys_invoice_vat_amount',
    tag: '{vat_amount}',
    label: 'VAT Amount',
    category: 'invoice',
    description: 'Total VAT amount on invoice',
    sampleValue: '£80.00',
    isSystem: true,
  },
  {
    id: 'sys_invoice_total_amount',
    tag: '{total_amount}',
    label: 'Total Invoice Amount',
    category: 'invoice',
    description: 'Gross invoice amount including VAT',
    sampleValue: '£480.00',
    isSystem: true,
  },
  {
    id: 'sys_invoice_amount_paid',
    tag: '{amount_paid}',
    label: 'Amount Paid (Invoice)',
    category: 'invoice',
    description: 'Total payment credited against invoice',
    sampleValue: '£200.00',
    isSystem: true,
  },
  {
    id: 'sys_invoice_remaining_amount',
    tag: '{remaining_amount}',
    label: 'Remaining Balance Due',
    category: 'invoice',
    description: 'Outstanding balance payable on invoice',
    sampleValue: '£280.00',
    isSystem: true,
  },
  {
    id: 'sys_invoice_balance_due',
    tag: '{balance_due}',
    label: 'Balance Due (Alias)',
    category: 'invoice',
    description: 'Outstanding invoice balance',
    sampleValue: '£280.00',
    isSystem: true,
  },
  {
    id: 'sys_invoice_status',
    tag: '{invoice_status}',
    label: 'Invoice Status',
    category: 'invoice',
    description: 'Status: Pending, Paid, Partially Paid, Overdue',
    sampleValue: 'Partially Paid',
    isSystem: true,
  },
  {
    id: 'sys_invoice_category',
    tag: '{invoice_category}',
    label: 'Invoice Category',
    category: 'invoice',
    description: 'Department/Category (Rental, Maintenance, VD)',
    sampleValue: 'Rental',
    isSystem: true,
  },
  {
    id: 'sys_invoice_description',
    tag: '{invoice_description}',
    label: 'Invoice Description',
    category: 'invoice',
    description: 'Invoice line summary or billing reason',
    sampleValue: 'Weekly fleet vehicle hire charges',
    isSystem: true,
  },
  {
    id: 'sys_lloyds_bank_details',
    tag: '{lloyds_bank_details}',
    label: 'Bank Transfer Instructions',
    category: 'invoice',
    description: 'Full official company bank details for transfer',
    sampleValue: 'Bank: Lloyds Bank | Acc: 30513162 | Sort: 30-99-50',
    isSystem: true,
  },
  {
    id: 'sys_full_statement',
    tag: '{full_statement}',
    label: 'Full Account Statement',
    category: 'invoice',
    description: 'Complete billing breakdown with line items',
    sampleValue: 'Subtotal: £400.00 | VAT: £80.00 | Total: £480.00 | Paid: £200.00 | Owing: £280.00',
    isSystem: true,
  },
  {
    id: 'sys_invoice_pdf_link',
    tag: '{pdf_doc_link}',
    label: 'Invoice PDF Download Link',
    category: 'invoice',
    description: 'Direct link to download official Invoice PDF',
    sampleValue: 'https://ais-skyline.app/view-invoice?id=INV-2026-081',
    isSystem: true,
  },

  // ─── H. MEMBERS & CUSTOMERS PAGE TAGS ───
  {
    id: 'sys_member_id',
    tag: '{member_id}',
    label: 'Member / Customer ID',
    category: 'members',
    description: 'Unique member or customer ID code',
    sampleValue: 'MEM-3081',
    isSystem: true,
  },
  {
    id: 'sys_customer_id',
    tag: '{customer_id}',
    label: 'Customer ID (Alias)',
    category: 'members',
    description: 'Customer record identifier',
    sampleValue: 'MEM-3081',
    isSystem: true,
  },
  {
    id: 'sys_account_number',
    tag: '{account_number}',
    label: 'Account Number',
    category: 'members',
    description: 'Member accounting reference number',
    sampleValue: 'ACC-5529',
    isSystem: true,
  },
  {
    id: 'sys_member_order_number',
    tag: '{order_number}',
    label: 'Member Reference Number',
    category: 'members',
    description: 'Registration reference number on member card',
    sampleValue: 'MEM-3081',
    isSystem: true,
  },
  {
    id: 'sys_membership_type',
    tag: '{membership_type}',
    label: 'Membership Type',
    category: 'members',
    description: 'Type: Individual, Company, or Claim',
    sampleValue: 'Individual',
    isSystem: true,
  },
  {
    id: 'sys_membership_status',
    tag: '{membership_status}',
    label: 'Membership Status',
    category: 'members',
    description: 'Member account status: Active, Inactive',
    sampleValue: 'Active',
    isSystem: true,
  },
  {
    id: 'sys_join_date',
    tag: '{join_date}',
    label: 'Member Join Date',
    category: 'members',
    description: 'Date member joined / registered',
    sampleValue: '12/03/2024',
    isSystem: true,
  },
  {
    id: 'sys_renewal_date',
    tag: '{renewal_date}',
    label: 'Renewal Date',
    category: 'members',
    description: 'Membership / documents renewal date',
    sampleValue: '12/03/2027',
    isSystem: true,
  },
  {
    id: 'sys_driver_license_number',
    tag: '{driver_license_number}',
    label: 'Driver License Number',
    category: 'members',
    description: 'DVLA driving license 16-character code',
    sampleValue: 'DOEJN801124AB9DE',
    isSystem: true,
  },
  {
    id: 'sys_license_expiry',
    tag: '{license_expiry}',
    label: 'Driving License Expiry',
    category: 'members',
    description: 'Photocard driver license expiration date',
    sampleValue: '15/08/2028',
    isSystem: true,
  },
  {
    id: 'sys_badge_number',
    tag: '{badge_number}',
    label: 'Taxi / PCO Badge Number',
    category: 'members',
    description: 'Local authority or TfL driver badge number',
    sampleValue: 'PCO-99214',
    isSystem: true,
  },
  {
    id: 'sys_bill_expiry',
    tag: '{bill_expiry}',
    label: 'Proof of Address Expiry',
    category: 'members',
    description: 'Utility bill validity cutoff date',
    sampleValue: '10/11/2026',
    isSystem: true,
  },
  {
    id: 'sys_date_of_birth',
    tag: '{date_of_birth}',
    label: 'Date of Birth',
    category: 'members',
    description: 'Customer birthday (DD/MM/YYYY)',
    sampleValue: '14/06/1988',
    isSystem: true,
  },
  {
    id: 'sys_national_insurance',
    tag: '{national_insurance_number}',
    label: 'National Insurance Number',
    category: 'members',
    description: 'UK National Insurance (NI) code',
    sampleValue: 'QQ 12 34 56 A',
    isSystem: true,
  },
  {
    id: 'sys_vat_number',
    tag: '{vat_number}',
    label: 'Company VAT Number',
    category: 'members',
    description: 'Company VAT registration number',
    sampleValue: 'GB 123 4567 89',
    isSystem: true,
  },
  {
    id: 'sys_portal_link',
    tag: '{portal_link}',
    label: 'Customer Online Portal Link',
    category: 'members',
    description: 'Personalized customer self-service link',
    sampleValue: 'https://ais-skyline.app/portal/MEM-3081',
    isSystem: true,
  },
];

const LOCAL_STORAGE_CUSTOM_TAGS = 'aie_custom_dynamic_tags_v1';

/**
 * Fetch all dynamic tags (system + Firestore custom tags)
 */
export async function fetchAllDynamicTags(): Promise<DynamicTag[]> {
  const tagsMap = new Map<string, DynamicTag>();

  // 1. Seed system tags
  SYSTEM_DYNAMIC_TAGS.forEach((tag) => tagsMap.set(tag.tag.toLowerCase(), tag));

  // 2. Fetch custom tags from Firestore
  try {
    const snap = await getDocs(collection(db, 'dynamicTags'));
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data && data.tag) {
        const normalizedKey = data.tag.toLowerCase();
        tagsMap.set(normalizedKey, {
          id: d.id,
          tag: data.tag.startsWith('{') ? data.tag : `{${data.tag}}`,
          label: data.label || data.tag,
          category: data.category || 'custom',
          description: data.description || '',
          sampleValue: data.sampleValue || 'Sample',
          isCustom: true,
          isSystem: false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }
    });
  } catch (err) {
    console.warn('[dynamicTagsService] Could not fetch Firestore tags, checking fallback cache:', err);
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CUSTOM_TAGS);
      if (cached) {
        const parsed: DynamicTag[] = JSON.parse(cached);
        parsed.forEach((t) => tagsMap.set(t.tag.toLowerCase(), t));
      }
    } catch {}
  }

  return Array.from(tagsMap.values());
}

/**
 * Real-time listener for dynamic tags
 */
export function subscribeToDynamicTags(onUpdate: (tags: DynamicTag[]) => void): () => void {
  const colRef = collection(db, 'dynamicTags');
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const tagsMap = new Map<string, DynamicTag>();
      SYSTEM_DYNAMIC_TAGS.forEach((tag) => tagsMap.set(tag.tag.toLowerCase(), tag));

      const customTagsList: DynamicTag[] = [];
      snapshot.docs.forEach((d) => {
        const data = d.data() as any;
        if (data && data.tag) {
          const item: DynamicTag = {
            id: d.id,
            tag: data.tag.startsWith('{') ? data.tag : `{${data.tag}}`,
            label: data.label || data.tag,
            category: data.category || 'custom',
            description: data.description || '',
            sampleValue: data.sampleValue || 'Sample',
            isCustom: true,
            isSystem: false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          tagsMap.set(item.tag.toLowerCase(), item);
          customTagsList.push(item);
        }
      });

      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_TAGS, JSON.stringify(customTagsList));
      } catch {}

      onUpdate(Array.from(tagsMap.values()));
    },
    (err) => {
      console.warn('[dynamicTagsService] Snapshot error:', err);
      // Fallback to fetch
      fetchAllDynamicTags().then(onUpdate);
    }
  );

  return unsubscribe;
}

/**
 * Save or update a dynamic tag in Firestore
 */
export async function saveDynamicTag(tagData: {
  id?: string;
  tag: string;
  label: string;
  category?: string;
  description?: string;
  sampleValue?: string;
}): Promise<DynamicTag> {
  let cleanTag = tagData.tag.trim();
  if (!cleanTag.startsWith('{')) cleanTag = `{${cleanTag}`;
  if (!cleanTag.endsWith('}')) cleanTag = `${cleanTag}}`;

  const docId = tagData.id || `tag_${cleanTag.replace(/[^a-zA-Z0-9_]/g, '')}_${Date.now()}`;

  const payload: DynamicTag = {
    id: docId,
    tag: cleanTag,
    label: tagData.label.trim(),
    category: tagData.category || 'custom',
    description: tagData.description?.trim() || '',
    sampleValue: tagData.sampleValue?.trim() || 'Sample Value',
    isCustom: true,
    isSystem: false,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'dynamicTags', docId), payload, { merge: true });

  // Broadcast window event for instant local sync across components
  window.dispatchEvent(new CustomEvent('dynamic_tags_updated', { detail: payload }));

  return payload;
}

/**
 * Delete a dynamic tag from Firestore
 */
export async function deleteDynamicTag(tagId: string): Promise<void> {
  if (!tagId) return;
  await deleteDoc(doc(db, 'dynamicTags', tagId));
  window.dispatchEvent(new CustomEvent('dynamic_tags_updated', { detail: { id: tagId, deleted: true } }));
}

/**
 * Substitutes dynamic tags in text using recipient data and known tags dictionary
 */
export function substituteDynamicTags(
  text: string,
  recipient?: {
    name?: string;
    firstName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    category?: string;
    [key: string]: any;
  } | null,
  tagsDictionary: DynamicTag[] = SYSTEM_DYNAMIC_TAGS
): string {
  if (!text) return '';

  const now = new Date();
  const todayStr = format(now, 'dd MMM yyyy');
  const dateStr = format(now, 'dd/MM/yyyy');

  const fullName = recipient?.name || 'Valued Customer';
  const firstName = recipient?.firstName || (recipient?.name ? recipient.name.split(' ')[0] : 'Customer');
  const companyName = recipient?.companyName || (recipient?.category === 'companies' ? recipient?.name : 'AIE Partner');
  const email = recipient?.email || 'customer@example.com';
  const mobile = recipient?.phone || '07552 553441';
  const category = recipient?.category 
    ? (recipient.category === 'members' ? 'Member' : recipient.category === 'companies' ? 'Company' : 'Claim')
    : 'Member';

  let rendered = text
    .replace(/\{customer_name\}/gi, fullName)
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{name\}/gi, fullName)
    .replace(/\{company_name\}/gi, companyName)
    .replace(/\{email\}/gi, email)
    .replace(/\{customer_email\}/gi, email)
    .replace(/\{mobile\}/gi, mobile)
    .replace(/\{phone\}/gi, mobile)
    .replace(/\{customer_phone\}/gi, mobile)
    .replace(/\{category\}/gi, category)
    .replace(/\{today\}/gi, todayStr)
    .replace(/\{today_date\}/gi, todayStr)
    .replace(/\{date\}/gi, dateStr);

  // Substitute any custom dynamic tags found in dictionary
  tagsDictionary.forEach((customTag) => {
    if (customTag.tag) {
      const sample = recipient && recipient[customTag.label] 
        ? String(recipient[customTag.label]) 
        : customTag.sampleValue || 'Sample';
      const escaped = customTag.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rendered = rendered.replace(new RegExp(escaped, 'gi'), sample);
    }
  });

  return rendered;
}
