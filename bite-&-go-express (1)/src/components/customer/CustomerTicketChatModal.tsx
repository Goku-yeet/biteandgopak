import React, { useState, useRef } from 'react';
import { CustomerTicket, TicketAttachment } from '../../types';
import { StorageService } from '../../utils/storage';
import {
  X,
  Send,
  Paperclip,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Lock,
  RotateCcw,
  User,
  Shield,
  ChefHat,
  ExternalLink,
} from 'lucide-react';

interface CustomerTicketChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: CustomerTicket | null;
  onTicketUpdated: (updated: CustomerTicket) => void;
}

export const CustomerTicketChatModal: React.FC<CustomerTicketChatModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onTicketUpdated,
}) => {
  const [replyText, setReplyText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<TicketAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, ticket?.messages?.length]);

  const [isReopenPromptOpen, setIsReopenPromptOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  if (!isOpen || !ticket) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setPendingAttachments((prev) => [
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
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && pendingAttachments.length === 0) return;

    setIsSending(true);
    const updated = StorageService.addTicketMessage(ticket.id, {
      sender: 'customer',
      senderName: ticket.customerName || 'Customer',
      message: replyText.trim() || 'Attached files for review.',
      attachments: pendingAttachments,
    });

    if (updated) {
      onTicketUpdated(updated);
    }

    setReplyText('');
    setPendingAttachments([]);
    setIsSending(false);
  };

  // Build message list (fallback to original message + adminReply if no messages array yet)
  const conversation = ticket.messages && ticket.messages.length > 0
    ? ticket.messages
    : [
        {
          id: `msg-orig-${ticket.id}`,
          sender: 'customer' as const,
          senderName: ticket.customerName,
          message: ticket.message,
          timestamp: ticket.createdAt,
          attachments: ticket.attachments || [],
        },
        ...(ticket.adminReply
          ? [
              {
                id: `msg-reply-${ticket.id}`,
                sender: 'manager' as const,
                senderName: 'Support Manager',
                message: ticket.adminReply,
                timestamp: ticket.updatedAt,
                attachments: [],
              },
            ]
          : []),
      ];

  const statusColors = {
    open: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    investigating: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    closed: 'bg-neutral-800 text-neutral-400 border-neutral-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col h-[85vh] max-h-[700px] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-sm">{ticket.id}</span>
                <span className="text-xs text-neutral-400">·</span>
                <span className="text-xs text-neutral-300">Order <strong className="text-amber-400 font-mono">{ticket.orderId}</strong></span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    statusColors[ticket.status] || statusColors.open
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Issue: <span className="text-neutral-200 capitalize">{ticket.issueType.replace('_', ' ')}</span>
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

        {/* Status Notice Banner if Resolved */}
        {ticket.status === 'resolved' && (
          <div className="px-4 py-2 bg-emerald-950/70 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>This ticket is marked <strong>Resolved</strong>. You can reply below to ask more questions anytime.</span>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversation.map((msg) => {
            const isCustomer = msg.sender === 'customer';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isCustomer
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isCustomer ? <User className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[80%] space-y-1.5 ${isCustomer ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-2 text-[10px] text-neutral-400 ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-semibold text-neutral-300">{msg.senderName}</span>
                    <span>•</span>
                    <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isCustomer
                        ? 'bg-amber-500/15 border border-amber-500/30 text-neutral-100 rounded-tr-xs'
                        : 'bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>

                    {/* Attachments within message */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-700/60 space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block">
                          Attachments ({msg.attachments.length}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {msg.attachments.map((att, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                if (att.url.startsWith('data:image')) {
                                  setPreviewImage(att.url);
                                }
                              }}
                              className="group relative cursor-pointer rounded-lg overflow-hidden border border-neutral-700 hover:border-amber-500 transition-all bg-neutral-900"
                            >
                              {att.url.startsWith('data:image') ? (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-20 h-20 object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="p-2 flex items-center gap-1.5 text-[11px] text-neutral-300">
                                  <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="truncate max-w-[120px]">{att.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input & Talk Back Area */}
        <div className="p-3.5 bg-neutral-950 border-t border-neutral-800 shrink-0 space-y-2">
            {/* Pending Attachments Strip */}
            {pendingAttachments.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-neutral-400 shrink-0">Attached:</span>
                {pendingAttachments.map((att, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 shrink-0"
                  >
                    {att.url.startsWith('data:image') ? (
                      <img src={att.url} alt="thumb" className="w-4 h-4 rounded object-cover" />
                    ) : (
                      <Paperclip className="w-3 h-3 text-amber-400" />
                    )}
                    <span className="text-[11px] truncate max-w-[100px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-neutral-400 hover:text-red-400 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {ticket.status === 'closed' ? (
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-neutral-400 text-xs">
                    <Lock className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span>This ticket has been marked Closed by staff. Talk back is disabled.</span>
                  </div>
                  {!isReopenPromptOpen && (
                    <button
                      type="button"
                      onClick={() => setIsReopenPromptOpen(true)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request to Reopen Ticket</span>
                    </button>
                  )}
                </div>

                {isReopenPromptOpen && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!reopenReason.trim()) return;
                      const updated = StorageService.reopenTicket(ticket.id, reopenReason.trim());
                      if (updated) {
                        onTicketUpdated(updated);
                        setIsReopenPromptOpen(false);
                        setReopenReason('');
                      }
                    }}
                    className="pt-2 border-t border-neutral-800 space-y-2 animate-in fade-in"
                  >
                    <label className="text-xs font-bold text-white block">
                      Explain why you would like to reopen this ticket:
                    </label>
                    <textarea
                      rows={2}
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="e.g. The issue was not fully resolved, missing replacement items, etc."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
                      autoFocus
                      required
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsReopenPromptOpen(false);
                          setReopenReason('');
                        }}
                        className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!reopenReason.trim()}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        Submit Reopen Request
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors"
                  title="Attach Photo / Receipt"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply to kitchen manager or describe update..."
                  className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={isSending || (!replyText.trim() && pendingAttachments.length === 0)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Talk Back</span>
                </button>
              </form>
            )}
          </div>
        </div>

      {/* High-Resolution Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Enlarged attachment"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-neutral-800"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-neutral-900 text-white rounded-full border border-neutral-700 hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
