import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { DeliveryRouteMap } from './DeliveryRouteMap';
import { getAreaCoordinates, buildGoogleMapsNavUrl, generateOrderMapsLinks, BITE_AND_GO_BRANCH_LOCATION } from '../../data/karachiAreas';
import {
  X,
  Navigation,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Clock,
  Bike,
  User,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export interface RiderDeliveryModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (orderId: string, status: OrderStatus, note?: string) => void;
}

export const RiderDeliveryModal: React.FC<RiderDeliveryModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !order) return null;

  // Resolve coordinates and Google Maps routing data
  const mapsData = generateOrderMapsLinks(order);
  const coords = mapsData.coords;
  const navUrl = mapsData.navUrl;

  // Normalize phone for WhatsApp
  const rawPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');
  const waPhone = rawPhone.startsWith('03')
    ? '92' + rawPhone.slice(1)
    : rawPhone.startsWith('92')
    ? rawPhone
    : '92' + rawPhone;
  const waMessage = encodeURIComponent(
    `Assalam-o-Alaikum ${order.customerName}! Your Bite & Go Express order (${order.id}) has been dispatched and our delivery rider is on the way to ${order.deliveryAddress}. Estimated arrival: ~15 mins. Thank you!`
  );
  const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

  const handleCopyAddress = () => {
    const fullText = `${order.deliveryAddress}, ${order.area} (Customer: ${order.customerName}, Phone: ${order.customerPhone})`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Rider Dispatch & Navigation</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-amber-400">
                  {order.id}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Delivery route & real-time Google Maps coordinates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Customer & Address Quick Action Card */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-neutral-400" />
                <span className="font-bold text-white text-sm">{order.customerName}</span>
                <span className="text-xs text-neutral-500">·</span>
                <span className="text-xs font-mono text-amber-400">{order.customerPhone}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-neutral-300">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-white">{order.deliveryAddress}</p>
                  <p className="text-neutral-400 text-[11px]">{order.area}</p>
                </div>
              </div>
              {order.customerNotes && (
                <p className="text-xs text-amber-400/90 italic bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 mt-1">
                  Note: "{order.customerNotes}"
                </p>
              )}
            </div>

            {/* Rider Fast Contact Actions */}
            <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
              <a
                href={`tel:${order.customerPhone}`}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Call Customer</span>
              </a>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp ETA</span>
              </a>

              <button
                type="button"
                onClick={handleCopyAddress}
                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Address'}</span>
              </button>
            </div>
          </div>

          {/* Grab Google Maps Route Link for Driver */}
          {(() => {
            const mapsData = generateOrderMapsLinks(order);
            const waRiderUrl = `https://wa.me/?text=${encodeURIComponent(mapsData.driverWhatsAppText)}`;

            return (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/30 space-y-3 bg-gradient-to-r from-amber-500/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Google Maps Turn-by-Turn Route Link</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                          Ready for Rider
                        </span>
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        Driver can grab this link to start turn-by-turn GPS navigation directly in the Google Maps app.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Copyable URL bar */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={mapsData.navUrl}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-300 truncate select-all focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(mapsData.navUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                        : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20'
                    }`}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Grab Maps Link'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-neutral-400">
                    Live GPS Navigation ➔ Destination: <span className="text-white font-medium">{mapsData.destinationAddress}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={waRiderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Route to Driver</span>
                    </a>
                    <a
                      href={mapsData.navUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Open GPS navigation directly in Google Maps"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Launch Google Maps</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Interactive Google Map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Live Route Navigation
              </span>
              <a
                href={navUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Open Fullscreen Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <DeliveryRouteMap
              origin={BITE_AND_GO_BRANCH_LOCATION}
              destination={{
                lat: coords.lat,
                lng: coords.lng,
                title: order.customerName,
                address: order.deliveryAddress,
              }}
              riderLocation={
                order.driver
                  ? {
                      lat: coords.lat,
                      lng: coords.lng,
                      name: order.driver.name,
                      vehiclePlate: order.driver.vehiclePlate,
                      phone: order.driver.phone,
                      progressPercent: order.driver.progressPercent,
                    }
                  : undefined
              }
              height="320px"
              showDirectionsButton={true}
            />
          </div>

          {/* Big Launch Navigation Bar for Rider */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-neutral-900 to-neutral-900 border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Turn-by-Turn GPS Navigation</p>
                <p className="text-[11px] text-neutral-400">
                  Direct routing from North Nazimabad kitchen to delivery pin
                </p>
              </div>
            </div>

            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <span>Launch GPS</span>
              <Navigation className="w-4 h-4" />
            </a>
          </div>

          {/* Driver Assignment & Quick Delivery Status Controls */}
          {onUpdateStatus && (
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Rider Dispatch Status
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 font-mono text-neutral-300 capitalize">
                  Current: {order.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateStatus(
                      order.id,
                      'on_the_way',
                      'Rider picked up thermal food bag and started GPS navigation.'
                    )
                  }
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    order.status === 'on_the_way'
                      ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                  }`}
                >
                  <Bike className="w-4 h-4 text-cyan-400" />
                  <span>Mark On The Way</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateStatus(
                      order.id,
                      'delivered',
                      'Rider confirmed order successfully delivered to customer.'
                    )
                  }
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    order.status === 'delivered'
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Delivered</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <span>Branch: North Nazimabad Block I</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
