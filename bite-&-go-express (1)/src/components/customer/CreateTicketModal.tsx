import React, { useState, useRef } from 'react';
import { StorageService } from '../../utils/storage';
import { CustomerTicket, Order, CustomerUser, TicketAttachment } from '../../types';
import {
  X,
  Ticket,
  AlertTriangle,
  Send,
  CheckCircle2,
  Phone,
  Mail,
  User,
  FileQuestion,
  HelpCircle,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedOrderId?: string;
  orders: Order[];
  activeCustomer: CustomerUser | null;
  onTicketCreated?: (ticket: CustomerTicket) => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  preselectedOrderId,
  orders,
  activeCustomer,
  onTicketCreated,
}) => {
  // Restrict to recently placed orders (customer's orders or orders placed in last 72 hours)
  const recentOrders = orders.filter((o) => {
    if (activeCustomer) {
      if (
        (o.customerEmail && o.customerEmail.toLowerCase() === activeCustomer.email.toLowerCase()) ||
        o.customerPhone === activeCustomer.phone
      ) {
        return true;
      }
    }
    const ageHours = (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60);
    return ageHours < 72;
  });

  const availableOrders = preselectedOrderId
    ? [orders.find((o) => o.id === preselectedOrderId) || { id: preselectedOrderId, total: 0, items: [], createdAt: new Date().toISOString() } as unknown as Order, ...recentOrders.filter(o => o.id !== preselectedOrderId)]
    : recentOrders;

  const defaultOrderId = preselectedOrderId || (availableOrders[0]?.id ?? '');
  const [selectedOrderId, setSelectedOrderId] = useState(defaultOrderId);
  const [issueType, setIssueType] = useState<CustomerTicket['issueType']>('missing_item');
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState(
    activeCustomer?.name || orders.find((o) => o.id === defaultOrderId)?.customerName || 'Customer'
  );
  const [customerEmail, setCustomerEmail] = useState(activeCustomer?.email || 'customer@biteandgo.pk');
  const [customerPhone, setCustomerPhone] = useState(
    activeCustomer?.phone || orders.find((o) => o.id === defaultOrderId)?.customerPhone || '0300-1234567'
  );
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submittedTicket, setSubmittedTicket] = useState<CustomerTicket | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: result,
            type: file.type,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || availableOrders.length === 0) {
      setErrorMsg('Tickets can only be filed for an order that has been placed now or recently.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('Please describe the issue in detail.');
      return;
    }
    setErrorMsg('');

    const ticket = StorageService.createTicket({
      orderId: selectedOrderId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      issueType,
      message: message.trim(),
      attachments,
    });

    setSubmittedTicket(ticket);
    if (onTicketCreated) onTicketCreated(ticket);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6">
        <button
          onClick={() => {
            setSubmittedTicket(null);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {submittedTicket ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-heading font-black text-white">Ticket Submitted!</h3>
              <p className="text-xs text-neutral-400">
                Ticket Reference: <span className="font-mono font-bold text-amber-400">{submittedTicket.id}</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left text-xs space-y-1.5 text-neutral-300">
              <div className="flex justify-between text-neutral-400">
                <span>Associated Order:</span>
                <span className="font-mono text-white">{submittedTicket.orderId}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Issue Type:</span>
                <span className="capitalize font-medium text-amber-400">{submittedTicket.issueType.replace('_', ' ')}</span>
              </div>
              <div className="pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400">
                Our kitchen &amp; delivery support manager will review your ticket and reach out via WhatsApp/Call at <span className="font-mono text-white">{submittedTicket.customerPhone}</span>.
              </div>
            </div>

            <button
              onClick={() => {
                setSubmittedTicket(null);
                onClose();
              }}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-heading font-bold text-white">Report an Order Issue</h3>
                <p className="text-xs text-neutral-400">We prioritize and resolve fast-food order discrepancies quickly</p>
              </div>
            </div>

            {availableOrders.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <Ticket className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">No Recent Orders Found</h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Support tickets can only be created for orders that have been placed recently. Once you place an order, you can open a ticket for that specific order from your tracker or account.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Close &amp; Return to Menu
                </button>
              </div>
            ) : (
              <>
                {errorMsg && (
                  <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Order Selection */}
                  <div>
                    <label className="text-xs font-bold text-neutral-300 block mb-1">
                      Recent Order Associated with Issue *
                    </label>
                    {preselectedOrderId ? (
                      <div className="p-2.5 rounded-xl bg-neutral-950 border border-amber-500/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{preselectedOrderId}</span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                            Recently Placed Order
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400">Locked to this order</span>
                      </div>
                    ) : (
                      <select
                        value={selectedOrderId}
                        onChange={(e) => setSelectedOrderId(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      >
                        {availableOrders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.id} — Rs. {o.total.toLocaleString()} ({o.items?.length || 0} items) · {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

              {/* Issue Type */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">What is the issue? *</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="missing_item">Missing Item / Side / Sauce</option>
                  <option value="order_decline_request">Request Order Cancellation / Decline</option>
                  <option value="delayed_order">Delivery Rider Delayed Beyond ETA</option>
                  <option value="wrong_order">Incorrect Item or Spiciness Delivered</option>
                  <option value="food_quality">Food Temperature / Quality Issue</option>
                  <option value="payment_issue">EasyPaisa / JazzCash Verification Issue</option>
                  <option value="other">Other Order Query</option>
                </select>
              </div>

              {/* Customer Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Description Message */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Describe what went wrong *
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Ordered extra cheddar cheese sauce but only regular sauce was delivered. Please assist!"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                    <span>Attach Photos / Proof (Optional)</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">Packaging, receipt, or delivered food</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="image/*"
                  className="hidden"
                />

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 border border-dashed border-neutral-800 hover:border-amber-500/50 rounded-xl bg-neutral-950/60 hover:bg-neutral-950 text-xs text-neutral-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    <span>Upload photo or screenshot of item / receipt</span>
                  </button>

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-xs text-white"
                        >
                          {att.url.startsWith('data:image') ? (
                            <img src={att.url} alt={att.name} className="w-6 h-6 object-cover rounded" />
                          ) : (
                            <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span className="text-[11px] truncate max-w-[120px]">{att.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="p-0.5 text-neutral-400 hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </>
        )}
      </>
    )}
      </div>
    </div>
  );
};
