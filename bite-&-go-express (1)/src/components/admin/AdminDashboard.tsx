import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Category,
  MenuItem,
  Order,
  OrderStatus,
  StoreSettings,
  PaymentMethod,
  CustomerTicket,
  TicketStatus,
  CustomerWidgetsConfig,
  KitchenPermissionsConfig,
  PosPermissionsConfig,
  ComboDeal,
  DeliveryRider,
} from '../../types';
import { initialComboDeals } from '../../data/initialMenu';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import { sounds } from '../../utils/audio';
import { ItemEditorModal } from './ItemEditorModal';
import { WebsiteHudSettingsTab } from './WebsiteHudSettingsTab';
import { KitchenPermissionsEditor } from './KitchenPermissionsEditor';
import { InventoryManagementTab } from './InventoryManagementTab';
import { DeliveryRatesSettingsSection } from './DeliveryRatesSettingsSection';
import { DeliveryRidersManagementSection } from './DeliveryRidersManagementSection';
import { PosEmployeePermissionsEditor } from './PosEmployeePermissionsEditor';
import { DailyOperatingHoursEditor } from './DailyOperatingHoursEditor';
import { SalesPerformanceOverview } from './SalesPerformanceOverview';
import { DealMakerTab } from './DealMakerTab';
import { PromoCodesManagementTab } from './PromoCodesManagementTab';
import { UserDatabaseTab } from './UserDatabaseTab';
import { FoodCostingTab } from './FoodCostingTab';
import { ExecutiveReportsTab } from './ExecutiveReportsTab';
import { StaffAccountsManagerTab } from './StaffAccountsManagerTab';
import { RiderDeliveryModal } from '../maps/RiderDeliveryModal';
import { ManagerAiAssistantModal } from './ManagerAiAssistantModal';
import { generateOrderMapsLinks, buildGoogleMapsNavUrl, KARACHI_DELIVERY_AREAS } from '../../data/karachiAreas';
import {
  Users,
  Tag,
  Boxes,
  LayoutDashboard,
  ShoppingBag,
  ShieldCheck,
  UtensilsCrossed,
  BarChart3,
  Settings,
  ChefHat,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Volume2,
  Bike,
  Home,
  XCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Image as ImageIcon,
  DollarSign,
  TrendingUp,
  CreditCard,
  Phone,
  Eye,
  X,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Lock,
  LogOut,
  KeyRound,
  Globe,
  ShieldAlert,
  Ticket,
  MessageSquare,
  Mail,
  History,
  Calculator,
  MapPin,
  Timer,
  RotateCcw,
  Upload,
  Camera,
  SlidersHorizontal,
  Filter,
  AlertOctagon,
  FileText,
  Check,
  Banknote,
  Monitor,
  Download,
  Navigation,
  Sparkles,
  Copy,
  ExternalLink,
  MessageCircle,
  Layers,
  Package,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface AdminDashboardProps {
  onBackToStore: () => void;
  onLogout: () => void;
  categories: Category[];
  menuItems: MenuItem[];
  orders: Order[];
  settings: StoreSettings;
  onRefreshData: () => void;
  onSaveSettings?: (updated: StoreSettings) => Promise<void>;
  onSaveWidgets?: (updated: CustomerWidgetsConfig) => Promise<void>;
  onSwitchPortal?: (view: 'admin' | 'kitchen' | 'pos' | 'rider') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToStore,
  onLogout,
  categories,
  menuItems,
  orders,
  settings,
  onRefreshData,
  onSaveSettings,
  onSaveWidgets,
  onSwitchPortal,
}) => {
  type AdminTab =
    | 'orders'
    | 'history'
    | 'customers'
    | 'payments'
    | 'tickets'
    | 'menu'
    | 'deals'
    | 'promos'
    | 'inventory'
    | 'costing'
    | 'reports'
    | 'analytics'
    | 'settings'
    | 'website_hud'
    | 'kitchen_perms'
    | 'pos_perms'
    | 'staff_accounts';
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [selectedMapOrder, setSelectedMapOrder] = useState<Order | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Smart Horizontal Tab Navigation & Corner Jump controls
  const tabNavRef = useRef<HTMLDivElement>(null);
  const [isTabJumpMenuOpen, setIsTabJumpMenuOpen] = useState(false);

  const scrollTabIntoView = (tabKey: AdminTab) => {
    setActiveTab(tabKey);
    setTimeout(() => {
      const el = document.getElementById(`admin-tab-${tabKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 40);
  };

  const handleScrollTabStrip = (direction: 'left' | 'right') => {
    if (tabNavRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      tabNavRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Keep active tab centered in view whenever activeTab changes
  useEffect(() => {
    const el = document.getElementById(`admin-tab-${activeTab}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTab]);

  // Automatic beeping sound alert when new orders arrive (only after initial load)
  const previousOrdersCountRef = useRef(orders.length);
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      previousOrdersCountRef.current = orders.length;
      return;
    }
    if (orders.length > previousOrdersCountRef.current) {
      // High-priority beep sound so employee won't miss the incoming order
      sounds.playKitchenOrderBeep();
    }
    previousOrdersCountRef.current = orders.length;
  }, [orders.length]);

  // Tickets state
  const [tickets, setTickets] = useState<CustomerTicket[]>(StorageService.getTickets());
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'investigating' | 'resolved' | 'closed'>('all');
  const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);

  const handleUpdateTicketStatus = (ticketId: string, status: TicketStatus, reply?: string) => {
    StorageService.updateTicketStatus(ticketId, status, reply);
    setTickets(StorageService.getTickets());
    setReplyTicketId(null);
    setReplyText('');
  };

  const handleApproveDeclineTicket = async (ticket: CustomerTicket) => {
    const reason = `Customer decline request approved (${ticket.id}): ${ticket.message}`;
    try {
      await ApiService.declineOrder(ticket.orderId, reason);
    } catch {}
    StorageService.declineOrder(ticket.orderId, reason);
    const reply = `Order cancellation approved by store manager. Order #${ticket.orderId} is cancelled and any online payment will be refunded.`;
    StorageService.updateTicketStatus(ticket.id, 'resolved', reply);
    setTickets(StorageService.getTickets());
    onRefreshData();
  };

  const handleRejectDeclineTicket = (ticket: CustomerTicket, customNote?: string) => {
    const reply = customNote || 'Order cancellation could not be approved because your food is already grilling on our chrome flat-tops and being prepared for delivery.';
    StorageService.updateTicketStatus(ticket.id, 'resolved', reply);
    setTickets(StorageService.getTickets());
    onRefreshData();
  };

  // Orders Tab filters & Staff Actions
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Timer adjustment modal state
  const [timerModalOrder, setTimerModalOrder] = useState<Order | null>(null);
  const [timerMinutesInput, setTimerMinutesInput] = useState<number>(25);
  const [timerReasonInput, setTimerReasonInput] = useState<string>('Kitchen rush & grilling fresh patties');

  // Decline order modal state
  const [declineModalOrder, setDeclineModalOrder] = useState<Order | null>(null);
  const [declinePresetReason, setDeclinePresetReason] = useState<string>('Out of 10 km delivery radius from North Nazimabad Block-I');
  const [declineCustomReason, setDeclineCustomReason] = useState<string>('');

  // All-Time History Filters
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyTimeRange, setHistoryTimeRange] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d'>('all');
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState<string>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');
  const [inspectHistoryOrder, setInspectHistoryOrder] = useState<Order | null>(null);

  // Refund / Return Modal State for Store Manager
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundReason, setRefundReason] = useState<string>('Customer Request / Item Return');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'easypaisa' | 'jazzcash' | 'pos_card' | 'original_payment'>('cash');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [refundSuccessToast, setRefundSuccessToast] = useState<string | null>(null);

  const handleOpenRefundModal = (order: Order) => {
    setRefundModalOrder(order);
    setRefundAmount(order.total);
    setRefundType('full');
    setRefundReason('Customer Request / Item Return');
    setRefundMethod(order.payment?.method === 'easypaisa' ? 'easypaisa' : order.payment?.method === 'jazzcash' ? 'jazzcash' : 'cash');
    setRefundNotes('');
  };

  const handleConfirmRefund = () => {
    if (!refundModalOrder) return;
    const finalAmt = Number(refundAmount) || refundModalOrder.total;
    StorageService.refundOrder(refundModalOrder.id, {
      refundAmount: finalAmt,
      refundReason,
      refundMethod,
      refundType,
      refundedBy: 'Store Manager (Admin)',
      returnedToKitchen: false,
      notes: refundNotes,
    });
    setRefundSuccessToast(`Refund of Rs. ${finalAmt.toLocaleString()} successfully processed for Order #${refundModalOrder.id}`);
    setRefundModalOrder(null);
    if (inspectHistoryOrder && inspectHistoryOrder.id === refundModalOrder.id) {
      const refreshed = StorageService.getOrders().find((o) => o.id === refundModalOrder.id);
      if (refreshed) setInspectHistoryOrder(refreshed);
    }
    onRefreshData();
    setTimeout(() => setRefundSuccessToast(null), 4000);
  };

  // Clear History Modal state
  const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
  const [clearHistoryMode, setClearHistoryMode] = useState<'finished' | 'all'>('finished');
  const [clearHistoryConfirmText, setClearHistoryConfirmText] = useState('');
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [clearHistoryToast, setClearHistoryToast] = useState('');

  const handleConfirmClearHistory = async () => {
    if (clearHistoryConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setIsClearingHistory(true);
    const preserveActive = clearHistoryMode === 'finished';
    try {
      await ApiService.clearOrderHistory(preserveActive);
    } catch {
      // Local fallback
    }
    const result = StorageService.clearOrderHistory(preserveActive);
    setIsClearingHistory(false);
    setIsClearHistoryModalOpen(false);
    setClearHistoryConfirmText('');
    setClearHistoryToast(
      preserveActive
        ? `Cleared ${result.deletedCount} completed & cancelled orders. Active cooking orders preserved.`
        : `Purged all ${result.deletedCount} order records from database.`
    );
    setTimeout(() => setClearHistoryToast(''), 4500);
    onRefreshData();
  };

  // Filtered History Orders Memo
  const historyFilteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (historyStatusFilter !== 'all' && o.status !== historyStatusFilter) return false;
      if (historyTypeFilter !== 'all' && o.orderType !== historyTypeFilter) return false;
      if (historyPaymentFilter !== 'all' && o.payment.method !== historyPaymentFilter) return false;
      if (historyTimeRange === 'today') {
        const today = new Date().toDateString();
        if (new Date(o.createdAt).toDateString() !== today) return false;
      } else if (historyTimeRange === 'yesterday') {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
        if (new Date(o.createdAt).toDateString() !== yesterday) return false;
      } else if (historyTimeRange === '7d') {
        if (Date.now() - new Date(o.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (historyTimeRange === '30d') {
        if (Date.now() - new Date(o.createdAt).getTime() > 30 * 24 * 60 * 60 * 1000) return false;
      }
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const hasItemMatch = o.items.some((it) => it.name.toLowerCase().includes(q));
        return (
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          o.deliveryAddress.toLowerCase().includes(q) ||
          o.area.toLowerCase().includes(q) ||
          (o.declineReason && o.declineReason.toLowerCase().includes(q)) ||
          hasItemMatch
        );
      }
      return true;
    });
  }, [orders, historyStatusFilter, historyTypeFilter, historyPaymentFilter, historyTimeRange, historySearchQuery]);

  // CSV Export for Offline Reporting & Analysis
  const [csvToast, setCsvToast] = useState('');

  const handleDownloadOrdersCSV = (exportMode: 'all' | 'filtered' = 'all') => {
    const listToExport = exportMode === 'filtered' ? historyFilteredOrders : orders;
    if (listToExport.length === 0) {
      setCsvToast('No order records available to export.');
      setTimeout(() => setCsvToast(''), 3500);
      return;
    }

    const headers = [
      'Order ID',
      'Placed At (PKT)',
      'Timestamp ISO',
      'Customer Name',
      'Customer Phone',
      'Order Type',
      'Karachi Area',
      'Delivery Address',
      'Payment Method',
      'Payment Status',
      'Transaction ID (TID)',
      'Subtotal (PKR)',
      'Delivery Fee (PKR)',
      'Total Amount (PKR)',
      'Order Status',
      'Total Items Count',
      'Items Breakdown',
      'Customer Notes',
      'Decline Reason',
    ];

    const escapeCell = (value: any): string => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = listToExport.map((ord) => {
      const itemsBreakdown = ord.items
        .map((it) => `${it.quantity}x ${it.name}${it.selectedVariant ? ` (${it.selectedVariant})` : ''}${it.selectedAddons && it.selectedAddons.length > 0 ? ` [addons: ${it.selectedAddons.map((a) => a.name).join(', ')}]` : ''}`)
        .join('; ');
      const itemCount = ord.items.reduce((sum, it) => sum + it.quantity, 0);
      const subtotal = ord.items.reduce((sum, it) => sum + it.itemTotal, 0);

      const placedDateFormatted = new Date(ord.createdAt).toLocaleString('en-PK', {
        timeZone: 'Asia/Karachi',
        dateStyle: 'medium',
        timeStyle: 'medium',
      });

      const paymentStatusStr = ord.payment?.verified
        ? 'VERIFIED'
        : ord.payment?.method === 'cod'
        ? 'COD - PAY ON ARRIVAL'
        : 'PENDING VERIFICATION';

      return [
        escapeCell(ord.id),
        escapeCell(placedDateFormatted),
        escapeCell(ord.createdAt),
        escapeCell(ord.customerName),
        escapeCell(ord.customerPhone),
        escapeCell(ord.orderType.toUpperCase()),
        escapeCell(ord.area || 'N/A'),
        escapeCell(ord.deliveryAddress || 'Pickup at Branch'),
        escapeCell(ord.payment?.method?.toUpperCase() || 'N/A'),
        escapeCell(paymentStatusStr),
        escapeCell(ord.payment?.transactionId || 'N/A'),
        escapeCell(subtotal),
        escapeCell(ord.deliveryFee),
        escapeCell(ord.total),
        escapeCell(ord.status.toUpperCase()),
        escapeCell(itemCount),
        escapeCell(itemsBreakdown),
        escapeCell(ord.customerNotes || ''),
        escapeCell(ord.declineReason || ''),
      ].join(',');
    });

    const csvData = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    const fileTimestamp = new Date().toISOString().slice(0, 10);
    downloadLink.href = downloadUrl;
    downloadLink.download = `bite_and_go_orders_${exportMode}_${fileTimestamp}.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);

    setCsvToast(`Successfully exported ${listToExport.length} orders to CSV!`);
    setTimeout(() => setCsvToast(''), 4500);
  };


  // Quick Photo Upload for Menu Items
  const quickPhotoInputRef = useRef<HTMLInputElement>(null);
  const [quickPhotoTargetId, setQuickPhotoTargetId] = useState<string | null>(null);

  const handleQuickPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickPhotoTargetId) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        StorageService.updateMenuItemImage(quickPhotoTargetId, reader.result);
        onRefreshData();
      }
    };
    reader.readAsDataURL(file);
    // reset input
    e.target.value = '';
  };

  // Menu Tab filters & modals
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || 'all');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);
  const [menuActionToast, setMenuActionToast] = useState<string | null>(null);
  const [copiedMapsOrderId, setCopiedMapsOrderId] = useState<string | null>(null);

  // Screenshot Zoom Modal
  const [zoomedScreenshotUrl, setZoomedScreenshotUrl] = useState<string | null>(null);
  const [zoomedOrder, setZoomedOrder] = useState<Order | null>(null);

  // Settings local state
  const [localSettings, setLocalSettings] = useState<StoreSettings>({ ...settings });
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings((prev) => {
        const stored = StorageService.getSettings();
        const preservedMode = prev.scheduleOverrideMode || settings.scheduleOverrideMode;
        return {
          ...settings,
          scheduleOverrideMode: preservedMode,
          disabledDeliveryAreas: prev.disabledDeliveryAreas ?? stored.disabledDeliveryAreas,
          freeDeliveryAreas: prev.freeDeliveryAreas ?? stored.freeDeliveryAreas,
          deliveryRiders: prev.deliveryRiders ?? stored.deliveryRiders,
          baseDeliveryFee: prev.baseDeliveryFee ?? stored.baseDeliveryFee,
          deliveryFee: prev.deliveryFee ?? stored.deliveryFee,
          deliveryRatePerKm: prev.deliveryRatePerKm ?? stored.deliveryRatePerKm,
          deliveryRadiusKm: prev.deliveryRadiusKm ?? stored.deliveryRadiusKm,
        };
      });
    }
  }, [settings]);

  // Security password change state
  const [targetAccount, setTargetAccount] = useState<'admin@biteandgo.pk' | 'kitchen@biteandgo.pk'>('admin@biteandgo.pk');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordToast, setPasswordToast] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; timestamp: string; ip: string; email: string; role: string; event: string; details: string }>>([]);

  // IP Whitelisting state
  const [detectedIp, setDetectedIp] = useState('');
  const [newIpInput, setNewIpInput] = useState('');

  const loadAuditLogs = () => {
    ApiService.getAuditLogs().then((logs) => {
      if (logs) setAuditLogs(logs);
    });
  };

  React.useEffect(() => {
    fetch('/api/staff/my-ip')
      .then((r) => r.json())
      .then((d) => {
        if (d.ip) setDetectedIp(d.ip);
      })
      .catch(() => {});
    loadAuditLogs();
  }, []);

  // Play kitchen order beep automatically whenever a new 'received' order appears in admin
  const prevReceivedOrdersCount = useRef(orders.filter((o) => o.status === 'received').length);
  useEffect(() => {
    const curReceived = orders.filter((o) => o.status === 'received').length;
    if (curReceived > prevReceivedOrdersCount.current) {
      sounds.playKitchenOrderBeep();
    }
    prevReceivedOrdersCount.current = curReceived;
  }, [orders]);

  const handleAddCurrentIp = () => {
    if (!detectedIp) return;
    const currentList = localSettings.staffIpWhitelist || [];
    if (!currentList.includes(detectedIp)) {
      setLocalSettings({
        ...localSettings,
        staffIpWhitelist: [...currentList, detectedIp],
      });
    }
  };

  const handleAddManualIp = () => {
    if (!newIpInput.trim()) return;
    const currentList = localSettings.staffIpWhitelist || [];
    if (!currentList.includes(newIpInput.trim())) {
      setLocalSettings({
        ...localSettings,
        staffIpWhitelist: [...currentList, newIpInput.trim()],
      });
      setNewIpInput('');
    }
  };

  const handleRemoveIp = (ipToRemove: string) => {
    const currentList = localSettings.staffIpWhitelist || [];
    setLocalSettings({
      ...localSettings,
      staffIpWhitelist: currentList.filter((ip) => ip !== ipToRemove),
    });
  };

  // Analytics timeframe & Deal Extraction controls
  const [analyticsRange, setAnalyticsRange] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [extractDeals, setExtractDeals] = useState<boolean>(false);
  const [itemAnalyticsSearch, setItemAnalyticsSearch] = useState<string>('');
  const [itemAnalyticsCategory, setItemAnalyticsCategory] = useState<string>('all');
  const [itemAnalyticsSort, setItemAnalyticsSort] = useState<'quantity' | 'revenue' | 'name'>('quantity');
  const [itemSalesCsvToast, setItemSalesCsvToast] = useState<string>('');

  // --- ACTIONS ---

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await ApiService.updateOrderStatus(orderId, status);
    } catch {
      // Fallback local
    }
    StorageService.updateOrderStatus(orderId, status);
    onRefreshData();
  };

  const [isDeclineLoading, setIsDeclineLoading] = useState(false);
  const handleConfirmDeclineOrder = async () => {
    if (!declineModalOrder) return;
    const preset = declinePresetReason !== 'Other' ? declinePresetReason : '';
    const finalReason = declineCustomReason.trim() || preset || 'Restaurant unable to process this order at this time';
    setIsDeclineLoading(true);
    try {
      await ApiService.declineOrder(declineModalOrder.id, finalReason);
    } catch {
      // Fallback
    }
    StorageService.declineOrder(declineModalOrder.id, finalReason);

    // Automatically resolve any open customer cancellation tickets for this order
    const relatedTickets = tickets.filter(
      (t) => t.orderId === declineModalOrder.id && t.issueType === 'order_decline_request' && t.status !== 'resolved'
    );
    for (const t of relatedTickets) {
      StorageService.updateTicketStatus(
        t.id,
        'resolved',
        `Order cancellation approved by store manager. Order #${declineModalOrder.id} cancelled: ${finalReason}`
      );
    }
    setTickets(StorageService.getTickets());

    setIsDeclineLoading(false);
    setDeclineModalOrder(null);
    setDeclineCustomReason('');
    if (inspectHistoryOrder && inspectHistoryOrder.id === declineModalOrder.id) {
      setInspectHistoryOrder(null);
    }
    onRefreshData();
  };

  const [isTimerLoading, setIsTimerLoading] = useState(false);
  const handleConfirmTimerAdjustment = async () => {
    if (!timerModalOrder) return;
    setIsTimerLoading(true);
    try {
      await ApiService.adjustOrderTimer(timerModalOrder.id, timerMinutesInput, timerReasonInput);
    } catch {
      // Fallback
    }
    StorageService.adjustOrderTimer(timerModalOrder.id, timerMinutesInput, timerReasonInput);
    setIsTimerLoading(false);
    setTimerModalOrder(null);
    onRefreshData();
  };

  const handleVerifyPayment = async (orderId: string, approve: boolean) => {
    try {
      await ApiService.verifyPayment(orderId, approve);
    } catch {
      // Fallback
    }
    StorageService.verifyEasyPaisaPayment(orderId, approve);
    onRefreshData();
    if (zoomedScreenshotUrl) {
      setZoomedScreenshotUrl(null);
    }
  };

  const handleToggleItemStock = async (itemId: string) => {
    try {
      await ApiService.toggleItemStock(itemId);
    } catch {
      // Fallback
    }
    StorageService.toggleItemAvailability(itemId);
    onRefreshData();
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await ApiService.deleteMenuItem(itemId);
    } catch {
      // Fallback
    }
    StorageService.deleteMenuItem(itemId);
    setItemToDelete(null);
    setMenuActionToast('Menu item removed successfully.');
    setTimeout(() => setMenuActionToast(null), 3000);
    onRefreshData();
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      await ApiService.deleteCategory(catId);
    } catch {
      // Fallback
    }
    StorageService.deleteCategory(catId);
    setCatToDelete(null);
    if (selectedCatId === catId) {
      setSelectedCatId('all');
    }
    setMenuActionToast('Category deleted successfully.');
    setTimeout(() => setMenuActionToast(null), 3000);
    onRefreshData();
  };

  const handleReorderItem = async (itemId: string, direction: 'up' | 'down') => {
    try {
      await ApiService.reorderItem(itemId, direction);
    } catch {
      // Fallback
    }
    StorageService.reorderMenuItem(itemId, direction);
    onRefreshData();
  };

  const handleReorderCategory = async (catId: string, direction: 'up' | 'down') => {
    try {
      await ApiService.reorderCategory(catId, direction);
    } catch {
      // Fallback
    }
    StorageService.reorderCategory(catId, direction);
    onRefreshData();
  };

  const handleSaveMenuItem = async (itemData: MenuItem | Omit<MenuItem, 'id' | 'order'>) => {
    if ('id' in itemData) {
      try {
        await ApiService.updateMenuItem(itemData as MenuItem);
      } catch {
        // Fallback
      }
      StorageService.updateMenuItem(itemData as MenuItem);
    } else {
      try {
        await ApiService.createMenuItem(itemData);
      } catch {
        // Fallback
      }
      StorageService.addMenuItem(itemData);
    }
    onRefreshData();
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await ApiService.createCategory({ name: newCatName.trim() });
    } catch {
      // Fallback
    }
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      slug: newCatName.trim().toLowerCase().replace(/\s+/g, '-'),
      order: categories.length + 1,
      iconName: 'Flame',
    };
    StorageService.saveCategories([...categories, newCat]);
    setNewCatName('');
    setIsAddingCat(false);
    onRefreshData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const stored = StorageService.getSettings();
    const mergedSettings: StoreSettings = {
      ...stored,
      ...localSettings,
      disabledDeliveryAreas: localSettings.disabledDeliveryAreas ?? stored.disabledDeliveryAreas ?? [],
      freeDeliveryAreas: localSettings.freeDeliveryAreas ?? stored.freeDeliveryAreas ?? [],
      deliveryRiders: localSettings.deliveryRiders ?? stored.deliveryRiders ?? [],
    };
    await StorageService.saveSettings(mergedSettings);
    if (onSaveSettings) {
      await onSaveSettings(mergedSettings);
    }
    try {
      await ApiService.updateSettings(mergedSettings);
    } catch {
      // Fallback
    }
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
    onRefreshData();
  };

  const handleSaveWidgetConfig = async (updatedConfig: CustomerWidgetsConfig) => {
    const current = StorageService.getSettings();
    const updatedSettings: StoreSettings = {
      ...current,
      customerWidgets: {
        ...(current.customerWidgets || {}),
        ...updatedConfig,
      },
    };
    setLocalSettings(updatedSettings);
    await StorageService.saveSettings(updatedSettings);
    if (onSaveWidgets) {
      await onSaveWidgets(updatedConfig);
    }
    if (onSaveSettings) {
      await onSaveSettings(updatedSettings);
    }
    try {
      await ApiService.updateSettings(updatedSettings);
    } catch {
      // Fallback
    }
    onRefreshData();
  };

  const handleSaveKitchenPermissions = async (updatedPerms: KitchenPermissionsConfig) => {
    const updatedSettings: StoreSettings = {
      ...localSettings,
      kitchenPermissions: updatedPerms,
    };
    setLocalSettings(updatedSettings);
    await StorageService.saveSettings(updatedSettings);
    if (onSaveSettings) {
      await onSaveSettings(updatedSettings);
    }
    try {
      await ApiService.updateSettings(updatedSettings);
    } catch {
      // Fallback
    }
    onRefreshData();
  };

  const handleSaveInventory = async (updatedItems: MenuItem[]) => {
    StorageService.saveMenuItems(updatedItems);
    sounds.playSuccess();
    onRefreshData();
  };

  const handleSavePosPermissions = async (updatedPerms: PosPermissionsConfig) => {
    const updatedSettings: StoreSettings = {
      ...localSettings,
      posPermissions: updatedPerms,
    };
    setLocalSettings(updatedSettings);
    await StorageService.saveSettings(updatedSettings);
    if (onSaveSettings) {
      await onSaveSettings(updatedSettings);
    }
    try {
      await ApiService.updateSettings(updatedSettings);
    } catch {
      // Fallback
    }
    sounds.playSuccess();
    onRefreshData();
  };

  const handleChangeMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordToast('');
    setPasswordError('');

    if (newPasswordInput.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    const res = await ApiService.changePassword(newPasswordInput, targetAccount);
    if (res.success) {
      setPasswordToast(`Password for ${targetAccount} successfully updated on backend!`);
      setNewPasswordInput('');
      loadAuditLogs();
      setTimeout(() => setPasswordToast(''), 4000);
    } else {
      setPasswordError(res.error || 'Failed to update password');
    }
  };

  // --- ANALYTICS CALCULATIONS ---
  const filteredOrders = orders.filter((o) => {
    if (analyticsRange === 'today') {
      const today = new Date().toDateString();
      return new Date(o.createdAt).toDateString() === today;
    }
    if (analyticsRange === '7d') {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(o.createdAt).getTime() >= sevenDaysAgo;
    }
    if (analyticsRange === '30d') {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return new Date(o.createdAt).getTime() >= thirtyDaysAgo;
    }
    return true;
  });

  const validOrders = filteredOrders.filter((o) => o.status !== 'cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = validOrders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // POS vs Online Breakdown
  const posOrders = validOrders.filter(
    (o) =>
      o.source === 'pos' ||
      o.orderType === 'dine_in' ||
      o.orderType === 'pos_takeaway' ||
      o.orderType === 'pos_counter'
  );
  const onlineOrders = validOrders.filter(
    (o) =>
      o.source !== 'pos' &&
      o.orderType !== 'dine_in' &&
      o.orderType !== 'pos_takeaway' &&
      o.orderType !== 'pos_counter'
  );
  const posRevenue = posOrders.reduce((sum, o) => sum + o.total, 0);
  const onlineRevenue = onlineOrders.reduce((sum, o) => sum + o.total, 0);

  // Payment Breakdown
  const easyPaisaOrders = validOrders.filter((o) => o.payment.method === 'easypaisa');
  const jazzCashOrders = validOrders.filter((o) => o.payment.method === 'jazzcash');
  const codOrders = validOrders.filter((o) => o.payment.method === 'cod');
  const posCashOrders = validOrders.filter((o) => o.payment.method === 'pos_cash');
  const posCardOrders = validOrders.filter((o) => o.payment.method === 'pos_card');
  const posEasyPaisaOrders = validOrders.filter((o) => (o.payment.method as string) === 'pos_easypaisa');

  const pendingVerificationOrders = orders.filter(
    (o) =>
      (o.payment.method === 'easypaisa' || o.payment.method === 'jazzcash') &&
      !o.payment.verified &&
      o.status !== 'cancelled'
  );

  // Delivery Orders & Rider Revenue Split Calculations
  const deliveryOrders = validOrders.filter(
    (o) =>
      o.orderType === 'delivery' ||
      (o.orderType as string) === 'pos_delivery' ||
      Boolean(o.deliveryAddress)
  );
  const totalDeliveryCharges = deliveryOrders.reduce((sum, o) => sum + (o.deliveryFee || 150), 0);
  const netFoodRevenue = Math.max(0, totalRevenue - totalDeliveryCharges);

  // Delivery fleet breakdown for splitting
  const fleetRidersList: DeliveryRider[] = useMemo(() => {
    return StorageService.getDeliveryRiders();
  }, [localSettings]);

  const riderSplits = useMemo(() => {
    return fleetRidersList.map((rider) => {
      const riderOrders = validOrders.filter((o) => {
        const isDeliv =
          o.orderType === 'delivery' ||
          (o.orderType as string) === 'pos_delivery' ||
          Boolean(o.deliveryAddress);
        if (!isDeliv) return false;
        return (
          o.driver?.name === rider.name ||
          (o.driver as any)?.id === rider.id ||
          (o.driver?.vehiclePlate && o.driver.vehiclePlate === rider.vehiclePlate)
        );
      });

      const deliveriesCount = riderOrders.length;
      const earnedDeliveryFees = riderOrders.reduce((sum, o) => sum + (o.deliveryFee || 150), 0);
      const codOrdersList = riderOrders.filter((o) => {
        const pm = o.payment?.method || (o as any).paymentMethod;
        return pm === 'cod' || pm === 'pos_cash' || !pm;
      });
      const totalCodCash = codOrdersList.reduce((sum, o) => sum + o.total, 0);
      const netCashToTurnIn = totalCodCash - earnedDeliveryFees;

      return {
        rider,
        deliveriesCount,
        earnedDeliveryFees,
        totalCodCash,
        netCashToTurnIn,
        codCount: codOrdersList.length,
        onlineCount: deliveriesCount - codOrdersList.length,
      };
    });
  }, [fleetRidersList, validOrders]);

  const totalCodCashAllRiders = riderSplits.reduce((sum, r) => sum + r.totalCodCash, 0);
  const totalNetCashAllRiders = riderSplits.reduce((sum, r) => sum + r.netCashToTurnIn, 0);

  // Combo deals reference for dish deconstruction
  const comboDealsList: ComboDeal[] = useMemo(() => {
    try {
      const stored = StorageService.getComboDeals();
      if (stored && stored.length > 0) return stored;
    } catch {}
    return initialComboDeals;
  }, []);

  // Items Sold Analysis & Deal Deconstruction Engine
  const {
    itemsSoldList,
    totalDishUnitsCount,
    totalDirectDishCount,
    totalFromDealsCount,
    totalItemsGrossRevenue,
  } = useMemo(() => {
    interface SoldItemRecord {
      id: string;
      name: string;
      category: string;
      image?: string;
      isDeal: boolean;
      directQuantity: number;
      fromDealsQuantity: number;
      totalQuantity: number;
      revenue: number;
      dealBreakdownNotes: string[];
    }

    const map: Record<string, SoldItemRecord> = {};

    validOrders.forEach((o) => {
      o.items.forEach((item) => {
        // Find if this is a combo deal
        const matchingDeal =
          comboDealsList.find(
            (d) =>
              d.id === item.menuItemId ||
              d.title.toLowerCase() === item.name.toLowerCase() ||
              d.id === (item as any).dealId
          ) ||
          initialComboDeals.find(
            (d) =>
              d.id === item.menuItemId ||
              d.title.toLowerCase() === item.name.toLowerCase()
          );

        const isDealItem =
          Boolean((item as any).isDeal) ||
          Boolean(matchingDeal) ||
          (item.menuItemId && item.menuItemId.startsWith('deal-')) ||
          item.name.toLowerCase().includes('feast') ||
          item.name.toLowerCase().includes('combo') ||
          item.name.toLowerCase().includes('mania');

        const incList = (item as any).includedDealItems || matchingDeal?.includedItems;

        if (extractDeals && isDealItem && incList && incList.length > 0) {
          // Deconstruct the combo deal into individual constituent dishes!
          let totalConstituentVal = 0;
          incList.forEach((inc: any) => {
            const menuItem = menuItems.find((m) => m.id === inc.menuItemId);
            const price = menuItem ? menuItem.price : 450;
            totalConstituentVal += price * inc.quantity;
          });

          incList.forEach((inc: any) => {
            const menuItem = menuItems.find((m) => m.id === inc.menuItemId);
            const resolvedName = menuItem?.name || inc.label || inc.menuItemId;
            const key = (menuItem?.id || inc.menuItemId || resolvedName).toLowerCase();
            const categoryName = menuItem
              ? categories.find((c) => c.id === menuItem.categoryId)?.name || menuItem.categoryId
              : 'Deals & Combos';

            const extractedUnits = inc.quantity * item.quantity;
            const menuItemPrice = menuItem?.price || 450;
            const shareRatio =
              totalConstituentVal > 0
                ? (menuItemPrice * inc.quantity) / totalConstituentVal
                : 1 / incList.length;
            const itemAttributedRevenue = Math.round(item.itemTotal * shareRatio);

            if (!map[key]) {
              map[key] = {
                id: key,
                name: resolvedName,
                category: categoryName,
                image: menuItem?.image,
                isDeal: false,
                directQuantity: 0,
                fromDealsQuantity: 0,
                totalQuantity: 0,
                revenue: 0,
                dealBreakdownNotes: [],
              };
            }

            map[key].fromDealsQuantity += extractedUnits;
            map[key].totalQuantity += extractedUnits;
            map[key].revenue += itemAttributedRevenue;
            const note = `${extractedUnits}x from "${item.name}"`;
            if (!map[key].dealBreakdownNotes.includes(note)) {
              map[key].dealBreakdownNotes.push(note);
            }
          });
        } else {
          // Standard as-ordered view
          const key = item.name.toLowerCase();
          const menuItem = menuItems.find(
            (m) => m.name.toLowerCase() === item.name.toLowerCase() || m.id === item.menuItemId
          );
          const categoryName = isDealItem
            ? 'Combos & Deals'
            : menuItem
            ? categories.find((c) => c.id === menuItem.categoryId)?.name || menuItem.categoryId
            : 'General Menu';

          if (!map[key]) {
            map[key] = {
              id: key,
              name: item.name,
              category: categoryName,
              image: item.image || menuItem?.image,
              isDeal: isDealItem,
              directQuantity: 0,
              fromDealsQuantity: 0,
              totalQuantity: 0,
              revenue: 0,
              dealBreakdownNotes: [],
            };
          }

          map[key].directQuantity += item.quantity;
          map[key].totalQuantity += item.quantity;
          map[key].revenue += item.itemTotal;
        }
      });
    });

    const list = Object.values(map);
    const totalDishUnits = list.reduce((sum, it) => sum + it.totalQuantity, 0);
    const totalDirectUnits = list.reduce((sum, it) => sum + it.directQuantity, 0);
    const totalFromDealsUnits = list.reduce((sum, it) => sum + it.fromDealsQuantity, 0);
    const totalRev = list.reduce((sum, it) => sum + it.revenue, 0);

    return {
      itemsSoldList: list,
      totalDishUnitsCount: totalDishUnits,
      totalDirectDishCount: totalDirectUnits,
      totalFromDealsCount: totalFromDealsUnits,
      totalItemsGrossRevenue: totalRev,
    };
  }, [validOrders, extractDeals, comboDealsList, menuItems, categories]);

  // Filtered & Sorted items sold for display and export
  const filteredItemsSold = useMemo(() => {
    return itemsSoldList
      .filter((it) => {
        if (itemAnalyticsSearch.trim()) {
          const q = itemAnalyticsSearch.toLowerCase();
          const matchesName = it.name.toLowerCase().includes(q);
          const matchesCat = it.category.toLowerCase().includes(q);
          if (!matchesName && !matchesCat) return false;
        }
        if (itemAnalyticsCategory !== 'all') {
          if (itemAnalyticsCategory === 'combos') {
            if (
              !it.isDeal &&
              !it.category.toLowerCase().includes('combo') &&
              !it.category.toLowerCase().includes('deal')
            ) {
              return false;
            }
          } else if (it.category.toLowerCase() !== itemAnalyticsCategory.toLowerCase()) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (itemAnalyticsSort === 'quantity') return b.totalQuantity - a.totalQuantity;
        if (itemAnalyticsSort === 'revenue') return b.revenue - a.revenue;
        return a.name.localeCompare(b.name);
      });
  }, [itemsSoldList, itemAnalyticsSearch, itemAnalyticsCategory, itemAnalyticsSort]);

  const topSellingItems = useMemo(() => {
    return [...itemsSoldList].sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [itemsSoldList]);

  // CSV Exporter for items sold records
  const handleDownloadItemsSoldCSV = () => {
    if (itemsSoldList.length === 0) {
      setItemSalesCsvToast('No item sales records found for this timeframe.');
      setTimeout(() => setItemSalesCsvToast(''), 3000);
      return;
    }

    const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const headers = [
      'Rank',
      'Item Name',
      'Category',
      'Item Format',
      'Direct Units Sold',
      'Units From Combos / Deals',
      'Total Dish Units Sold',
      'Gross Revenue (PKR)',
      'Volume Share (%)',
    ];

    const rows = filteredItemsSold.map((it, idx) => {
      const pct =
        totalDishUnitsCount > 0 ? ((it.totalQuantity / totalDishUnitsCount) * 100).toFixed(1) + '%' : '0%';
      const typeLabel = it.isDeal
        ? 'Combo Deal'
        : it.fromDealsQuantity > 0
        ? 'Dish (Extracted from Deals)'
        : 'Regular Menu Item';

      return [
        idx + 1,
        `"${it.name.replace(/"/g, '""')}"`,
        `"${it.category.replace(/"/g, '""')}"`,
        `"${typeLabel}"`,
        it.directQuantity,
        it.fromDealsQuantity,
        it.totalQuantity,
        it.revenue,
        `"${pct}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `bite_and_go_items_sold_${extractDeals ? 'extracted_deals_' : 'standard_'}${fileTimestamp}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setItemSalesCsvToast(`Successfully exported ${filteredItemsSold.length} item sales records to CSV!`);
    setTimeout(() => setItemSalesCsvToast(''), 3500);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToStore}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-300 border border-neutral-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Storefront</span>
              </button>

              <div className="h-4 w-px bg-neutral-800" />

              <div>
                <h1 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                  <span>Bite &amp; Go Control Center</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                    ADMIN
                  </span>
                </h1>
                <p className="text-[11px] text-neutral-400">
                  Real-time menu, orders &amp; EasyPaisa transfers
                </p>
              </div>
            </div>

            {/* Quick Status Stats */}
            <div className="flex items-center gap-2.5">
              {/* AI Manager Copilot Button */}
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 text-xs font-bold rounded-lg shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Open AI Operations Copilot (Gemini Flash)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Copilot</span>
              </button>

              {/* Test Order Beep Button */}
              <button
                type="button"
                onClick={() => {
                  sounds.unlockAudioContext();
                  sounds.playKitchenOrderBeep();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-750 hover:border-amber-500/50 text-amber-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                title="Test employee order alert beeper (Kitchen / POS sound)"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Test Alert Beep</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-neutral-300">Live Orders:</span>
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  {orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length}
                </span>
              </div>

              {tickets.filter((t) => t.issueType === 'order_decline_request' && t.status !== 'resolved').length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tickets');
                    setTicketFilter('open');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold animate-pulse shadow-md shadow-red-600/30 transition-colors cursor-pointer"
                  title="Customer submitted order decline request ticket"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>
                    {tickets.filter((t) => t.issueType === 'order_decline_request' && t.status !== 'resolved').length} Decline Request
                    {tickets.filter((t) => t.issueType === 'order_decline_request' && t.status !== 'resolved').length > 1 ? 's' : ''}
                  </span>
                </button>
              )}

              {pendingVerificationOrders.length > 0 && (
                <button
                  onClick={() => setActiveTab('payments')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold animate-pulse"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{pendingVerificationOrders.length} EasyPaisa to Verify</span>
                </button>
              )}

              {/* Lock & Sign Out Button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                title="Sign out of admin session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Admin Navigation Tabs with Smart Corner Scroll Controls & Quick Jump Option */}
          <div className="flex items-center gap-1 pt-1 border-t border-neutral-900 relative">
            {/* Left Corner Scroll Control */}
            <button
              type="button"
              onClick={() => handleScrollTabStrip('left')}
              className="p-2 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors shrink-0 cursor-pointer shadow-xs"
              title="Scroll tabs to the left"
              aria-label="Scroll tabs left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Smart Scrollable Tab Bar */}
            <div
              ref={tabNavRef}
              className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth"
            >
              <button
                id="admin-tab-orders"
                onClick={() => scrollTabIntoView('orders')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Live Orders Pipeline</span>
                <span className="bg-neutral-850 text-neutral-300 text-[10px] px-1.5 py-0.2 rounded-md font-mono">
                  {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length}
                </span>
              </button>

              <button
                id="admin-tab-history"
                onClick={() => scrollTabIntoView('history')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'history'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>All-Time History</span>
                <span className="bg-neutral-850 text-neutral-300 text-[10px] px-1.5 py-0.2 rounded-md font-mono">
                  {orders.length}
                </span>
              </button>

              <button
                id="admin-tab-customers"
                onClick={() => scrollTabIntoView('customers')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'customers'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>User Database &amp; Orders</span>
              </button>

              <button
                id="admin-tab-payments"
                onClick={() => scrollTabIntoView('payments')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'payments'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Payment Verifications</span>
                {pendingVerificationOrders.length > 0 && (
                  <span className="bg-emerald-500 text-neutral-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                    {pendingVerificationOrders.length}
                  </span>
                )}
              </button>

              <button
                id="admin-tab-tickets"
                onClick={() => scrollTabIntoView('tickets')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'tickets'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>Customer Issue Tickets</span>
                {tickets.filter((t) => t.status === 'open').length > 0 && (
                  <span className="bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                    {tickets.filter((t) => t.status === 'open').length}
                  </span>
                )}
              </button>

              <button
                id="admin-tab-menu"
                onClick={() => scrollTabIntoView('menu')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'menu'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Menu &amp; Categories CRUD</span>
                <span className="bg-neutral-850 text-neutral-300 text-[10px] px-1.5 py-0.2 rounded-md font-mono">
                  {menuItems.length}
                </span>
              </button>

              <button
                id="admin-tab-deals"
                onClick={() => scrollTabIntoView('deals')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'deals'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Deal Maker &amp; Combos</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  DEALS
                </span>
              </button>

              <button
                id="admin-tab-promos"
                onClick={() => scrollTabIntoView('promos')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'promos'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Tag className="w-4 h-4 text-amber-400" />
                <span>Promo Codes &amp; Night Offers</span>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  PROMOS
                </span>
              </button>

              <button
                id="admin-tab-inventory"
                onClick={() => scrollTabIntoView('inventory')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Boxes className="w-4 h-4 text-emerald-400" />
                <span>Manage Inventory</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  STOCK
                </span>
              </button>

              <button
                id="admin-tab-costing"
                onClick={() => scrollTabIntoView('costing')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'costing'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>Food Costing &amp; BOM</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  COSTING
                </span>
              </button>

              <button
                id="admin-tab-reports"
                onClick={() => scrollTabIntoView('reports')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'reports'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Executive Reports</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  RECHARTS
                </span>
              </button>

              <button
                id="admin-tab-analytics"
                onClick={() => scrollTabIntoView('analytics')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Sales Analytics</span>
              </button>

              <button
                id="admin-tab-settings"
                onClick={() => scrollTabIntoView('settings')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Store &amp; EasyPaisa Settings</span>
              </button>

              <button
                id="admin-tab-website_hud"
                onClick={() => scrollTabIntoView('website_hud')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'website_hud'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Website HUD &amp; Widgets</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  HUD
                </span>
              </button>

              <button
                id="admin-tab-kitchen_perms"
                onClick={() => scrollTabIntoView('kitchen_perms')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'kitchen_perms'
                    ? 'border-red-500 text-red-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <ChefHat className="w-4 h-4 text-red-400" />
                <span>Kitchen Permissions</span>
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  PERMS
                </span>
              </button>

              <button
                id="admin-tab-pos_perms"
                onClick={() => scrollTabIntoView('pos_perms')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'pos_perms'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Employee POS Perms</span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  POS HUD
                </span>
              </button>

              <button
                id="admin-tab-staff_accounts"
                onClick={() => scrollTabIntoView('staff_accounts')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'staff_accounts'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Staff &amp; Rider Credentials</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  PORTALS
                </span>
              </button>
            </div>

            {/* Right Corner Scroll Control */}
            <button
              type="button"
              onClick={() => handleScrollTabStrip('right')}
              className="p-2 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors shrink-0 cursor-pointer shadow-xs"
              title="Scroll tabs to the right"
              aria-label="Scroll tabs right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Corner Option: Jump to Tab Menu (Smart 1-Click Navigation) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsTabJumpMenuOpen(!isTabJumpMenuOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isTabJumpMenuOpen
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-750 hover:border-amber-500/50 text-neutral-300 hover:text-amber-400'
                }`}
                title="Corner Option: Jump to any tab immediately without manual scrolling"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Jump to Tab</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isTabJumpMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTabJumpMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 z-50 max-h-96 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-neutral-500 border-b border-neutral-850 mb-1 flex items-center justify-between">
                    <span>Jump to Section</span>
                    <span className="text-amber-400 font-mono text-[9px]">17 Menus</span>
                  </div>

                  {[
                    { id: 'orders' as AdminTab, label: 'Live Orders Pipeline', icon: <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />, badge: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length },
                    { id: 'history' as AdminTab, label: 'All-Time History', icon: <History className="w-3.5 h-3.5 text-neutral-400" />, badge: orders.length },
                    { id: 'customers' as AdminTab, label: 'User Database & Orders', icon: <Users className="w-3.5 h-3.5 text-blue-400" /> },
                    { id: 'payments' as AdminTab, label: 'Payment Verifications', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />, badge: pendingVerificationOrders.length, highlight: pendingVerificationOrders.length > 0 },
                    { id: 'tickets' as AdminTab, label: 'Customer Issue Tickets', icon: <Ticket className="w-3.5 h-3.5 text-red-400" />, badge: tickets.filter((t) => t.status === 'open').length, highlight: tickets.filter((t) => t.status === 'open').length > 0 },
                    { id: 'menu' as AdminTab, label: 'Menu & Categories CRUD', icon: <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />, badge: menuItems.length },
                    { id: 'deals' as AdminTab, label: 'Deal Maker & Combos', icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" /> },
                    { id: 'promos' as AdminTab, label: 'Promo Codes & Offers', icon: <Tag className="w-3.5 h-3.5 text-purple-400" /> },
                    { id: 'inventory' as AdminTab, label: 'Manage Inventory', icon: <Boxes className="w-3.5 h-3.5 text-emerald-400" /> },
                    { id: 'costing' as AdminTab, label: 'Food Costing & Recipe BOM', icon: <Calculator className="w-3.5 h-3.5 text-amber-400" /> },
                    { id: 'reports' as AdminTab, label: 'Executive Reports (Recharts)', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> },
                    { id: 'analytics' as AdminTab, label: 'Sales Analytics', icon: <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> },
                    { id: 'settings' as AdminTab, label: 'Store & EasyPaisa Settings', icon: <Settings className="w-3.5 h-3.5 text-neutral-400" /> },
                    { id: 'website_hud' as AdminTab, label: 'Website HUD & Widgets', icon: <Monitor className="w-3.5 h-3.5 text-amber-400" /> },
                    { id: 'kitchen_perms' as AdminTab, label: 'Kitchen Permissions', icon: <ChefHat className="w-3.5 h-3.5 text-red-400" /> },
                    { id: 'pos_perms' as AdminTab, label: 'Employee POS Perms', icon: <CreditCard className="w-3.5 h-3.5 text-blue-400" /> },
                    { id: 'staff_accounts' as AdminTab, label: 'Staff & Rider Credentials', icon: <KeyRound className="w-3.5 h-3.5 text-amber-400" /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        scrollTabIntoView(tab.id);
                        setIsTabJumpMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                          : 'text-neutral-300 hover:bg-neutral-850 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {tab.icon}
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                          tab.highlight ? 'bg-red-500 text-white animate-pulse' : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= EXECUTIVE LIVE OPERATIONS & SALES TICKER HUD ================= */}
      <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-neutral-800/90 backdrop-blur-xl px-3 sm:px-6 py-2 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar text-xs">
          {/* Live Store Hub Signal */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded-full text-emerald-400 font-mono text-[10px] font-bold tracking-wider shadow-xs">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE OPERATIONS HUD</span>
              <span className="text-neutral-500">·</span>
              <span className="text-emerald-300/80 font-normal">North Nazimabad</span>
            </div>
          </div>

          {/* Ticker Metrics Capsules */}
          <div className="flex items-center gap-2.5 text-neutral-300 shrink-0">
            {/* Total Realized Sales (POS Register + Online Web) */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-950/20 border border-amber-500/35 px-3 py-1 rounded-xl shadow-xs">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[9px] text-amber-400/80 uppercase font-mono font-bold block leading-none">Total Realized Revenue</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-mono font-black text-amber-300 text-xs sm:text-sm tabular-nums">
                    Rs. {totalRevenue.toLocaleString()}
                  </span>
                  <span className="text-[9.5px] font-mono text-neutral-400">({validOrders.length} orders)</span>
                </div>
              </div>
            </div>

            {/* In-Store POS Register Sales */}
            <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-500/30 px-3 py-1 rounded-xl">
              <CreditCard className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div>
                <span className="text-[9px] text-blue-300/80 uppercase font-mono font-bold block leading-none">POS Register</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-white text-xs tabular-nums">
                    Rs. {posRevenue.toLocaleString()}
                  </span>
                  <span className="text-[9.5px] font-mono text-blue-300/70">({posOrders.length} tickets)</span>
                </div>
              </div>
            </div>

            {/* Online Storefront Sales */}
            <div className="flex items-center gap-2 bg-neutral-950/80 border border-emerald-500/30 px-3 py-1 rounded-xl">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[9px] text-emerald-400/80 uppercase font-mono font-bold block leading-none">Online Web</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-mono font-bold text-white text-xs tabular-nums">
                    Rs. {onlineRevenue.toLocaleString()}
                  </span>
                  <span className="text-[9.5px] font-mono text-emerald-300/70">({onlineOrders.length} orders)</span>
                </div>
              </div>
            </div>

            {/* Live Kitchen Cooking Station */}
            <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/30 px-3 py-1 rounded-xl">
              <ChefHat className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <div>
                <span className="text-[9px] text-red-400/80 uppercase font-mono font-bold block leading-none">Kitchen Active</span>
                <span className="font-mono font-bold text-red-400 text-xs block mt-0.5">
                  {orders.filter(o => o.status === 'preparing' || o.status === 'confirmed').length} tickets firing
                </span>
              </div>
            </div>

            {/* EasyPaisa Action Alert */}
            {pendingVerificationOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className="flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs animate-pulse"
                title="Review customer EasyPaisa screenshots"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] text-emerald-300 font-bold whitespace-nowrap">
                  {pendingVerificationOrders.length} EasyPaisa to Verify
                </span>
              </button>
            )}

            {/* Quick Average Order Value */}
            <div className="hidden lg:flex items-center gap-2 bg-neutral-950/80 border border-neutral-800 px-2.5 py-1 rounded-xl">
              <div>
                <span className="text-[9px] text-neutral-400 uppercase font-mono block leading-none">AOV / Basket</span>
                <span className="font-mono font-bold text-neutral-200 text-xs block mt-0.5">
                  Rs. {avgOrderValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ================= TAB 1: LIVE ORDERS PIPELINE ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {['all', 'received', 'confirmed', 'preparing', 'on_the_way', 'delivered'].map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-colors ${
                        orderStatusFilter === st
                          ? 'bg-amber-500 text-neutral-950 font-bold'
                          : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search Order # or phone..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Orders Cards Grid */}
            <div className="space-y-4">
              {orders
                .filter((o) => {
                  if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
                  if (orderSearchQuery.trim()) {
                    const q = orderSearchQuery.toLowerCase();
                    return (
                      o.id.toLowerCase().includes(q) ||
                      o.customerName.toLowerCase().includes(q) ||
                      o.customerPhone.includes(q)
                    );
                  }
                  return true;
                })
                .map((order) => {
                  return (
                    <div
                      key={order.id}
                      className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all space-y-4 shadow-sm"
                    >
                      {/* Top Bar of card */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base font-bold text-amber-400">
                            {order.id}
                          </span>
                          <span className="text-xs text-neutral-500">·</span>
                          <span className="text-xs text-neutral-400">
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-xs text-neutral-500">·</span>
                          <span className="text-xs font-semibold text-white capitalize">
                            {order.orderType}
                          </span>
                        </div>

                        {/* Payment Status Pill */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 ${
                              order.payment.verified
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {order.payment.verified ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {order.payment.method} ·{' '}
                              {order.payment.verified ? 'Verified' : 'Pending Verification'}
                            </span>
                          </span>

                          {order.payment.screenshotUrl && (
                            <button
                              onClick={() => {
                                setZoomedScreenshotUrl(order.payment.screenshotUrl || null);
                                setZoomedOrder(order);
                              }}
                              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>View Receipt</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Middle: Customer & Destination details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850">
                          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                            Customer Details
                          </span>
                          <p className="font-bold text-white text-sm">{order.customerName}</p>
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="text-amber-400 font-mono flex items-center gap-1 mt-1 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{order.customerPhone}</span>
                          </a>
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                              Delivery Destination
                            </span>
                            {order.orderType === 'delivery' && (
                              <button
                                type="button"
                                onClick={() => setSelectedMapOrder(order)}
                                className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
                                title="Open Interactive Google Maps Route"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Rider Map</span>
                              </button>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{order.deliveryAddress}</p>
                            <p className="text-neutral-400 text-[11px] mt-0.5">{order.area}</p>
                            {order.customerNotes && (
                              <p className="text-amber-400/90 text-[11px] italic mt-1">
                                Note: "{order.customerNotes}"
                              </p>
                            )}
                          </div>

                          {/* Quick Google Maps Grab & Dispatch Actions for Driver */}
                          {order.orderType === 'delivery' && (() => {
                            const mapsData = generateOrderMapsLinks(order);
                            const isCopied = copiedMapsOrderId === order.id;
                            const waRiderUrl = `https://wa.me/?text=${encodeURIComponent(mapsData.driverWhatsAppText)}`;

                            return (
                              <div className="pt-2 border-t border-neutral-850 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                                  <span className="font-semibold flex items-center gap-1 text-emerald-400">
                                    <MapPin className="w-3 h-3" />
                                    <span>Google Maps for Driver</span>
                                  </span>
                                  <span className="text-neutral-500 font-mono text-[9px]">Turn-by-turn</span>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* 1-Click Copy Link Button for Driver */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(mapsData.navUrl);
                                      setCopiedMapsOrderId(order.id);
                                      setTimeout(() => setCopiedMapsOrderId(null), 2500);
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                      isCopied
                                        ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                                        : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-200 border border-neutral-750'
                                    }`}
                                    title="Grab Google Maps link so driver can open GPS route instantly"
                                  >
                                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 text-amber-400" />}
                                    <span>{isCopied ? 'Link Copied!' : 'Copy Link for Driver'}</span>
                                  </button>

                                  {/* Open in Google Maps directly */}
                                  <a
                                    href={mapsData.navUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-neutral-200 border border-neutral-750 text-[10px] font-bold flex items-center gap-1 hover:text-white transition-all"
                                    title="Open route directly in Google Maps application"
                                  >
                                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                                    <span>Open Maps</span>
                                  </a>

                                  {/* WhatsApp Dispatch Packet to Driver */}
                                  <a
                                    href={waRiderUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                                    title="Send full order details & Maps link to Rider via WhatsApp"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850">
                          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                            Payment Details
                          </span>
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-400">Total:</span>
                            <span className="font-mono text-base font-bold text-white tabular-nums">
                              Rs. {order.total.toLocaleString()}
                            </span>
                          </div>
                          {order.payment.transactionId && (
                            <p className="text-neutral-400 text-[11px] font-mono mt-1">
                              TID: <span className="text-amber-400">{order.payment.transactionId}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Items breakdown */}
                      <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-850 text-xs">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                          Ordered Items ({order.items.length})
                        </span>
                        <div className="space-y-1.5 divide-y divide-neutral-900">
                          {order.items.map((it) => (
                            <div key={it.id} className="pt-1.5 flex items-start justify-between">
                              <div>
                                <span className="font-bold text-white">
                                  {it.quantity}x {it.name}
                                </span>
                                {it.selectedVariant && (
                                  <span className="text-neutral-400 ml-1.5">({it.selectedVariant})</span>
                                )}
                                {it.selectedSpiciness && (
                                  <span className="text-red-400 ml-1.5">· {it.selectedSpiciness}</span>
                                )}
                                {it.selectedAddons.length > 0 && (
                                  <span className="text-neutral-400 block text-[11px]">
                                    + {it.selectedAddons.map((a) => a.name).join(', ')}
                                  </span>
                                )}
                                {it.specialInstructions && (
                                  <span className="text-amber-500/80 block text-[11px] italic">
                                    "{it.specialInstructions}"
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-white tabular-nums">
                                Rs. {it.itemTotal.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Decline Reason Banner if cancelled */}
                      {order.status === 'cancelled' && (
                        <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2">
                          <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-red-300">Order Declined / Cancelled:</span>
                            <p className="mt-0.5 text-red-200/90">{order.declineReason || 'Declined by store manager'}</p>
                          </div>
                        </div>
                      )}

                      {/* Customer Cancellation Request Ticket Banner if customer requested decline */}
                      {(() => {
                        const declineTicket = tickets.find(
                          (t) => t.orderId === order.id && t.issueType === 'order_decline_request' && t.status !== 'resolved'
                        );
                        if (!declineTicket || order.status === 'cancelled') return null;
                        return (
                          <div className="p-3.5 rounded-xl bg-red-950/80 border-2 border-red-500 text-xs text-white space-y-2 animate-pulse">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-red-300 flex items-center gap-1.5 uppercase tracking-wide">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                Customer Requested Order Decline (Ticket #{declineTicket.id})
                              </span>
                              <span className="bg-red-500 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                                ACTION REQUIRED
                              </span>
                            </div>
                            <p className="text-neutral-200">
                              Customer Reason: <strong className="text-amber-300">"{declineTicket.message}"</strong>
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleApproveDeclineTicket(declineTicket)}
                                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Approve Decline &amp; Cancel</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectDeclineTicket(declineTicket)}
                                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                <span>Reject Request (Keep Order)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('tickets');
                                  setTicketFilter('all');
                                }}
                                className="px-2 py-1 text-neutral-400 hover:text-white text-xs underline cursor-pointer"
                              >
                                View Full Ticket
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Timer Bar & Action status advance pipeline */}
                      <div className="pt-2 border-t border-neutral-800 space-y-3">
                        {/* Timer Adjust Controls (Staff/Manager) */}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 text-xs">
                            <div className="flex items-center gap-2">
                              <Timer className="w-4 h-4 text-amber-400" />
                              <span className="text-neutral-400">Order Timer:</span>
                              <span className="font-mono font-bold text-white bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md">
                                {order.estimatedMinutes || 20}m ETA
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  StorageService.adjustOrderTimer(order.id, (order.estimatedMinutes || 20) + 5, 'Rush buffer (+5m)');
                                  onRefreshData();
                                }}
                                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-neutral-300 hover:text-white rounded-md text-[11px] font-semibold"
                                title="Add 5 minutes"
                              >
                                +5m
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  StorageService.adjustOrderTimer(order.id, (order.estimatedMinutes || 20) + 10, 'Grill peak volume (+10m)');
                                  onRefreshData();
                                }}
                                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-neutral-300 hover:text-white rounded-md text-[11px] font-semibold"
                                title="Add 10 minutes"
                              >
                                +10m
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  StorageService.adjustOrderTimer(order.id, Math.max(1, (order.estimatedMinutes || 20) - 5), 'Preparation expedited (-5m)');
                                  onRefreshData();
                                }}
                                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-neutral-300 hover:text-white rounded-md text-[11px] font-semibold"
                                title="Subtract 5 minutes"
                              >
                                -5m
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTimerModalOrder(order);
                                  setTimerMinutesInput(order.estimatedMinutes || 25);
                                  setTimerReasonInput('Grilling fresh patties & packing sides');
                                }}
                                className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-md text-[11px] font-semibold"
                              >
                                Custom Timer
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-400">Current Status:</span>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wide ${
                              order.status === 'cancelled'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-neutral-800 text-amber-400'
                            }`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>

                        {order.status === 'cancelled' && (
                          <div className="w-full mt-2 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-start gap-2.5">
                            <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="font-bold text-red-300">Declined by Store: </span>
                              <span className="text-white font-medium">
                                {order.declineReason || 'Order was cancelled'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'received')}
                              className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-[11px] font-semibold border border-neutral-700 transition-colors"
                              title="Reopen order into received queue"
                            >
                              Re-Open
                            </button>
                          </div>
                        )}

                          {/* Quick Status Buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            {order.status === 'received' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors"
                              >
                                Confirm Order
                              </button>
                            )}

                            {(order.status === 'received' || order.status === 'confirmed') && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors"
                              >
                                Start Grilling (Kitchen)
                              </button>
                            )}

                            {order.status === 'preparing' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'on_the_way')}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                <Bike className="w-3.5 h-3.5" />
                                <span>Dispatch Rider</span>
                              </button>
                            )}

                            {order.status === 'on_the_way' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Delivered</span>
                              </button>
                            )}

                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                              <button
                                onClick={() => {
                                  setDeclineModalOrder(order);
                                  setDeclinePresetReason('Out of 10 km delivery radius from North Nazimabad Block-I');
                                  setDeclineCustomReason('');
                                }}
                                className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Decline Order</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {orders.length === 0 && (
                <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-neutral-800">
                  <ShoppingBag className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-white">No orders found</p>
                  <p className="text-xs text-neutral-500">Orders placed by customers will appear here in real-time.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: ALL-TIME ORDER HISTORY & ARCHIVE ================= */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  <span>All-Time Order History &amp; Records</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Complete store archive: inspect all past deliveries, track decline reasons, and filter by customer, date, or channel.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 font-semibold">
                  {orders.length} Historical Records
                </span>

                {orders.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDownloadOrdersCSV('all')}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer active:scale-98"
                      title="Download full order history as CSV for Excel / Google Sheets reporting"
                    >
                      <Download className="w-3.5 h-3.5 text-neutral-950" />
                      <span>Download CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsClearHistoryModalOpen(true);
                        setClearHistoryConfirmText('');
                        setClearHistoryMode('finished');
                      }}
                      className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Delete and purge order history records"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Delete History</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {csvToast && (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{csvToast}</span>
              </div>
            )}

            {clearHistoryToast && (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{clearHistoryToast}</span>
              </div>
            )}

            {/* D3 Sales Performance Overview Card */}
            <SalesPerformanceOverview orders={orders} />

            {/* Lifetime KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 font-medium uppercase">All-Time Orders</span>
                <p className="text-xl font-bold font-mono text-white mt-1">{orders.length}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Total records stored</p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 font-medium uppercase">Delivered Orders</span>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {orders.filter((o) => o.status === 'delivered').length}
                </p>
                <p className="text-[10px] text-emerald-500/80 mt-0.5">Completed successfully</p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 font-medium uppercase">Declined / Cancelled</span>
                <p className="text-xl font-bold font-mono text-red-400 mt-1">
                  {orders.filter((o) => o.status === 'cancelled').length}
                </p>
                <p className="text-[10px] text-red-400/80 mt-0.5">With recorded reasons</p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 font-medium uppercase">Gross Realized Volume</span>
                <p className="text-xl font-bold font-mono text-amber-400 mt-1">
                  Rs. {orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Non-cancelled total</p>
              </div>
            </div>

            {/* Search Bar & Multi-Filter Controls */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search history by Order #, customer name, phone, address, item name, or decline reason..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Order Status
                  </label>
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="all">All Statuses ({orders.length})</option>
                    <option value="delivered">Delivered ({orders.filter(o => o.status === 'delivered').length})</option>
                    <option value="cancelled">Declined / Cancelled ({orders.filter(o => o.status === 'cancelled').length})</option>
                    <option value="received">Received ({orders.filter(o => o.status === 'received').length})</option>
                    <option value="confirmed">Confirmed ({orders.filter(o => o.status === 'confirmed').length})</option>
                    <option value="preparing">Preparing ({orders.filter(o => o.status === 'preparing').length})</option>
                    <option value="on_the_way">On the Way ({orders.filter(o => o.status === 'on_the_way').length})</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Date Range
                  </label>
                  <select
                    value={historyTimeRange}
                    onChange={(e) => setHistoryTimeRange(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={historyPaymentFilter}
                    onChange={(e) => setHistoryPaymentFilter(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="all">All Payment Channels</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="cod">Cash on Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    Fulfillment Type
                  </label>
                  <select
                    value={historyTypeFilter}
                    onChange={(e) => setHistoryTypeFilter(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Pickup</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filtered History Orders Status & Quick Export Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
              <span className="text-neutral-400">
                Showing <strong className="text-white font-mono">{historyFilteredOrders.length}</strong> of{' '}
                <span className="font-mono text-neutral-300">{orders.length}</span> historical orders
              </span>

              {historyFilteredOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownloadOrdersCSV('filtered')}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
                  title="Export currently filtered orders view to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export Filtered ({historyFilteredOrders.length}) to CSV</span>
                </button>
              )}
            </div>

            {/* Filtered History Orders Cards */}
            <div className="space-y-3">
              {historyFilteredOrders.map((order) => {
                  const isDeclined = order.status === 'cancelled';
                  const isDelivered = order.status === 'delivered';
                  const isRefunded = order.status === 'refunded';

                  return (
                    <div
                      key={order.id}
                      className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all text-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-neutral-800">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-amber-400 text-sm">{order.id}</span>
                          <span className="text-neutral-500">·</span>
                          <span className="text-neutral-400 font-mono">
                            {new Date(order.createdAt).toLocaleDateString([], {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            {new Date(order.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-neutral-500">·</span>
                          <span className="capitalize text-neutral-300 font-medium">{order.orderType}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                              isDelivered
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : isDeclined
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                : isRefunded
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>

                          {order.orderType === 'delivery' && (
                            <button
                              type="button"
                              onClick={() => setSelectedMapOrder(order)}
                              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="View Google Maps Delivery Route"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>Rider Map</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setInspectHistoryOrder(order)}
                            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Inspect Order</span>
                          </button>

                          {!isDeclined && !isRefunded && (
                            <button
                              type="button"
                              onClick={() => handleOpenRefundModal(order)}
                              className="px-2.5 py-1 bg-purple-950/70 hover:bg-purple-900 border border-purple-800 text-purple-300 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              title="Issue Customer Refund or Return"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Refund / Return</span>
                            </button>
                          )}

                          {!isDeclined && order.status !== 'delivered' && !isRefunded && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeclineModalOrder(order);
                                setDeclinePresetReason('Out of 10 km delivery radius from North Nazimabad Block-I');
                                setDeclineCustomReason('');
                              }}
                              className="px-2.5 py-1 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              title="Decline / Cancel this order with reason"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <span className="text-neutral-500 text-[10px] uppercase font-bold block">Customer:</span>
                          <p className="font-bold text-white mt-0.5">{order.customerName}</p>
                          <p className="font-mono text-neutral-400">{order.customerPhone}</p>
                        </div>

                        <div>
                          <span className="text-neutral-500 text-[10px] uppercase font-bold block">Destination &amp; Radius:</span>
                          <p className="text-neutral-200 mt-0.5">{order.area}</p>
                          {order.distanceKm && (
                            <p className="text-amber-400 font-mono text-[11px]">
                              ~{order.distanceKm} km from North Nazimabad Block-I
                            </p>
                          )}
                        </div>

                        <div>
                          <span className="text-neutral-500 text-[10px] uppercase font-bold block">Financials:</span>
                          <p className="font-mono font-bold text-white text-sm mt-0.5">
                            Rs. {order.total.toLocaleString()}
                          </p>
                          <p className="text-neutral-400 uppercase font-mono text-[10px]">
                            {order.payment.method} · {order.payment.verified ? 'Verified' : 'Unverified'}
                          </p>
                        </div>
                      </div>

                      {/* Items Summary line */}
                      <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex flex-wrap items-center justify-between gap-2 text-neutral-300">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{order.items.length} items:</span>
                          <span className="text-neutral-400 truncate max-w-md">
                            {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </span>
                        </div>
                        {order.customerNotes && (
                          <span className="text-amber-400/90 text-[11px] italic">
                            Note: "{order.customerNotes}"
                          </span>
                        )}
                      </div>

                      {/* Proof of Delivery Photo Banner */}
                      {order.deliveryProofPhoto && (
                        <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={order.deliveryProofPhoto}
                              alt="Proof of Delivery"
                              className="w-12 h-12 rounded-lg object-cover border border-purple-500/40 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                              onClick={() => setInspectHistoryOrder(order)}
                            />
                            <div>
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <Camera className="w-3.5 h-3.5" /> Doorstep Proof of Delivery Photo
                              </span>
                              <p className="text-[10px] text-neutral-400">
                                Delivered by {order.deliveredByRider || order.driver?.name || 'Rider'}{order.deliveredAt ? ` at ${new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInspectHistoryOrder(order)}
                            className="text-amber-400 hover:text-amber-300 text-xs font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
                          >
                            Inspect Photo
                          </button>
                        </div>
                      )}

                      {/* Refund Information Banner if refunded */}
                      {isRefunded && order.refundInfo && (
                        <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-200 text-xs flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <RotateCcw className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-purple-300">
                                Refund Processed ({order.refundInfo.refundType.toUpperCase()}): Rs. {order.refundInfo.refundAmount.toLocaleString()} via {order.refundInfo.refundMethod.toUpperCase()}
                              </span>
                              <p className="text-purple-200/90 mt-0.5">Reason: {order.refundInfo.refundReason}</p>
                              {order.refundInfo.notes && (
                                <p className="text-purple-300/70 text-[11px] mt-0.5 italic">"{order.refundInfo.notes}"</p>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-purple-400 font-mono shrink-0">
                            {new Date(order.refundInfo.refundedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}

                      {/* Decline Reason Banner if declined */}
                      {isDeclined && order.declineReason && (
                        <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2">
                          <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-red-300">Decline Reason Provided:</span>
                            <p className="text-red-200/90 mt-0.5">{order.declineReason}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {orders.filter((o) => {
                if (historyStatusFilter !== 'all' && o.status !== historyStatusFilter) return false;
                if (historyTypeFilter !== 'all' && o.orderType !== historyTypeFilter) return false;
                if (historyPaymentFilter !== 'all' && o.payment.method !== historyPaymentFilter) return false;
                if (historySearchQuery.trim()) {
                  const q = historySearchQuery.toLowerCase();
                  return (
                    o.id.toLowerCase().includes(q) ||
                    o.customerName.toLowerCase().includes(q) ||
                    o.customerPhone.includes(q) ||
                    o.area.toLowerCase().includes(q)
                  );
                }
                return true;
              }).length === 0 && (
                <div className="p-12 rounded-2xl bg-neutral-900 border border-neutral-800 text-center text-neutral-500">
                  <History className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">No historical orders match the filters</p>
                  <p className="text-xs text-neutral-500 mt-1">Try clearing your search query or reset status filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB: USER DATABASE & CUSTOMER CRM ================= */}
        {activeTab === 'customers' && (
          <UserDatabaseTab
            orders={orders}
            settings={localSettings}
            onRefreshData={onRefreshData}
          />
        )}

        {/* ================= TAB 2: PAYMENT VERIFICATIONS ================= */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">EasyPaisa &amp; JazzCash Verification Queue</h3>
                <p className="text-xs text-neutral-400">
                  Inspect user-uploaded payment screenshots, verify Transaction IDs, and approve orders
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Pending:</span>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {pendingVerificationOrders.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {orders
                .filter((o) => o.payment.method === 'easypaisa' || o.payment.method === 'jazzcash')
                .map((order) => {
                  return (
                    <div
                      key={order.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        order.payment.verified
                          ? 'bg-neutral-900/60 border-neutral-800'
                          : 'bg-neutral-900 border-amber-500/50 shadow-lg shadow-amber-500/5'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-bold text-white">
                              {order.id}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                order.payment.method === 'easypaisa'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {order.payment.method}
                            </span>
                          </div>

                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                              order.payment.verified
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {order.payment.verified ? 'Verified & Approved' : 'Action Required'}
                          </span>
                        </div>

                        {/* Customer & Amount details */}
                        <div className="text-xs space-y-1">
                          <p className="text-neutral-300">
                            Customer: <strong className="text-white">{order.customerName}</strong> ({order.customerPhone})
                          </p>
                          <p className="text-neutral-300">
                            Amount: <strong className="text-amber-400 font-mono text-sm">Rs. {order.total.toLocaleString()}</strong>
                          </p>
                          <p className="text-neutral-300 font-mono">
                            Transaction ID: <span className="text-white font-bold">{order.payment.transactionId || 'None provided'}</span>
                          </p>
                        </div>

                        {/* Screenshot Receipt Preview Thumbnail */}
                        <div className="pt-2">
                          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                            Customer Uploaded Receipt:
                          </label>
                          {order.payment.screenshotUrl ? (
                            <div
                              onClick={() => {
                                setZoomedScreenshotUrl(order.payment.screenshotUrl || null);
                                setZoomedOrder(order);
                              }}
                              className="relative group cursor-pointer aspect-[16/9] w-full rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950"
                            >
                              <img
                                src={order.payment.screenshotUrl}
                                alt="Payment Receipt"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-neutral-950/40 group-hover:bg-neutral-950/20 flex items-center justify-center transition-colors">
                                <span className="bg-neutral-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
                                  <Eye className="w-4 h-4 text-amber-400" />
                                  Click to Inspect Screenshot
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center text-xs text-neutral-500">
                              No screenshot image attached by customer.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Approval Actions */}
                      <div className="pt-4 mt-4 border-t border-neutral-800 flex items-center justify-end gap-2">
                        {!order.payment.verified ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setDeclineModalOrder(order);
                                setDeclinePresetReason('Unable to verify EasyPaisa / JazzCash payment proof');
                                setDeclineCustomReason('The cashier could not match this transaction with the EasyPaisa / JazzCash account statement. Please place an order using Cash on Delivery.');
                              }}
                              className="px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline Order</span>
                            </button>
                            <button
                              onClick={() => handleVerifyPayment(order.id, false)}
                              className="px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors"
                            >
                              Report Invalid
                            </button>
                            <button
                              onClick={() => handleVerifyPayment(order.id, true)}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Verify &amp; Confirm Payment</span>
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Payment Approved</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ================= TAB: CUSTOMER ISSUE TICKETS ================= */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>Customer Support &amp; Order Issue Tickets</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Resolve missing items, delayed riders, and customer complaints with resolution notes
                </p>
              </div>

              {/* Status filter tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(['all', 'open', 'investigating', 'resolved', 'closed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setTicketFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                      ticketFilter === st
                        ? 'bg-amber-500 text-neutral-950 shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {st === 'all' ? `All (${tickets.length})` : `${st} (${tickets.filter((t) => t.status === st).length})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {tickets
                .filter((t) => ticketFilter === 'all' || t.status === ticketFilter)
                .map((ticket) => {
                  const linkedOrder = orders.find((o) => o.id === ticket.orderId);

                  return (
                    <div
                      key={ticket.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        ticket.status === 'open'
                          ? 'bg-neutral-900 border-red-500/40 shadow-lg shadow-red-500/5'
                          : ticket.status === 'investigating'
                          ? 'bg-neutral-900 border-blue-500/40'
                          : 'bg-neutral-900/60 border-neutral-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-base font-bold text-white">{ticket.id}</span>
                          <span className="text-neutral-500 font-mono text-xs">
                            Order <span className="text-amber-400 font-bold">{ticket.orderId}</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ticket.status === 'open'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : ticket.status === 'investigating'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </div>

                        <div className="text-xs text-neutral-400 flex items-center gap-3">
                          <span className="capitalize px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-amber-400 font-medium">
                            {ticket.issueType.replace('_', ' ')}
                          </span>
                          <span className="font-mono text-[11px]">
                            {new Date(ticket.createdAt).toLocaleDateString()} {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Customer Contact & Message */}
                      <div className="py-3.5 space-y-2">
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <span className="text-white font-bold">{ticket.customerName}</span>
                          <span className="text-neutral-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-500" />
                            {ticket.customerPhone}
                          </span>
                          <span className="text-neutral-400 font-mono flex items-center gap-1">
                            <Mail className="w-3 h-3 text-neutral-500" />
                            {ticket.customerEmail}
                          </span>
                          {linkedOrder && (
                            <span className="text-emerald-400 font-mono">
                              Total: Rs. {linkedOrder.total.toLocaleString()} ({linkedOrder.items.length} items)
                            </span>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 space-y-2">
                          <p className="font-semibold text-neutral-400 text-[11px]">Customer Complaint / Note:</p>
                          <p className="whitespace-pre-wrap">{ticket.message}</p>

                          {/* Customer Attachments */}
                          {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="pt-2 border-t border-neutral-900 space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                                Attached Proof / Photos ({ticket.attachments.length}):
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {ticket.attachments.map((att, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      if (att.url.startsWith('data:image')) {
                                        setPreviewAttachmentUrl(att.url);
                                      }
                                    }}
                                    className="cursor-pointer group flex items-center gap-1.5 p-1 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-500 transition-colors"
                                  >
                                    {att.url.startsWith('data:image') ? (
                                      <img src={att.url} alt={att.name} className="w-12 h-12 object-cover rounded" />
                                    ) : (
                                      <span className="text-[11px] text-amber-400 px-2 py-1">{att.name}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Conversation Thread if multi-message */}
                        {ticket.messages && ticket.messages.length > 1 && (
                          <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs space-y-2">
                            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Conversation Thread ({ticket.messages.length} messages)</span>
                            </span>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {ticket.messages.map((m) => (
                                <div
                                  key={m.id}
                                  className={`p-2 rounded-xl text-xs ${
                                    m.sender === 'customer'
                                      ? 'bg-neutral-900 border border-neutral-800 text-neutral-200'
                                      : 'bg-amber-500/10 border border-amber-500/20 text-neutral-100'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                                    <span className="font-semibold text-white">
                                      {m.sender === 'customer' ? `Customer (${m.senderName})` : `Staff/Manager (${m.senderName})`}
                                    </span>
                                    <span className="font-mono">
                                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p>{m.message}</p>
                                  {m.attachments && m.attachments.length > 0 && (
                                    <div className="flex gap-1.5 mt-1">
                                      {m.attachments.map((a, i) => (
                                        <img
                                          key={i}
                                          src={a.url}
                                          alt={a.name}
                                          onClick={() => setPreviewAttachmentUrl(a.url)}
                                          className="w-8 h-8 rounded object-cover cursor-pointer hover:opacity-80"
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {ticket.adminReply && (!ticket.messages || ticket.messages.length <= 1) && (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                            <p className="font-semibold text-[11px] flex items-center gap-1.5 mb-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Manager Resolution Note:</span>
                            </p>
                            <p className="text-neutral-200">{ticket.adminReply}</p>
                          </div>
                        )}

                        {/* Special One-Click Resolution for Order Decline Requests */}
                        {ticket.issueType === 'order_decline_request' && ticket.status !== 'resolved' && (
                          <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-700/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-red-300 text-xs flex items-center gap-1.5">
                                <AlertOctagon className="w-4 h-4 text-red-400" />
                                Customer Cancellation Request for Order #{ticket.orderId}
                              </span>
                              {linkedOrder && (
                                <span className="text-[11px] font-mono text-neutral-300">
                                  Order Status: <strong className="text-amber-400 uppercase">{linkedOrder.status.replace('_', ' ')}</strong> · Rs. {linkedOrder.total.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-200">
                              Customer's Reason: <span className="text-white font-semibold">"{ticket.message}"</span>
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleApproveDeclineTicket(ticket)}
                                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Approve Decline &amp; Cancel Order #{ticket.orderId}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectDeclineTicket(ticket)}
                                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white font-semibold text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5 text-amber-400" />
                                <span>Reject Request (Food Already Cooking)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ticket Action Controls */}
                      <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {ticket.status !== 'investigating' && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticket.id, 'investigating')}
                              className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Mark Investigating
                            </button>
                          )}

                          {replyTicketId === ticket.id ? (
                            <button
                              onClick={() => setReplyTicketId(null)}
                              className="px-3 py-1.5 text-neutral-400 hover:text-white text-xs"
                            >
                              Cancel Reply
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setReplyTicketId(ticket.id);
                                setReplyText(ticket.adminReply || '');
                              }}
                              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <MessageSquare className="w-3 h-3 text-amber-400" />
                              <span>{ticket.adminReply ? 'Reply / Chat' : 'Add Reply'}</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {ticket.status !== 'resolved' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticket.id, 'resolved', replyText || ticket.adminReply || 'Resolved with customer.')}
                              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Resolve</span>
                            </button>
                          )}

                          {ticket.status !== 'closed' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticket.id, 'closed', replyText || ticket.adminReply || 'Closed by staff.')}
                              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <Lock className="w-3 h-3 text-neutral-400" />
                              <span>Close Ticket</span>
                            </button>
                          )}

                          {ticket.status === 'closed' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticket.id, 'open', 'Reopened by manager')}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              title="Reopen closed ticket so customer can view and track updates again"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Re-open Ticket (Manager Action)</span>
                            </button>
                          )}

                          {ticket.status === 'resolved' && (
                            <button
                              onClick={() => handleUpdateTicketStatus(ticket.id, 'open')}
                              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Re-open</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Resolution Input Drawer */}
                      {replyTicketId === ticket.id && (
                        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-neutral-300">
                              Send Response to Customer:
                            </label>
                            <span className="text-[11px] text-neutral-400">Customer can view &amp; reply back in their ticket bar</span>
                          </div>

                          {/* Quick presets */}
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              'Replacement item freshly dispatched with rider.',
                              'Apologies! Free Lotus Shake voucher added to your account.',
                              'Contacted customer via WhatsApp and issue resolved.',
                              'Payment verified and confirmed with accounting.',
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setReplyText(preset)}
                                className="text-[10px] bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-md px-2 py-0.5"
                              >
                                + {preset.slice(0, 35)}...
                              </button>
                            ))}
                          </div>

                          <textarea
                            rows={2}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type resolution reply note to customer..."
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                if (!replyText.trim()) return;
                                StorageService.addTicketMessage(ticket.id, {
                                  sender: 'manager',
                                  senderName: 'Support Manager',
                                  message: replyText.trim(),
                                });
                                setTickets(StorageService.getTickets());
                                setReplyTicketId(null);
                                setReplyText('');
                              }}
                              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-lg"
                            >
                              Send Message (Keep Current Status)
                            </button>
                            <button
                              onClick={() => handleUpdateTicketStatus(ticket.id, 'resolved', replyText.trim())}
                              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg"
                            >
                              Send &amp; Mark Resolved
                            </button>
                            <button
                              onClick={() => handleUpdateTicketStatus(ticket.id, 'closed', replyText.trim())}
                              className="px-3.5 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-xs rounded-lg"
                            >
                              Send &amp; Close Ticket
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {tickets.filter((t) => ticketFilter === 'all' || t.status === ticketFilter).length === 0 && (
                <div className="text-center py-16 bg-neutral-900 rounded-2xl border border-neutral-800">
                  <Ticket className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-white">No tickets in this filter</p>
                  <p className="text-xs text-neutral-500">Customer complaints and issue reports will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Header toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Manage Categories &amp; Items</span>
                <span className="text-xs text-neutral-500">·</span>
                <span className="text-xs text-neutral-400">{menuItems.length} Total Items</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={quickPhotoInputRef}
                  accept="image/*"
                  onChange={handleQuickPhotoChange}
                  className="hidden"
                />

                <button
                  onClick={() => setIsAddingCat(true)}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Category</span>
                </button>

                <button
                  onClick={() => {
                    setEditingItem(null);
                    setIsItemModalOpen(true);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Menu Item</span>
                </button>
              </div>
            </div>

            {/* Inline Add Category Bar */}
            {isAddingCat && (
              <div className="p-4 rounded-xl bg-neutral-900 border border-amber-500/40 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="New Category Name (e.g. Gourmet Sauces, Sliders, Desserts)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-amber-500 text-neutral-950 text-xs font-bold rounded-lg"
                >
                  Save Category
                </button>
                <button
                  onClick={() => setIsAddingCat(false)}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Category selection & Reordering */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Categories ({categories.length})
                </span>
                <span className="text-[11px] text-neutral-500">
                  Click to filter · Arrow to reorder · Trash to delete
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* All Items Filter Chip */}
                <button
                  type="button"
                  onClick={() => setSelectedCatId('all')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    selectedCatId === 'all'
                      ? 'border-amber-500 bg-amber-500 text-neutral-950 font-bold shadow-md'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
                  }`}
                >
                  All Items ({menuItems.length})
                </button>

                {categories
                  .sort((a, b) => a.order - b.order)
                  .map((cat, idx) => (
                    <div
                      key={cat.id}
                      className={`flex items-center gap-1 p-1 rounded-lg border transition-all ${
                        selectedCatId === cat.id
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-neutral-800 bg-neutral-900'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCatId(cat.id)}
                        className={`px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          selectedCatId === cat.id ? 'text-amber-400 font-bold' : 'text-neutral-300'
                        }`}
                      >
                        {cat.name}
                      </button>

                      {/* Move Category Up / Down buttons */}
                      <button
                        type="button"
                        onClick={() => handleReorderCategory(cat.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400 disabled:opacity-30 cursor-pointer"
                        title="Move Category Left/Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorderCategory(cat.id, 'down')}
                        disabled={idx === categories.length - 1}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-400 disabled:opacity-30 cursor-pointer"
                        title="Move Category Right/Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>

                      {/* Delete Category Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCatToDelete(cat);
                        }}
                        className="p-1 rounded hover:bg-red-950/80 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                        title={`Delete Category "${cat.name}"`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Items List in Selected Category */}
            <div className="space-y-3">
              {menuItems
                .filter((item) => selectedCatId === 'all' || item.categoryId === selectedCatId)
                .sort((a, b) => a.order - b.order)
                .map((item, idx, arr) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                  >
                    {/* Left: Image & Details */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative group w-14 h-14 rounded-xl bg-neutral-950 overflow-hidden border border-neutral-800 shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setQuickPhotoTargetId(item.id);
                            quickPhotoInputRef.current?.click();
                          }}
                          className="absolute inset-0 bg-neutral-950/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-amber-400 text-[9px] font-bold transition-opacity"
                          title="Click to upload replacement photo"
                        >
                          <Camera className="w-4 h-4 mb-0.5" />
                          <span>Photo</span>
                        </button>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                          {item.isBestseller && (
                            <span className="text-[10px] text-amber-400 font-bold">★ Bestseller</span>
                          )}
                          {item.isSpicy && (
                            <span className="text-[10px] text-red-400 font-bold">🌶 Spicy</span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 truncate max-w-md mt-0.5">
                          {item.description}
                        </p>
                        <span className="font-mono text-xs font-bold text-amber-400 mt-1 block tabular-nums">
                          Rs. {item.price.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Right: Controls (Reorder, In-Stock Switch, Edit, Delete) */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {/* Reorder Arrows */}
                      <div className="flex items-center bg-neutral-950 rounded-lg border border-neutral-800 p-0.5">
                        <button
                          onClick={() => handleReorderItem(item.id, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30"
                          title="Move Item Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleReorderItem(item.id, 'down')}
                          disabled={idx === arr.length - 1}
                          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30"
                          title="Move Item Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Stock Toggle */}
                      <button
                        onClick={() => handleToggleItemStock(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          item.isAvailable
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                      </button>

                      {/* Upload Photo Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setQuickPhotoTargetId(item.id);
                          quickPhotoInputRef.current?.click();
                        }}
                        className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 transition-colors"
                        title="Upload replacement photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsItemModalOpen(true);
                        }}
                        className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button (Safe, iframe-compatible confirmation) */}
                      <button
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        className="p-2 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================= TAB: EXECUTIVE VISUAL REPORTS (RECHARTS) ================= */}
        {activeTab === 'reports' && (
          <ExecutiveReportsTab
            orders={orders}
            menuItems={menuItems}
            categories={categories}
          />
        )}

        {/* ================= TAB 4: SALES ANALYTICS ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Timeframe toolbar */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-900 border border-neutral-800">
              <div>
                <h3 className="text-sm font-bold text-white">Sales &amp; Business Performance</h3>
                <p className="text-xs text-neutral-400">
                  Track sales volume, revenue in PKR, payment methods, and popular items
                </p>
              </div>

              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                {(['today', '7d', '30d', 'all'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setAnalyticsRange(r)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      analyticsRange === r
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'All Time'}
                  </button>
                ))}
              </div>
            </div>

            {/* D3 Sales Performance Overview */}
            <SalesPerformanceOverview orders={orders} />

            {/* 6 Financial & Volume Metric Cards linking POS, Online & Dish Production */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {/* Card 1: Gross Combined Revenue */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                  Gross Combined Revenue
                </span>
                <p className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                  Rs. {totalRevenue.toLocaleString()}
                </p>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 pt-1 truncate">
                  <TrendingUp className="w-3 h-3 shrink-0" />
                  <span>Realized (POS + Online)</span>
                </p>
              </div>

              {/* Card 2: Net Kitchen Food Sales (Excludes Delivery Fees) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-neutral-900 border border-amber-500/40 space-y-1">
                <span className="text-[11px] text-amber-300 uppercase font-semibold flex items-center gap-1">
                  <UtensilsCrossed className="w-3 h-3 text-amber-400" />
                  <span>Net Food Revenue</span>
                </span>
                <p className="text-xl sm:text-2xl font-mono font-bold text-amber-300 tabular-nums">
                  Rs. {netFoodRevenue.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 pt-1">
                  Food sales (excl. delivery fees)
                </p>
              </div>

              {/* Card 3: Rider Revenue & Delivery Fees Pool */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-neutral-900 border border-cyan-500/40 space-y-1">
                <span className="text-[11px] text-cyan-300 uppercase font-semibold flex items-center gap-1">
                  <Bike className="w-3 h-3 text-cyan-400" />
                  <span>Rider Revenue Pool</span>
                </span>
                <p className="text-xl sm:text-2xl font-mono font-bold text-cyan-300 tabular-nums">
                  Rs. {totalDeliveryCharges.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 pt-1">
                  {deliveryOrders.length} trips • Delivery charges
                </p>
              </div>

              {/* Card 4: Total Orders Count Breakdown */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                  Total Orders
                </span>
                <p className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                  {totalOrdersCount}
                </p>
                <p className="text-[10px] text-neutral-400 pt-1 truncate">
                  {posOrders.length} POS · {validOrders.filter((o) => o.orderType === 'delivery').length} Deliv · {validOrders.filter((o) => o.orderType === 'pickup').length} Pick
                </p>
              </div>

              {/* Card 5: Average Order Value */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-neutral-400 uppercase font-semibold block">
                  Avg Order Value (AOV)
                </span>
                <p className="text-xl sm:text-2xl font-mono font-bold text-amber-400 tabular-nums">
                  Rs. {avgOrderValue.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 pt-1">Per realized order</p>
              </div>

              {/* Card 6: Total Amount of Items Sold */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-amber-500/40 space-y-1 bg-gradient-to-br from-neutral-900 to-amber-950/20">
                <span className="text-[11px] text-amber-300 uppercase font-semibold flex items-center gap-1">
                  <Package className="w-3 h-3 text-amber-400" />
                  <span>Total Items Sold</span>
                </span>
                <p className="text-xl sm:text-2xl font-mono font-bold text-amber-400 tabular-nums">
                  {totalDishUnitsCount} <span className="text-xs font-normal text-neutral-400">units</span>
                </p>
                <p className="text-[10px] text-neutral-400 pt-1 truncate">
                  {extractDeals ? `${totalDirectDishCount} direct · ${totalFromDealsCount} from deals` : `${itemsSoldList.length} unique items sold`}
                </p>
              </div>
            </div>

            {/* Payment Methods & Top Items Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Payment Methods Breakdown */}
              <div className="lg:col-span-5 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Payment Channels Split
                </h4>

                  {/* In-Store POS Cash Register */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-medium flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                        <span>In-Store POS Register (Cash)</span>
                      </span>
                      <span className="font-mono text-blue-400">
                        {totalOrdersCount > 0
                          ? Math.round((posCashOrders.length / totalOrdersCount) * 100)
                          : 0}
                        % ({posCashOrders.length})
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${
                            totalOrdersCount > 0
                              ? (posCashOrders.length / totalOrdersCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* In-Store POS Card */}
                  {posCardOrders.length > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white font-medium flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                          <span>In-Store POS Card / Terminal</span>
                        </span>
                        <span className="font-mono text-indigo-400">
                          {totalOrdersCount > 0
                            ? Math.round((posCardOrders.length / totalOrdersCount) * 100)
                            : 0}
                          % ({posCardOrders.length})
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${
                              totalOrdersCount > 0
                                ? (posCardOrders.length / totalOrdersCount) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-medium">EasyPaisa Transfers</span>
                      <span className="font-mono text-emerald-400">
                        {totalOrdersCount > 0
                          ? Math.round((easyPaisaOrders.length / totalOrdersCount) * 100)
                          : 0}
                        % ({easyPaisaOrders.length})
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${
                            totalOrdersCount > 0
                              ? (easyPaisaOrders.length / totalOrdersCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-medium">Cash on Delivery (Online COD)</span>
                      <span className="font-mono text-amber-400">
                        {totalOrdersCount > 0
                          ? Math.round((codOrders.length / totalOrdersCount) * 100)
                          : 0}
                        % ({codOrders.length})
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${
                            totalOrdersCount > 0
                              ? (codOrders.length / totalOrdersCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-medium">JazzCash Direct</span>
                      <span className="font-mono text-purple-400">
                        {totalOrdersCount > 0
                          ? Math.round((jazzCashOrders.length / totalOrdersCount) * 100)
                          : 0}
                        % ({jazzCashOrders.length})
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${
                            totalOrdersCount > 0
                              ? (jazzCashOrders.length / totalOrdersCount) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 text-xs text-neutral-400">
                  💡 EasyPaisa transfers with uploaded screenshots reduce COD rejection rates by ~94%.
                </div>
              </div>

              {/* Top Selling Items Leaderboard */}
              <div className="lg:col-span-7 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Top Selling Velocity Dishes
                  </h4>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {extractDeals ? 'Deconstructed Mode' : 'Standard View'}
                  </span>
                </div>

                <div className="divide-y divide-neutral-800 text-xs">
                  {topSellingItems.slice(0, 5).map((item, index) => (
                    <div key={item.name} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-amber-400 w-4">
                          #{index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white">{item.name}</p>
                            {item.isDeal && (
                              <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 py-0.2 rounded font-mono font-bold">
                                COMBO
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500">
                            {item.totalQuantity} units sold
                            {item.fromDealsQuantity > 0 && ` (${item.fromDealsQuantity} from deals)`}
                          </p>
                        </div>
                      </div>

                      <span className="font-mono font-bold text-white tabular-nums">
                        Rs. {item.revenue.toLocaleString()}
                      </span>
                    </div>
                  ))}

                  {topSellingItems.length === 0 && (
                    <div className="py-8 text-center text-neutral-500">
                      No sales data in this timeframe.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Complete Dish Volume & Deal Extraction Records */}
            <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
              {/* Toast if exported */}
              {itemSalesCsvToast && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{itemSalesCsvToast}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setItemSalesCsvToast('')}
                    className="text-emerald-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Header + Deal Extraction Switch */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-400" />
                      <span>Items Sold Record &amp; Production Analytics</span>
                    </h4>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                      {filteredItemsSold.length} ITEMS LOGGED
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Complete unit breakdown of every dish, burger, shake, and deal sold with revenue tracking.
                  </p>
                </div>

                {/* The Master Deal Extraction Toggle */}
                <div className="flex items-center gap-3 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 shrink-0">
                  <div className="text-left">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Extract Items from Deals</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                          extractDeals
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {extractDeals ? 'ON (DECONSTRUCTED)' : 'OFF (BUNDLED)'}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400 max-w-xs">
                      {extractDeals
                        ? 'Decomposing combo meals into individual burgers, fries & drinks'
                        : 'Showing combo meals as single packaged deal units'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExtractDeals(!extractDeals)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                      extractDeals ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                    title="Toggle deal deconstruction"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-neutral-950 transition-transform ${
                        extractDeals ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 4 Stat Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    Total Dish Units Sold
                  </span>
                  <p className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                    {totalDishUnitsCount} <span className="text-xs font-normal text-neutral-400">items</span>
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                    {extractDeals ? 'Combined dish production' : 'Direct order count'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    Direct Menu Orders
                  </span>
                  <p className="text-xl font-bold font-mono text-white tabular-nums">
                    {totalDirectDishCount} <span className="text-xs font-normal text-neutral-400">units</span>
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                    Ordered standalone
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    Units Inside Deals
                  </span>
                  <p className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                    {totalFromDealsCount} <span className="text-xs font-normal text-neutral-400">units</span>
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                    {extractDeals ? 'Extracted from combo bundles' : 'Enable toggle to deconstruct'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">
                    Items Gross Turnover
                  </span>
                  <p className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                    Rs. {totalItemsGrossRevenue.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                    Realized dish revenue
                  </p>
                </div>
              </div>

              {/* Search, Filter & CSV Export Toolbar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search dish by name or category..."
                      value={itemAnalyticsSearch}
                      onChange={(e) => setItemAnalyticsSearch(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                    {itemAnalyticsSearch && (
                      <button
                        type="button"
                        onClick={() => setItemAnalyticsSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category Filter */}
                  <select
                    value={itemAnalyticsCategory}
                    onChange={(e) => setItemAnalyticsCategory(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {!extractDeals && <option value="combos">Deals &amp; Combos</option>}
                  </select>

                  {/* Sort Order */}
                  <select
                    value={itemAnalyticsSort}
                    onChange={(e) => setItemAnalyticsSort(e.target.value as any)}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="quantity">Sort: Most Units Sold</option>
                    <option value="revenue">Sort: Highest Gross Revenue</option>
                    <option value="name">Sort: Dish Name (A-Z)</option>
                  </select>

                  {/* CSV Export Button */}
                  <button
                    type="button"
                    onClick={handleDownloadItemsSoldCSV}
                    className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Export items sold record to CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Items Sold Data Table */}
              <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/70 text-neutral-400 font-mono text-[11px] uppercase">
                      <th className="py-3 px-3.5 w-12 text-center">#</th>
                      <th className="py-3 px-3.5">Dish / Menu Item</th>
                      <th className="py-3 px-3.5">Category</th>
                      <th className="py-3 px-3.5">Sold Composition</th>
                      <th className="py-3 px-3.5 text-right font-bold text-neutral-300">Total Units Sold</th>
                      <th className="py-3 px-3.5 text-right font-bold text-neutral-300">Revenue (PKR)</th>
                      <th className="py-3 px-3.5 w-32">Volume Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {filteredItemsSold.map((it, idx) => {
                      const sharePct =
                        totalDishUnitsCount > 0 ? (it.totalQuantity / totalDishUnitsCount) * 100 : 0;
                      return (
                        <tr key={it.id + it.name} className="hover:bg-neutral-900/50 transition-colors">
                          <td className="py-3 px-3.5 text-center font-mono font-bold text-neutral-500">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-mono font-bold ${
                                idx === 0
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : idx === 1
                                  ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30'
                                  : idx === 2
                                  ? 'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                                  : 'text-neutral-500'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-3">
                              {it.image ? (
                                <img
                                  src={it.image}
                                  alt={it.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-neutral-800 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-neutral-850 border border-neutral-800 flex items-center justify-center text-neutral-500 shrink-0">
                                  <UtensilsCrossed className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-white flex items-center gap-2">
                                  <span>{it.name}</span>
                                  {it.isDeal && (
                                    <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                                      COMBO DEAL
                                    </span>
                                  )}
                                  {it.fromDealsQuantity > 0 && (
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                                      EXTRACTED
                                    </span>
                                  )}
                                </div>
                                {it.dealBreakdownNotes && it.dealBreakdownNotes.length > 0 && (
                                  <div className="text-[10px] text-neutral-500 truncate max-w-xs mt-0.5">
                                    Includes {it.dealBreakdownNotes.join(' · ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded font-medium">
                              {it.category}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            {it.fromDealsQuantity > 0 ? (
                              <div className="text-[11px] space-y-0.5">
                                <span className="text-white font-mono font-medium">
                                  {it.directQuantity} direct
                                </span>
                                <span className="text-neutral-500 font-mono"> + </span>
                                <span className="text-emerald-400 font-mono font-bold">
                                  {it.fromDealsQuantity} from deals
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 font-mono text-[11px]">
                                {it.directQuantity} direct orders
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <span className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                              {it.totalQuantity}
                            </span>
                            <span className="text-[10px] text-neutral-500 ml-1">units</span>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-white tabular-nums">
                            Rs. {it.revenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                                <span>{sharePct.toFixed(1)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(3, sharePct))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredItemsSold.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-neutral-500">
                          <Package className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                          <p className="font-bold text-neutral-400">No item sales records found</p>
                          <p className="text-[11px] text-neutral-600 mt-0.5">
                            Try adjusting your search or timeframe filter above.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Informative Footer Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-neutral-800 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {extractDeals
                      ? 'Deconstructed Mode active: Combos are decomposed into their individual kitchen dishes.'
                      : 'Standard Mode active: Combos and individual items are reported as packaged in orders.'}
                  </span>
                </span>
                <span className="font-mono text-neutral-500 text-[11px]">
                  Total {totalDishUnitsCount} dish units across {validOrders.length} orders
                </span>
              </div>
            </div>

            {/* ================= RIDER REVENUE & FLEET DELIVERY SPLIT (DRIVER SETTLEMENT) ================= */}
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Rider Revenue &amp; Delivery Fee Split
                      </h4>
                      <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold px-2 py-0.2 rounded-full">
                        FLEET SETTLEMENT
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Separate store food sales from driver delivery charges. Settle cash in hand vs delivery fees owed per rider.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Timeframe Filter
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                    {analyticsRange === 'today' ? 'Today' : analyticsRange === '7d' ? 'Last 7 Days' : analyticsRange === '30d' ? 'Last 30 Days' : 'All Time'}
                  </span>
                </div>
              </div>

              {/* 4 Summary Capsules for Split */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
                    🍔 Kitchen Food Net Sales
                  </span>
                  <p className="text-lg font-black font-mono text-amber-300 tabular-nums">
                    Rs. {netFoodRevenue.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Store food revenue (excl. delivery)
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-cyan-500/30">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">
                    🛵 Rider Delivery Fees Pool
                  </span>
                  <p className="text-lg font-black font-mono text-cyan-300 tabular-nums">
                    Rs. {totalDeliveryCharges.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    {deliveryOrders.length} trips total delivery charges
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-blue-500/30">
                  <span className="text-[10px] uppercase font-bold text-blue-400 block mb-0.5">
                    💵 COD Cash With Riders
                  </span>
                  <p className="text-lg font-black font-mono text-blue-300 tabular-nums">
                    Rs. {totalCodCashAllRiders.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Physical cash collected by fleet
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-950 border border-emerald-500/30">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                    💰 Net Cash to Collect from Fleet
                  </span>
                  <p className="text-lg font-black font-mono text-emerald-300 tabular-nums">
                    Rs. {totalNetCashAllRiders.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    COD cash minus driver fees
                  </p>
                </div>
              </div>

              {/* Rider Fleet Breakdown Table */}
              <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/70 text-neutral-400 font-mono text-[11px] uppercase">
                      <th className="py-3 px-3.5">Delivery Rider</th>
                      <th className="py-3 px-3.5 text-center">Completed Trips</th>
                      <th className="py-3 px-3.5 text-right text-cyan-300">Rider Delivery Fee Payout</th>
                      <th className="py-3 px-3.5 text-right text-blue-300">COD Cash In Hand</th>
                      <th className="py-3 px-3.5 text-center">Payment Split</th>
                      <th className="py-3 px-3.5 text-center font-bold text-white">Settlement Balance</th>
                      <th className="py-3 px-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {riderSplits.map((split) => {
                      const waText = `🛵 *BITE & GO — DRIVER SETTLEMENT SLIP*
━━━━━━━━━━━━━━━━━━
👤 *Rider:* ${split.rider.name} (${split.rider.vehiclePlate})
📅 *Period:* ${analyticsRange.toUpperCase()}
📦 *Completed Deliveries:* ${split.deliveriesCount} trips
━━━━━━━━━━━━━━━━━━
🛵 *Delivery Fee Earned (Rider Payout):* Rs. ${split.earnedDeliveryFees.toLocaleString()}
💵 *COD Cash Collected (In Hand):* Rs. ${split.totalCodCash.toLocaleString()}
━━━━━━━━━━━━━━━━━━
💰 *NET SETTLEMENT:* ${split.netCashToTurnIn >= 0 ? `Please deposit Rs. ${split.netCashToTurnIn.toLocaleString()} to manager` : `Store owes rider Rs. ${Math.abs(split.netCashToTurnIn).toLocaleString()}`}

_Bite & Go Operations Management_`;

                      const riderWaUrl = split.rider.phone
                        ? `https://wa.me/${split.rider.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waText)}`
                        : `https://wa.me/?text=${encodeURIComponent(waText)}`;

                      return (
                        <tr key={split.rider.id} className="hover:bg-neutral-900/50 transition-colors">
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 font-black text-xs shrink-0">
                                <Bike className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-white block">
                                  {split.rider.name}
                                </span>
                                <span className="text-[11px] text-neutral-400 font-mono">
                                  {split.rider.vehiclePlate} {split.rider.phone ? `· ${split.rider.phone}` : ''}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3.5 text-center font-mono font-bold text-white">
                            <span className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800">
                              {split.deliveriesCount} trips
                            </span>
                          </td>

                          <td className="py-3 px-3.5 text-right font-mono font-bold text-cyan-300 tabular-nums">
                            Rs. {split.earnedDeliveryFees.toLocaleString()}
                          </td>

                          <td className="py-3 px-3.5 text-right font-mono font-bold text-blue-300 tabular-nums">
                            Rs. {split.totalCodCash.toLocaleString()}
                          </td>

                          <td className="py-3 px-3.5 text-center font-mono text-[11px] text-neutral-400">
                            <span>{split.codCount} COD</span>
                            <span className="mx-1">·</span>
                            <span>{split.onlineCount} Online</span>
                          </td>

                          <td className="py-3 px-3.5 text-center">
                            {split.deliveriesCount === 0 ? (
                              <span className="text-[11px] text-neutral-500 font-mono">No trips in period</span>
                            ) : split.netCashToTurnIn > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <span>Collect Rs. {split.netCashToTurnIn.toLocaleString()}</span>
                              </span>
                            ) : split.netCashToTurnIn < 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <span>Pay Rs. {Math.abs(split.netCashToTurnIn).toLocaleString()} to Rider</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-neutral-800 text-neutral-300">
                                <span>Settled (Rs. 0)</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 text-center">
                            <a
                              href={riderWaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/40 text-[11px] font-bold transition-colors shadow-sm"
                              title="Send instant settlement breakdown to rider on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp Slip</span>
                            </a>
                          </td>
                        </tr>
                      );
                    })}

                    {riderSplits.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-neutral-500">
                          <Bike className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                          <p className="font-bold text-neutral-400">No delivery riders registered</p>
                          <p className="text-[11px] text-neutral-600 mt-0.5">
                            Add riders under Store Settings &gt; Delivery Fleet to track their payouts.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: STORE, DELIVERY CALCULATOR & PAYMENT SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white mb-0.5">
                    Manager Storefront &amp; Pricing Controls
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Adjust North Nazimabad 10 km delivery fees, payment toggles, and branch operating hours
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Manager HUD
                </span>
              </div>

              {settingsSavedToast && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All store settings, delivery rates, and payment methods saved successfully!</span>
                </div>
              )}

              {/* Security & System Health Status Card */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      System Security &amp; Fleet Navigation Shield
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    All Shields Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">Password Encryption</span>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      PBKDF2-SHA256 (100k rounds)
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">Google Maps Integration</span>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Live Rider GPS Synced
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">AI Operations Copilot</span>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Gemini Operations Online
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">Brute-Force &amp; XSS Defense</span>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Rate Limiting &amp; CSP Active
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">Session Security</span>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      HMAC Token Verification
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-400 block mb-0.5">AI Operations Copilot</span>
                      <p className="font-bold text-amber-400">Launch Copilot</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(true)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Ask AI
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* 1. Branch Location, Rates & Two-Way Synchronized Calculator Simulator */}
                <DeliveryRatesSettingsSection
                  settings={localSettings}
                  onSave={async (updated) => {
                    setLocalSettings(updated);
                    if (onSaveSettings) await onSaveSettings(updated);
                  }}
                  onRefreshData={onRefreshData}
                />

                {/* 1.5. Delivery Drivers Fleet & Pre-Selected Riders Management */}
                <DeliveryRidersManagementSection
                  settings={localSettings}
                  onSave={async (updated) => {
                    setLocalSettings(updated);
                    if (onSaveSettings) await onSaveSettings(updated);
                  }}
                  onRefreshData={onRefreshData}
                />

                {/* 2. Payment Methods Adjustment Area (Manager Toggles) */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      Payment Methods Configuration &amp; Toggles
                    </h4>
                    <span className="text-[11px] text-neutral-400">
                      Enable or disable payment options on storefront
                    </span>
                  </div>

                  {/* EasyPaisa Card */}
                  <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                          EP
                        </div>
                        <span className="text-xs font-bold text-white">EasyPaisa Direct Transfer</span>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={localSettings.paymentMethodsConfig?.easypaisaEnabled ?? true}
                          onChange={(e) => {
                            const cfg = localSettings.paymentMethodsConfig || {
                              easypaisaEnabled: true,
                              jazzcashEnabled: true,
                              codEnabled: true,
                              easypaisaAccountTitle: localSettings.easyPaisaAccountTitle,
                              easypaisaAccountNumber: localSettings.easyPaisaAccountNumber,
                              jazzcashAccountTitle: localSettings.jazzCashAccountTitle,
                              jazzcashAccountNumber: localSettings.jazzCashAccountNumber,
                            };
                            setLocalSettings({
                              ...localSettings,
                              paymentMethodsConfig: { ...cfg, easypaisaEnabled: e.target.checked },
                            });
                          }}
                          className="rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className={(localSettings.paymentMethodsConfig?.easypaisaEnabled ?? true) ? 'text-emerald-400' : 'text-neutral-500'}>
                          {(localSettings.paymentMethodsConfig?.easypaisaEnabled ?? true) ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-neutral-300 block mb-1">EasyPaisa Account Title</label>
                        <input
                          type="text"
                          value={localSettings.easyPaisaAccountTitle}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalSettings({
                              ...localSettings,
                              easyPaisaAccountTitle: val,
                              paymentMethodsConfig: {
                                ...(localSettings.paymentMethodsConfig as any),
                                easypaisaAccountTitle: val,
                              },
                            });
                          }}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-300 block mb-1">EasyPaisa Account Number</label>
                        <input
                          type="text"
                          value={localSettings.easyPaisaAccountNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalSettings({
                              ...localSettings,
                              easyPaisaAccountNumber: val,
                              paymentMethodsConfig: {
                                ...(localSettings.paymentMethodsConfig as any),
                                easypaisaAccountNumber: val,
                              },
                            });
                          }}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* JazzCash Card */}
                  <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                          JC
                        </div>
                        <span className="text-xs font-bold text-white">JazzCash Direct Transfer</span>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={localSettings.paymentMethodsConfig?.jazzcashEnabled ?? true}
                          onChange={(e) => {
                            const cfg = localSettings.paymentMethodsConfig || {
                              easypaisaEnabled: true,
                              jazzcashEnabled: true,
                              codEnabled: true,
                              easypaisaAccountTitle: localSettings.easyPaisaAccountTitle,
                              easypaisaAccountNumber: localSettings.easyPaisaAccountNumber,
                              jazzcashAccountTitle: localSettings.jazzCashAccountTitle,
                              jazzcashAccountNumber: localSettings.jazzCashAccountNumber,
                            };
                            setLocalSettings({
                              ...localSettings,
                              paymentMethodsConfig: { ...cfg, jazzcashEnabled: e.target.checked },
                            });
                          }}
                          className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                        />
                        <span className={(localSettings.paymentMethodsConfig?.jazzcashEnabled ?? true) ? 'text-amber-400' : 'text-neutral-500'}>
                          {(localSettings.paymentMethodsConfig?.jazzcashEnabled ?? true) ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-neutral-300 block mb-1">JazzCash Account Title</label>
                        <input
                          type="text"
                          value={localSettings.jazzCashAccountTitle}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalSettings({
                              ...localSettings,
                              jazzCashAccountTitle: val,
                              paymentMethodsConfig: {
                                ...(localSettings.paymentMethodsConfig as any),
                                jazzcashAccountTitle: val,
                              },
                            });
                          }}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-neutral-300 block mb-1">JazzCash Account Number</label>
                        <input
                          type="text"
                          value={localSettings.jazzCashAccountNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalSettings({
                              ...localSettings,
                              jazzCashAccountNumber: val,
                              paymentMethodsConfig: {
                                ...(localSettings.paymentMethodsConfig as any),
                                jazzcashAccountNumber: val,
                              },
                            });
                          }}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cash On Delivery (COD) Card */}
                  <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Banknote className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-white">Cash On Delivery (COD)</span>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={localSettings.paymentMethodsConfig?.codEnabled ?? true}
                          onChange={(e) => {
                            const cfg = localSettings.paymentMethodsConfig || {
                              easypaisaEnabled: true,
                              jazzcashEnabled: true,
                              codEnabled: true,
                              easypaisaAccountTitle: localSettings.easyPaisaAccountTitle,
                              easypaisaAccountNumber: localSettings.easyPaisaAccountNumber,
                              jazzcashAccountTitle: localSettings.jazzCashAccountTitle,
                              jazzcashAccountNumber: localSettings.jazzCashAccountNumber,
                            };
                            setLocalSettings({
                              ...localSettings,
                              paymentMethodsConfig: { ...cfg, codEnabled: e.target.checked },
                            });
                          }}
                          className="rounded border-neutral-700 text-blue-500 focus:ring-blue-500"
                        />
                        <span className={(localSettings.paymentMethodsConfig?.codEnabled ?? true) ? 'text-blue-400' : 'text-neutral-500'}>
                          {(localSettings.paymentMethodsConfig?.codEnabled ?? true) ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    <div className="text-xs">
                      <label className="text-neutral-300 block mb-1">COD Customer Note &amp; Instructions</label>
                      <input
                        type="text"
                        value={localSettings.paymentMethodsConfig?.codNotes || 'Cash on delivery accepted up to Rs. 5,000 within 10 km radius.'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalSettings({
                            ...localSettings,
                            paymentMethodsConfig: {
                              ...(localSettings.paymentMethodsConfig as any),
                              codNotes: val,
                            },
                          });
                        }}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Operating hours */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <label className="text-xs text-white block font-bold">
                      Store Work Hours &amp; Everyday Schedule
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      Order Protection Enabled
                    </span>
                  </div>
                  <DailyOperatingHoursEditor
                    settings={localSettings}
                    onChange={async (patch) => {
                      const updated = { ...localSettings, ...patch };
                      setLocalSettings(updated);
                      await StorageService.saveSettings(updated);
                      if (onSaveSettings) await onSaveSettings(updated);
                      try {
                        await ApiService.updateSettings(updated);
                      } catch {}
                      onRefreshData();
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save All Store, Delivery &amp; Payment Settings</span>
                </button>
              </form>
            </div>

            {/* Backend Master Security & Password */}
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Backend Security &amp; Master Password</h3>
                  <p className="text-xs text-neutral-400">
                    Protected with HMAC SHA-256 tokens and brute-force IP rate limiting
                  </p>
                </div>
              </div>

              {passwordToast && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{passwordToast}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangeMasterPassword} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1">Target Account</label>
                    <select
                      value={targetAccount}
                      onChange={(e) => setTargetAccount(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="admin@biteandgo.pk">Admin (admin@biteandgo.pk)</option>
                      <option value="kitchen@biteandgo.pk">Kitchen Station (kitchen@biteandgo.pk)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1">
                      New Strong Password
                    </label>
                    <input
                      type="password"
                      placeholder="Min 6 characters..."
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-500">
                    PBKDF2 100k rounds + Salted Hash
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Update Password</span>
                  </button>
                </div>
              </form>

              {/* Master 2FA PIN and Gate Passcode */}
              <div className="pt-4 border-t border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  2FA Master PIN &amp; Stealth Gateway
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1">Admin 2FA Master PIN</label>
                    <input
                      type="text"
                      value={localSettings.admin2FaPin || ''}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, admin2FaPin: e.target.value })
                      }
                      placeholder="849201"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1">Stealth Gate Passcode</label>
                    <input
                      type="text"
                      value={localSettings.staffGatePasscode || ''}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, staffGatePasscode: e.target.value })
                      }
                      placeholder="biteandgo2026"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Audit Logs */}
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Live Security Audit Log</h3>
                </div>
                <button
                  type="button"
                  onClick={loadAuditLogs}
                  className="px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl bg-neutral-950 border border-neutral-850 divide-y divide-neutral-900 text-[11px] font-mono">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-2.5 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              log.event === 'login_success'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : log.event === 'login_failed'
                                ? 'bg-red-500/15 text-red-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {log.event}
                          </span>
                          <span className="text-neutral-300 font-semibold">{log.email}</span>
                          <span className="text-neutral-500">[{log.ip}]</span>
                        </div>
                        <p className="text-neutral-400 text-[10px] font-sans">{log.details}</p>
                      </div>
                      <span className="text-neutral-500 text-[10px] shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-neutral-500">No security audit events recorded yet.</div>
                )}
              </div>
            </div>

            {/* IP Whitelisting & Hidden Portal Protection */}
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">IP Whitelisting &amp; Secret Portal</h3>
                    <p className="text-xs text-neutral-400">
                      Restrict admin &amp; kitchen access strictly to approved IP addresses
                    </p>
                  </div>
                </div>

                {/* Toggle Enable */}
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={!!localSettings.ipWhitelistEnabled}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, ipWhitelistEnabled: e.target.checked })
                    }
                    className="rounded border-neutral-700 text-blue-500 focus:ring-blue-500"
                  />
                  <span className={localSettings.ipWhitelistEnabled ? 'text-blue-400' : 'text-neutral-500'}>
                    {localSettings.ipWhitelistEnabled ? 'IP Filtering Active' : 'Filter Disabled'}
                  </span>
                </label>
              </div>

              {/* Detected Current IP Card */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block">Your Current Detected IP:</span>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {detectedIp || 'Resolving IP...'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddCurrentIp}
                  className="px-3 py-1.5 bg-neutral-850 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Whitelist My IP</span>
                </button>
              </div>

              {/* Whitelisted IPs List */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Approved Whitelist IPs ({localSettings.staffIpWhitelist?.length || 0})
                </label>
                <div className="space-y-1.5 mb-2">
                  {localSettings.staffIpWhitelist && localSettings.staffIpWhitelist.length > 0 ? (
                    localSettings.staffIpWhitelist.map((ip) => (
                      <div
                        key={ip}
                        className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-neutral-200">{ip}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIp(ip)}
                          className="text-neutral-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-neutral-500 italic p-2 bg-neutral-950 rounded-lg">
                      No IPs whitelisted yet. (When empty or disabled, login is protected by password).
                    </p>
                  )}
                </div>

                {/* Add Manual IP */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.100 or static IP..."
                    value={newIpInput}
                    onChange={(e) => setNewIpInput(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualIp}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add IP</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 text-xs text-neutral-400 space-y-1">
                <p className="font-semibold text-neutral-300">💡 Staff Portal URL Access:</p>
                <p className="text-[11px] text-neutral-500">
                  Customers see zero admin or kitchen buttons on the website. To access staff portals, simply navigate to <span className="font-mono text-amber-400">/admin</span> or <span className="font-mono text-amber-400">/staff</span> in your browser URL (or <span className="font-mono text-red-400">/kitchen</span> for Kitchen Station), then sign in with your email and password.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Save IP Whitelist Configuration
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 8: WEBSITE HUD & CUSTOMER WIDGETS ================= */}
        {activeTab === 'website_hud' && (
          <WebsiteHudSettingsTab
            settings={localSettings}
            categories={categories}
            menuItems={menuItems}
            orders={orders}
            onSaveWidgets={handleSaveWidgetConfig}
            onSavePosPermissions={handleSavePosPermissions}
            onSaveStoreSettings={async (updatedSettings) => {
              const current = StorageService.getSettings();
              const merged: StoreSettings = {
                ...current,
                ...updatedSettings,
                customerWidgets: {
                  ...(current.customerWidgets || {}),
                  ...(updatedSettings.customerWidgets || {}),
                } as CustomerWidgetsConfig,
              };
              setLocalSettings(merged);
              await StorageService.saveSettings(merged);
              if (onSaveSettings) {
                await onSaveSettings(merged);
              }
              try {
                await ApiService.updateSettings(merged);
              } catch {
                // Fallback
              }
              onRefreshData();
            }}
            onRefreshData={onRefreshData}
          />
        )}

        {/* ================= TAB 9: KITCHEN PORTAL PERMISSIONS ================= */}
        {activeTab === 'kitchen_perms' && (
          <KitchenPermissionsEditor
            settings={localSettings}
            onSavePermissions={handleSaveKitchenPermissions}
            onRefreshData={onRefreshData}
          />
        )}

        {/* ================= TAB 10: MANAGE INVENTORY (CUSTOM NUMBERS) ================= */}
        {activeTab === 'inventory' && (
          <InventoryManagementTab
            menuItems={menuItems}
            categories={categories}
            onSaveInventory={handleSaveInventory}
            onRefreshData={onRefreshData}
          />
        )}

        {/* ================= TAB: FOOD COSTING & RECIPE BOM CALCULATOR ================= */}
        {activeTab === 'costing' && (
          <FoodCostingTab />
        )}

        {/* ================= TAB 11: EMPLOYEE PORTAL & POS PERMISSIONS ================= */}
        {activeTab === 'pos_perms' && (
          <PosEmployeePermissionsEditor
            settings={localSettings}
            categories={categories}
            onSavePermissions={handleSavePosPermissions}
            onRefreshData={onRefreshData}
          />
        )}

        {/* ================= TAB 12: DEAL MAKER & COMBOS ================= */}
        {activeTab === 'deals' && (
          <DealMakerTab
            menuItems={menuItems}
            onRefreshData={onRefreshData}
          />
        )}

        {/* ================= TAB 13: PROMO CODES ENGINE ================= */}
        {activeTab === 'promos' && (
          <PromoCodesManagementTab
            onRefreshData={onRefreshData}
          />
        )}

        {/* ================= TAB 14: STAFF ACCOUNTS & PORTALS CREDENTIALS ================= */}
        {activeTab === 'staff_accounts' && (
          <StaffAccountsManagerTab
            onSwitchPortal={onSwitchPortal}
          />
        )}
      </main>

      {/* Item Editor Modal */}
      {isItemModalOpen && (
        <ItemEditorModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveMenuItem}
          categories={categories}
          initialItem={editingItem}
        />
      )}

      {/* Full Screen Screenshot Zoom Modal */}
      {zoomedScreenshotUrl && zoomedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-2xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Payment Receipt for {zoomedOrder.id}
                </h3>
                <p className="text-xs text-neutral-400">
                  Customer: {zoomedOrder.customerName} · Total: Rs. {zoomedOrder.total.toLocaleString()} · Trx ID: {zoomedOrder.payment.transactionId || 'N/A'}
                </p>
              </div>

              <button
                onClick={() => setZoomedScreenshotUrl(null)}
                className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-neutral-950">
              <img
                src={zoomedScreenshotUrl}
                alt="Zoomed Payment Screenshot"
                className="max-h-[60vh] w-auto object-contain rounded-lg border border-neutral-800 shadow-xl"
              />
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
              <div className="text-xs text-neutral-400 font-mono">
                Method: {zoomedOrder.payment.method.toUpperCase()}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomedScreenshotUrl(null)}
                  className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  Close
                </button>
                {!zoomedOrder.payment.verified && (
                  <button
                    onClick={() => handleVerifyPayment(zoomedOrder.id, true)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Payment</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DECLINE ORDER MODAL (MANAGER HUD) ================= */}
      {declineModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5 text-red-400">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Decline &amp; Cancel Order #{declineModalOrder.id}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Provide a reason to inform the customer and log in store archive
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeclineModalOrder(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                aria-label="Close decline modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Brief Summary */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Customer:</span>
                <span className="font-semibold text-white">
                  {declineModalOrder.customerName} ({declineModalOrder.customerPhone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Delivery Area:</span>
                <span className="text-neutral-300">
                  {declineModalOrder.area} {declineModalOrder.distanceKm ? `(~${declineModalOrder.distanceKm} km)` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Total Billed:</span>
                <span className="font-mono font-bold text-amber-400">
                  Rs. {declineModalOrder.total.toLocaleString()} ({declineModalOrder.payment.method.toUpperCase()})
                </span>
              </div>
            </div>

            {/* Select Preset Reason */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-200 block">
                Select Primary Decline Reason:
              </label>
              <select
                value={declinePresetReason}
                onChange={(e) => setDeclinePresetReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="Out of 10 km delivery radius from North Nazimabad Block-I">
                  📍 Out of 10 km delivery radius from North Nazimabad Block-I
                </option>
                <option value="Kitchen at maximum peak capacity (grill rush)">
                  🔥 Kitchen at maximum peak capacity (grill rush)
                </option>
                <option value="Out of stock on fresh smash beef patties / brioche buns">
                  🍔 Out of stock on fresh smash beef patties / brioche buns
                </option>
                <option value="Unable to verify EasyPaisa / JazzCash payment proof">
                  💳 Unable to verify EasyPaisa / JazzCash payment proof
                </option>
                <option value="Customer unreachable via phone / invalid address">
                  📞 Customer unreachable via phone / incomplete address
                </option>
                <option value="Kitchen closing hours / technical maintenance">
                  🕒 Kitchen closing hours / technical maintenance
                </option>
                <option value="Customer requested order cancellation">
                  🙋 Customer requested order cancellation
                </option>
                <option value="Other">
                  ✍️ Other / Specific Custom Reason
                </option>
              </select>
            </div>

            {/* Custom Notes / Specific Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-200 block">
                Detailed Explanation for Customer &amp; History:
              </label>
              <textarea
                rows={3}
                placeholder="Write specific decline details (e.g. 'We currently deliver up to 10km around Block-I North Nazimabad. Please visit us for self-pickup!')..."
                value={declineCustomReason}
                onChange={(e) => setDeclineCustomReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 resize-none"
              />
              <p className="text-[11px] text-neutral-400">
                ℹ️ This message will be displayed in the customer's live tracker and sent via push notification.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeclineModalOrder(null)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Keep Order (Do Not Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeclineOrder}
                disabled={isDeclineLoading}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>{isDeclineLoading ? 'Cancelling...' : 'Confirm Decline & Cancel'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TIMER ADJUSTMENT MODAL (MANAGER HUD) ================= */}
      {timerModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5 text-amber-400">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Adjust Preparation Timer #{timerModalOrder.id}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Current Estimated Time: {timerModalOrder.estimatedMinutes || 20} minutes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTimerModalOrder(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                aria-label="Close timer modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Add Presets */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-2">
                Quick Adjust ETA:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      const cur = timerModalOrder.estimatedMinutes || 20;
                      setTimerMinutesInput(cur + mins);
                    }}
                    className="py-2 px-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-amber-400 text-xs font-bold rounded-xl transition-all"
                  >
                    +{mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Exact Minutes Input */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                Total Estimated Minutes:
              </label>
              <input
                type="number"
                min={1}
                max={180}
                value={timerMinutesInput}
                onChange={(e) => setTimerMinutesInput(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                Reason / Note for Customer:
              </label>
              <input
                type="text"
                value={timerReasonInput}
                onChange={(e) => setTimerReasonInput(e.target.value)}
                placeholder="e.g. Grilling fresh patties & fries rush"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTimerModalOrder(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTimerAdjustment}
                disabled={isTimerLoading}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isTimerLoading ? 'Updating...' : `Set to ${timerMinutesInput} mins`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= INSPECT ORDER MODAL (FROM ALL-TIME HISTORY) ================= */}
      {inspectHistoryOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Order #{inspectHistoryOrder.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inspectHistoryOrder.status === 'delivered'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : inspectHistoryOrder.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {inspectHistoryOrder.status.replace('_', ' ')}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Placed: {new Date(inspectHistoryOrder.createdAt).toLocaleString()} · {inspectHistoryOrder.orderType.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectHistoryOrder(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cancelled Banner if cancelled */}
            {inspectHistoryOrder.status === 'cancelled' && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-start gap-2.5">
                <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold text-red-300">Decline / Cancellation Reason: </span>
                  <span className="text-white font-medium">{inspectHistoryOrder.declineReason || 'Order was cancelled'}</span>
                </div>
              </div>
            )}

            {/* Delivery Proof Photo Banner if delivered with photo */}
            {inspectHistoryOrder.deliveryProofPhoto && (
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-400" />
                    <span>Doorstep Proof of Delivery Photo (Rider Handover)</span>
                  </span>
                  {inspectHistoryOrder.deliveredByRider && (
                    <span className="text-purple-300 font-mono text-[11px]">
                      Rider: {inspectHistoryOrder.deliveredByRider}
                    </span>
                  )}
                </div>
                <img
                  src={inspectHistoryOrder.deliveryProofPhoto}
                  alt="POD Photo"
                  className="w-full max-h-56 object-cover rounded-xl border border-neutral-800"
                />
              </div>
            )}

            {/* Customer & Delivery details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 text-xs">
              <div>
                <span className="text-neutral-500 text-[10px] uppercase font-bold block mb-1">Customer Info:</span>
                <p className="font-bold text-white">{inspectHistoryOrder.customerName}</p>
                <p className="text-neutral-300 font-mono flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-neutral-500" />
                  {inspectHistoryOrder.customerPhone}
                </p>
                {inspectHistoryOrder.customerEmail && (
                  <p className="text-neutral-400 text-[11px] mt-0.5">{inspectHistoryOrder.customerEmail}</p>
                )}
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] uppercase font-bold block mb-1">Delivery Destination:</span>
                <p className="text-white font-medium">{inspectHistoryOrder.deliveryAddress}</p>
                <p className="text-amber-400 text-[11px] mt-0.5">
                  Area: {inspectHistoryOrder.area} {inspectHistoryOrder.distanceKm ? `(~${inspectHistoryOrder.distanceKm} km from Block-I)` : ''}
                </p>
              </div>
            </div>

            {/* Items Receipt */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 space-y-2 text-xs">
              <span className="text-neutral-400 text-[10px] uppercase font-bold tracking-wider block">
                Itemized Receipt ({inspectHistoryOrder.items.length} items):
              </span>
              <div className="divide-y divide-neutral-900">
                {inspectHistoryOrder.items.map((it) => (
                  <div key={it.id} className="py-2 flex items-start justify-between">
                    <div>
                      <span className="font-bold text-white">
                        {it.quantity}x {it.name}
                      </span>
                      {it.selectedVariant && <span className="text-neutral-400 ml-1.5">({it.selectedVariant})</span>}
                      {it.selectedSpiciness && <span className="text-red-400 ml-1.5">· {it.selectedSpiciness}</span>}
                      {it.selectedAddons.length > 0 && (
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          + {it.selectedAddons.map((a) => a.name).join(', ')}
                        </p>
                      )}
                      {it.specialInstructions && (
                        <p className="text-[11px] text-amber-500/80 italic mt-0.5">"{it.specialInstructions}"</p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-neutral-200">
                      Rs. {it.itemTotal.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {(inspectHistoryOrder.notes || inspectHistoryOrder.customerNotes) && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                    📝 Customer Special Instructions:
                  </span>
                  <p className="text-white italic font-medium">
                    "{inspectHistoryOrder.notes || inspectHistoryOrder.customerNotes}"
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-800 flex justify-between font-bold text-white">
                <span>Total Amount:</span>
                <span className="font-mono text-amber-400 text-sm">
                  Rs. {inspectHistoryOrder.total.toLocaleString()} ({inspectHistoryOrder.payment.method.toUpperCase()})
                </span>
              </div>
            </div>

            {/* Timeline Notes */}
            <div className="space-y-1.5 text-xs">
              <span className="text-neutral-400 text-[10px] uppercase font-bold tracking-wider block">Status Timeline Notes:</span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-neutral-950 border border-neutral-850">
                {inspectHistoryOrder.statusHistory.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="text-neutral-300 flex-1">{h.note}</span>
                    <span className="font-mono text-neutral-500 text-[10px] shrink-0">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Refund Information if refunded */}
            {inspectHistoryOrder.status === 'refunded' && inspectHistoryOrder.refundInfo && (
              <div className="p-3.5 rounded-xl bg-purple-950/70 border border-purple-800 text-xs text-purple-200 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-purple-400" />
                    <span>Refund Issued ({inspectHistoryOrder.refundInfo.refundType.toUpperCase()})</span>
                  </span>
                  <span className="font-mono text-white text-sm">
                    Rs. {inspectHistoryOrder.refundInfo.refundAmount.toLocaleString()}
                  </span>
                </div>
                <p className="text-purple-200/90 text-[11px]">
                  Method: <strong className="text-white uppercase">{inspectHistoryOrder.refundInfo.refundMethod}</strong> · Reason: {inspectHistoryOrder.refundInfo.refundReason}
                </p>
                {inspectHistoryOrder.refundInfo.notes && (
                  <p className="text-purple-300/70 text-[11px] italic">"{inspectHistoryOrder.refundInfo.notes}"</p>
                )}
                <p className="text-[10px] text-purple-400 font-mono">
                  Processed on {new Date(inspectHistoryOrder.refundInfo.refundedAt).toLocaleString()} by {inspectHistoryOrder.refundInfo.refundedBy || 'Store Manager'}
                </p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {inspectHistoryOrder.status !== 'cancelled' && inspectHistoryOrder.status !== 'refunded' && (
                  <button
                    type="button"
                    onClick={() => {
                      const ord = inspectHistoryOrder;
                      setInspectHistoryOrder(null);
                      handleOpenRefundModal(ord);
                    }}
                    className="px-3.5 py-2 bg-purple-950/70 hover:bg-purple-900 border border-purple-800 text-purple-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Process Refund / Return for this order"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Refund / Return Order</span>
                  </button>
                )}

                {inspectHistoryOrder.status !== 'cancelled' && inspectHistoryOrder.status !== 'delivered' && inspectHistoryOrder.status !== 'refunded' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDeclineModalOrder(inspectHistoryOrder);
                      setDeclinePresetReason('Out of 10 km delivery radius from North Nazimabad Block-I');
                      setDeclineCustomReason('');
                    }}
                    className="px-3.5 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Decline &amp; Cancel This Order</span>
                  </button>
                ) : inspectHistoryOrder.status === 'delivered' ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Delivered &amp; Completed</span>
                  </div>
                ) : inspectHistoryOrder.status === 'refunded' ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
                    <RotateCcw className="w-4 h-4" />
                    <span>Refunded &amp; Closed</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateOrderStatus(inspectHistoryOrder.id, 'received');
                      setInspectHistoryOrder(null);
                    }}
                    className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Re-Open Order
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setInspectHistoryOrder(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Manager Refund & Return Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-purple-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5 text-purple-400">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Issue Order Refund / Return
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Order <span className="text-amber-400 font-mono font-bold">{refundModalOrder.id}</span> · Total Rs. {refundModalOrder.total.toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer & Items Brief */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 text-xs space-y-1">
              <div className="flex justify-between text-neutral-300">
                <span>Customer: <strong className="text-white">{refundModalOrder.customerName}</strong> ({refundModalOrder.customerPhone})</span>
                <span className="text-neutral-400 capitalize">{refundModalOrder.orderType}</span>
              </div>
              <p className="text-neutral-400 truncate">
                Items: {refundModalOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </p>
            </div>

            {/* Refund Type Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300 block">Refund Type:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRefundType('full');
                    setRefundAmount(refundModalOrder.total);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    refundType === 'full'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  Full Refund (100% · Rs. {refundModalOrder.total.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setRefundType('partial')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    refundType === 'partial'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  Partial Refund (Custom Amount)
                </button>
              </div>
            </div>

            {/* Refund Amount Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-neutral-300">Refund Amount (PKR):</label>
                <span className="text-neutral-500 font-mono">Max: Rs. {refundModalOrder.total.toLocaleString()}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-neutral-400 text-xs">Rs.</span>
                <input
                  type="number"
                  min="1"
                  max={refundModalOrder.total}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Math.min(refundModalOrder.total, Math.max(0, Number(e.target.value))))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Refund Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300 block">Payout / Refund Method:</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="cash">💵 Store Cash Return</option>
                <option value="easypaisa">📱 EasyPaisa Mobile Wallet</option>
                <option value="jazzcash">⚡ JazzCash Mobile Wallet</option>
                <option value="pos_card">💳 Bank Card / POS Reversal</option>
                <option value="original_payment">🔄 Return via Original Method</option>
              </select>
            </div>

            {/* Refund Reason Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300 block">Refund / Return Reason:</label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="Customer Request / Item Return">Customer Request / Item Return</option>
                <option value="Food Quality / Wrong Item Prepared">Food Quality / Wrong Item Prepared</option>
                <option value="Spillage / Packaging Damage in Transit">Spillage / Packaging Damage in Transit</option>
                <option value="Delivery Delay beyond Promise Time">Delivery Delay beyond Promise Time</option>
                <option value="Customer Unreachable / Address Error">Customer Unreachable / Address Error</option>
                <option value="Payment Dispute / Double Charged">Payment Dispute / Double Charged</option>
              </select>
            </div>

            {/* Internal Manager Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300 block">Manager Audit Notes (Optional):</label>
              <textarea
                rows={2}
                placeholder="e.g. Patty cold on arrival; customer refunded in cash and complimentary drink offered..."
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Refund (Rs. {Number(refundAmount || refundModalOrder.total).toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Success Toast */}
      {refundSuccessToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-60 bg-purple-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{refundSuccessToast}</span>
        </div>
      )}

      {/* Clear All-Time History Confirmation Modal */}
      {isClearHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-red-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5 text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Delete All-Time Order History
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Irreversible administrative database action
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClearHistoryModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-200 space-y-1.5">
              <p className="font-bold text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Permanent Database Action:</span>
              </p>
              <p className="text-[11px] leading-relaxed text-neutral-300">
                This will delete historical order records, timestamps, customer details, and payment histories from the store archives.
              </p>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-200 block">
                Select Deletion Scope:
              </label>

              <div className="space-y-2">
                <div
                  onClick={() => setClearHistoryMode('finished')}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    clearHistoryMode === 'finished'
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="clearMode"
                    checked={clearHistoryMode === 'finished'}
                    onChange={() => setClearHistoryMode('finished')}
                    className="mt-0.5 text-amber-500"
                  />
                  <div>
                    <span className="font-bold text-xs block text-white">
                      Delete Completed &amp; Cancelled Orders Only (Recommended)
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Clears finished archive ({orders.filter(o => o.status === 'delivered' || o.status === 'cancelled').length} orders) and keeps current live cooking orders safe.
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setClearHistoryMode('all')}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    clearHistoryMode === 'all'
                      ? 'border-red-500 bg-red-500/10 text-white'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="clearMode"
                    checked={clearHistoryMode === 'all'}
                    onChange={() => setClearHistoryMode('all')}
                    className="mt-0.5 text-red-500"
                  />
                  <div>
                    <span className="font-bold text-xs block text-white">
                      Purge Entire Order History (All {orders.length} Records)
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Wipes 100% of all order logs from local database and server memory.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation typing requirement */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-neutral-300 block">
                Type <span className="font-mono font-bold text-red-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="Type DELETE..."
                value={clearHistoryConfirmText}
                onChange={(e) => setClearHistoryConfirmText(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase font-mono tracking-wider focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearHistoryModalOpen(false)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearHistory}
                disabled={clearHistoryConfirmText.trim().toUpperCase() !== 'DELETE' || isClearingHistory}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isClearingHistory ? 'Purging History...' : 'Confirm Purge History'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Attachment Preview Modal */}
      {previewAttachmentUrl && (
        <div
          onClick={() => setPreviewAttachmentUrl(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewAttachmentUrl}
              alt="Enlarged proof"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-neutral-800"
            />
            <button
              onClick={() => setPreviewAttachmentUrl(null)}
              className="absolute -top-3 -right-3 p-2 bg-neutral-900 text-white rounded-full border border-neutral-700 hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Rider Delivery Navigation Modal */}
      <RiderDeliveryModal
        order={selectedMapOrder}
        isOpen={!!selectedMapOrder}
        onClose={() => setSelectedMapOrder(null)}
        onUpdateStatus={(orderId, status, note) => {
          StorageService.updateOrderStatus(orderId, status, note);
          onRefreshData();
          setSelectedMapOrder((prev) => (prev && prev.id === orderId ? { ...prev, status } : prev));
        }}
      />

      {/* Delete Item Confirmation Dialog (Iframe-safe, zero window.confirm) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Delete Menu Item?</h4>
                <p className="text-xs text-neutral-400">This action removes it from the customer menu</p>
              </div>
            </div>
            <p className="text-sm text-neutral-300">
              Are you sure you want to permanently delete <strong className="text-white">"{itemToDelete.name}"</strong> (Rs. {itemToDelete.price.toLocaleString()})?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(itemToDelete.id)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Dialog (Iframe-safe, zero window.confirm) */}
      {catToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Delete Category?</h4>
                <p className="text-xs text-neutral-400">Manage menu category hierarchy</p>
              </div>
            </div>
            <p className="text-sm text-neutral-300">
              Are you sure you want to delete the category <strong className="text-white">"{catToDelete.name}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCategory(catToDelete.id)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Category</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Action Toast */}
      {menuActionToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-neutral-700 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{menuActionToast}</span>
        </div>
      )}

      {/* AI Operations Copilot Modal */}
      <ManagerAiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        orders={orders}
        menuItems={menuItems}
        settings={settings}
        onRefreshData={onRefreshData}
      />

      {/* Floating Quick AI Assistant Button */}
      <button
        type="button"
        onClick={() => setIsAiModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-bold text-xs rounded-2xl shadow-2xl shadow-amber-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-300/40"
        title="Open AI Operations Copilot (Gemini Flash)"
      >
        <Sparkles className="w-4 h-4" />
        <span>AI Copilot</span>
      </button>
    </div>
  );
};
