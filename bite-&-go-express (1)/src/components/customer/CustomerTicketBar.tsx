import React, { useState } from 'react';
import { CustomerTicket, CustomerUser, Order } from '../../types';
import { StorageService } from '../../utils/storage';
import {
  Ticket,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Send,
  HelpCircle,
  Paperclip,
  X,
  ChefHat,
} from 'lucide-react';

interface CustomerTicketBarProps {
  tickets: CustomerTicket[];
  activeCustomer: CustomerUser | null;
  orders: Order[];
  onOpenTicketChat: (ticket: CustomerTicket) => void;
  onOpenCreateTicket: () => void;
  showAlways?: boolean;
}

export const CustomerTicketBar: React.FC<CustomerTicketBarProps> = ({
  tickets,
  activeCustomer,
  orders,
  onOpenTicketChat,
  onOpenCreateTicket,
  showAlways = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Strictly filter to the current customer's tickets
  const relevantTickets = StorageService.getCustomerTickets(activeCustomer, orders);

  if (isDismissed || relevantTickets.length === 0) return null;

  // Strictly only show active tickets requiring attention ('open' or 'investigating')
  // Turn off banner completely when ticket is resolved or closed by staff
  const activeTicket = relevantTickets.find((t) => t.status === 'open' || t.status === 'investigating');

  if (!activeTicket || activeTicket.status === 'closed' || activeTicket.status === 'resolved') return null;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-2.5 h-2.5" />
            <span>Open</span>
          </span>
        );
      case 'investigating':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <ChefHat className="w-2.5 h-2.5" />
            <span>Investigating</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Resolved</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
            <span>Closed</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-neutral-900 border-y border-neutral-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          {/* Left info */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Ticket className="w-3.5 h-3.5" />
            </div>

            {activeTicket ? (
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-bold text-white shrink-0">Support Ticket:</span>
                <span className="font-mono text-amber-400 font-bold shrink-0">{activeTicket.id}</span>
                <span className="text-neutral-500 hidden sm:inline">·</span>
                <span className="text-neutral-300 truncate max-w-xs sm:max-w-md">
                  Order <strong className="text-white font-mono">{activeTicket.orderId}</strong> ({activeTicket.issueType.replace('_', ' ')})
                </span>
                {statusBadge(activeTicket.status)}
                {activeTicket.adminReply && (
                  <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.2 rounded hidden md:inline truncate max-w-xs">
                    💬 Manager: "{activeTicket.adminReply}"
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="font-bold text-white">Bite &amp; Go Customer Care Bar:</span>
                <span className="text-neutral-400">Order issue or question? Open a ticket, attach photos &amp; talk back directly with our kitchen manager.</span>
              </div>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {activeTicket && (
              <button
                type="button"
                onClick={() => onOpenTicketChat(activeTicket)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Open chat to talk back to staff with attachments"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Talk Back &amp; Messages ({activeTicket.messages?.length || 1})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-neutral-500 hover:text-neutral-300 rounded cursor-pointer"
              title="Dismiss ticket bar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
