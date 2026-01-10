// src/constants/emailTemplates.ts

export type EmailType = 'custom' | 'rental' | 'maintenance' | 'invoice' | 'claim' | 'finance';

export interface EmailTemplate {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  requiredFields?: Array<'rental' | 'vehicle' | 'maintenance' | 'invoice' | 'claim' | 'transaction'>;
}

const aieSkylineSignature = `Kind regards,
Admin Team
AIE Skyline Limited
📍 United House, 39–41 North Road, London, N7 9DP
☎️ 020 8050 5337 | 📱 07552 553441 (24/7 & WhatsApp)
✉️ admin@aieskyline.co.uk
🌐 www.aieskyline.co.uk`;

const aieClaimsSignature = `Kind regards,
AIE Claims Team
📍 AIE Claims, United House, 39–41 North Road, London, N7 9DP
☎️ 020 8050 5337
📱 WhatsApp: +2080505337
✉️ claims@aieclaims.co.uk
🌐 www.aieclaims.co.uk`;

export const emailTemplates: Record<EmailType, EmailTemplate[]> = {
  /* ───────── FINANCE (NEW) ───────── */
  finance: [
    {
      id: 'finance_payment_received',
      name: 'Payment Received Confirmation',
      subjectTemplate: 'Payment Received - [Vehicle Reg]',
      bodyTemplate:
`Dear [Recipient Name],

We are writing to confirm that we have received your payment of £[Amount Paid] on [Date Received].

Thank you for your prompt payment. This amount has been credited to your account.

Current Account Status:

Payment Received: -£[Amount Paid]

Remaining Balance: £[New Balance]

Please ensure any remaining balance is cleared by the agreed due date.

${aieSkylineSignature}`,
      requiredFields: ['transaction'] 
    },
    {
      id: 'finance_overdue_account',
      name: 'URGENT: Overdue Account',
      subjectTemplate: 'URGENT: Overdue Account - [Vehicle Reg]',
      bodyTemplate:
`Dear [Recipient Name],

Our records indicate that your account is currently overdue.

Despite previous reminders, we have not yet received payment for the outstanding balance. Please be advised that prompt payment is required to ensure the continued continuity of our services and your vehicle rental agreement.

Outstanding Details:

Total Overdue: £[Amount Owed]

Due Date: [Date]

Please make an immediate payment of £[Amount Owed] using the details below:

Payment Details: 🏦 Bank: Lloyds Bank 💼 Account Name: AIE SKYLINE LIMITED 🔢 Account Number: 30513162 🔣 Sort Code: 30-99-50 📝 Reference: [Vehicle Reg]

If you have already made this payment in the last 24 hours, please disregard this message and send us the proof of payment via WhatsApp (07552 553441).

${aieSkylineSignature}`
    },
    {
      id: 'finance_statement_account',
      name: 'Statement of Account',
      subjectTemplate: 'Statement of Account - [Vehicle Reg]',
      bodyTemplate:
`Dear [Recipient Name],

This is a gentle reminder regarding the current outstanding balance on your account with AIE Skyline Limited.

As of [Today's Date], your total outstanding balance is £[Total Amount].

Please arrange for this balance to be cleared by [Due Date] using the details below:

Payment Details: 🏦 Bank: Lloyds Bank 💼 Account Name: AIE SKYLINE LIMITED 🔢 Account Number: 30513162 🔣 Sort Code: 30-99-50 📝 Reference: [Vehicle Reg]

If you have any queries regarding these figures, please contact the office immediately.

${aieSkylineSignature}`
    },
    {
      id: 'finance_new_charge',
      name: 'NEW CHARGE: Immediate Payment Required',
      subjectTemplate: 'NEW CHARGE: Immediate Payment Required - [Vehicle Reg]',
      bodyTemplate:
`Dear [Recipient Name],

Please be advised that a new charge has been applied to your account which requires your immediate attention.

Charge Details:

Reason: [Reason]

Date of Incident/Charge: [Date]

Amount charged: £[Amount]

Total Account Balance Now Due: £[New Total Balance]

Please arrange for the payment of £[New Total Balance] to be made ASAP to the account below:

Payment Details: 🏦 Bank: Lloyds Bank 💼 Account Name: AIE SKYLINE LIMITED 🔢 Account Number: 30513162 🔣 Sort Code: 30-99-50 📝 Reference: [Vehicle Reg]

If you require a copy of the invoice or the PCN evidence, please reply to this email or request it via WhatsApp.

${aieSkylineSignature}`,
      requiredFields: ['transaction']
    }
  ],

  /* ───────── RENTAL ───────── */
  rental: [
    {
      id: 'rental_welcome',
      name: 'Rental Welcome',
      subjectTemplate: 'Welcome to AIE Skyline – Vehicle Rental Confirmation',
      bodyTemplate:
`Dear [Driver Name],

Welcome to AIE Skyline! Thank you for choosing us for your vehicle rental needs.

We’re delighted to have you on board and are committed to providing a smooth, professional, and hassle-free experience. Your journey with AIE Skyline’s London Iconic Taxi Rental starts here—and we’re here to support you every step of the way.

What You Can Expect:
• Clean, well-maintained vehicles
• 24/7 breakdown and emergency support
• Transparent service with no hidden charges

⚠ Important Notice
Vehicle damage is your responsibility. Our insurance excess is £1,000. If your vehicle is damaged, you will pay either the cost of the repair or the excess—whichever is cheaper. Please ensure the vehicle is kept clean at all times during your hire.

Need Help? Save These Numbers:
🔧 24-Hour Breakdown Assistance: 📱 07951 762124
🚗 Accident (office hours Mon–Fri 09:30–18:00): ☎️ 020 8050 5337
📱 Out of hours & WhatsApp: 07552 553441

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'rental_outstanding',
      name: 'Rental Outstanding',
      subjectTemplate: 'Outstanding Rental Balance – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We hope this message finds you well. This is a reminder that an outstanding payment remains on your recent vehicle rental with AIE Skyline.

📄 Rental Details
Vehicle: AIE Skyline – London Iconic Taxi Rental
Registration Number: [Vehicle Registration Number]
Rental Period: [Start Date] to [End Date]
Rental Type: [Rental Type]

💳 Payment Summary
Total Amount Due: £[Total Amount]
Amount Paid: £[Amount Paid]
Outstanding Balance: £[Outstanding Balance]

🏦 Payment Instructions
Bank: Lloyds Bank
Account Name: AIE Skyline
Account Number: 30513162
Sort Code: 30-99-50
Payment Reference: [Vehicle Registration Number]

⚠ Important Notice
Failure to settle the outstanding balance may result in late fees or suspension of rental services. If you’ve already made the payment or require assistance, please contact us.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'rental_completed',
      name: 'Rental Agreement Completed',
      subjectTemplate: 'Rental Agreement Completed – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We are pleased to confirm that your rental agreement has been successfully completed.

📄 Rental Details
Vehicle: AIE Skyline – London Iconic Taxi Rental
Registration Number: [Vehicle Registration Number]
Rental Period: [Start Date] to [End Date]
Rental Type: [Rental Type]
Agreement Reference: [Vehicle Reg]

Thank you for choosing AIE Skyline. We look forward to working with you again.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'rental_overdue',
      name: 'Rental Payment Overdue',
      subjectTemplate: 'Rental Payment Overdue – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

Our records show that your rental payment is overdue.

📄 Rental Details
Vehicle: AIE Skyline – London Iconic Taxi Rental
Registration Number: [Vehicle Registration Number]
Rental Period: [Start Date] to [End Date]
Rental Type: [Rental Type]

💳 Payment Summary
Amount Overdue: £[Outstanding Amount]

🏦 Payment Instructions
Bank: Lloyds Bank
Account Name: AIE Skyline
Account Number: 30513162
Sort Code: 30-99-50
Payment Reference: [Vehicle Registration Number]

⚠ Important Notice
Please settle this balance immediately to avoid further action or suspension of hire.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'rental_payment_received',
      name: 'Payment Received',
      subjectTemplate: 'Rental Payment Received – Thank You',
      bodyTemplate:
`Dear [Driver Name],

We confirm receipt of your rental payment.

📄 Payment Summary
Vehicle: [Vehicle Registration Number]
Amount Received: £[Amount]
Date Received: [DD/MM/YYYY]
Payment Reference: [Vehicle Registration Number]

Thank you for keeping your rental account up to date.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'rental_docs_request',
      name: 'Documents Request / Expired',
      subjectTemplate: 'Urgent – Driver Documents Required',
      bodyTemplate:
`Dear [Driver Name],

Our records show that one or more of your driver documents have expired or are missing.

📄 Required Documents
- Driver Licence
- National Insurance Number
- Driver Bill Requirements

⚠ Important Notice
Please provide updated copies immediately. Failure to do so may result in suspension of your hire agreement.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
  ],

  /* ───────── MAINTENANCE ───────── */
  maintenance: [
    {
      id: 'nsl_booking_confirmation_driver',
      name: '📅 NSL Inspection Booking (Driver)',
      subjectTemplate: '📅 NSL Inspection Booking Confirmation – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We have booked your vehicle for its NSL (Taxi Licensing) Inspection.

🔹 Appointment Details
Vehicle: [Vehicle Reg]
Date: [Date]
Time: [Date & Time]
Location: [Location]

⚠ Mandatory Requirements

Cleanliness: The vehicle must be professionally valeted (inside and out) prior to arrival. A dirty vehicle will fail inspection immediately.

Punctuality: Arrive at least 20 minutes early. Late arrivals are often turned away.

Failure to attend or failing due to cleanliness will result in a re-booking fee and potential suspension of the vehicle license.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'mot_booking_confirmation_driver',
      name: '📅 MOT Booking (Driver)',
      subjectTemplate: '📅 MOT Booking Confirmation – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

Your vehicle is booked for an MOT Test.

🔹 Appointment Details
Vehicle: [Vehicle Reg]
Date: [Date]
Time: [Date & Time]
Location: [Location]

⚠ Important Instructions

Arrival: Please arrive 15 minutes before your slot.

Condition: Ensure the vehicle is clean and free of unnecessary clutter to allow the tester access.

Compliance: This test is required to keep the vehicle road-legal.

If you cannot attend, please contact us immediately to avoid a missed booking fee.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'vehicle_service_booking_driver',
      name: '🔧 Vehicle Service Booking (Driver)',
      subjectTemplate: '🔧 Vehicle Service Confirmation – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We have booked your vehicle in for a Scheduled Service.

🔹 Appointment Details
Vehicle: [Vehicle Reg]
Date: [Date]
Time: [Date & Time]
Location: [Location]

⚠ Instructions

Please ensure you arrive on time so the technicians can complete the work promptly.

The service usually takes approximately 2–3 hours.

Please plan your work schedule accordingly.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'repair_booking_driver',
      name: '🛠️ Repair Booking (Driver)',
      subjectTemplate: '🛠️ Repair Booking Confirmation – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We have arranged a booking to carry out Repairs on your vehicle.

🔹 Appointment Details
Vehicle: [Vehicle Reg]
Date: [Date]
Time: [Date & Time]
Location: [Location]
Issue to be fixed: [Additional Notes]

⚠ Instructions

Please drop the vehicle off promptly at the time stated above.

If the vehicle is non-drivable before this date, please contact the breakdown line immediately.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'general_maintenance_booking_driver',
      name: '🔧 General Maintenance Booking (Driver)',
      subjectTemplate: '🔧 Maintenance Booking Confirmation – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

Your vehicle is booked in for General Maintenance.

🔹 Appointment Details
Vehicle: [Vehicle Reg]
Date: [Date]
Time: [Date & Time]
Location: [Location]
Work Required: [Additional Notes]

⚠ Instructions

Please arrive on time.

Wait times may vary depending on the workshop schedule.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'nsl_booking_request',
      name: 'NSL Booking Request (Service Center)',
      subjectTemplate: 'NSL Booking Request – Vehicle Registration: [Insert Reg No.]',
      bodyTemplate:
`Dear LEVC Service Team,

I am writing to request a NSL booking for the following vehicle:

🔹 Vehicle Registration Number: [Insert Reg No.]
🔹 Service Type: Nsl booking
🔹 Preferred Date & Time: [Insert Date & Time]
🔹 Location: 39-41 Brewery Road, London, N7 9QH
🔹 Additional Notes: Nsl booking required

Please confirm the booking at your earliest convenience.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'vehicle_service_request',
      name: 'Vehicle Service Request (Service Center)',
      subjectTemplate: 'Vehicle Service Request – Vehicle Registration: [Insert Reg No.]',
      bodyTemplate:
`Dear LEVC Service Team,

I am writing to request a vehicle service for the following vehicle:

🔹 Vehicle Registration Number: [Insert Reg No.]
🔹 Current Mileage: [Insert Mileage]
🔹 Service Type: Vehicle Service
🔹 Preferred Date & Time: [Insert Date & Time]
🔹 Location: 39-41 Brewery Road, London, N7 9QH
🔹 Additional Notes: Vehicle service required

Please confirm the booking at your earliest convenience.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'mot_failure_repair_request',
      name: 'MOT Failure Repair Request (Service Center)',
      subjectTemplate: 'MOT Failure Repair Booking Request – Vehicle Registration: [Insert Reg No.]',
      bodyTemplate:
`Dear LEVC Service Team,

I am writing to request a MOT failure repair for the following vehicle:

🔹 Vehicle Registration Number: [Insert Reg No.]
🔹 Service Type: Mot failure repair
🔹 Preferred Date & Time: [Insert Date & Time]
🔹 Location: 39-41 Brewery Road, London, N7 9QH
🔹 Additional Notes: Mot failure repair required

Please confirm the booking at your earliest convenience.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'maintenance_repair_request',
      name: 'Maintenance Repair Request (Service Center)',
      subjectTemplate: 'Maintenance Repair Booking Request – Vehicle Registration: [Insert Reg No.]',
      bodyTemplate:
`Dear LEVC Service Team,

I am writing to request a maintenance repair for the following vehicle:

🔹 Vehicle Registration Number: [Insert Reg No.]
🔹 Service Type: Maintenance repair
🔹 Preferred Date & Time: [Insert Date & Time]
🔹 Location: 39-41 Brewery Road, London, N7 9QH
🔹 Additional Notes: Maintenance repair required

Please confirm the booking at your earliest convenience.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'mot_booking_request',
      name: 'MOT Booking Request (Service Center)',
      subjectTemplate: 'MOT Booking Request – Vehicle Registration: [Vehicle Reg]',
      bodyTemplate:
`🚕 MOT Booking Request

Dear [Service Team],

I would like to request an MOT booking for the following vehicle:

Vehicle Registration: [Vehicle Reg]
Driver Name: [Driver Name]
Preferred Date: [DD/MM/YYYY]
Location: [Location]

Additional Notes: [Additional Notes]

Please confirm the booking at your earliest convenience.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'parts_prices_availability_request',
      name: 'Parts Prices Request (Service Center)',
      subjectTemplate: 'Parts Prices & Availability Request – [Vehicle Reg]',
      bodyTemplate:
`🔧 Parts Prices & Availability Request

Dear [Parts Department / Service Team],

I am writing to request prices and availability for the following part(s):

Vehicle Registration: [Vehicle Reg]
Part(s) Required: [Part(s) Required]
Quantity: [Quantity]
Additional Notes: [Additional Notes]

Please confirm availability, price, and estimated delivery/collection time.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'road_tax_payment_confirmation',
      name: 'Road Tax Payment Confirmation',
      subjectTemplate: 'Road Tax Payment Confirmation – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We are pleased to inform you that the road tax for your hire vehicle has now been paid and successfully renewed.

🔹 Vehicle Registration Number: [Vehicle Reg]
🔹 New Road Tax Expiry Date: [Expiry Date]

Your vehicle remains fully compliant with road regulations, and no further action is required from you at this time.

Please continue to ensure the vehicle is kept clean and in good condition throughout the hire period.

Thank you for your prompt cooperation.

${aieSkylineSignature}`,
      requiredFields: ['vehicle']
    },
  ],

  /* ───────── INVOICE ───────── */
  invoice: [
    {
      id: 'invoice_issued',
      name: 'Invoice Issued',
      subjectTemplate: 'Invoice [Invoice Number] – AIE Skyline Limited',
      bodyTemplate:
`Dear [Customer Name],

Please find below the details of your invoice:

🔹 Invoice Number: [Invoice Number]
🔹 Invoice Date: [Invoice Date]
🔹 Amount Due: £[Amount]
🔹 Due Date: [Due Date]

🏦 Payment Instructions:
Bank: Lloyds Bank
Account Name: AIE Skyline Limited
Sort Code: 30-99-50
Account Number: 30513162
Payment Reference: [Invoice Number]

⚠ Please ensure payment is made by the due date to avoid late fees or disruption to services.

Thank you for your business.

${aieSkylineSignature}`,
      requiredFields: ['invoice']
    },
    {
      id: 'invoice_reminder_overdue',
      name: 'Invoice Reminder (Outstanding / Overdue)',
      subjectTemplate: 'Overdue Invoice Reminder – [Invoice Number]',
      bodyTemplate:
`Dear [Customer Name],

This is a reminder that payment for the following invoice remains outstanding and overdue:

🔹 Invoice Number: [Invoice Number]
🔹 Invoice Date: [Invoice Date]
🔹 Amount Due: £[Amount]
🔹 Due Date: [Due Date]

Please make payment immediately to avoid additional late charges or disruption to your account. If you have already paid, please disregard this reminder or reply with payment confirmation.

🏦 Payment Instructions:
Bank: Lloyds Bank
Account Name: AIE Skyline Limited
Sort Code: 30-99-50
Account Number: 30513162
Payment Reference: [Invoice Number]

Thank you for your prompt attention.

${aieSkylineSignature}`,
      requiredFields: ['invoice']
    },
    {
      id: 'invoice_payment_confirmation',
      name: 'Payment Confirmation',
      subjectTemplate: 'Invoice Paid – Thank You [Invoice Number]',
      bodyTemplate:
`Dear [Customer Name],

We confirm receipt of payment for your invoice.

🔹 Invoice Number: [Invoice Number]
🔹 Invoice Date: [Invoice Date]
🔹 Amount Paid: £[Amount]
🔹 Payment Date: [DD/MM/YYYY]

Your account is now up to date. Thank you for settling your invoice promptly and for choosing AIE Skyline Limited.

${aieSkylineSignature}`,
      requiredFields: ['invoice']
    },
    {
      id: 'invoice_reminder_short',
      name: '🚨 Invoice Reminder',
      subjectTemplate: '🚨 Invoice Reminder – [Invoice No.]',
      bodyTemplate:
`🚨 Invoice Reminder

Dear [Customer Name],

This is a polite reminder that the following invoice remains outstanding:

Invoice Number: [Invoice No.]
Invoice Date: [DD/MM/YYYY]
Amount Due: £[Amount]
Due Date: [DD/MM/YYYY]

💳 Payment Details – AIE Skyline Ltd
🏦 Bank: Lloyds Bank
💼 Account Name: AIE SKYLINE LIMITED
🔢 Account Number: 30513162
🔣 Sort Code: 30-99-50
📌 Reference: [Customer Name / Invoice No.]

Please arrange payment at your earliest convenience. If payment has already been made, kindly disregard this reminder.

Thank you for your prompt attention.

${aieSkylineSignature}`,
      requiredFields: ['invoice']
    },
  ],

  /* ───────── CLAIM ───────── */
  claim: [
    {
      id: 'claim_urgent_docs_required',
      name: 'Urgent - Documents Required for New Accident Claim',
      subjectTemplate: 'Urgent - Documents Required for New Accident Claim',
      bodyTemplate:
`Dear [Client Name],

Thank you for reporting your accident to AIE Claims. To proceed with setting up your file and managing your claim efficiently, we require copies of the following documents immediately.

Please ensure all photos or scans are clear and readable.

Required Documents Checklist:

Driver Licence (Photocard – Front and Back)

Driver TfL Licence (PCO/Bill)

Logbook (V5C) (Pages 1, 2, and 3)

NSL Licence (Vehicle Licence/Inspection Document)

National Insurance Number

Insurance Certificate (Current Policy)

If we are providing a replacement vehicle, we also require:

Bank Statements (3 months from the date of accident up until the end of hire)

Tax Returns (Last 3 years)

How to Send Your Documents:

You can submit these documents via email or WhatsApp for an instant response.

WhatsApp: 02080505337 or 07552 553441

Email: claims@aieclaims.co.uk

Please send these as soon as possible to avoid any delays in processing your claim or arranging your replacement vehicle.

If you have any questions, please contact our Claims Team on 020 8050 5337 option 2 & 1.

Best Regards,

Claims Team
AIE Claims
United House, 39–41 North Road
London, N7 9DP

📞 Tel: 020 8050 5337
📱 WhatsApp: 07552 553441
✉️ Email: claims@aieclaims.co.uk
🌐 Web: www.aieclaims.co.uk`,
      requiredFields: ['claim']
    },
    {
      id: 'claim_new_to_legal',
      name: 'New Claim – Send to Legal Team',
      subjectTemplate: 'New Claim Submission – [Client Name] – [Registration Number]',
      bodyTemplate:
`Hi [Recipient Name],

Please find below the details of a new case. Relevant documents and supporting evidence are attached.

Action Required: Kindly ensure that all attached documents are added to the claim file.

Claim Type: [Vehicle Damage]  [Credit Hire]  [PI]  [Storage]  [Loss of Earnings]  [Windscreen]  [MIB]  [Other]

Client Information:
- Client Name: [Client Name]
- Client Registration: [Client Registration]

Third Party Information:
- Third Party Registration: [Third Party Registration]

Incident Details:
- Date: [Date]
- Time: [Time]
- Location: [Location]
- Description: [Brief description of the incident]

If you require any further information, please contact us.

${aieClaimsSignature}`,
      requiredFields: ['claim']
    },
    {
      id: 'claim_update_request',
      name: 'Claim Update Request',
      subjectTemplate: 'Claim Update Request – [Client Name] – [Registration Number]',
      bodyTemplate:
`Hi [Recipient Name],

We are following up regarding the progress of the below claim:

Claim Type: [Vehicle Damage]  [Credit Hire]  [PI]  [Storage]  [Loss of Earnings]  [Windscreen]  [MIB]  [Other]
Client Name: [Client Name]
Client Registration: [Client Registration]
Incident Date: [Date]

Please provide us with an update on the current status of this claim, including any recent developments, next steps, or outstanding requirements.

Thank you for your cooperation.

${aieClaimsSignature}`,
      requiredFields: ['claim']
    },
    {
      id: 'claim_engineer_report',
      name: 'Engineer Report Request',
      subjectTemplate: 'Engineer Report Request – [Client Name] – [Registration Number]',
      bodyTemplate:
`Hi [Recipient Name],

We are requesting the engineer’s inspection report for the following case:

Claim Type: [Vehicle Damage]  [Credit Hire]  [PI]  [Storage]  [Loss of Earnings]  [Windscreen]  [MIB]  [Other]
Client Name: [Client Name]
Client Registration: [Client Registration]
Incident Date: [Date]
Incident Location: [Location]

Kindly provide the engineer’s findings, repair cost estimates, and any additional observations required for progressing this claim.

Please confirm when the report will be available.

${aieClaimsSignature}`,
      requiredFields: ['claim']
    },
    {
      id: 'claim_customer_update',
      name: 'Customer Claim Update Notification',
      subjectTemplate: 'Claim Update – [Claim Reference]',
      bodyTemplate:
`Dear [Customer Name],

We are writing to provide you with an update regarding your claim:

Claim Reference: [Claim Reference]
Vehicle Registration: [Vehicle Reg]
Status Update: [Insert progress / next step]

Please be assured that our team is actively managing your case and will keep you informed of any developments. If you have any questions, please contact us.

${aieClaimsSignature}`,
      requiredFields: ['claim']
    },
    {
      id: 'claim_customer_docs_request',
      name: 'Customer Documents Request',
      subjectTemplate: 'Request for Supporting Documents – [Claim Reference]',
      bodyTemplate:
`Dear [Customer Name],

We require some information and documentation to set up your accident claim. Please provide the following at your earliest convenience:


📅 Accident date and time
📍 Accident location
📝 Description of the accident
📄 All four pages of the logbook
🪪 Driving licence (front and back)
🚖 Taxi licence (NSL/BILL)
👤 Third party information
📑 Vehicle insurance certificate
📸 All accident scene photos and any supporting evidence


Once we receive the above, we will proceed with your claim without delay.

${aieClaimsSignature}`,
      requiredFields: ['claim']
    },
    {
      id: 'claim_customer_additional_info',
      name: 'Customer Additional Information Required',
      subjectTemplate: 'Additional Information Required – [Claim Reference]',
      bodyTemplate:
`Dear [Customer Name],

To continue processing your claim, we require the following additional information:

Claim Reference: [Claim Reference]
Vehicle Registration: [Vehicle Reg]
Details Needed: [Specify clearly what is missing]

Once received, we will be able to move forward without delay.

Thank you for your cooperation and assistance.

${aieClaimsSignature}`,
      requiredFields: ['claim']
    },
  ],

  /* ───────── CUSTOM ───────── */
  custom: [
    {
      id: 'skyline_welcome_account_details',
      name: 'Welcome to AIE Skyline - Important Account & Contact Details',
      subjectTemplate: 'Welcome to AIE Skyline - Important Account & Contact Details',
      bodyTemplate:
`Dear [Driver Name],

Welcome to AIE Skyline Limited. We are pleased to have you on board.

For your records, please save the following important information regarding your account payments and how to contact our team.

📞 Contacting Support
Please save our office and WhatsApp numbers in your phone immediately.

Office Landline: 020 8050 5337

WhatsApp Support: 07552 553441

Email: admin@aieskyline.co.uk

Address: United House, 39-41 North Road, London, N7 9DP

Please use WhatsApp for sending proof of payment or non-urgent queries.

💷 Payment Information
Rent is due on MONDAY. Please use the details below for all transfers.

🏦 Bank: Lloyds Bank

💼 Account Name: AIE SKYLINE LIMITED

🔢 Account Number: 30513162

🔣 Sort Code: 30-99-50

📝 Reference: [Vehicle Reg]

Important: You must quote your Vehicle Registration number as the payment reference so we can allocate your payment correctly to your account.

We look forward to working with you.

${aieSkylineSignature}`
    },
    {
      id: 'claims_bank_tax_request',
      name: '📩 AIE Claims – Request for Bank Statements & Tax Returns',
      subjectTemplate: 'Request for Bank Statements & Tax Returns – [Claim Reference]',
      bodyTemplate:
`Dear [Customer Name],

As part of your ongoing claim, we require the following documents:

Bank Statements
February 2025 – May 2025

Tax Returns
2022
2023
2024

Please provide these documents at your earliest convenience via email or WhatsApp. Kindly note that we cannot progress your claim until the requested information is received.

Thank you for your cooperation.

${aieClaimsSignature}`,
    },
    {
      id: 'skyline_general_communication',
      name: '📩 AIE Skyline – General Communication Template',
      subjectTemplate: '[Insert Subject Here]',
      bodyTemplate:
`Dear [Recipient Name],

We are writing regarding [insert purpose: e.g., your rental account, vehicle service, payment, or general update].

Details:

[Insert Key Detail 1]

[Insert Key Detail 2]

[Insert Key Detail 3]

Please [insert required action: e.g., arrange payment, provide documents, confirm booking, or note the update].

If you have any questions or need further assistance, do not hesitate to contact us.

${aieSkylineSignature}`,
    },
    {
      id: 'mot_expiry_notification',
      name: 'MOT Expiry Notification (Driver)',
      subjectTemplate: 'MOT Expiry Reminder – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We hope you are well. Our records show that the MOT for your hire vehicle is due to expire soon.

🔹 Vehicle Registration Number: [Vehicle Reg]
🔹 MOT Expiry Date: [Expiry Date]

⚠ Action Required
Please ensure the vehicle is presented for its MOT before the expiry date. Driving without a valid MOT may result in penalties, fines, and suspension of your hire agreement.
Ensure the vehicle is presented clean and on time.

If you require assistance booking the MOT, please contact us immediately.

Thank you for your cooperation.

${aieSkylineSignature}`,
      requiredFields: ['vehicle']
    },
    {
      id: 'nsl_expiry_notification',
      name: 'NSL Expiry Notification (Driver)',
      subjectTemplate: 'NSL Expiry Reminder – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We hope you are well. Our records show that the NSL licence/inspection for your hire vehicle is due to expire soon.

🔹 Vehicle Registration Number: [Vehicle Reg]
🔹 NSL Expiry Date: [Expiry Date]

⚠ Action Required
Please ensure the vehicle is presented for its NSL inspection/renewal before the expiry date. Failure to do so may result in the vehicle being non-compliant and suspension of your hire agreement.
Ensure the vehicle is presented clean and on time, with all required documents (driver badge/licence/logbook).

If you need help arranging the NSL booking, please contact us immediately.

Thank you for your cooperation.

${aieSkylineSignature}`,
      requiredFields: ['vehicle']
    },
    {
      id: 'road_tax_expiry_notification',
      name: 'Road Tax Expiry Notification (Driver)',
      subjectTemplate: 'Road Tax Expiry Reminder – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We hope you are well. Our records show that the road tax for your hire vehicle is due to expire soon.

🔹 Vehicle Registration Number: [Vehicle Reg]
🔹 Road Tax Expiry Date: [Expiry Date]
🔹 Amount Due: £[Amount]

⚠ Action Required
Please arrange payment of the above amount immediately.

🚫 Important Notice: Road tax will not be renewed if payment is not received on time. This may result in the vehicle being taken off the road and suspension of your hire agreement.

Ensure the vehicle is kept clean at all times and compliant with road regulations.

Thank you for your prompt attention.

${aieSkylineSignature}`,
      requiredFields: ['vehicle']
    },
    {
      id: 'road_tax_payment_confirmation_driver',
      name: 'Road Tax Payment Confirmation (Driver)',
      subjectTemplate: 'Road Tax Payment Confirmation – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We are pleased to inform you that the road tax for your hire vehicle has now been paid and successfully renewed.

🔹 Vehicle Registration Number: [Vehicle Reg]
🔹 New Road Tax Expiry Date: [Expiry Date]

Your vehicle remains fully compliant with road regulations, and no further action is required from you at this time.

Please continue to ensure the vehicle is kept clean and in good condition throughout the hire period.

Thank you for your prompt cooperation.

${aieSkylineSignature}`,
      requiredFields: ['vehicle']
    },
    {
      id: 'mileage_request',
      name: '📩 Request for Vehicle Mileage',
      subjectTemplate: 'Request for Vehicle Mileage',
      bodyTemplate:
`Hello [Driver Name],

Could you please send a clear picture of the dashboard showing the mileage of the vehicle you are currently driving?

Please ensure the display is clearly visible and easy to read.

Thank you for your cooperation.

${aieSkylineSignature}`,
    },
    {
      id: 'outstanding_payment_vehicle_generic',
      name: '📩 Outstanding Payment Reminder (Vehicle)',
      subjectTemplate: 'Outstanding Payment Reminder – Vehicle [Vehicle Reg]',
      bodyTemplate:
`Dear [Client Name],

We hope this message finds you well. This is a reminder that an outstanding payment remains for your vehicle with AIE Skyline.

📄 Vehicle Details
Registration Number: [Vehicle Reg]

💳 Payment Summary
Total Amount Due: £[Total Amount]
Amount Paid: £[Amount Paid]
Outstanding Balance: £[Outstanding Amount]

🏦 Payment Instructions
Bank: Lloyds Bank
Account Name: AIE Skyline
Account Number: 30513162
Sort Code: 30-99-50
Payment Reference: [Vehicle Reg]

⚠ Important Notice
Failure to settle the outstanding balance may result in late fees or suspension of services. If you’ve already made the payment or require assistance, please contact us.

${aieSkylineSignature}`,
      requiredFields: ['vehicle'],
    },
  ],
};