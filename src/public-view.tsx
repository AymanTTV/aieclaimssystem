// src/public-view.tsx
import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { useVehicles } from './hooks/useVehicles';
import { useRentals } from './hooks/useRentals';
import { Car, Mail, MessageCircle, Info, Calendar, ShieldCheck, Search, Clock, CheckCircle, ArrowRight, X } from 'lucide-react';
import { startOfDay, endOfDay, isAfter, format } from 'date-fns';

const PublicRentalShowcase = () => {
  const { vehicles, loading: vLoading, error: vError } = useVehicles();
  const { rentals, loading: rLoading } = useRentals();

  // Filter States
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState<string>(todayStr);
  const [dateTo, setDateTo] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'returning_soon'>('all');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [actionType, setActionType] = useState<'whatsapp' | 'email'>('whatsapp');
  
  // Expanded Requester Details
  const [requester, setRequester] = useState({
    name: '',
    badge: '',
    phone: '',
    email: '',
    period: '', // 'Short term' | 'Long term'
    periodFrom: '',
    periodTo: '',
    note: ''
  });

  // 1. STRICT FILTERING LOGIC
  const processedVehicles = useMemo(() => {
    const end = dateTo ? new Date(dateTo) : new Date();
    const targetEnd = endOfDay(end);

    return vehicles
      // ✅ ADDED FILTER: Exclude vehicles where assignmentType is 'Claims'
      .filter(v => v.status !== 'sold' && v.status !== 'unavailable' && v.registrationNumber && v.assignmentType !== 'Claims')
      .map(vehicle => {
        // STRICT SUBSTITUTION CHECK
        const isCurrentlyOnSub = rentals.some(rental => 
          rental.status === 'active' && 
          rental.hireSubstitutionDetails?.some(sub => 
            (sub.registration || '').toLowerCase() === (vehicle.registrationNumber || '').toLowerCase() &&
            !sub.returnCondition
          )
        );

        if (isCurrentlyOnSub) return null;

        let computedStatus = 'available';
        let note = '';

        const blockingRental = rentals.find(r => 
          r.vehicleId === vehicle.id && 
          (r.status === 'active' || r.status === 'scheduled')
        );

        if (blockingRental) {
          if (blockingRental.expectedReturnDate) {
            const expDate = new Date(blockingRental.expectedReturnDate);
            if (!isAfter(endOfDay(expDate), targetEnd)) {
              computedStatus = 'returning_soon';
              note = format(expDate, 'dd/MM/yyyy');
            } else {
              computedStatus = 'hired';
            }
          } else {
            computedStatus = 'hired';
          }
        } else {
          if (vehicle.status === 'available') {
            computedStatus = 'available';
          } else {
            computedStatus = 'hired';
          }
        }

        return { ...vehicle, computedStatus, note };
      })
      .filter(Boolean)
      .filter((v: any) => v.computedStatus === 'available' || v.computedStatus === 'returning_soon'); 
  }, [vehicles, rentals, dateFrom, dateTo]);

  // 2. APPLY UI FILTERS
  const filteredData = useMemo(() => {
    let data = processedVehicles as any[];

    if (activeFilter !== 'all') {
      data = data.filter(v => v.computedStatus === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(v => 
        (v.registrationNumber || '').toLowerCase().includes(q) ||
        (v.make || '').toLowerCase().includes(q) ||
        (v.model || '').toLowerCase().includes(q)
      );
    }

    return data;
  }, [processedVehicles, activeFilter, searchQuery]);

  // 3. BOOKING ACTIONS
  const handleOpenModal = (vehicle: any, type: 'whatsapp' | 'email') => {
    setSelectedVehicle(vehicle);
    setActionType(type);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedVehicle(null);
    setRequester({ name: '', badge: '', phone: '', email: '', period: '', periodFrom: '', periodTo: '', note: '' }); 
  };

  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return 'N/A';
    return dtStr.replace('T', ' '); // simple format cleanup for message
  };

  const submitBookingRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const v = selectedVehicle;
    const now = new Date().toLocaleString('en-GB', { hour12: true });
    const statusText = v.computedStatus === 'returning_soon' ? `\n• Status: Returns Soon (${v.note})` : '';

    const requesterInfo = `
Requester Details:
• Name: ${requester.name}
• Badge Number: ${requester.badge}
• Phone: ${requester.phone}
• Email: ${requester.email || 'N/A'}

Rental Period Details:
• Period Type: ${requester.period || 'N/A'}
• From: ${formatDateTime(requester.periodFrom)}
• To: ${formatDateTime(requester.periodTo)}

• Note: ${requester.note || 'None'}`;

    if (actionType === 'whatsapp') {
      const message = `Hello AIE Skyline, I am interested in renting:
• Vehicle: ${v.make} ${v.model}
• Registration: ${v.registrationNumber}${statusText}
• Inquiry Date: ${now}
${requesterInfo}

Pricing Reference:
- Daily Rate: £${v.dailyRentalPrice || 'N/A'}
- Weekly Rate: £${v.weeklyRentalPrice || 'N/A'}

Could you please provide more details on availability?`;

      window.open(`https://wa.me/447552553441?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      const subject = `Rental Inquiry: ${v.make} ${v.model} (${v.registrationNumber})`;
      const statusLine = v.computedStatus === 'returning_soon' ? `\nNote: This vehicle is returning to the fleet on ${v.note}.` : '';
      const body = `Hello AIE Skyline Team,

I am interested in renting the following vehicle:
Vehicle: ${v.make} ${v.model}
Registration: ${v.registrationNumber}
Inquiry Date/Time: ${now}${statusLine}
${requesterInfo}

Pricing Reference from Website:
Daily Rate: £${v.dailyRentalPrice || 'N/A'}
Weekly Rate: £${v.weeklyRentalPrice || 'N/A'}

Please let me know the next steps for booking.`;

      window.location.href = `mailto:admin@aieskyline.co.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    handleCloseModal();
  };

  if (vLoading || rLoading) return <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontFamily: 'sans-serif' }}>Loading our premium fleet...</div>;
  if (vError) return <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444', fontFamily: 'sans-serif' }}>Unable to load fleet data. Please contact us at admin@aieskyline.co.uk.</div>;

  return (
    <div className="aie-rental-container relative">
      <style>{`
        .aie-rental-container { all: initial; display: block; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; box-sizing: border-box; }
        .aie-rental-container * { box-sizing: border-box; }
        
        .aie-filters { background: #ffffff; border-radius: 16px; padding: 20px; margin-bottom: 30px; border: 1px solid #eef2f6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .aie-filter-row { display: flex; flex-direction: column; gap: 16px; }
        @media (min-width: 768px) { .aie-filter-row { flex-direction: row; align-items: flex-end; justify-content: space-between; } }
        .aie-input-group { display: flex; flex-direction: column; gap: 6px; width: 100%; }
        @media (min-width: 768px) { .aie-input-group { width: auto; } }
        .aie-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; }
        .aie-date-picker { display: flex; align-items: center; gap: 10px; }
        .aie-input { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; width: 100%; }
        .aie-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .aie-search-wrapper { position: relative; width: 100%; max-width: 400px; }
        .aie-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .aie-search-input { padding: 10px 14px 10px 38px; width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; }
        .aie-search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        
        .aie-tabs { display: flex; gap: 10px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eef2f6; overflow-x: auto; padding-bottom: 5px; }
        .aie-tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; white-space: nowrap; }
        .aie-tab-active { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
        .aie-tab-inactive { background: #f8fafc; color: #64748b; border-color: #e2e8f0; }
        .aie-tab-inactive:hover { background: #f1f5f9; }

        .aie-grid { display: grid; gap: 30px; justify-content: center; grid-template-columns: repeat(1, 1fr); }
        @media (min-width: 768px) { .aie-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .aie-grid { grid-template-columns: repeat(3, 1fr); } }

        .aie-card { background: #ffffff; border-radius: 20px; border: 1px solid #f1f5f9; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); transition: all 0.3s ease; position: relative; width: 100%; max-width: 380px; margin: 0 auto; }
        .aie-card:hover { transform: translateY(-6px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
        .aie-image-wrapper { position: relative; height: 220px; background: #f8fafc; }
        .aie-image-wrapper img { width: 100%; height: 100%; object-fit: cover; }
        
        .aie-status-badge { position: absolute; top: 15px; right: 15px; color: white; padding: 6px 12px; border-radius: 50px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .badge-ready { background: #10b981; }
        .badge-soon { background: #3b82f6; }

        .aie-content { padding: 24px; }
        .aie-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .aie-vehicle-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
        .aie-reg-tag { font-family: monospace; background: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 13px; font-weight: 600; }
        .aie-specs { display: flex; gap: 12px; color: #64748b; font-size: 14px; margin-bottom: 20px; }

        .aie-price-table { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #e2e8f0; }
        .aie-price-box { background: #f8fafc; padding: 12px 5px; text-align: center; }
        .aie-price-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
        .aie-price-amount { font-size: 18px; font-weight: 800; color: #0f172a; }

        .aie-actions { display: flex; flex-direction: column; gap: 10px; }
        .aie-btn { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.2s; text-decoration: none !important; border: none; }
        .btn-wa { background: #25D366; color: white; }
        .btn-wa:hover { background: #1eb956; }
        .btn-mail { background: #0f172a; color: white; }
        .btn-mail:hover { background: #1e293b; }
        .aie-empty { text-align: center; padding: 60px; background: #f8fafc; border-radius: 20px; color: #64748b; }

        /* Modal Styles */
        .aie-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
        /* ✅ UPDATED MAX-WIDTH to 600px for more room */
        .aie-modal-box { background: #fff; width: 100%; max-width: 600px; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; max-height: 90vh; animation: modalIn 0.3s ease-out; }
        @keyframes modalIn { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .aie-modal-header { padding: 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .aie-modal-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
        .aie-modal-close { cursor: pointer; color: #94a3b8; transition: color 0.2s; background: none; border: none; padding: 0; }
        .aie-modal-close:hover { color: #ef4444; }
        .aie-modal-body { padding: 20px; overflow-y: auto; }
        .aie-modal-form-group { margin-bottom: 16px; }
        .aie-modal-form-label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
        .aie-modal-form-input { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; outline: none; transition: border-color 0.2s; }
        .aie-modal-form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .aie-modal-footer { padding: 20px; background: #f8fafc; border-top: 1px solid #f1f5f9; display: flex; gap: 10px; flex-shrink: 0; }
        .aie-modal-submit { flex: 1; padding: 12px; border-radius: 8px; font-weight: 700; color: white; border: none; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; transition: opacity 0.2s; }
        .aie-modal-submit:hover { opacity: 0.9; }
        .aie-modal-submit.whatsapp { background: #25D366; }
        .aie-modal-submit.email { background: #0f172a; }

        .aie-radio-group { display: flex; gap: 20px; }
        .aie-radio-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: #475569; font-weight: 500; }
        .aie-radio-label input { width: 16px; height: 16px; accent-color: #3b82f6; cursor: pointer; }
      `}</style>

      {/* FILTER HEADER */}
      <div className="aie-filters">
        <div className="aie-filter-row">
          <div className="aie-input-group">
            <span className="aie-label"><Calendar size={14} /> Check Availability Range</span>
            <div className="aie-date-picker">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="aie-input" />
              <ArrowRight size={16} color="#94a3b8" />
              <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)} className="aie-input" />
            </div>
          </div>

          <div className="aie-input-group">
            <span className="aie-label">Search Vehicle</span>
            <div className="aie-search-wrapper">
              <Search size={16} className="aie-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Make, Model, or Registration..."
                className="aie-search-input"
              />
              {searchQuery && (
                <X size={16} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
              )}
            </div>
          </div>
        </div>

        <div className="aie-tabs">
          <button onClick={() => setActiveFilter('all')} className={`aie-tab-btn ${activeFilter === 'all' ? 'aie-tab-active' : 'aie-tab-inactive'}`}>
            Show All ({processedVehicles.length})
          </button>
          <button onClick={() => setActiveFilter('available')} className={`aie-tab-btn ${activeFilter === 'available' ? 'aie-tab-active' : 'aie-tab-inactive'}`}>
            <CheckCircle size={14} /> Available Now ({processedVehicles.filter((v: any) => v.computedStatus === 'available').length})
          </button>
          <button onClick={() => setActiveFilter('returning_soon')} className={`aie-tab-btn ${activeFilter === 'returning_soon' ? 'aie-tab-active' : 'aie-tab-inactive'}`}>
            <Clock size={14} /> Returns Soon ({processedVehicles.filter((v: any) => v.computedStatus === 'returning_soon').length})
          </button>
        </div>
      </div>

      {/* VEHICLE GRID */}
      <div className="aie-grid">
        {filteredData.map((vehicle: any) => (
          <div key={vehicle.id} className="aie-card">
            <div className="aie-image-wrapper">
              {vehicle.image ? (
                <img src={vehicle.image} alt={`${vehicle.make} ${vehicle.model}`} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Car size={48} color="#cbd5e1" />
                </div>
              )}
              
              {vehicle.computedStatus === 'returning_soon' ? (
                <div className="aie-status-badge badge-soon">Returns {vehicle.note}</div>
              ) : (
                <div className="aie-status-badge badge-ready">Ready for Hire</div>
              )}
            </div>

            <div className="aie-content">
              <div className="aie-title-row">
                <h3 className="aie-vehicle-name">{vehicle.make} {vehicle.model}</h3>
                <span className="aie-reg-tag">{vehicle.registrationNumber}</span>
              </div>
              
              <div className="aie-specs">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} /> {vehicle.year}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Certified
                </span>
              </div>

              <div className="aie-price-table">
                <div className="aie-price-box">
                  <div className="aie-price-label">Daily</div>
                  <div className="aie-price-amount">£{vehicle.dailyRentalPrice || '0'}</div>
                </div>
                <div className="aie-price-box">
                  <div className="aie-price-label">Weekly</div>
                  <div className="aie-price-amount">£{vehicle.weeklyRentalPrice || '0'}</div>
                </div>
              </div>

              <div className="aie-actions">
                <button onClick={() => handleOpenModal(vehicle, 'whatsapp')} className="aie-btn btn-wa">
                  <MessageCircle size={18} /> Book via WhatsApp
                </button>
                <button onClick={() => handleOpenModal(vehicle, 'email')} className="aie-btn btn-mail">
                  <Mail size={18} /> Email Inquiry
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredData.length === 0 && (
        <div className="aie-empty">
          <Info size={48} style={{ marginBottom: '16px', opacity: 0.5, margin: '0 auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>No vehicles found</h3>
          <p>We couldn't find any vehicles matching your selected dates or search criteria.</p>
        </div>
      )}

      {/* REQUESTER DETAILS MODAL */}
      {showModal && selectedVehicle && (
        <div className="aie-modal-overlay">
          <div className="aie-modal-box">
            <div className="aie-modal-header">
              <h3 className="aie-modal-title">Booking Details</h3>
              <button onClick={handleCloseModal} className="aie-modal-close">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={submitBookingRequest} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="aie-modal-body">
                {/* 2-column layout for name and badge to save vertical space on desktop */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="aie-modal-form-label">Full Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={requester.name}
                      onChange={(e) => setRequester({...requester, name: e.target.value})}
                      placeholder="Enter your full name" 
                      className="aie-modal-form-input" 
                    />
                  </div>
                  <div>
                    <label className="aie-modal-form-label">Badge Number *</label>
                    <input 
                      type="text" 
                      required 
                      value={requester.badge}
                      onChange={(e) => setRequester({...requester, badge: e.target.value})}
                      placeholder="Enter your badge number" 
                      className="aie-modal-form-input" 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="aie-modal-form-label">Phone Number *</label>
                    <input 
                      type="tel" 
                      required 
                      value={requester.phone}
                      onChange={(e) => setRequester({...requester, phone: e.target.value})}
                      placeholder="Enter your mobile number" 
                      className="aie-modal-form-input" 
                    />
                  </div>
                  <div>
                    <label className="aie-modal-form-label">Email Address (Optional)</label>
                    <input 
                      type="email" 
                      value={requester.email}
                      onChange={(e) => setRequester({...requester, email: e.target.value})}
                      placeholder="Enter your email" 
                      className="aie-modal-form-input" 
                    />
                  </div>
                </div>

                {/* Period Radio Selection */}
                <div className="aie-modal-form-group">
                  <label className="aie-modal-form-label">Rental Period Type *</label>
                  <div className="aie-radio-group">
                    <label className="aie-radio-label">
                      <input 
                        type="radio" 
                        name="periodType" 
                        value="Short term"
                        required
                        checked={requester.period === 'Short term'}
                        onChange={(e) => setRequester({...requester, period: e.target.value})}
                      />
                      Short term
                    </label>
                    <label className="aie-radio-label">
                      <input 
                        type="radio" 
                        name="periodType" 
                        value="Long term"
                        required
                        checked={requester.period === 'Long term'}
                        onChange={(e) => setRequester({...requester, period: e.target.value})}
                      />
                      Long term
                    </label>
                  </div>
                </div>

                {/* Date Selection (Only shows if a Period is selected) */}
                {requester.period && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label className="aie-modal-form-label">Date From *</label>
                      <input 
                        type="datetime-local" 
                        required 
                        value={requester.periodFrom}
                        onChange={(e) => setRequester({...requester, periodFrom: e.target.value})}
                        className="aie-modal-form-input" 
                      />
                    </div>
                    <div>
                      <label className="aie-modal-form-label">Date To *</label>
                      <input 
                        type="datetime-local" 
                        required 
                        value={requester.periodTo}
                        onChange={(e) => setRequester({...requester, periodTo: e.target.value})}
                        className="aie-modal-form-input" 
                      />
                    </div>
                  </div>
                )}

                <div className="aie-modal-form-group" style={{ marginBottom: 0 }}>
                  <label className="aie-modal-form-label">Note (Optional)</label>
                  <textarea 
                    value={requester.note}
                    onChange={(e) => setRequester({...requester, note: e.target.value})}
                    placeholder="If there is further info please provide here..." 
                    className="aie-modal-form-input" 
                    rows={3}
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>

              </div>

              <div className="aie-modal-footer">
                <button 
                  type="submit" 
                  className={`aie-modal-submit ${actionType}`}
                >
                  {actionType === 'whatsapp' ? (
                    <><MessageCircle size={20} /> Proceed to WhatsApp</>
                  ) : (
                    <><Mail size={20} /> Proceed to Email</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const container = document.getElementById('aie-rental-showcase');
if (container) {
  const root = createRoot(container);
  root.render(<PublicRentalShowcase />);
}