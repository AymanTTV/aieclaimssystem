// src/constants/emailTemplates.ts

export type EmailType = 'custom' | 'rental' | 'maintenance' | 'invoice' | 'claim';

export interface EmailTemplate {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  requiredFields: Array<'vehicle' | 'maintenance'>;
}

export const emailTemplates: Record<EmailType, EmailTemplate[]> = {
  custom: [
    {
      id: 'mileageRequest',
      name: 'Mileage request',
      subjectTemplate:
        'Request for Current Vehicle Mileage – [Vehicle Registration Number]',
      bodyTemplate: `Dear [Driver's Name],
      
I hope you are well. Please could you provide the current mileage reading for the following vehicle at your earliest convenience:

🔹 Vehicle Registration Number: [Vehicle Registration Number]  
🔹 Your Name: [Driver's Name]  
🔹 Date of Reading: [Date]  

This is required for our internal records and maintenance scheduling. A clear photo of the dashboard showing the mileage would be appreciated if possible.

Thank you for your cooperation.

Best regards,  
AIE Skyline Limited  
📍 United House, 39-41 North Road, London, N7 9DP  
📞 020 8050 5337 | 📱 +44 7999 558801  
✉️ admin@aieskyline.co.uk  
🌐 www.aieskyline.co.uk`,
      requiredFields: ['vehicle'],
    },
    {
      id: 'serviceBooking',
      name: 'Your vehicle is booked for service',
      subjectTemplate:
        'Vehicle Service Booking Confirmation – [Vehicle Registration Number]',
      bodyTemplate: `Dear [Driver's Name],

I hope you're well. Please note that your vehicle has been booked in for service as per the details below:

🔹 Vehicle Registration Number: [Vehicle Registration Number]  
🔹 Service Type: [Service Type]  
🔹 Date & Time: [Date & Time]  
🔹 Location: [Location]  

Please ensure the vehicle is available at the scheduled time and location. Let us know immediately if there are any issues with attending the appointment.

Thank you for your cooperation.

Best regards,  
AIE Skyline Limited  
📍 United House, 39-41 North Road, London, N7 9DP  
📞 020 8050 5337 | 📱 +44 7999 558801  
✉️ admin@aieskyline.co.uk  
🌐 www.aieskyline.co.uk`,
      requiredFields: ['vehicle', 'maintenance'],
    },
  ],

  rental: [
    {
      id: 'welcome',
      name: 'Rental Welcome',
      subjectTemplate: 'Welcome to AIE Skyline London Iconic Taxi Rental',
      bodyTemplate: `Welcome to AIE Skyline!  
Thank you for choosing us for your vehicle rental needs.

We’re delighted to have you on board and are committed to providing a smooth, professional, and hassle-free experience. Your journey with AIE Skyline’s London Iconic Taxi Rental starts here—and we’re here to support you every step of the way.

What You Can Expect:

• Clean, well-maintained vehicles  
• 24/7 breakdown and emergency support  
• Transparent service with no hidden charges  

Vehicle damage is your responsibility. Our insurance excess is £1 000. If your vehicle is damaged, you will pay either the cost of the repair or the excess—whichever is cheaper.

Need Help? Save These Numbers:

🔧 24-Hour Breakdown Assistance: 📱 07951 762124  
🚗 Accident (office hours Mon–Fri 09:30–18:00): ☎️ 020 8050 5337  
📱 Out of hours & WhatsApp: 07552 553441  

Get in Touch Anytime:

📍 United House, 39–41 North Road, London, N7 9DP  
☎️ 020 8050 5337  
📱 +44 7999 558801 / WhatsApp: 07552 553441  
✉️ admin@aieskyline.co.uk  
🌐 www.aieskyline.co.uk`,
      requiredFields: [],
    },
    {
      id: 'outstanding',
      name: 'Rental outstanding',
      subjectTemplate: 'Outstanding Rental Payment – Immediate Attention Required',
      bodyTemplate: `Dear [Customer Name],

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
Failure to settle the outstanding balance may result in late fees or suspension of rental services. If you’ve already made the payment or require assistance, please contact us:

📞 020 8050 5337 (Mon–Fri, 09:30–18:00)  
📱 07552 553441 (24/7 & WhatsApp)  
✉️ admin@aieskyline.co.uk

We appreciate your prompt attention to this matter and look forward to resolving it quickly.

Kind regards,  
Admin Team AIE Skyline  
📍 United House, 39–41 North Road, London, N7 9DP  
🌐 www.aieskyline.co.uk`,
      requiredFields: [],
    },
    {
      id: 'completed',
      name: 'Rental Completed',
      subjectTemplate: 'Thank You – Rental Successfully Completed',
      bodyTemplate: `Dear [Customer Name],

Thank you for choosing AIE Skyline. We’re pleased to confirm that your rental has now been successfully completed.

Rental Summary:  
Vehicle: AIE Skyline London Iconic Taxi Rental  
Registration Number: [Vehicle Registration Number]  
Rental Period: [Start Date] to [End Date]  
Status: Completed – please retain this for your records.

We hope you had a smooth and comfortable experience. Your satisfaction is our top priority. If you have any feedback or require further assistance, please let us know. We’d be delighted to welcome you again.

📞 020 8050 5337 (Mon–Fri, 09:30–18:00)  
📱 07552 553441 (24/7 & WhatsApp)  
✉️ admin@aieskyline.co.uk  
🌐 www.aieskyline.co.uk

Warm regards,  
Admin Team AIE Skyline`,
      requiredFields: [],
    },
    {
      id: 'overdue',
      name: 'Rental overdue',
      subjectTemplate: 'Urgent: Overdue Rental Payment – Immediate Action Required',
      bodyTemplate: `Dear [Customer Name],

This is a formal notice that your rental payment with AIE Skyline is now overdue and requires immediate settlement to avoid additional charges or service disruption.

📄 Rental Details  
Vehicle: AIE Skyline – London Iconic Taxi Rental  
Registration Number: [Vehicle Registration Number]  
Rental Period: [Start Date] to [End Date]  
Due Date: [Original Due Date]

💳 Payment Summary  
Total Amount Due: £[Total Amount]  
Amount Paid: £[Amount Paid]  
Outstanding Balance: £[Outstanding Balance]

🏦 Payment Instructions  
Bank: Lloyds Bank  
Account Name: AIE Skyline  
Sort Code: 30-99-50  
Account Number: 30513162  
Payment Reference: [Vehicle Registration Number]

🔔 Please ensure the correct reference is used.

📞 020 8050 5337 (Mon–Fri, 09:30–18:00)  
📱 07552 553441 (24/7 & WhatsApp)  
✉️ admin@aieskyline.co.uk

Kind regards,  
Admin Team AIE Skyline`,
      requiredFields: [],
    },
  ],

  maintenance: [
    {
      id: 'partsRequest',
      name: 'Request part price and availability',
      subjectTemplate: 'Request for LEVC Part Pricing and Availability',
      bodyTemplate: `Dear LEVC Parts Department,

I hope this message finds you well. I am writing to request pricing and availability for the following part(s) for a vehicle registered under the details below:

Registration Number: [Vehicle Registration Number]  
Make and Model: [Make & Model]  
Year of First Registration: [Year]

Please refer to the attached parts list for more details.

Could you kindly provide the prices and availability of the requested part(s), as well as any other necessary information to proceed with the purchase?

Thank you for your assistance.

Best regards,  
Admin Team  
AIE Skyline Limited – Claims Department  
✉ admin@aieskyline.co.uk  
📞 020 8050 5337 (WhatsApp)  
📍 United House, 39-41 North Road, London, N7 9DP`,
      requiredFields: [],
    },
    {
      id: 'serviceBooking',
      name: 'Vehicle service booking',
      subjectTemplate:
        'Maintenance Service Request for [Service Type] – Vehicle Registration: [Vehicle Registration Number]',
      bodyTemplate: `Dear LEVC Service Team,

I hope you are well. Kindly arrange a maintenance service for the following vehicle:

🔹 Vehicle Registration Number: [Vehicle Registration Number]  
🔹 Service Type: [Service Type]  
🔹 Preferred Date & Time: [Date & Time]  
🔹 Location: [Location]  
🔹 Additional Notes: [Additional Notes]

Please confirm the booking at your earliest convenience. If an alternative date or time is necessary, please check with us before confirming.

Best regards,  
Admin Team AIE Skyline Limited  
✉ admin@aieskyline.co.uk  
📞 020 8050 5337 | 📱 +44 7999 558801  
🌐 www.aieskyline.co.uk`,
      requiredFields: ['vehicle', 'maintenance'],
    },
    {
      id: 'invoiceRequest',
      name: 'Vehicle invoice request',
      subjectTemplate: 'Request for Vehicle Repair Invoice – [Invoice/Repair Reference Number]',
      bodyTemplate: `Dear LEVC Service Team,

I hope you are well. I am writing to kindly request the invoice for the recent repair services carried out on the following vehicle:

🔹 Vehicle Registration Number: [Vehicle Registration Number]  
🔹 Repair Service Date: [Repair Date]  
🔹 Service Type: [Service Type]

Please send the invoice at your earliest convenience. If any further details are required, let me know.

Thank you for your assistance.

Best regards,  
[Your Name]  
AIE Skyline Limited  
✉ admin@aieskyline.co.uk  
📞 020 8050 5337 | 📱 +44 7999 558801  
🌐 www.aieskyline.co.uk`,
      requiredFields: [],
    },
  ],

  invoice: [
    {
      id: 'outstandingInvoice',
      name: 'Please pay outstanding invoice',
      subjectTemplate: 'Outstanding Invoice Reminder – Immediate Attention Required',
      bodyTemplate: `Dear [Customer Name],

This is a reminder that payment for the following invoice remains outstanding and is now overdue:

🔹 Invoice Number: [Invoice Number]  
🔹 Invoice Date: [Invoice Date]  
🔹 Amount Due: [Amount]  
🔹 Due Date: [Due Date]

Please make payment to avoid late fees or disruption. If you have already paid, please disregard or reply with confirmation.

🏦 Payment Instructions:  
Bank: Lloyds Bank  
Account Name: AIE Skyline  
Sort Code: 30-99-50  
Account Number: 30513162  
Payment Reference: [Invoice Number]

Questions? Get in touch:

📞 020 8050 5337  
📱 +44 7999 558801  
✉ admin@aieskyline.co.uk

Thank you,  
Admin Team AIE Skyline`,
      requiredFields: [],
    },
    {
      id: 'newInvoice',
      name: 'Invoice new',
      subjectTemplate: 'New Invoice Issued – [Invoice Number]',
      bodyTemplate: `Dear [Customer Name],

Please find below the details of your new invoice:

🔹 Invoice Number: [Invoice Number]  
🔹 Invoice Date: [Invoice Date]  
🔹 Amount Due: £[Amount]  
🔹 Due Date: [Due Date]  
🔹 Description: [Description]

Please pay by the due date to avoid interruptions.

🏦 Payment Instructions:  
Bank: Lloyds Bank  
Account Name: AIE Skyline  
Sort Code: 30-99-50  
Account Number: 30513162  
Payment Reference: [Invoice Number]

Questions? Contact us:

📞 020 8050 5337  
📱 +44 7999 558801  
✉ admin@aieskyline.co.uk

Thank you,  
AIE Skyline Admin Team`,
      requiredFields: [],
    },
  ],

  claim: [
    {
      id: 'claimStarted',
      name: 'Claim started submission',
      subjectTemplate: 'New Case Submission – Documents and Details Enclosed',
      bodyTemplate: `Hi [Recipient's Name],

Please find below the details of a new case. Relevant documents and supporting evidence are attached.

Action Required: Kindly ensure that all attached documents are added to the claim file.

Client Information:  
Client Name: [Client Name]  
Client Registration: [Client Registration]

Third Party Information:  
Third Party Registration: [Third Party Registration]

Incident Details:  
Date: [Date]  
Time: [Time]  
Location: [Location]  
Description: [Description]

If you require any further information, please contact us.

Kind regards,  
Claims Team AIE Claims Ltd  
✉ claims@aieclaims.co.uk  
📞 020 8050 5337  
🌐 www.aieclaims.co.uk`,
      requiredFields: [],
    },
    {
      id: 'claimUpdate',
      name: 'Claim update needed',
      subjectTemplate: 'Request for Case Update – [Case/File Reference Number]',
      bodyTemplate: `Dear [Recipient's Name],

I hope this message finds you well. Please provide an update on the case referenced below:

Case/File Reference Number: [Case/File Reference Number]  
Client Name: [Client Name]  
Date of Incident: [Date]  
Incident Description: [Description]

Could you share progress so far, and let me know if any documents are still needed?

Thank you,  
[Your Name]  
AIE Claims Ltd – Claims Department  
✉ claims@aieclaims.co.uk  
📞 020 8050 5337  
🌐 www.aieclaims.co.uk`,
      requiredFields: [],
    },
  ],
};
