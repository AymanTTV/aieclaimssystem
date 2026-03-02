import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Zap, Calendar, Wrench, Clock, Eye, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// ── TYPES ──
type AutomationKey = 
  | 'rentalMondaySummary' 
  | 'rentalCompletionAutoSend' 
  | 'maintenanceAutoNotifyDriver' 
  | 'maintenanceAutoNotifyServiceCenter';

export default function AutomationSettings() {
  const [loading, setLoading] = useState(true);
  const [activePreview, setActivePreview] = useState<AutomationKey | null>(null);
  const [config, setConfig] = useState<Record<AutomationKey, boolean>>({
    rentalMondaySummary: false,
    rentalCompletionAutoSend: false,
    maintenanceAutoNotifyDriver: false,
    maintenanceAutoNotifyServiceCenter: false,
  });

  useEffect(() => {
    async function loadSettings() {
      const docRef = doc(db, 'settings', 'automations');
      const snap = await getDoc(docRef);
      if (snap.exists()) setConfig(snap.data() as any);
      setLoading(false);
    }
    loadSettings();
  }, []);

  const toggleSetting = async (key: AutomationKey) => {
    const newVal = !config[key];
    const newConfig = { ...config, [key]: newVal };
    setConfig(newConfig);
    if (newVal) setActivePreview(key); // Show preview immediately on enable
    
    try {
      await setDoc(doc(db, 'settings', 'automations'), newConfig);
      toast.success('Automation API on the process', {
        icon: '🚀',
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
      });
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Connecting to Automation Engine...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8 px-4 sm:px-0">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-100 p-2 rounded-lg">
            <Zap className="w-8 h-8 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Automation Control Center</h1>
            <p className="text-sm text-gray-500">Manage Twilio WhatsApp Workflows & Auto-Notifications</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Twilio API: Connected
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: Toggles */}
        <div className="space-y-6 px-4 sm:px-0">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-gray-800">Rental Workflows</h2>
            </div>
            <div className="p-6 divide-y divide-gray-100">
              <AutomationItem 
                label="Monday Rent Summary"
                description="Sends detailed calculations (Total/Paid/Balance) every Monday at 09:00."
                enabled={config.rentalMondaySummary}
                onToggle={() => toggleSetting('rentalMondaySummary')}
                onHover={() => setActivePreview('rentalMondaySummary')}
              />
              <AutomationItem 
                label="Auto-Send Completion"
                description="Triggers 'Agreement Completed' template when status hits 'Completed'."
                enabled={config.rentalCompletionAutoSend}
                onToggle={() => toggleSetting('rentalCompletionAutoSend')}
                onHover={() => setActivePreview('rentalCompletionAutoSend')}
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              <h2 className="font-bold text-gray-800">Maintenance Workflows</h2>
            </div>
            <div className="p-6 divide-y divide-gray-100">
              <AutomationItem 
                label="Driver Notification"
                description="Auto-notifies drivers of MOT, NSL, or Service bookings upon creation."
                enabled={config.maintenanceAutoNotifyDriver}
                onToggle={() => toggleSetting('maintenanceAutoNotifyDriver')}
                onHover={() => setActivePreview('maintenanceAutoNotifyDriver')}
              />
              <AutomationItem 
                label="Service Center Multi-Send"
                description="Sends booking requests to all registered numbers for the provider."
                enabled={config.maintenanceAutoNotifyServiceCenter}
                onToggle={() => toggleSetting('maintenanceAutoNotifyServiceCenter')}
                onHover={() => setActivePreview('maintenanceAutoNotifyServiceCenter')}
              />
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Live Preview Demo */}
        <div className="lg:sticky lg:top-24 space-y-4 px-4 sm:px-0">
          <div className="bg-gray-900 rounded-3xl p-6 shadow-2xl border-4 border-gray-800 relative">
            <div className="flex items-center gap-2 mb-4 text-gray-400 text-xs uppercase tracking-widest font-semibold">
              <Eye className="w-4 h-4" /> Live Message Preview
            </div>
            
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
               <div className="bg-[#DCF8C6] text-gray-800 p-4 rounded-lg rounded-tl-none shadow-sm relative max-w-[95%]">
                  <p className="text-[12px] whitespace-pre-wrap leading-relaxed font-sans">
                    {getPreviewText(activePreview || (Object.keys(config).find(k => config[k as AutomationKey]) as AutomationKey))}
                  </p>
                  <span className="text-[10px] text-gray-500 absolute bottom-1 right-2">09:00 AM ✓✓</span>
               </div>
            </div>

            <div className="mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <p className="text-[11px] text-gray-400 leading-normal">
                  Values like <code className="text-yellow-500">[Vehicle Reg]</code> are auto-filled by the 
                  <span className="text-blue-300 ml-1 font-semibold">Twilio Production API</span> based on real-time Monday balance calculations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HELPERS ──

const SIGNATURE = `Kind regards,
Admin Team
AIE Skyline Limited
📍 United House, 39–41 North Road, London, N7 9DP
☎️ 020 8050 5337 | 📱 07552 553441
✉️ admin@aieskyline.co.uk
🌐 www.aieskyline.co.uk`;

function getPreviewText(key: AutomationKey | undefined) {
  if (!key) return "Select or hover over an automation to preview the message...";

  switch (key) {
    case 'rentalMondaySummary':
      return `*Outstanding Rental Balance – [Vehicle Reg]*

Dear [Driver Name],

This is your Monday rental summary reminder.

📄 *Rental Details*
Vehicle: AIE Skyline – London Iconic Taxi
Reg: [Vehicle Reg]
Rental Type: [Daily/Weekly]

💳 *Payment Summary*
Total Amount Due: £[Total]
Amount Paid: £[Paid]
*Outstanding Balance: £[Balance]*

🏦 *Payment Instructions*
Bank: Lloyds Bank
Account: AIE Skyline Limited
Number: 30513162 | Sort: 30-99-50
Ref: [Vehicle Reg]

⚠ *Important Notice*
Please settle this balance today to avoid late fees or hire suspension.

${SIGNATURE}`;

    case 'rentalCompletionAutoSend':
      return `*Rental Agreement Completed – [Vehicle Reg]*

Dear [Driver Name],

We confirm your rental agreement is now successfully completed.

📄 *Final Summary*
Vehicle: [Vehicle Reg]
Total Cost: £[Total]
Final Balance: £0.00 (Cleared)

Thank you for choosing AIE Skyline. We look forward to working with you again.

${SIGNATURE}`;

    case 'maintenanceAutoNotifyDriver':
      return `*🔧 Maintenance Booking Confirmation*

Dear [Driver Name],

We have booked your vehicle for [Service/MOT/NSL].

🔹 *Appointment Details*
Vehicle: [Vehicle Reg]
Date: [Date] | Time: [Time]
Location: [Service Center Name]

⚠ *Mandatory:* Vehicle must be clean for inspection. Late arrivals may be turned away.

${SIGNATURE}`;

    case 'maintenanceAutoNotifyServiceCenter':
      return `*NEW BOOKING REQUEST*

Dear Service Team,

Please confirm a booking for:
🔹 Reg: [Vehicle Reg]
🔹 Work: [Maintenance Type]
🔹 Preferred: [Date & Time]

Please confirm at your earliest convenience.

${SIGNATURE}`;

    default:
      return "Template content loading...";
  }
}

function AutomationItem({ label, description, enabled, onToggle, onHover }: any) {
  return (
    <div 
      className="flex items-start justify-between py-5 gap-4 group cursor-pointer"
      onMouseEnter={onHover}
    >
      <div className="flex-1">
        <p className={`font-semibold transition-colors ${enabled ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
          {label}
        </p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner ${
          enabled ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}