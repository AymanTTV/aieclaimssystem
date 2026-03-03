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

Payment Received: £[Amount Paid]

Remaining Balance: £[New Balance]

Please ensure any remaining balance is cleared by the agreed due date.

${aieSkylineSignature}`,
      requiredFields: ['transaction'] 
    },
    {
      id: 'finance_credit_on_account',
      name: 'You have a credit on your account',
      subjectTemplate: 'Quick Update: You have a credit on your account - [Vehicle Reg]',
      bodyTemplate:
`Hi [Recipient Name],

Just a quick note to let you know that you have a credit of £[Amount] on your account.

We’ll keep this on your file to offset your next bill. Please let us know if you have any questions!

Kind regards,


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
    },
    {
      id: 'finance_account_statement_pdf',
      name: 'Account Statement (With Attachment)',
      subjectTemplate: 'Your Account Statement from AIE Skyline',
      bodyTemplate:
`📊 Your Account Statement from AIE Skyline.

Hi [selected account name],

Please find your latest account statement attached for your records.

Thank you for your continued partnership with AIE Skyline Limited. If you have any questions regarding the activity or balance shown, please feel free to reach out to the finance team.

${aieSkylineSignature}`
    }
  ],

  /* ───────── RENTAL ───────── */
  rental: [
    {
      id: 'rental_reminder_monday',
      name: 'Rental Reminder Monday',
      subjectTemplate: 'Rental Statement Breakdown - [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We hope you had a productive week. This is your automated statement for the week starting Monday, [the current date].

📄 Rental Statement Breakdown

Vehicle Details: 

Reg: [Vehicle Reg]

Status: Active Hire

💳 Payment Calculation

Balance Brought Forward: £[owing Balance]

Rental type: [Rental Type]

-------------------------------------------

Total Outstanding Balance: £[owing balance]

🏦 Payment Instructions

Bank: Lloyds Bank
Account: AIE Skyline Limited
Number: 30513162 | Sort: 30-99-50
Ref: [Vehicle Reg]

🤝 Payment Request 
Please kindly arrange for the Total Outstanding Balance to be settled today. Clearing your balance on Mondays ensures your account remains up to date and your vehicle hire continues without interruption.

If you have already made this payment, thank you—please feel free to ignore this reminder.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'rental_end_of_week',
      name: 'End-of-Week Account Review',
      subjectTemplate: 'Outstanding Statement - [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We are conducting our end-of-week account review and noticed that we have not yet received the full rental payment for your vehicle.

📄 Outstanding Statement

Vehicle: [Vehicle Reg]

Week Commencing: [current Date]

Total Remaining Balance: [Outstanding Balance]

🏦 Payment Instructions

Bank: Lloyds Bank
Account: AIE Skyline Limited
Number: 30513162 | Sort: 30-99-50
Ref: [Vehicle Reg]

🤝 Action Required 
Please kindly ensure this balance is cleared before 5:00 PM today. Keeping your account up to date before the weekend prevents any administrative issues or potential hire suspensions.

If you have already transferred the funds in the last few hours, please WhatsApp a copy of your receipt to 07552 553441 so we can update your record immediately.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'rental_substitute_activation',
      name: 'Substitute Vehicle Activation',
      subjectTemplate: '🔄 Substitute Vehicle Activation – [Sub Reg]',
      bodyTemplate:
`🔄 Substitute Vehicle Activation – [Sub Reg]

Dear [Driver Name],

This message is to confirm that a substitute vehicle has been assigned to your account while your main vehicle is unavailable.

🚗 Active Vehicle Details

• Substitute Reg: [Sub Reg]
• Effective From: [Date the date from of the substitute vehicle start date] / [Time the time from of the substitute vehicle start time]
• Main Vehicle Reg (Inactive): [Main Reg the rental main vehicle registration number]

⚠️ Important Terms
• Billing: Your rental agreement and weekly charges remain active and will now apply to this substitute vehicle.
• Maintenance: All standard rules apply, including the mandatory 3-times-per-week charging requirement.
• Responsibility: You are fully liable for the condition and care of this substitute vehicle until it is returned and swapped back.

Please ensure you have performed a walk-around inspection of the substitute vehicle. If you notice any pre-existing issues not noted on your hand-over sheet, please notify us immediately.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'mileage_update_request',
      name: 'Mileage Update Request',
      subjectTemplate: '📍 Mileage Update Request – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

We are currently updating our vehicle records and kindly request the current mileage for your vehicle.

Action Required: Please reply to this message with a clear photo of your dashboard showing the current mileage for [Vehicle Reg].

This information helps us stay on top of your vehicle's maintenance schedule and ensures we book your services at the correct intervals.

Thank you for your cooperation and your continued hard work.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'rental_return_confirmation_policy',
      name: 'Return Confirmation & Inspection Policy',
      subjectTemplate: '📝 Return Confirmation & Inspection Policy — [Vehicle Reg]',
      bodyTemplate:
`📝 Return Confirmation & Inspection Policy — [Vehicle Reg]

Dear [Driver Name],

Thank you for choosing AIE Skyline. We truly value you as a customer and appreciate your business.

We have noted your intent to return the vehicle. Please take note of our mandatory return and holiday procedures:

⚠️ Mandatory Return & Inspection Policy

• Driver Presence Required: You must remain present during the final vehicle inspection. You cannot leave the premises until the vehicle's condition is fully agreed upon and signed off by both the owner and the hirer (as you).
• Immediate Payment: We do not hold deposits. Any costs for physical damage or professional valeting (required for poor condition, smoking, or spills) must be settled in full before you leave.
• Liability: You remain fully responsible for the vehicle until the final payment and sign-off are completed.

🏖️ Holiday & Return Policy

• Book in Advance: If you are finishing your hire for a holiday, please ensure you book your vehicle for your return date now with a member of staff.
• No Guarantees: We cannot guarantee a vehicle will be available for last-minute bookings upon your return.
• Secure Your Vehicle: Our staff will register your return date in our system specifically to secure a vehicle for you.

We look forward to seeing you at the office.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'rental_welcome',
      name: 'Rental Welcome',
      subjectTemplate: '🚖 Welcome to AIE Skyline – New Hire Activation',
      bodyTemplate:
`Dear [Driver Name],

Welcome to AIE Skyline! We are delighted to have you on board. Our goal is to provide you with a smooth, professional, and hassle-free experience in one of London’s Iconic Taxis.

Your rental agreement for [Vehicle Reg] is now active. Please review the following care and maintenance guidelines to ensure your hire remains in good standing.

📄 Billing & Rental Cycle
• Start Date: [Start Date]
• Rental Cycle: Our rental week runs Monday to Sunday.
• Initial Charge: Since you started midweek, your initial charge covers the days remaining until Sunday.
• Monday Summary: A full weekly charge will be generated every Monday at 09:00.

⚡ Charging & Vehicle Health
• Charging Frequency: To keep the vehicle in peak condition, we kindly ask that you charge it at least 3 times per week.
• Battery Care: Please be aware that LEVC provides diagnostic reports regarding charging frequency. To avoid any personal liability for mechanical or battery issues, we encourage you to maintain this regular charging schedule, as failures resulting from a lack of charging may be held to your account.

🔧 Maintenance, Repairs & Breakdown
• Servicing: All mechanical work and tires are handled by our dedicated technicians at the LEVC Main Dealer.
• Punctures: You are responsible for fixing standard punctures. If the tire cannot be repaired, please go to LEVC; they will replace it and charge it to our account.
• 24-Hour Breakdown (MEMS Recovery): 📱 07951 762124

🧼 Cleanliness, Damage & Liability
• Standards: The vehicle must be kept clean at all times. If the vehicle is returned or seen in poor condition, a charge for a full professional valet will apply.
• No Smoking/Eating: Strictly prohibited. You are responsible for the cost of repair for any liquid spills (coffee, etc.) in the driver or passenger compartments.
• Insurance Excess: Our insurance excess is £1,000. If the vehicle is damaged, you will pay either the cost of the repair or the excess—whichever is cheaper.

🏦 Payment Details
Please ensure all payments are made to the following account:
• Bank: Lloyds Bank | Account Name: AIE Skyline Limited
• Account No: 30513162 | Sort Code: 30-99-50
• Reference: [Vehicle Reg]

📞 Contact Directory
• Office Hours (Mon–Fri, 09:30–18:00): ☎️ 020 8050 5337
• Out of Hours & WhatsApp (24/7): 📱 07552 553441
• Email: admin@aieskyline.co.uk
• Address: United House, 39–41 North Road, London, N7 9DP

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
Subtotal: £[Subtotal]
VAT: £[VAT]
Total: £[Total Amount]
Paid: £[Amount Paid]
Owing: £[Outstanding Balance]

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

Our records indicate that your rental payment for this week is now overdue. We have not yet received the funds to clear the balance on your account.

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

⚠ Required Action Please settle this outstanding amount immediately to ensure your vehicle hire remains active. Failure to clear overdue balances may result in late fees or a formal suspension of your hire agreement.

If you are experiencing any difficulties making this payment, please contact the office urgently on 020 8050 5337 or 07552 553441 to discuss your account.

${aieSkylineSignature}`,
      requiredFields: ['rental']
    },
    {
      id: 'rental_payment_received',
      name: 'Payment Received',
      subjectTemplate: 'Rental Payment Received – Thank You',
      bodyTemplate:
`Dear [Driver Name],

This is a confirmation that your payment has been successfully received and credited to your account for [Vehicle Registration Number]

📄 Payment Summary
Vehicle: [Vehicle Registration Number]
Amount Received: £[Amount]
Date Received: [DD/MM/YYYY]
Payment Reference: [Vehicle Registration Number]

Thank you for your prompt payment. Keeping your account up to date ensures your account remains active and in good standing.

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
      id: 'maintenance_service_due',
      name: 'Service Due Notification',
      subjectTemplate: '🔧 Service Due Notification – [Vehicle Reg]',
      bodyTemplate:
`🔧 Service Due Notification – [Vehicle Reg]

Dear [Driver Name],

Thank you for providing your current mileage. Based on our records, your vehicle is now due for a routine service.

📄 Service Details
• Vehicle: [Vehicle Reg]
• Current Mileage: [Mileage]
• Service Interval: [NextMileage]
• Additional Notes: [Additional Notes]

✅ Next Steps 
Our team will contact you shortly with a confirmed appointment date and location. Please ensure the vehicle is available and clean for the scheduled booking.

Reminder: To maintain vehicle health and battery efficiency, please continue to charge your vehicle at least 3 times per week.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'vehicle_maintenance_appointment',
      name: 'Vehicle Maintenance Appointment',
      subjectTemplate: 'Vehicle Maintenance Appointment – [Vehicle Reg]',
      bodyTemplate:
`Dear [Driver Name],

Please be advised that an appointment has been scheduled for your vehicle. Details are as follows:

📅 Appointment Details
•⁠  ⁠Maintenance Type: [Maintenance Type]
•⁠  ⁠Date: [Date]
•⁠  ⁠Time: [Time]
•⁠  Location: [Garage Name] - [Location]
• Additional Notes: [Additional Notes]

⚡ Important Reminders
•⁠  ⁠Attendance: Please ensure the vehicle is clean and arrives at the location on time.
•⁠  ⁠Vehicle Care: Remember that you must charge the vehicle at least 3 times per week to prevent mechanical failure.
•⁠  ⁠Cancellations: If you cannot attend, you must notify the office at least 24 hours in advance.

Thank you for your cooperation in keeping your vehicle safe and roadworthy.
Kind regards,

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'maintenance_appointment_tomorrow',
      name: 'Reminder: Vehicle Appointment Tomorrow',
      subjectTemplate: 'Reminder: Vehicle Appointment Tomorrow – [Vehicle Reg]',
      bodyTemplate:
`Reminder: Vehicle Appointment Tomorrow – [Vehicle Reg]

Dear [Driver Name],

This is a friendly reminder that your vehicle is scheduled for maintenance tomorrow.

📅 Appointment Details
• Date: Tomorrow, [the maintenance date]
• Location: [Garage Name] - [Location]
• Type: [Maintenance Type]
• Additional Notes: [Additional Notes]

📍 Action Required
• Please ensure you arrive 10 minutes early to allow for the vehicle handover.
• The vehicle must be in a clean condition for the technicians to work on.

⚠️ Need to Reschedule? 
If you are unable to attend, please call us immediately on 020 8050 5337. Late cancellations may result in a garage fee being charged to your account.

Safe driving,

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
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
Time: [Time]
Location: [Garage Name] - [Location]
Additional Notes: [Additional Notes]

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
Location: [Garage Name] - [Location]
Additional Notes: [Additional Notes]

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
Location: [Garage Name] - [Location]
Additional Notes: [Additional Notes]

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

We have successfully booked your vehicle in for its scheduled maintenance. Please find the confirmed details below:

🔹 Appointment Details
Vehicle: [Vehicle Reg]
Date: [Date]
Time: [Date & Time]
Location: [Garage Name] - [Location]
Additional Notes: [Additional Notes]

⚠ Important Instructions
•	Punctuality: Please ensure you arrive at the garage on time to avoid any delays to your work day.
•	Vehicle Care: As a reminder, the main dealer diagnostics will check for the mandatory 3-times-per-week charging. Please ensure your battery health is maintained.
•	Cancellations: If for any reason you cannot attend, please contact us on 07552 553441 immediately so we can reallocate the slot.


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
Location: [Garage Name] - [Location]
Additional Notes: [Additional Notes]

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
`Dear  [Garage Name],

I am writing to request a NSL booking for the following vehicle:

🔹 Vehicle Registration Number: [Insert Reg No.]
🔹 Service Type: [Maintenance Type]
🔹 Preferred Date & Time: [Date & Time]
🔹 Location: [Garage Name] - [Location]
🔹 Additional Notes: [Additional Notes]

Please confirm receipt of this booking. All invoices should be sent to admin@aieskyline.co.uk.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'vehicle_service_request',
      name: 'Vehicle Service Request (Service Center)',
      subjectTemplate: 'Vehicle Service Request – Vehicle Registration: [Insert Reg No.]',
      bodyTemplate:
`Dear  [Garage Name],

I am writing to request a vehicle service for the following vehicle:

🔹 Vehicle Registration Number: [Insert Reg No.]
🔹 Current Mileage: [Insert Mileage]
🔹 Service Type: [Maintenance Type]
🔹 Preferred Date & Time: [Date & Time]
🔹 Location: [Garage Name] - [Location]
🔹 Additional Notes: [Additional Notes]

Please confirm receipt of this booking. All invoices should be sent to admin@aieskyline.co.uk.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'mot_failure_repair_request',
      name: 'MOT Failure Repair Request (Service Center)',
      subjectTemplate: 'MOT Failure Repair Booking Request – Vehicle Registration: [Insert Reg No.]',
      bodyTemplate:
`Dear  [Garage Name],

I am writing to request a MOT failure repair for the following vehicle:

🔹 Vehicle Registration Number: [Insert Reg No.]
🔹 Service Type: [Maintenance Type]
🔹 Preferred Date & Time: [Date & Time]
🔹 Location: [Garage Name] - [Location]
🔹 Additional Notes: [Additional Notes]

Please confirm receipt of this booking. All invoices should be sent to admin@aieskyline.co.uk.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'maintenance_repair_request',
      name: 'Maintenance Repair Request (Service Center)',
      subjectTemplate: 'Maintenance Repair Booking Request – Vehicle Registration: [Insert Reg No.]',
      bodyTemplate:
`Dear  [Garage Name],

Please book in the following vehicle for:

🔹 Vehicle Registration Number: [Insert Reg No.]
🔹 Service Type: [Maintenance Type]
🔹 Preferred Date & Time: [Date & Time]
🔹 Location: [Garage Name] - [Location]
🔹 Additional Notes: [Additional Notes]

Please confirm receipt of this booking. All invoices should be sent to admin@aieskyline.co.uk.

${aieSkylineSignature}`,
      requiredFields: ['maintenance']
    },
    {
      id: 'mot_booking_request',
      name: 'MOT Booking Request (Service Center)',
      subjectTemplate: 'MOT Booking Request – Vehicle Registration: [Vehicle Reg]',
      bodyTemplate:
`🚕 MOT Booking Request

Dear  [Garage Name],

I would like to request an MOT booking for the following vehicle:

Vehicle Registration: [Vehicle Reg]
Driver Name: [Driver Name]
Preferred Date: [DD/MM/YYYY]
Location: [Garage Name] - [Location]

Additional Notes: [Additional Notes]

Please confirm receipt of this booking. All invoices should be sent to admin@aieskyline.co.uk.

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
🔹 Amount Paid: £[Paid Balance]
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
      id: 'claim_status_new_setup',
      name: 'Status: New Claim Setup',
      subjectTemplate: 'New Claim Setup - [Claim Number]',
      bodyTemplate:
`🛡️ AIE Claims Ltd – New Claim.

Dear [Client Name],

We are sorry to hear about your recent accident, but we are here to help. This message confirms that your claim has been successfully set up with AIE Claims.

Your Claim Ref: [Claim Number]

Our team is now reviewing your details and will begin contacting the relevant parties. We will provide you with a progress update every two weeks.

${aieClaimsSignature}`,
      requiredFields: ['claim']
    },
    {
      id: 'claim_status_liability_accepted',
      name: 'Status: Liability Accepted',
      subjectTemplate: 'Claim Update: Liability Accepted - [Claim Number]',
      bodyTemplate:
`✅ Claim Update: Liability Accepted

Dear [Client Name],

Good news regarding your claim [Claim Number]. Liability has been officially accepted by the third party.

This means we can now proceed with the next stages of your repair and/or hire with full authorization.

${aieClaimsSignature}`,
      requiredFields: ['claim']
    },
    {
      id: 'claim_status_repair_in_progress',
      name: 'Status: Repair in Progress',
      subjectTemplate: 'Claim Update: Repair in Progress - [Vehicle Reg]',
      bodyTemplate:
`🔧 Claim Update: Repair in Progress

Dear [Client Name],

We are pleased to inform you that the repairs on your vehicle [Vehicle Reg] have now commenced.

We are monitoring the progress with the workshop and will notify you as soon as the work is nearing completion.

${aieClaimsSignature}`,
      requiredFields: ['claim']
    },
    {
      id: 'claim_status_repair_completed',
      name: 'Status: Repair Completed / Ready for Collection',
      subjectTemplate: 'Your Vehicle is Ready for Collection! - [Vehicle Reg]',
      bodyTemplate:
`🚗 Your Vehicle is Ready for Collection!

Dear [Client Name],

Great news! The repairs to your vehicle [Vehicle Reg] are now complete, and it is ready for collection from [Garage Name].

🔄 Credit Hire Return:
If you are currently in an AIE Claims replacement vehicle, please note that you must arrange to return the hire vehicle at the same time you collect your own.

Please contact us at 020 8050 5337 to confirm your collection time.

${aieClaimsSignature}`,
      requiredFields: ['claim']
    },
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