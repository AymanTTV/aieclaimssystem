// src/components/maintenance/MaintenanceRecipientSelectorModal.tsx
import React from 'react';
import Modal from '../ui/Modal';
import { MaintenanceLog } from '../../types';
import {
  ResolvedMaintenanceContext,
  MaintenanceChannelMode,
  MaintenanceRecipientType,
} from '../../utils/maintenanceCommunication';
import {
  MessageCircle,
  Mail,
  User,
  Wrench,
  Car,
  Calendar,
  ArrowRight,
  Phone,
  Building2,
  MapPin,
  AlertTriangle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MaintenanceRecipientSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: MaintenanceLog | null;
  context: ResolvedMaintenanceContext | null;
  mode: MaintenanceChannelMode;
  onSelectRecipient: (recipientType: MaintenanceRecipientType) => void;
}

export const MaintenanceRecipientSelectorModal: React.FC<
  MaintenanceRecipientSelectorModalProps
> = ({ isOpen, onClose, log, context, mode, onSelectRecipient }) => {
  if (!isOpen || !log || !context) return null;

  const isWhatsApp = mode === 'whatsapp';
  const hasActiveRental = context.hasActiveRental;

  const handleDriverClick = () => {
    if (!hasActiveRental) {
      toast.error('No active driver is currently assigned to this vehicle (No active rental found).');
      return;
    }
    onSelectRecipient('driver');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isWhatsApp
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-sky-100 text-sky-700'
            }`}
          >
            {isWhatsApp ? (
              <MessageCircle className="w-5 h-5" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">
              Choose Recipient for {isWhatsApp ? 'WhatsApp' : 'Email'}
            </h3>
            <p className="text-xs text-gray-500 font-normal">
              Order #{context.orderNumber} • {context.vehicleReg} ({context.serviceType})
            </p>
          </div>
        </div>
      }
      size="md"
    >
      <div className="space-y-4 pt-1">
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-800">{context.vehicleReg}</span>
            <span className="text-gray-400">•</span>
            <span>{context.serviceType}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{context.scheduledDate}</span>
          </div>
        </div>

        {/* Dynamic Rental Driver Status Banner if unassigned */}
        {!hasActiveRental && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">No Active Rental Found for Vehicle</p>
              <p className="text-amber-700 text-[11px] mt-0.5">
                Vehicle <span className="font-semibold">{context.vehicleReg}</span> currently does not have an active rental. The "Send to Driver" option is disabled until a rental is activated.
              </p>
            </div>
          </div>
        )}

        <p className="text-xs font-medium text-gray-700">
          Select who should receive this {isWhatsApp ? 'WhatsApp message' : 'email notification'}:
        </p>

        <div className="grid grid-cols-1 gap-3">
          {/* OPTION 1: SEND TO DRIVER (ACTIVE RENTAL) */}
          <div
            onClick={hasActiveRental ? () => onSelectRecipient('driver') : handleDriverClick}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group relative flex flex-col justify-between shadow-xs ${
              hasActiveRental
                ? 'border-gray-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 cursor-pointer'
                : 'border-gray-200/80 bg-gray-50/70 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                    hasActiveRental
                      ? 'bg-blue-100 text-blue-700 group-hover:scale-105'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm font-bold transition-colors ${
                        hasActiveRental
                          ? 'text-gray-900 group-hover:text-indigo-700'
                          : 'text-gray-500'
                      }`}
                    >
                      Send to Driver (Active Rental)
                    </h4>
                    {hasActiveRental ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Active Rental
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                        No Active Rental
                      </span>
                    )}
                  </div>

                  {hasActiveRental ? (
                    <>
                      <p className="text-xs font-medium text-gray-800 mt-1">
                        {context.driverName}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        {context.driverPhone ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {context.driverPhone}
                          </span>
                        ) : (
                          <span className="text-amber-600 italic">No phone on record</span>
                        )}
                        {context.driverEmail && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {context.driverEmail}
                          </span>
                        )}
                        {context.rentalAgreementNumber && (
                          <span className="inline-flex items-center gap-1 text-gray-500">
                            <FileText className="w-3 h-3 text-gray-400" />
                            Agreement #{context.rentalAgreementNumber}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      No active driver is currently assigned to this vehicle.
                    </p>
                  )}
                </div>
              </div>
              <div
                className={`p-1 transition-colors ${
                  hasActiveRental
                    ? 'text-gray-400 group-hover:text-indigo-600'
                    : 'text-gray-300'
                }`}
              >
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* OPTION 2: SEND TO GARAGE */}
          <button
            type="button"
            onClick={() => onSelectRecipient('garage')}
            className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 transition-all duration-200 group relative flex flex-col justify-between shadow-xs cursor-pointer"
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      Send to Garage
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Work Order Booking
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-800 mt-1">
                    {context.garageName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    {context.garageAddress && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-[200px]">{context.garageAddress}</span>
                      </span>
                    )}
                    {context.garagePhone && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {context.garagePhone}
                      </span>
                    )}
                    {context.garageEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {context.garageEmail}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-gray-400 group-hover:text-indigo-600 transition-colors p-1">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default MaintenanceRecipientSelectorModal;
