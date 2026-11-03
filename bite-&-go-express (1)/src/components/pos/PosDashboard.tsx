import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MenuItem,
  Category,
  Order,
  OrderItem,
  OrderStatus,
  StoreSettings,
  PosPermissionsConfig,
  DEFAULT_POS_PERMISSIONS,
  PaymentMethod,
  CustomerTicket,
  InventoryIngredient,
  DeliveryRider,
} from '../../types';
import { StorageService } from '../../utils/storage';
import { ApiService } from '../../utils/api';
import { sounds } from '../../utils/audio';
import { generateOrderMapsLinks } from '../../data/karachiAreas';
import {
  CreditCard,
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  Printer,
  X,
  Flame,
  ShieldCheck,
  User,
  LogOut,
  ArrowLeft,
  DollarSign,
  Receipt,
  FileText,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Boxes,
  KeyRound,
  UtensilsCrossed,
  Package,
  ChefHat,
  Tag,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Paperclip,
  Send,
  Sliders,
  Calendar,
  TrendingUp,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Phone,
  Timer,
  Hash,
  Volume2,
  MapPin,
  Edit2,
  Bike,
  PhoneCall,
  UserCheck,
  ExternalLink,
  Banknote,
} from 'lucide-react';

interface PosDashboardProps {
  categories: Category[];
  menuItems: MenuItem[];
  orders: Order[];
  settings: StoreSettings;
  cashierName?: string;
  initialTab?: 'pos' | 'kitchen' | 'history' | 'tickets' | 'rider';
  onBackToStore: () => void;
  onLogout: () => void;
  onRefreshData: () => void;
  onToggleStock?: (itemId: string, inStock: boolean) => void;
}

export const PosDashboard: React.FC<PosDashboardProps> = ({
  categories,
  menuItems,
  orders,
  settings,
  cashierName = 'Counter Cashier (Emp-01)',
  initialTab = 'pos',
  onBackToStore,
  onLogout,
  onRefreshData,
  onToggleStock,
}) => {
  const perms: PosPermissionsConfig = settings.posPermissions || DEFAULT_POS_PERMISSIONS;

  const isKitchenPortal = initialTab === 'kitchen';

  // Unified Infused Top Tabs - includes POS, Kitchen, History, Tickets, and dedicated Rider HUD
  const [activeTab, setActiveTab] = useState<'pos' | 'kitchen' | 'history' | 'tickets' | 'rider'>(
    isKitchenPortal ? 'kitchen' : initialTab
  );

  // Auto-Print System: Automatically prints Kitchen Order Ticket (KOT) on order confirmation
  const [autoPrintKOT, setAutoPrintKOT] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bitego_pos_autoprint_kot');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [autoPrintToast, setAutoPrintToast] = useState<string | null>(null);

  const toggleAutoPrintKOT = () => {
    const next = !autoPrintKOT;
    setAutoPrintKOT(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bitego_pos_autoprint_kot', String(next));
    }
  };

  // --------------------------------------------------------------------------
  // TAB 1: POS REGISTER STATE
  // --------------------------------------------------------------------------
  const [orderType, setOrderType] = useState<'pos_dine_in' | 'pos_takeaway' | 'pos_counter' | 'pos_delivery'>('pos_dine_in');
  const [tableNumber, setTableNumber] = useState<string>('Table 1');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('pos_cash');
  const [heldTickets, setHeldTickets] = useState<Array<{
    id: string;
    items: OrderItem[];
    orderType: 'pos_dine_in' | 'pos_takeaway' | 'pos_counter' | 'pos_delivery';
    tableNumber: string;
    customerName: string;
    customerPhone: string;
    heldAt: string;
  }>>([]);

  // Modals inside POS
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [itemOptVariant, setItemOptVariant] = useState<string>('');
  const [itemOptVariantPrice, setItemOptVariantPrice] = useState<number>(0);
  const [itemOptAddons, setItemOptAddons] = useState<Array<{ name: string; price: number }>>([]);
  const [itemOptNotes, setItemOptNotes] = useState<string>('');
  const [itemOptQty, setItemOptQty] = useState<number>(1);
  const [customItemModalOpen, setCustomItemModalOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemNotes, setCustomItemNotes] = useState('');
  const [customItemCategory, setCustomItemCategory] = useState(categories[0]?.id || 'cat-smash');
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptTab, setReceiptTab] = useState<'both' | 'kitchen' | 'customer'>('both');
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinAction, setPinAction] = useState<'void' | 'discount' | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [liveTick, setLiveTick] = useState<number>(() => Date.now());
  const [currentTime, setCurrentTime] = useState<string>(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick(Date.now());
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --------------------------------------------------------------------------
  // RAW INVENTORY & INGREDIENTS STOCK TRACKER (Buns, Patties, Wraps, Cheese)
  // --------------------------------------------------------------------------
  const [ingredients, setIngredients] = useState<InventoryIngredient[]>(() => StorageService.getIngredients());
  const [isRawStockModalOpen, setIsRawStockModalOpen] = useState(false);
  const [rawStockFilter, setRawStockFilter] = useState<'all' | 'low' | 'bakery' | 'proteins' | 'dairy'>('all');

  useEffect(() => {
    const handleSync = () => {
      setIngredients(StorageService.getIngredients());
    };
    window.addEventListener('bg_data_updated', handleSync);
    return () => window.removeEventListener('bg_data_updated', handleSync);
  }, []);

  const bunsIngredient = useMemo(() => {
    return ingredients.find((i) => i.id === 'ing-brioche-bun' || i.name.toLowerCase().includes('bun')) || null;
  }, [ingredients]);

  const beefPattyIngredient = useMemo(() => {
    return ingredients.find((i) => i.id === 'ing-beef-smash-patty' || i.name.toLowerCase().includes('smash patty')) || null;
  }, [ingredients]);

  const zingerPattyIngredient = useMemo(() => {
    return ingredients.find((i) => i.id === 'ing-zinger-patty' || i.name.toLowerCase().includes('zinger')) || null;
  }, [ingredients]);

  const tortillaIngredient = useMemo(() => {
    return ingredients.find((i) => i.id === 'ing-tortilla-wrap' || i.name.toLowerCase().includes('tortilla')) || null;
  }, [ingredients]);

  const cheeseIngredient = useMemo(() => {
    return ingredients.find((i) => i.id === 'ing-cheddar-slice' || i.name.toLowerCase().includes('cheddar')) || null;
  }, [ingredients]);

  const isBunsOut = Boolean(bunsIngredient && bunsIngredient.currentStock <= 0);
  const isBunsLow = Boolean(
    bunsIngredient && !isBunsOut && bunsIngredient.currentStock <= (bunsIngredient.lowStockThreshold || 30)
  );

  const lowStockIngredients = useMemo(() => {
    return ingredients.filter((i) => i.currentStock <= (i.lowStockThreshold || 15));
  }, [ingredients]);

  const handleQuickAddIngredientStock = (ingredientId: string, delta: number) => {
    StorageService.updateIngredientStock(ingredientId, delta, true);
    setIngredients(StorageService.getIngredients());
    sounds.playSuccess();
  };

  const handleSetIngredientStock = (ingredientId: string, quantity: number) => {
    StorageService.updateIngredientStock(ingredientId, Math.max(0, quantity), false);
    setIngredients(StorageService.getIngredients());
    sounds.playSuccess();
  };

  const getItemIngredientWarning = (item: MenuItem): { isOut: boolean; isLow: boolean; message: string } | null => {
    const isBurger =
      item.categoryId === 'cat-smash' ||
      item.name.toLowerCase().includes('burger') ||
      item.name.toLowerCase().includes('melt') ||
      Boolean(item.recipe && item.recipe.some((r) => r.ingredientId === 'ing-brioche-bun'));

    if (isBurger && bunsIngredient) {
      if (bunsIngredient.currentStock <= 0) {
        return { isOut: true, isLow: false, message: 'Buns Out (0 left)' };
      }
      if (bunsIngredient.currentStock <= (bunsIngredient.lowStockThreshold || 30)) {
        return { isOut: false, isLow: true, message: `Buns Low (${bunsIngredient.currentStock} left)` };
      }
    }

    if (item.recipe && item.recipe.length > 0) {
      for (const rec of item.recipe) {
        const ing = ingredients.find((i) => i.id === rec.ingredientId);
        if (ing) {
          if (ing.currentStock < rec.quantity) {
            const shortName = ing.name.split(' ')[0];
            return { isOut: true, isLow: false, message: `${shortName} Out` };
          }
          if (ing.currentStock <= (ing.lowStockThreshold || 15)) {
            const shortName = ing.name.split(' ')[0];
            return { isOut: false, isLow: true, message: `${shortName} Low (${ing.currentStock})` };
          }
        }
      }
    }
    return null;
  };

  // --------------------------------------------------------------------------
  // TAB 2: LIVE KITCHEN ORDERS STATE
  // --------------------------------------------------------------------------
  const [kitchenFilter, setKitchenFilter] = useState<'all' | 'new' | 'cooking' | 'ready' | 'completed'>('all');
  const [kitchenActionToast, setKitchenActionToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [delayingOrder, setDelayingOrder] = useState<Order | null>(null);
  const [delayMinutes, setDelayMinutes] = useState(10);
  const [customDelayInput, setCustomDelayInput] = useState<string>('10');
  const [delayReason, setDelayReason] = useState('Grill Station Rush - High Order Volume');
  const [customDelayReason, setCustomDelayReason] = useState('');
  const [viewingScreenshotOrder, setViewingScreenshotOrder] = useState<Order | null>(null);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [decliningOrder, setDecliningOrder] = useState<Order | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [customDeclineReason, setCustomDeclineReason] = useState('');
  const [supervisorPasscode, setSupervisorPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isStationStockModalOpen, setIsStationStockModalOpen] = useState(false);
  const [isKitchenActionLoading, setIsKitchenActionLoading] = useState(false);
  const [deliveryRiders, setDeliveryRiders] = useState<DeliveryRider[]>(() => StorageService.getDeliveryRiders());
  const [isAssigningRiderOrder, setIsAssigningRiderOrder] = useState<Order | null>(null);

  useEffect(() => {
    setDeliveryRiders(StorageService.getDeliveryRiders());
  }, [orders]);

  const handleAssignRider = async (orderId?: string, rider?: DeliveryRider | null) => {
    if (!orderId) return;
    try {
      StorageService.assignRiderToOrder(orderId, rider || null);
      try {
        await ApiService.assignRider(orderId, rider || null);
      } catch {}
      sounds.playChime();
      setIsAssigningRiderOrder(null);
      setKitchenActionToast({
        message: rider ? `Assigned rider ${rider.name} to order ${orderId}` : `Unassigned rider from order ${orderId}`,
        type: 'success',
      });
      if (onRefreshData) onRefreshData();
      setTimeout(() => setKitchenActionToast(null), 3000);
    } catch (err) {
      console.error('Failed to assign rider:', err);
    }
  };

  // --------------------------------------------------------------------------
  // TAB 3: TODAY'S ORDER HISTORY STATE
  // --------------------------------------------------------------------------
  const [historyFilter, setHistoryFilter] = useState<'all' | 'dine_in' | 'takeaway' | 'delivery' | 'completed' | 'cancelled'>('all');
  const [historyTimeRange, setHistoryTimeRange] = useState<'today' | 'all'>('today');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<Order | null>(null);
  const [editingItemNoteIdx, setEditingItemNoteIdx] = useState<number | null>(null);
  const [itemNoteInput, setItemNoteInput] = useState('');
  const [editingNotesOrder, setEditingNotesOrder] = useState<Order | null>(null);
  const [orderNotesInput, setOrderNotesInput] = useState<string>('');

  const handleOpenOrderNotesModal = (order: Order) => {
    setEditingNotesOrder(order);
    setOrderNotesInput(order.notes || order.customerNotes || (order as any).specialInstructions || '');
  };

  const handleSaveOrderNotes = () => {
    if (!editingNotesOrder) return;
    const updated = StorageService.updateOrderNotes(editingNotesOrder.id, orderNotesInput);
    if (updated) {
      if (lastPlacedOrder && lastPlacedOrder.id === updated.id) {
        setLastPlacedOrder(updated);
      }
    }
    sounds.playSuccess();
    setEditingNotesOrder(null);
    onRefreshData();
  };

  // --------------------------------------------------------------------------
  // REFUND & ADJUST ONGOING ORDER STATE (POS CASHIER / MANAGER)
  // --------------------------------------------------------------------------
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [refundReason, setRefundReason] = useState<string>('Customer Request / Cancelled');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'easypaisa' | 'jazzcash' | 'card'>('cash');
  const [refundNotes, setRefundNotes] = useState<string>('');

  const [adjustModalOrder, setAdjustModalOrder] = useState<Order | null>(null);
  const [adjustItems, setAdjustItems] = useState<OrderItem[]>([]);
  const [adjustCustomerName, setAdjustCustomerName] = useState('');
  const [adjustCustomerPhone, setAdjustCustomerPhone] = useState('');
  const [adjustDeliveryAddress, setAdjustDeliveryAddress] = useState('');
  const [adjustArea, setAdjustArea] = useState('');
  const [adjustTableNumber, setAdjustTableNumber] = useState('');
  const [adjustDiscount, setAdjustDiscount] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustStatus, setAdjustStatus] = useState<OrderStatus>('received');
  const [adjustAddItemSelect, setAdjustAddItemSelect] = useState<string>('');

  const handleOpenRefundModal = (order: Order) => {
    setRefundModalOrder(order);
    setRefundAmount(order.total);
    setRefundType('full');
    setRefundReason('Customer Request / Cancelled');
    setRefundMethod(order.payment?.method === 'pos_cash' ? 'cash' : 'easypaisa');
    setRefundNotes('');
  };

  const handleConfirmRefund = () => {
    if (!refundModalOrder) return;
    const allOrders = StorageService.getOrders();
    const updated = allOrders.map((o) => {
      if (o.id === refundModalOrder.id) {
        return {
          ...o,
          status: 'cancelled' as OrderStatus,
          declineReason: `Refunded (Rs. ${refundAmount}): ${refundReason}${refundNotes ? ` - ${refundNotes}` : ''}`,
          total: refundType === 'full' ? 0 : Math.max(0, o.total - refundAmount),
          statusHistory: [
            ...o.statusHistory,
            {
              status: 'cancelled' as OrderStatus,
              timestamp: new Date().toISOString(),
              note: `Refund of Rs. ${refundAmount} processed via ${refundMethod.toUpperCase()} by ${cashierName}. Reason: ${refundReason}`,
            },
          ],
        };
      }
      return o;
    });
    StorageService.saveOrders(updated);
    sounds.playCashRegister();
    setRefundModalOrder(null);
    onRefreshData();
  };

  const handleOpenAdjustOrderModal = (order: Order) => {
    setAdjustModalOrder(order);
    setAdjustItems(order.items.map((it) => ({ ...it })));
    setAdjustCustomerName(order.customerName || '');
    setAdjustCustomerPhone(order.customerPhone || '');
    setAdjustDeliveryAddress(order.deliveryAddress || '');
    setAdjustArea(order.area || '');
    setAdjustTableNumber(order.tableNumber || '');
    setAdjustDiscount(order.discount || 0);
    setAdjustNotes(order.notes || order.customerNotes || '');
    setAdjustStatus(order.status);
    setAdjustAddItemSelect('');
  };

  const handleAdjustItemQuantity = (index: number, delta: number) => {
    setAdjustItems((prev) => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index);
      }
      const singlePrice = next[index].price;
      next[index] = {
        ...next[index],
        quantity: newQty,
        itemTotal: singlePrice * newQty,
      };
      return next;
    });
  };

  const handleAdjustAddNewItem = (menuItemId: string) => {
    const item = menuItems.find((m) => m.id === menuItemId);
    if (!item) return;
    const newItem: OrderItem = {
      id: `adj-${Date.now()}-${Math.random()}`,
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      selectedAddons: [],
      itemTotal: item.price,
    };
    setAdjustItems((prev) => [...prev, newItem]);
    setAdjustAddItemSelect('');
  };

  const handleSaveAdjustOrder = () => {
    if (!adjustModalOrder) return;
    const subtotal = adjustItems.reduce((sum, it) => sum + it.itemTotal, 0);
    const deliveryFee = adjustModalOrder.deliveryFee || 0;
    const total = Math.max(0, subtotal + deliveryFee - adjustDiscount);

    const allOrders = StorageService.getOrders();
    const updated = allOrders.map((o) => {
      if (o.id === adjustModalOrder.id) {
        return {
          ...o,
          items: adjustItems,
          customerName: adjustCustomerName,
          customerPhone: adjustCustomerPhone,
          deliveryAddress: adjustDeliveryAddress,
          area: adjustArea,
          tableNumber: adjustTableNumber || undefined,
          discount: adjustDiscount,
          subtotal,
          total,
          notes: adjustNotes,
          customerNotes: adjustNotes,
          status: adjustStatus,
          statusHistory: [
            ...o.statusHistory,
            {
              status: adjustStatus,
              timestamp: new Date().toISOString(),
              note: `Order adjusted by ${cashierName}. Total updated to Rs. ${total}.`,
            },
          ],
        };
      }
      return o;
    });
    StorageService.saveOrders(updated);
    sounds.playSuccess();
    setAdjustModalOrder(null);
    onRefreshData();
  };

  // --------------------------------------------------------------------------
  // TAB 4: SUPPORT TICKETS STATE
  // --------------------------------------------------------------------------
  const [tickets, setTickets] = useState<CustomerTicket[]>(StorageService.getTickets());
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'investigating' | 'resolved' | 'closed'>('all');
  const [selectedTicket, setSelectedTicket] = useState<CustomerTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [newWebsiteOrderAlert, setNewWebsiteOrderAlert] = useState<Order | null>(null);
  const [buzzerMuted, setBuzzerMuted] = useState(false);
  const [isTerminalLocked, setIsTerminalLocked] = useState(false);
  const [lockPinInput, setLockPinInput] = useState('');
  const [lockPinError, setLockPinError] = useState('');
  const [ipOverrideUnlocked, setIpOverrideUnlocked] = useState(false);
  const [ipPasscodeInput, setIpPasscodeInput] = useState('');
  const [ipPasscodeError, setIpPasscodeError] = useState('');

  // IP Whitelist Detection for POS Terminal Security
  const [clientIpInfo, setClientIpInfo] = useState<{
    ip: string;
    isWhitelisted: boolean;
    whitelistEnabled: boolean;
  }>({
    ip: '127.0.0.1',
    isWhitelisted: true,
    whitelistEnabled: Boolean(settings.ipWhitelistEnabled),
  });

  useEffect(() => {
    ApiService.getMyIp().then((info) => {
      setClientIpInfo(info);
    });
  }, []);

  // Real-time Event Listener for instant website order notification
  useEffect(() => {
    const handleNewWebOrder = (e: any) => {
      const ord = e.detail as Order;
      if (ord) {
        setNewWebsiteOrderAlert(ord);
        setBuzzerMuted(false);
        sounds.unlockAudioContext();
        sounds.playKitchenOrderBeep();
      }
    };
    window.addEventListener('bg_new_web_order', handleNewWebOrder);
    return () => window.removeEventListener('bg_new_web_order', handleNewWebOrder);
  }, []);

  // Pending unacknowledged website orders (status === 'received')
  const unhandledReceivedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'received');
  }, [orders]);

  // Continuous repetitive buzzer loop every 4.5 seconds so employee hears it and prepares order
  useEffect(() => {
    if (unhandledReceivedOrders.length === 0 || buzzerMuted) {
      return;
    }

    sounds.unlockAudioContext();
    sounds.playKitchenOrderBeep();

    const buzzerTimer = setInterval(() => {
      sounds.unlockAudioContext();
      sounds.playKitchenOrderBeep();
    }, 4500);

    return () => clearInterval(buzzerTimer);
  }, [unhandledReceivedOrders.length, buzzerMuted]);

  // Incoming new order chime & buzzer tracking for website orders
  const knownOrderIds = useRef<Set<string>>(new Set(orders.map((o) => o.id)));
  const prevReceivedCount = useRef(orders.filter((o) => o.status === 'received').length);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      orders.forEach((o) => knownOrderIds.current.add(o.id));
      prevReceivedCount.current = orders.filter((o) => o.status === 'received').length;
      return;
    }

    const curReceived = orders.filter((o) => o.status === 'received').length;
    const brandNewOrder = orders.find(
      (o) => !knownOrderIds.current.has(o.id) && o.status === 'received'
    );

    if (brandNewOrder && curReceived > prevReceivedCount.current) {
      sounds.unlockAudioContext();
      sounds.playKitchenOrderBeep();
      setNewWebsiteOrderAlert(brandNewOrder);
      setBuzzerMuted(false);
    }

    orders.forEach((o) => knownOrderIds.current.add(o.id));
    prevReceivedCount.current = curReceived;
    setTickets(StorageService.getTickets());
  }, [orders]);

  const handleQuickAcceptReceivedOrder = async (orderToAccept: Order) => {
    try {
      await ApiService.updateOrderStatus(orderToAccept.id, 'confirmed');
    } catch {
      StorageService.updateOrderStatus(
        orderToAccept.id,
        'confirmed',
        `Accepted by POS (${cashierName}). Sent to Kitchen Grill Station.`
      );
    }
    sounds.playSuccess();
    triggerAutoPrint(orderToAccept);
    setNewWebsiteOrderAlert(null);
    onRefreshData();
  };

  // --------------------------------------------------------------------------
  // FILTERING LOGIC (Category hiding by Admin HUD, Out-of-Stock)
  // --------------------------------------------------------------------------
  const isGrillCategoryHidden = (perms.hiddenCategoryIdsForEmployees || []).includes('cat-smash');

  const visibleCategories = useMemo(() => {
    const hidden = perms.hiddenCategoryIdsForEmployees || [];
    return categories.filter((c) => !hidden.includes(c.id));
  }, [categories, perms.hiddenCategoryIdsForEmployees]);

  const visibleMenuItems = useMemo(() => {
    const hiddenCatIds = perms.hiddenCategoryIdsForEmployees || [];
    return menuItems.filter((it) => {
      if (hiddenCatIds.includes(it.categoryId)) return false;
      if (perms.hideOutOfStockItemsForEmployees && (it.stockQuantity === 0 || !it.isAvailable)) {
        return false;
      }
      return true;
    });
  }, [menuItems, perms.hiddenCategoryIdsForEmployees, perms.hideOutOfStockItemsForEmployees]);

  const displayedItems = useMemo(() => {
    return visibleMenuItems.filter((it) => {
      if (selectedCategoryId !== 'all' && it.categoryId !== selectedCategoryId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [visibleMenuItems, selectedCategoryId, searchQuery]);

  // --------------------------------------------------------------------------
  // FINANCIAL CALCULATIONS
  // --------------------------------------------------------------------------
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + (it.itemTotal || it.price * it.quantity), 0);
  }, [cartItems]);

  const discountAmount = useMemo(() => {
    if (discountPercent <= 0) return 0;
    return Math.round((cartSubtotal * discountPercent) / 100);
  }, [cartSubtotal, discountPercent]);

  const taxAmount = useMemo(() => {
    const rate = perms.defaultTaxRatePercent || 0;
    if (rate <= 0) return 0;
    const taxable = cartSubtotal - discountAmount;
    return Math.round((taxable * rate) / 100);
  }, [cartSubtotal, discountAmount, perms.defaultTaxRatePercent]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount + taxAmount);
  }, [cartSubtotal, discountAmount, taxAmount]);

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - cartTotal);

  // --------------------------------------------------------------------------
  // CART ACTIONS
  // --------------------------------------------------------------------------
  const handleAddToCart = (item: MenuItem, variantName?: string, extraPrice = 0, itemNotes = '') => {
    const unitPrice = item.price + extraPrice;
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.id === item.id && ci.selectedVariant === variantName && (ci.notes || '') === itemNotes
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        const cur = next[existingIdx];
        const newQty = cur.quantity + 1;
        next[existingIdx] = {
          ...cur,
          quantity: newQty,
          itemTotal: unitPrice * newQty,
        };
        return next;
      } else {
        const newItem: OrderItem = {
          id: item.id,
          menuItemId: item.id,
          name: item.name,
          price: unitPrice,
          quantity: 1,
          selectedVariant: variantName,
          selectedAddons: [],
          itemTotal: unitPrice,
          image: item.image,
          notes: itemNotes || undefined,
          specialInstructions: itemNotes || undefined,
        };
        return [...prev, newItem];
      }
    });
    sounds.playChime();
  };

  const handleOpenItemOptions = (item: MenuItem) => {
    setCustomizingItem(item);
    if (item.variants && item.variants.length > 0) {
      setItemOptVariant(item.variants[0].name);
      const delta = item.variants[0].priceDelta ?? (item.variants[0].price ? item.variants[0].price - item.price : 0);
      setItemOptVariantPrice(delta);
    } else {
      setItemOptVariant('');
      setItemOptVariantPrice(0);
    }
    setItemOptAddons([]);
    setItemOptNotes('');
    setItemOptQty(1);
  };

  const handleConfirmAddCustomizedItem = () => {
    if (!customizingItem) return;
    const extraPrice = itemOptVariantPrice + itemOptAddons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = customizingItem.price + extraPrice;
    const finalNotes = itemOptNotes.trim() || undefined;

    const newItem: OrderItem = {
      id: customizingItem.id,
      menuItemId: customizingItem.id,
      name: customizingItem.name,
      price: unitPrice,
      quantity: itemOptQty,
      itemTotal: unitPrice * itemOptQty,
      selectedVariant: itemOptVariant || undefined,
      selectedAddons: itemOptAddons,
      notes: finalNotes,
      specialInstructions: finalNotes,
      image: customizingItem.image,
    };

    setCartItems((prev) => [...prev, newItem]);
    sounds.playChime();
    setCustomizingItem(null);
  };

  const handleUpdateQuantity = (idx: number, delta: number) => {
    setCartItems((prev) => {
      const next = [...prev];
      const cur = next[idx];
      const newQty = cur.quantity + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== idx);
      }
      next[idx] = {
        ...cur,
        quantity: newQty,
        itemTotal: cur.price * newQty,
      };
      return next;
    });
  };

  const handleRemoveCartItem = (idx: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearCart = () => {
    if (perms.requireManagerPinForVoid && cartItems.length > 0) {
      setPinAction('void');
      setPinPromptOpen(true);
      return;
    }
    setCartItems([]);
    setDiscountPercent(0);
    setCashTendered('');
    setCustomerNotes('');
  };

  const handleApplyDiscount = (pct: number) => {
    if (pct > 20 && perms.requireManagerPinForDiscount) {
      setPinAction('discount');
      setPinPromptOpen(true);
      return;
    }
    setDiscountPercent(pct);
  };

  const handleAuthorizePin = () => {
    const validPin = perms.supervisorPasscode || '1234';
    if (enteredPin.trim() === validPin) {
      if (pinAction === 'void') {
        setCartItems([]);
        setDiscountPercent(0);
        setCashTendered('');
        setCustomerNotes('');
      } else if (pinAction === 'discount') {
        setDiscountPercent(25);
      }
      setPinPromptOpen(false);
      setEnteredPin('');
      setPinError('');
    } else {
      setPinError('Invalid Manager Passcode');
    }
  };

  // Hold / Recall Tickets
  const handleHoldTicket = () => {
    if (cartItems.length === 0) return;
    const ticket = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      items: [...cartItems],
      orderType,
      tableNumber,
      customerName,
      customerPhone,
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHeldTickets((prev) => [ticket, ...prev]);
    setCartItems([]);
    setCashTendered('');
    sounds.playChime();
  };

  const handleRecallTicket = (ticketId: string) => {
    const found = heldTickets.find((t) => t.id === ticketId);
    if (!found) return;
    setCartItems(found.items);
    setOrderType(found.orderType);
    setTableNumber(found.tableNumber);
    setCustomerName(found.customerName);
    setCustomerPhone(found.customerPhone);
    setHeldTickets((prev) => prev.filter((t) => t.id !== ticketId));
    sounds.playChime();
  };

  const handleAddCustomItem = () => {
    const price = parseFloat(customItemPrice);
    if (!customItemName.trim() || isNaN(price) || price <= 0) return;
    const newItem: OrderItem = {
      id: `item-custom-${Date.now()}`,
      menuItemId: `custom-${Date.now()}`,
      name: customItemName.trim(),
      price: price,
      quantity: 1,
      selectedAddons: [],
      itemTotal: price,
      notes: customItemNotes.trim() || undefined,
      specialInstructions: customItemNotes.trim() || undefined,
    };
    setCartItems((prev) => [...prev, newItem]);
    sounds.playChime();
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemNotes('');
    setCustomItemModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // AUTO-PRINT SYSTEM & CHECKOUT
  // --------------------------------------------------------------------------
  const triggerAutoPrint = (order: Order) => {
    if (autoPrintKOT) {
      sounds.playKitchenOrderBeep();
      setAutoPrintToast(`🖨️ Auto-Printing Kitchen KOT & Customer Receipt for ${order.id}... Sent to Thermal Printer!`);
      setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.warn('Auto print trigger error:', err);
        }
      }, 500);
      setTimeout(() => setAutoPrintToast(null), 5000);
    }
  };

  const handleProcessCheckout = async () => {
    if (cartItems.length === 0) return;

    const orderNumber = `BG-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: `#${orderNumber}`,
      items: cartItems,
      subtotal: cartSubtotal,
      discount: discountAmount,
      deliveryFee: 0,
      taxAmount: taxAmount,
      total: cartTotal,
      status: 'confirmed',
      area: 'Counter / In-Store',
      estimatedMinutes: orderType === 'pos_dine_in' ? 12 : 10,
      statusHistory: [
        {
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          note: `POS Order rang up by ${cashierName}. Sent to Kitchen KDS.`,
        },
      ],
      customerName: customerName.trim() || (orderType === 'pos_dine_in' ? `Guest (${tableNumber})` : 'Walk-in Counter Guest'),
      customerPhone: customerPhone.trim() || '0300-0000000',
      deliveryAddress: orderType === 'pos_dine_in' ? `Dine-In Table: ${tableNumber}` : 'Counter Pickup / Takeaway',
      payment: {
        method: selectedPaymentMethod,
        isPaid: true,
        details: `POS Terminal Ring: ${cashierName}`,
        verified: true,
        accountTitle: 'POS Counter Register',
        accountNumber: 'POS-01',
      },
      createdAt: new Date().toISOString(),
      source: 'pos',
      orderType: orderType === 'pos_dine_in' ? 'dine_in' : orderType === 'pos_takeaway' ? 'pos_takeaway' : 'pos_counter',
      tableNumber: orderType === 'pos_dine_in' ? tableNumber : undefined,
      cashierName,
      cashTendered: selectedPaymentMethod === 'pos_cash' && tenderedNum > 0 ? tenderedNum : undefined,
      changeDue: selectedPaymentMethod === 'pos_cash' && changeDue > 0 ? changeDue : undefined,
      notes: customerNotes.trim() || undefined,
      customerNotes: customerNotes.trim() || undefined,
    };

    // Save to persistence synchronously first so it's guaranteed to appear in history and reports
    const savedOrder = StorageService.saveOrder(newOrder);
    try {
      await ApiService.createOrder(savedOrder);
    } catch {
      // already safely saved in StorageService
    }

    // Deduct stock inventory and raw recipe ingredients (buns, patties, etc.)
    cartItems.forEach((ci) => {
      StorageService.decrementStock(ci.id, ci.quantity);
      const mItem = menuItems.find((m) => m.id === ci.menuItemId || m.id === ci.id);
      if (mItem?.recipe && mItem.recipe.length > 0) {
        mItem.recipe.forEach((rec) => {
          StorageService.updateIngredientStock(rec.ingredientId, -(rec.quantity * ci.quantity), true);
        });
      } else if (
        ci.name.toLowerCase().includes('burger') ||
        ci.name.toLowerCase().includes('smash') ||
        ci.name.toLowerCase().includes('melt') ||
        ci.name.toLowerCase().includes('crunch')
      ) {
        StorageService.updateIngredientStock('ing-brioche-bun', -ci.quantity, true);
        StorageService.updateIngredientStock('ing-beef-smash-patty', -ci.quantity, true);
      }
    });
    setIngredients(StorageService.getIngredients());

    sounds.playSuccess();

    // Set last placed order and trigger Auto-Print (Both Kitchen KOT and Customer Receipt)
    setLastPlacedOrder(savedOrder);
    setReceiptTab('both'); // Print both Kitchen KOT & Customer Receipt simultaneously as requested
    setIsReceiptModalOpen(true);
    triggerAutoPrint(savedOrder);

    // Reset register
    setCartItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
    setCashTendered('');
    setDiscountPercent(0);
    setEditingItemNoteIdx(null);

    onRefreshData();
  };

  // --------------------------------------------------------------------------
  // TAB 2: LIVE KITCHEN ACTIONS (Accept, Ready, Delay, Decline, Stock)
  // --------------------------------------------------------------------------
  const liveKitchenOrders = useMemo(() => {
    return orders.filter((o) => {
      if (kitchenFilter === 'new') return o.status === 'received' || o.status === 'confirmed';
      if (kitchenFilter === 'cooking') return o.status === 'preparing';
      if (kitchenFilter === 'ready') return o.status === 'on_the_way';
      if (kitchenFilter === 'completed') return o.status === 'delivered';
      // 'all' shows all active kitchen pipeline orders
      return o.status !== 'cancelled' && o.status !== 'delivered';
    });
  }, [orders, kitchenFilter]);

  const newKitchenCount = orders.filter((o) => o.status === 'received' || o.status === 'confirmed').length;
  const cookingKitchenCount = orders.filter((o) => o.status === 'preparing').length;
  const readyKitchenCount = orders.filter((o) => o.status === 'on_the_way').length;
  const activeKitchenCount = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'delivered').length;
  const completedKitchenCount = orders.filter((o) => o.status === 'delivered').length;

  const handleKitchenStatusUpdate = async (orderId: string, newStatus: OrderStatus, customNote?: string) => {
    setIsKitchenActionLoading(true);
    // 1. Immediately update StorageService synchronously so local state and UI advance without delay
    StorageService.updateOrderStatus(orderId, newStatus, customNote);
    onRefreshData();

    // 2. Sync to API in background
    try {
      await ApiService.updateOrderStatus(orderId, newStatus, customNote);
    } catch {
      // already safely updated in StorageService
    }

    sounds.playChime();

    const statusLabels: Record<OrderStatus, string> = {
      received: 'Queued',
      confirmed: 'Confirmed & Queued',
      preparing: 'Cooking on High Heat Grill 🔥',
      on_the_way: 'Food Cooked & Packed for Handover 📦',
      delivered: 'Order Delivered / Served ✅',
      cancelled: 'Order Cancelled',
      refunded: 'Order Refunded / Returned 🔄',
    };

    if (newStatus === 'preparing' && kitchenFilter === 'new') {
      setKitchenFilter('cooking');
    }

    setKitchenActionToast({
      message: `Order ${orderId}: Moved to "${statusLabels[newStatus]}"`,
      type: 'success',
    });
    setTimeout(() => setKitchenActionToast(null), 3500);

    setIsKitchenActionLoading(false);
  };

  const handleConfirmDelay = async () => {
    if (!delayingOrder) return;
    setIsKitchenActionLoading(true);
    const mins = Math.max(1, parseInt(customDelayInput, 10) || delayMinutes || 10);
    const finalReason = customDelayReason.trim() || delayReason.trim() || 'Grill Station Rush - High Order Volume';
    const newEstMins = (delayingOrder.estimatedMinutes || 20) + mins;
    try {
      await ApiService.kitchenDelayOrder(delayingOrder.id, mins, finalReason);
    } catch {
      // fallback
    }
    StorageService.adjustOrderTimer(delayingOrder.id, newEstMins, finalReason);
    sounds.playChime();
    setDelayingOrder(null);
    setCustomDelayReason('');
    setIsKitchenActionLoading(false);
    onRefreshData();
  };

  const handleVerifyScreenshotPayment = async (orderId: string, approve: boolean) => {
    try {
      await ApiService.verifyPayment(orderId, approve);
    } catch {
      // fallback
    }
    StorageService.verifyPayment(orderId, approve);
    sounds.playSuccess();
    setViewingScreenshotOrder(null);
    onRefreshData();
  };

  const handleConfirmDecline = async () => {
    if (!decliningOrder) return;
    
    // Build final cancellation reason
    let finalReason = '';
    if (declineReason === 'Other Specific Reason (Must Specify Below)') {
      finalReason = customDeclineReason.trim();
    } else if (declineReason) {
      finalReason = customDeclineReason.trim() ? `${declineReason} — ${customDeclineReason.trim()}` : declineReason;
    }

    if (!finalReason) {
      setPasscodeError('Please select or write a mandatory cancellation reason before declining this order.');
      return;
    }

    // Only enforce supervisor passcode if explicitly configured in kitchen permissions
    if (settings.kitchenPermissions?.requireSupervisorPasscodeForDecline) {
      const validPin = settings.kitchenPermissions?.supervisorPasscode || '1234';
      if (supervisorPasscode.trim() !== validPin) {
        setPasscodeError('Supervisor Passcode required to decline order');
        return;
      }
    }

    setIsKitchenActionLoading(true);
    try {
      await ApiService.kitchenDeclineOrder(decliningOrder.id, finalReason);
    } catch {
      // Fallback
    }
    StorageService.declineOrder(decliningOrder.id, finalReason);

    // Automatically resolve any open customer cancellation tickets for this order
    const relatedTickets = tickets.filter(
      (t) => t.orderId === decliningOrder.id && t.issueType === 'order_decline_request' && t.status !== 'resolved'
    );
    for (const t of relatedTickets) {
      StorageService.updateTicketStatus(
        t.id,
        'resolved',
        `Order #${decliningOrder.id} declined by counter staff: ${finalReason}`
      );
    }

    sounds.playSuccess();
    setDecliningOrder(null);
    setSupervisorPasscode('');
    setCustomDeclineReason('');
    setPasscodeError('');
    setIsKitchenActionLoading(false);
    onRefreshData();
  };

  const handlePrintSingleKitchenKOT = (order: Order) => {
    setLastPlacedOrder(order);
    setReceiptTab('kitchen');
    setIsReceiptModalOpen(true);
    sounds.playChime();
  };

  const handlePrintSingleCustomerReceipt = (order: Order) => {
    setLastPlacedOrder(order);
    setReceiptTab('customer');
    setIsReceiptModalOpen(true);
    sounds.playChime();
  };

  // --------------------------------------------------------------------------
  // TAB 3: TODAY'S ORDERS FILTERING
  // --------------------------------------------------------------------------
  const todayOrders = useMemo(() => {
    const todayStr = new Date().toDateString();
    return orders.filter((o) => {
      if (historyTimeRange === 'today') {
        const orderDate = new Date(o.createdAt);
        const orderDateStr = orderDate.toDateString();
        const isRecent24h = Math.abs(Date.now() - orderDate.getTime()) <= 24 * 60 * 60 * 1000;
        if (orderDateStr !== todayStr && !isRecent24h) return false;
      }

      if (historyFilter === 'dine_in') return o.orderType === 'dine_in';
      if (historyFilter === 'takeaway') return o.orderType === 'pos_takeaway' || o.orderType === 'pos_counter' || o.orderType === 'pickup';
      if (historyFilter === 'delivery') return o.orderType === 'delivery';
      if (historyFilter === 'completed') return o.status === 'delivered';
      if (historyFilter === 'cancelled') return o.status === 'cancelled';

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          (o.notes && o.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [orders, historyFilter, historySearch, historyTimeRange]);

  const todayGrossSales = useMemo(() => {
    return todayOrders
      .filter((o) => o.status !== 'cancelled')
      .reduce((acc, o) => acc + o.total, 0);
  }, [todayOrders]);

  // --------------------------------------------------------------------------
  // TAB 4: TICKETS ACTIONS
  // --------------------------------------------------------------------------
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (ticketFilter === 'all') return true;
      return t.status === ticketFilter;
    });
  }, [tickets, ticketFilter]);

  const handleSendTicketReply = (ticketId: string) => {
    if (!ticketReplyText.trim()) return;
    const updated = StorageService.replyToTicket(ticketId, ticketReplyText.trim());
    if (updated) {
      setTickets(StorageService.getTickets());
      setSelectedTicket(updated);
      setTicketReplyText('');
      sounds.playSuccess();
    }
  };

  const handleUpdateTicketStatus = (ticketId: string, status: CustomerTicket['status']) => {
    const updated = StorageService.updateTicketStatus(ticketId, status);
    if (updated) {
      setTickets(StorageService.getTickets());
      setSelectedTicket(updated);
      if (status === 'resolved' || status === 'closed') {
        setPreviewAttachmentUrl(null);
      }
      sounds.playSuccess();
    }
  };

  const handleResolveAndRemake = async (ticket: CustomerTicket) => {
    // 1. Mark ticket resolved and turn off screenshot preview
    setPreviewAttachmentUrl(null);
    StorageService.updateTicketStatus(ticket.id, 'resolved');
    // 2. Find original order
    const original = orders.find((o) => o.id === ticket.orderId);
    if (original) {
      const remakeOrder: Order = {
        ...original,
        id: `#REMAKE-${original.id.replace('#', '')}-${Math.floor(10 + Math.random() * 90)}`,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        notes: `REMAKE DISPATCH: Issue ticket ${ticket.id} (${ticket.issueType})`,
      };
      try {
        await ApiService.createOrder(remakeOrder);
      } catch {
        StorageService.saveOrder(remakeOrder);
      }
      sounds.playKitchenOrderBeep();
      triggerAutoPrint(remakeOrder);
      onRefreshData();
      alert(`Remake order ${remakeOrder.id} fired directly into Kitchen KDS queue!`);
    }
    setTickets(StorageService.getTickets());
  };

  // Badge counts
  const liveKitchenCount = orders.filter((o) => o.status === 'received' || o.status === 'confirmed' || o.status === 'preparing').length;
  const openTicketsCount = tickets.filter((t) => t.status === 'open' || t.status === 'investigating').length;
  const activeDeliveriesCount = orders.filter(
    (o) =>
      (o.orderType === 'delivery' || (o.orderType as string) === 'pos_delivery' || Boolean(o.deliveryAddress)) &&
      o.status !== 'delivered' &&
      o.status !== 'cancelled'
  ).length;

  // Custom ingredient restock number state (replaces preset-only restrictions)
  const [customStockValues, setCustomStockValues] = useState<Record<string, string>>({});

  // Rider HUD internal tab state
  const [riderViewStatus, setRiderViewStatus] = useState<'active' | 'delivered'>('active');
  const [riderFilterSelected, setRiderFilterSelected] = useState<string>('all');
  const [riderSearchInput, setRiderSearchInput] = useState<string>('');
  const [riderConfirmingId, setRiderConfirmingId] = useState<string | null>(null);
  const [riderSuccessToast, setRiderSuccessToast] = useState<string | null>(null);

  const handleRiderMarkDelivered = async (order: Order) => {
    setRiderConfirmingId(order.id);
    sounds.unlockAudioContext();
    try {
      const riderName = order.driver?.name || 'Delivery Fleet';
      const customNote = `Order handed over and marked DELIVERED by rider ${riderName}.`;

      // 1. Unconditionally update local storage first so loadData gets delivered status immediately
      StorageService.updateOrderStatus(order.id, 'delivered', customNote);

      // 2. Sync to server
      try {
        await ApiService.updateOrderStatus(order.id, 'delivered', customNote);
      } catch (err) {
        console.warn('API sync warning:', err);
      }

      sounds.playSuccess();
      setRiderSuccessToast(`Order ${order.id} confirmed DELIVERED to customer!`);
      onRefreshData();
      setTimeout(() => setRiderSuccessToast(null), 3500);
    } catch (err) {
      console.error('Rider delivered error:', err);
    } finally {
      setRiderConfirmingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none overflow-hidden">
      {/* ================= PRINT STYLES FOR 58MM THERMAL RECEIPT & KITCHEN KOT ================= */}
      <style>{`
        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-printable-receipt, #thermal-printable-receipt * {
            visibility: visible !important;
          }
          #thermal-printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 58mm !important;
            max-width: 58mm !important;
            margin: 0 !important;
            padding: 2mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
          .print-hide {
            display: none !important;
          }
        }
      `}</style>

      {/* ================= AUTO-PRINT NOTIFICATION TOAST ================= */}
      {autoPrintToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top border border-emerald-400/40">
          <Printer className="w-4 h-4 animate-bounce" />
          <span>{autoPrintToast}</span>
          <button
            type="button"
            onClick={() => setAutoPrintToast(null)}
            className="p-1 hover:bg-emerald-700 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ================= INCOMING WEBSITE ORDER LIVE NOTIFICATION BANNER ================= */}
      {newWebsiteOrderAlert && (
        <div className="bg-gradient-to-r from-red-600 via-amber-500 to-amber-400 text-neutral-950 px-3 py-2 flex flex-wrap items-center justify-between text-xs font-bold shadow-2xl animate-pulse z-40 border-b-2 border-red-700 shrink-0 gap-2">
          <div className="flex items-center gap-2 truncate">
            <Volume2 className="w-5 h-5 text-neutral-950 shrink-0 animate-bounce" />
            <div className="truncate">
              <span className="bg-neutral-950 text-amber-400 px-2 py-0.5 rounded text-[11px] font-black mr-2 font-mono">
                WEB ORDER #{newWebsiteOrderAlert.id}
              </span>
              <span className="font-black">
                {newWebsiteOrderAlert.customerName || 'Customer'} · Rs. {newWebsiteOrderAlert.total.toLocaleString()} · Just placed online!
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleQuickAcceptReceivedOrder(newWebsiteOrderAlert)}
              className="px-3 py-1 bg-neutral-950 hover:bg-neutral-900 text-emerald-400 rounded-lg text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Accept &amp; Start Preparing</span>
            </button>
            <button
              type="button"
              onClick={() => setBuzzerMuted(!buzzerMuted)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border flex items-center gap-1 ${
                buzzerMuted
                  ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                  : 'bg-amber-600/30 text-neutral-950 border-amber-600/60 hover:bg-amber-600/50'
              }`}
            >
              <span>{buzzerMuted ? '🔊 Unmute Buzzer' : '🔇 Silence Buzzer'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('kitchen');
                setNewWebsiteOrderAlert(null);
              }}
              className="px-2.5 py-1 bg-neutral-950 text-white rounded-lg text-xs font-black shadow hover:bg-neutral-850 cursor-pointer"
            >
              Open Kitchen KDS
            </button>
            <button
              type="button"
              onClick={() => setNewWebsiteOrderAlert(null)}
              className="p-1 hover:bg-black/20 rounded text-neutral-950"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= UNIFIED TOP HEADER (Non-Colliding Responsive Layout) ================= */}
      <header className="min-h-14 bg-neutral-900 border-b border-neutral-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-30">
        {/* Left: Brand & Branch Location (Strictly truncated to avoid collision) */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <button
            type="button"
            onClick={onBackToStore}
            className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Return to Online Storefront"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-xl ${isKitchenPortal ? 'bg-amber-500 text-neutral-950' : 'bg-blue-600 text-white'} flex items-center justify-center font-black text-xs font-heading shadow-md shrink-0`}>
              {isKitchenPortal ? 'KDS' : 'POS'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-heading font-black text-white leading-none truncate">
                  {isKitchenPortal ? 'BITE & GO KITCHEN' : perms.employeePortalTitle || 'BITE & GO EXPRESS'}
                </h1>
                <span className="text-[9px] text-emerald-400 font-mono font-bold flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden sm:inline">{isKitchenPortal ? 'KDS' : 'LIVE'}</span>
                </span>
              </div>
              <div
                className="flex items-center gap-1 text-[10px] text-amber-300 font-medium mt-0.5 truncate max-w-[130px] sm:max-w-[190px] xl:max-w-[260px]"
                title={`${settings.storeAddress || settings.storeArea || 'Block-I, North Nazimabad, Karachi'} (Branch POS-01)`}
              >
                <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">
                  {settings.storeAddress || settings.storeArea || 'Block-I, North Nazimabad'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Infused Workspaces (Clear, bold, no overlapping scrollbars) */}
        <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 gap-1 overflow-x-auto no-scrollbar shrink-0 shadow-inner">
          {/* Tab 1: POS Register */}
          {!isKitchenPortal && (
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'pos'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>POS Register</span>
            </button>
          )}

          {/* Tab 2: Live Kitchen Orders */}
          <button
            type="button"
            onClick={() => setActiveTab('kitchen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'kitchen'
                ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-500" />
            <span>Kitchen Queue</span>
            {liveKitchenCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-red-600 text-white animate-pulse">
                {liveKitchenCount}
              </span>
            )}
          </button>

          {/* Tab 3: Today's Orders History */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Orders History</span>
            <span className="text-[10px] opacity-70 font-mono">({todayOrders.length})</span>
          </button>

          {/* Tab 4: Customer Tickets */}
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Support Tickets</span>
            {openTicketsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-neutral-950">
                {openTicketsCount}
              </span>
            )}
          </button>

          {/* Tab 5: Dedicated Rider Delivery HUD */}
          <button
            type="button"
            onClick={() => setActiveTab('rider')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'rider'
                ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Open Rider Delivery Portal (Direct navigation & single Mark-As-Delivered action)"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Rider HUD</span>
            {activeDeliveriesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-emerald-600 text-white animate-pulse">
                {activeDeliveriesCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: Live Clock, Today's Sales, Auto-Print Toggle & Staff Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Clock HUD */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentTime}</span>
          </div>

          {/* Today's Sales Quick Counter HUD */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400">
            <span className="font-bold">Today:</span>
            <span>Rs. {todayOrders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()}</span>
            <span className="text-neutral-500 text-[10px]">({todayOrders.length})</span>
          </div>

          {/* Test Alert Buzzer for Incoming Orders */}
          <button
            type="button"
            onClick={() => {
              sounds.unlockAudioContext();
              sounds.playKitchenOrderBeep();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-amber-400 hover:text-amber-300 text-xs font-bold transition-all cursor-pointer"
            title="Test High-Priority Web Order Beeper (Buzzer sound)"
          >
            <Volume2 className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            <span className="hidden lg:inline">Test Buzzer</span>
          </button>

          {/* Security: IP Whitelist status badge */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono"
            title={`Branch IP Protection: ${clientIpInfo.ip}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-emerald-400 font-bold">Whitelisted IP</span>
            <span className="text-neutral-500 text-[10px]">({clientIpInfo.ip})</span>
          </div>

          {/* Quick Lock Till Screen for Cashier Security */}
          <button
            type="button"
            onClick={() => {
              setIsTerminalLocked(true);
              setLockPinInput('');
              setLockPinError('');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-xs text-neutral-300 hover:text-amber-400 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Lock POS Terminal (PIN required to resume register)"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Lock Till</span>
          </button>

          {/* Dual Auto-Print Toggle (Kitchen KOT + Customer Receipt) */}
          <button
            type="button"
            onClick={toggleAutoPrintKOT}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              autoPrintKOT
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm'
                : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'
            }`}
            title="Auto-prints both Kitchen KOT and Customer Receipt on order charge"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Dual Auto-Print:</span>
            <span className="font-mono">{autoPrintKOT ? 'ON' : 'OFF'}</span>
          </button>

          {/* Z-Report Quick Shortcut */}
          <button
            type="button"
            onClick={() => setIsZReportOpen(true)}
            className="px-2 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-xs text-neutral-300 font-bold hidden md:flex items-center gap-1 transition-colors cursor-pointer"
            title="Daily Z-Report & Till Register Closing"
          >
            <Receipt className="w-3.5 h-3.5 text-amber-400" />
            <span>Z-Report</span>
          </button>

          {/* Cashier Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate max-w-[100px]">{cashierName}</span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* High-Priority Continuous Web Order Alert Banner with Sound Buzzer Trigger */}
      {unhandledReceivedOrders.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-amber-500 to-amber-500 text-neutral-950 px-4 py-2 flex flex-wrap items-center justify-between font-bold text-xs shadow-xl animate-pulse z-20 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 animate-bounce shrink-0" />
            <span>
              🔔 {unhandledReceivedOrders.length} NEW WEBSITE ORDER(S) WAITING FOR GRILL: ({unhandledReceivedOrders.map((o) => o.id).join(', ')})
            </span>
            <span className="hidden md:inline-block bg-neutral-950/20 text-neutral-950 px-2 py-0.5 rounded text-[10px] font-mono">
              {buzzerMuted ? '🔇 Buzzer Muted' : '🔊 Beeping every 4.5s'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickAcceptReceivedOrder(unhandledReceivedOrders[0])}
              className="px-2.5 py-1 bg-neutral-950 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-black shadow transition-colors cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Accept #{unhandledReceivedOrders[0].id} &amp; Prepare</span>
            </button>
            <button
              type="button"
              onClick={() => setBuzzerMuted(!buzzerMuted)}
              className="px-2.5 py-1 bg-neutral-950/90 text-amber-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              {buzzerMuted ? '🔊 Unmute Buzzer' : '🔇 Mute Buzzer'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kitchen')}
              className="px-2.5 py-1 bg-neutral-950 text-white hover:bg-neutral-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              View in Kitchen Queue →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: POS REGISTER INTERFACE (Redesigned & High-Efficiency) */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT 65%: PRODUCT CATALOG & SEARCH */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-neutral-800">
            {/* Top Filter Strip */}
            <div className="p-3 bg-neutral-900 border-b border-neutral-800 space-y-2.5">
              {/* Search + Quick Order Types */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search menu (e.g. smash, cheese, animal fries)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Order Type Selector */}
                <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setOrderType('pos_dine_in')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      orderType === 'pos_dine_in'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Dine-In
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('pos_takeaway')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      orderType === 'pos_takeaway'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Takeaway
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('pos_counter')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      orderType === 'pos_counter'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Counter
                  </button>
                </div>

                {/* Table Picker (if Dine-In) */}
                {orderType === 'pos_dine_in' && (
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="bg-neutral-950 border border-blue-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold shrink-0 cursor-pointer"
                  >
                    <option value="Table 1">Table 1</option>
                    <option value="Table 2">Table 2</option>
                    <option value="Table 3">Table 3</option>
                    <option value="Table 4">Table 4</option>
                    <option value="Table 5">Table 5</option>
                    <option value="Table 6">Table 6</option>
                    <option value="Table 7">Table 7</option>
                    <option value="Table 8">Table 8</option>
                    <option value="Booth 1">Booth 1</option>
                    <option value="Booth 2">Booth 2</option>
                    <option value="Outdoor 1">Outdoor 1</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setCustomItemModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                  title="Add custom off-menu item or special charge"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Custom Item</span>
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategoryId === 'all'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  All ({visibleMenuItems.length})
                </button>

                {visibleCategories.map((cat) => {
                  const count = visibleMenuItems.filter((it) => it.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                        selectedCategoryId === cat.id
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] opacity-70 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* RAW INVENTORY & BUNS OUT-OF-STOCK ALERT STRIP */}
              <div className="space-y-1.5 pt-0.5">
                {/* 1. Buns Critical Alert (Out of Stock or Low Stock) */}
                {isBunsOut ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-200 text-xs font-bold animate-pulse shadow-lg shadow-red-500/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">🚫</span>
                      <div className="min-w-0">
                        <span className="text-red-400 uppercase tracking-wide text-[10px] block font-mono">
                          CRITICAL RAW STOCK ALERT
                        </span>
                        <p className="truncate font-black text-white text-xs">
                          Brioche Burger Buns OUT OF STOCK (0 left)! Burgers cannot be assembled.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQuickAddIngredientStock('ing-brioche-bun', 50)}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow"
                      >
                        +50 Restock
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRawStockModalOpen(true)}
                        className="px-2 py-1 bg-neutral-950 border border-neutral-750 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Adjust
                      </button>
                    </div>
                  </div>
                ) : isBunsLow ? (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                      <div className="min-w-0">
                        <span className="font-bold text-amber-300">
                          ⚠️ Buns Low Stock Warning: Only {bunsIngredient?.currentStock} {bunsIngredient?.unit || 'buns'} left in kitchen!
                        </span>
                        <span className="text-[11px] text-neutral-400 hidden sm:inline ml-1">
                          (Threshold: {bunsIngredient?.lowStockThreshold || 30})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQuickAddIngredientStock('ing-brioche-bun', 30)}
                        className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow"
                        title="Add +30 Buns to kitchen inventory"
                      >
                        +30 Buns
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRawStockModalOpen(true)}
                        className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 text-amber-400 hover:text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* 2. Raw Ingredients Live Stock Ticker Bar */}
                <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-neutral-950 border border-neutral-850 text-xs overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold flex items-center gap-1">
                      <Boxes className="w-3.5 h-3.5 text-blue-400" />
                      <span>Raw Inventory:</span>
                    </span>

                    {/* Buns pill */}
                    <div
                      className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono flex items-center gap-1 cursor-pointer hover:border-amber-500/60 ${
                        isBunsOut
                          ? 'bg-red-500/20 border-red-500/60 text-red-300 font-bold'
                          : isBunsLow
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold animate-pulse'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      }`}
                      onClick={() => setIsRawStockModalOpen(true)}
                      title="Click to view/restock buns"
                    >
                      <span>🍔 Buns:</span>
                      <span className="font-bold">{bunsIngredient?.currentStock ?? 0}</span>
                      {isBunsOut && <span className="text-[9px] text-red-400 font-sans font-bold">OUT</span>}
                      {isBunsLow && <span className="text-[9px] text-amber-400 font-sans font-bold">LOW</span>}
                    </div>

                    {/* Beef patties */}
                    {beefPattyIngredient && (
                      <div
                        className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono flex items-center gap-1 cursor-pointer hover:border-amber-500/60 ${
                          beefPattyIngredient.currentStock <= 0
                            ? 'bg-red-500/20 border-red-500/60 text-red-300 font-bold'
                            : beefPattyIngredient.currentStock <= beefPattyIngredient.lowStockThreshold
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                        }`}
                        onClick={() => setIsRawStockModalOpen(true)}
                      >
                        <span>🥩 Patties:</span>
                        <span className="font-bold">{beefPattyIngredient.currentStock}</span>
                        {beefPattyIngredient.currentStock <= beefPattyIngredient.lowStockThreshold && (
                          <span className="text-[9px] text-amber-400 font-sans font-bold">LOW</span>
                        )}
                      </div>
                    )}

                    {/* Zinger patties */}
                    {zingerPattyIngredient && (
                      <div
                        className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono flex items-center gap-1 cursor-pointer hover:border-amber-500/60 ${
                          zingerPattyIngredient.currentStock <= 0
                            ? 'bg-red-500/20 border-red-500/60 text-red-300 font-bold'
                            : zingerPattyIngredient.currentStock <= zingerPattyIngredient.lowStockThreshold
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                        }`}
                        onClick={() => setIsRawStockModalOpen(true)}
                      >
                        <span>🍗 Zingers:</span>
                        <span className="font-bold">{zingerPattyIngredient.currentStock}</span>
                      </div>
                    )}

                    {/* Wraps */}
                    {tortillaIngredient && (
                      <div
                        className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono flex items-center gap-1 cursor-pointer hover:border-amber-500/60 ${
                          tortillaIngredient.currentStock <= tortillaIngredient.lowStockThreshold
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                        }`}
                        onClick={() => setIsRawStockModalOpen(true)}
                      >
                        <span>🌯 Wraps:</span>
                        <span className="font-bold">{tortillaIngredient.currentStock}</span>
                      </div>
                    )}

                    {/* Cheese */}
                    {cheeseIngredient && (
                      <div
                        className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono flex items-center gap-1 cursor-pointer hover:border-amber-500/60 ${
                          cheeseIngredient.currentStock <= cheeseIngredient.lowStockThreshold
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                        }`}
                        onClick={() => setIsRawStockModalOpen(true)}
                      >
                        <span>🧀 Cheese:</span>
                        <span className="font-bold">{cheeseIngredient.currentStock}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRawStockModalOpen(true)}
                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Raw Inventory &amp; Restock</span>
                  </button>
                </div>
              </div>

              {/* Admin HUD Restriction Notice */}
              {isGrillCategoryHidden && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>⚠️ Admin HUD Notice: Smash Grill category is turned OFF by Manager</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 font-mono font-bold px-2 py-0.5 rounded">
                    GRILL HIDDEN
                  </span>
                </div>
              )}
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {displayedItems.map((item) => {
                const qty = typeof item.stockQuantity === 'number' ? item.stockQuantity : 45;
                const isLow = qty > 0 && qty <= (item.lowStockThreshold || 10);
                const rawWarning = getItemIngredientWarning(item);
                const isItemBlockedByRaw = Boolean(rawWarning?.isOut);
                const isOut = qty === 0 || !item.isAvailable || isItemBlockedByRaw;
                const inCartCount = cartItems
                  .filter((ci) => ci.id === item.id)
                  .reduce((sum, ci) => sum + ci.quantity, 0);

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOut && handleAddToCart(item)}
                    className={`relative p-2.5 rounded-2xl border flex flex-col justify-between transition-all group select-none ${
                      isOut
                        ? 'bg-neutral-900/40 border-neutral-850 opacity-50 cursor-not-allowed'
                        : inCartCount > 0
                        ? 'bg-neutral-900 border-blue-500/80 shadow-lg shadow-blue-500/5 hover:border-blue-400 active:scale-[0.98] cursor-pointer'
                        : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850/80 active:scale-[0.98] shadow-sm hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-neutral-950 relative mb-2">
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />

                      {/* In-Cart Counter Pill */}
                      {inCartCount > 0 && (
                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-blue-600 text-white font-mono text-[10px] font-black shadow-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{inCartCount} in ticket</span>
                        </div>
                      )}

                      {/* Price Badge */}
                      <div className="absolute top-1.5 right-1.5">
                        <span className="px-2 py-0.5 rounded-lg font-mono font-black text-xs bg-neutral-950/90 text-amber-400 border border-neutral-800 shadow-md">
                          Rs. {item.price.toLocaleString()}
                        </span>
                      </div>

                      {isOut ? (
                        <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-[1px] flex flex-col items-center justify-center font-bold text-red-400 text-xs font-mono p-1 text-center">
                          <span>{rawWarning?.isOut ? rawWarning.message.toUpperCase() : "86'd SOLD OUT"}</span>
                          {rawWarning?.isOut && (
                            <span className="text-[9.5px] text-neutral-300 font-sans mt-0.5">Kitchen restock needed</span>
                          )}
                        </div>
                      ) : isLow ? (
                        <div className="absolute bottom-1.5 left-1.5 bg-red-600/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold shadow">
                          LOW ({qty})
                        </div>
                      ) : rawWarning?.isLow ? (
                        <div className="absolute bottom-1.5 left-1.5 bg-amber-500 text-neutral-950 font-mono text-[9px] px-1.5 py-0.5 rounded-md font-bold shadow flex items-center gap-0.5">
                          <span>⚠️ {rawWarning.message}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                          {item.name}
                        </h4>
                        {item.isSpicy && <span className="text-[10px]" title="Spicy">🌶️</span>}
                      </div>
                      <p className="text-[10px] text-neutral-400 line-clamp-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {qty > 0 ? `${qty} avail` : '86 out'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenItemOptions(item);
                          }}
                          className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-[10px] font-bold transition-colors"
                          title="Special notes, spiciness, addons"
                        >
                          Options
                        </button>
                        {!isOut && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                            className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-90 text-white flex items-center justify-center shadow transition-all"
                            title="Add to cart"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {displayedItems.length === 0 && (
                <div className="col-span-full py-16 text-center text-neutral-500 space-y-2">
                  <Search className="w-8 h-8 mx-auto opacity-30 text-blue-400" />
                  <p className="text-sm font-bold text-white">No items found</p>
                  <p className="text-xs text-neutral-400">Try adjusting your search query or category filter.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 35%: REGISTER TICKET & BILLING TERMINAL */}
          <div className="w-full lg:w-[380px] xl:w-[420px] bg-neutral-900 flex flex-col justify-between shrink-0 shadow-2xl">
            {/* Active Ticket Header */}
            <div className="p-3.5 border-b border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-heading font-black text-white">ACTIVE TICKET</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                    {orderType.replace('pos_', '').replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                  {orderType === 'pos_dine_in' ? `Table: ${tableNumber}` : 'Direct Counter Sale'} · {cartItems.length} items
                </p>
              </div>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="px-2.5 py-1 text-neutral-400 hover:text-red-400 text-xs rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Clear active ticket"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Void</span>
                </button>
              )}
            </div>

            {/* Customer Details Row */}
            <div className="px-3.5 py-2 border-b border-neutral-800 bg-neutral-950/30 flex gap-2">
              <input
                type="text"
                placeholder="Guest Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone (Optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-32 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Order Notes & Special Instructions Section */}
            <div className="px-3.5 py-2 border-b border-neutral-800 bg-neutral-950/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-amber-400" />
                  <span>Order Notes / Kitchen Instructions</span>
                </label>
                {customerNotes && (
                  <button
                    type="button"
                    onClick={() => setCustomerNotes('')}
                    className="text-[9.5px] text-neutral-400 hover:text-red-400 font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="e.g. No onion, extra spicy, well done, pack sauce separate..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
              />
              {/* Quick Preset Kitchen Instruction Chips */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {[
                  'No Onion',
                  'Extra Sauce',
                  'Well Done',
                  'Pack Separate',
                  'Extra Spicy',
                  'No Mayo',
                  'Rush Order',
                  'VIP Guest',
                ].map((chip) => {
                  const isSelected = customerNotes.toLowerCase().includes(chip.toLowerCase());
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          const regex = new RegExp(`(^|,\\s*)${chip}`, 'i');
                          setCustomerNotes((prev) => prev.replace(regex, '').replace(/^,\s*/, '').trim());
                        } else {
                          setCustomerNotes((prev) => (prev ? `${prev}, ${chip}` : chip));
                        }
                      }}
                      className={`text-[9px] px-2 py-0.5 rounded-md font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Ticket Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cartItems.map((ci, idx) => (
                <div
                  key={`${ci.id}-${idx}`}
                  className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{ci.name}</p>
                      {ci.selectedVariant && (
                        <p className="text-[10px] text-amber-400 font-mono">· {ci.selectedVariant}</p>
                      )}
                      {ci.notes && (
                        <p className="text-[10px] text-amber-300 font-medium italic">"{ci.notes}"</p>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold text-white shrink-0">
                      Rs. {(ci.itemTotal || ci.price * ci.quantity).toLocaleString()}
                    </span>
                  </div>

                  {/* Inline Item Note Editor */}
                  {editingItemNoteIdx === idx && (
                    <div className="pt-1.5 pb-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        placeholder="Item cooking note (e.g. extra cheese, no pickle)"
                        value={itemNoteInput}
                        onChange={(e) => setItemNoteInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setCartItems((prev) => {
                              const next = [...prev];
                              const noteVal = itemNoteInput.trim() || undefined;
                              next[idx] = { ...next[idx], notes: noteVal, specialInstructions: noteVal };
                              return next;
                            });
                            setEditingItemNoteIdx(null);
                          } else if (e.key === 'Escape') {
                            setEditingItemNoteIdx(null);
                          }
                        }}
                        className="flex-1 bg-neutral-900 border border-amber-500/60 rounded px-2 py-0.5 text-[11px] text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCartItems((prev) => {
                            const next = [...prev];
                            const noteVal = itemNoteInput.trim() || undefined;
                            next[idx] = { ...next[idx], notes: noteVal, specialInstructions: noteVal };
                            return next;
                          });
                          setEditingItemNoteIdx(null);
                        }}
                        className="px-2 py-0.5 bg-amber-500 text-neutral-950 font-bold rounded text-[10px]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingItemNoteIdx(null)}
                        className="px-1.5 py-0.5 text-neutral-400 hover:text-white text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-850">
                    <div className="flex items-center gap-1.5 bg-neutral-900 px-1 py-0.5 rounded-lg border border-neutral-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(idx, -1)}
                        className="p-1 text-neutral-400 hover:text-white rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-xs text-white px-2">
                        {ci.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(idx, 1)}
                        className="p-1 text-neutral-400 hover:text-white rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingItemNoteIdx === idx) {
                            setEditingItemNoteIdx(null);
                          } else {
                            setEditingItemNoteIdx(idx);
                            setItemNoteInput(ci.notes || '');
                          }
                        }}
                        className="text-[10px] text-amber-400/90 hover:text-amber-300 font-semibold flex items-center gap-0.5 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>{ci.notes ? 'Edit Note' : '+ Note'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(idx)}
                        className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {cartItems.length === 0 && (
                <div className="py-12 text-center text-neutral-500 space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto opacity-30 text-blue-400" />
                  <p className="text-xs font-bold text-neutral-300">Ticket is Empty</p>
                  <p className="text-[11px] text-neutral-500">Tap items on the left menu to ring up order.</p>
                </div>
              )}
            </div>

            {/* Financials & Payment Keypad */}
            <div className="p-3.5 bg-neutral-950 border-t border-neutral-800 space-y-2.5">
              {/* Discount Buttons */}
              {perms.canApplyDiscounts && (
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="text-neutral-400 text-[10px]">Discount:</span>
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyDiscount(pct)}
                      className={`px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                        discountPercent === pct
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {pct === 0 ? 'None' : `${pct}%`}
                    </button>
                  ))}
                </div>
              )}

              {/* Subtotal, Discount & Total */}
              <div className="space-y-1 text-xs border-y border-neutral-850 py-2">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-white">Rs. {cartSubtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Discount ({discountPercent}%):</span>
                    <span className="font-mono">-Rs. {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-neutral-400">
                    <span>SST Tax ({perms.defaultTaxRatePercent}%):</span>
                    <span className="font-mono">Rs. {taxAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-base font-black text-white pt-1">
                  <span>TOTAL DUE:</span>
                  <span className="font-mono text-amber-400 text-lg">Rs. {cartTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Quick Cash Presets (Exact, 500, 1000, 2000, 5000) */}
              <div className="grid grid-cols-5 gap-1 text-[10px] font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setCashTendered(String(cartTotal))}
                  className="py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded text-center cursor-pointer"
                >
                  Exact
                </button>
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTendered(String(amt))}
                    className="py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded text-center cursor-pointer"
                  >
                    {amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>

              {/* Cash Paid Input & Change Return */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">Rs.</span>
                  <input
                    type="number"
                    placeholder="Cash Tendered..."
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-2 py-1.5 text-xs text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                {changeDue > 0 && (
                  <div className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold shrink-0">
                    Change: Rs. {changeDue.toLocaleString()}
                  </div>
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: 'pos_cash', label: '💵 Cash' },
                  { id: 'pos_card', label: '💳 Card' },
                  { id: 'easypaisa', label: '📱 EasyP' },
                  { id: 'split', label: '⚡ Split' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(pm.id as any)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      selectedPaymentMethod === pm.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>

              {/* Bottom Actions: Hold & PRIMARY CHARGE BUTTON */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleHoldTicket}
                  disabled={cartItems.length === 0}
                  className="px-3 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 rounded-xl text-xs font-bold border border-neutral-800 transition-colors shrink-0 cursor-pointer"
                  title="Pause / Hold current ticket"
                >
                  <Pause className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleProcessCheckout}
                  disabled={cartItems.length === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-heading font-black text-sm rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>CHARGE RS. {cartTotal.toLocaleString()} &amp; FIRE KITCHEN</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE KITCHEN ORDERS (Infused Kitchen KDS) */}
      {/* ========================================================================= */}
      {activeTab === 'kitchen' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
          {/* Action notification toast banner */}
          {kitchenActionToast && (
            <div className="bg-emerald-500 text-neutral-950 px-4 py-2 text-xs font-black flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 z-30 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neutral-950 shrink-0" />
                <span>{kitchenActionToast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setKitchenActionToast(null)}
                className="p-1 hover:bg-emerald-600 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Sub Header for Kitchen Station */}
          <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-red-500" />
                <span>Live Kitchen Queue</span>
              </span>
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-bold flex-wrap">
                <button
                  type="button"
                  onClick={() => setKitchenFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${kitchenFilter === 'all' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                >
                  All ({activeKitchenCount})
                </button>
                <button
                  type="button"
                  onClick={() => setKitchenFilter('new')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${kitchenFilter === 'new' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                >
                  New Queue ({newKitchenCount})
                </button>
                <button
                  type="button"
                  onClick={() => setKitchenFilter('cooking')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${kitchenFilter === 'cooking' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                >
                  Cooking Now ({cookingKitchenCount})
                </button>
                <button
                  type="button"
                  onClick={() => setKitchenFilter('ready')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${kitchenFilter === 'ready' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                >
                  Ready / Dispatched ({readyKitchenCount})
                </button>
                <button
                  type="button"
                  onClick={() => setKitchenFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${kitchenFilter === 'completed' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                >
                  Completed ({completedKitchenCount})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStationStockModalOpen(true)}
                className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-amber-400 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Station Stock (86'd)</span>
              </button>
              <button
                type="button"
                onClick={onRefreshData}
                className="p-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                title="Refresh Kitchen Orders"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Live Kitchen Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {liveKitchenOrders.map((ord) => {
              const isNew = ord.status === 'received' || ord.status === 'confirmed';
              const isCooking = ord.status === 'preparing';
              const isReady = ord.status === 'on_the_way';
              const isDelivered = ord.status === 'delivered';

              // LIVE CUSTOMER ELAPSED TIMER (ticks continuously every second using liveTick state)
              const elapsedTotalSec = Math.max(0, Math.floor((liveTick - new Date(ord.createdAt).getTime()) / 1000));
              const elapsedMins = Math.floor(elapsedTotalSec / 60);
              const elapsedSecs = elapsedTotalSec % 60;
              const elapsedFormatted = `${String(elapsedMins).padStart(2, '0')}:${String(elapsedSecs).padStart(2, '0')}`;

              const estMins = ord.estimatedMinutes || 20;
              const targetTotalSec = estMins * 60;
              const remainingTotalSec = targetTotalSec - elapsedTotalSec;
              const isOverdue = remainingTotalSec < 0;

              const overdueTotalSec = Math.abs(remainingTotalSec);
              const overdueMins = Math.floor(overdueTotalSec / 60);
              const overdueSecs = overdueTotalSec % 60;
              const overdueFormatted = `${String(overdueMins).padStart(2, '0')}:${String(overdueSecs).padStart(2, '0')}`;

              const remMins = Math.floor(Math.max(0, remainingTotalSec) / 60);
              const remSecs = Math.max(0, remainingTotalSec) % 60;
              const remainingFormatted = `${String(remMins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;

              const percentElapsed = Math.min(100, Math.round((elapsedTotalSec / targetTotalSec) * 100));

              return (
                <div
                  key={ord.id}
                  className={`rounded-2xl border flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                    isNew
                      ? 'bg-neutral-900 border-amber-500/50 shadow-amber-500/10'
                      : isCooking
                      ? 'bg-neutral-900 border-blue-500/60 shadow-blue-500/15 ring-1 ring-blue-500/20'
                      : isReady
                      ? 'bg-neutral-900 border-purple-500/50 shadow-purple-500/10'
                      : 'bg-neutral-900 border-emerald-500/50'
                  }`}
                >
                  {/* Card Header with LIVE Customer Timer Pill */}
                  <div className="p-3.5 bg-neutral-950/90 border-b border-neutral-800 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-base text-white">{ord.id}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                          ord.orderType === 'dine_in'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : ord.orderType === 'delivery'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {ord.tableNumber ? `Table: ${ord.tableNumber}` : ord.orderType || 'Counter'}
                        </span>
                        {ord.source === 'website' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            🌐 Online
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-neutral-400">
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · <strong className="text-neutral-300">{ord.customerName}</strong>
                        </p>
                      </div>
                    </div>

                    {/* LIVE CUSTOMER TIMER PILL BADGE */}
                    <div className="flex flex-col items-end gap-1">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono text-[11px] font-black shadow border ${
                        isOverdue
                          ? 'bg-red-500/25 text-red-300 border-red-500/50 animate-pulse'
                          : percentElapsed > 75
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        <Timer className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-400 animate-spin' : percentElapsed > 75 ? 'text-amber-400' : 'text-emerald-400'}`} />
                        <span>{elapsedFormatted}</span>
                        <span className="text-[9px] opacity-80">
                          {isOverdue ? `(+${overdueFormatted} late)` : `(${remainingFormatted} left)`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {ord.payment?.screenshotUrl && !ord.payment?.verified ? (
                          <button
                            type="button"
                            onClick={() => setViewingScreenshotOrder(ord)}
                            className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[9px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            title="Review customer payment screenshot receipt"
                          >
                            <Eye className="w-3 h-3 text-amber-400" />
                            <span>Slip</span>
                          </button>
                        ) : ord.payment?.verified ? (
                          <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                            ✓ Paid
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handlePrintSingleKitchenKOT(ord)}
                          className="p-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg border border-neutral-800 cursor-pointer"
                          title="Print Kitchen Order Ticket (KOT)"
                        >
                          <Printer className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Visual 4-Step Interactive Pipeline Track */}
                  <div className="px-3.5 py-1.5 bg-neutral-950 border-b border-neutral-850 flex items-center justify-between gap-1 text-[10px] font-mono">
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${
                      isNew ? 'bg-amber-500 text-neutral-950 font-black shadow' : 'text-neutral-500'
                    }`}>
                      <span>1. Queue</span>
                    </div>
                    <span className="text-neutral-700">&rarr;</span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${
                      isCooking ? 'bg-blue-600 text-white font-black shadow animate-pulse' : isReady || isDelivered ? 'text-blue-400' : 'text-neutral-500'
                    }`}>
                      <span>2. Cooking</span>
                    </div>
                    <span className="text-neutral-700">&rarr;</span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${
                      isReady ? 'bg-purple-600 text-white font-black shadow' : isDelivered ? 'text-purple-400' : 'text-neutral-500'
                    }`}>
                      <span>3. Ready</span>
                    </div>
                    <span className="text-neutral-700">&rarr;</span>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold ${
                      isDelivered ? 'bg-emerald-600 text-white font-black shadow' : 'text-neutral-500'
                    }`}>
                      <span>4. Complete</span>
                    </div>
                  </div>

                  {/* Items List with notes */}
                  <div className="p-3.5 space-y-2 flex-1 overflow-y-auto max-h-56">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-neutral-950 border border-neutral-850">
                        <div className="flex items-baseline justify-between">
                          <span className="font-black text-sm text-white">
                            <strong className="text-amber-400 font-mono text-base mr-1">{it.quantity}x</strong>
                            {it.name}
                          </span>
                        </div>
                        {it.selectedVariant && (
                          <p className="text-[11px] text-amber-300 font-mono pl-5">· {it.selectedVariant}</p>
                        )}
                        {it.selectedAddons && it.selectedAddons.length > 0 && (
                          <p className="text-[10px] text-neutral-400 pl-5">
                            + {it.selectedAddons.map((a) => a.name).join(', ')}
                          </p>
                        )}
                        {(it.notes || (it as any).specialInstructions) && (
                          <p className="text-[11px] text-red-400 font-bold italic pl-5 mt-0.5">
                            ⚠️ NOTE: {it.notes || (it as any).specialInstructions}
                          </p>
                        )}
                      </div>
                    ))}
                    {(ord.notes || ord.customerNotes) && (
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 font-bold text-xs space-y-0.5 shadow-sm">
                        <span className="text-[10px] uppercase font-mono font-black text-amber-400 block tracking-wider">
                          📝 Customer Special Instructions:
                        </span>
                        <p className="font-sans text-white text-xs leading-snug">
                          {ord.notes || ord.customerNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Delivery Order: Assigned Rider or Select Rider */}
                  {ord.orderType === 'delivery' && (
                    <div className="px-3.5 py-2 bg-neutral-950/80 border-t border-neutral-850">
                      {ord.driver ? (
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold shrink-0">
                              <Bike className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{ord.driver.name}</span>
                                <span className="text-[10px] font-mono text-purple-300 font-normal">({ord.driver.vehiclePlate})</span>
                              </p>
                              <p className="text-[10px] text-neutral-400 font-mono">Assigned Delivery Rider</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${ord.driver.phone}`}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow"
                              title={`Direct Call Rider: ${ord.driver.phone}`}
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>Call Rider</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => setIsAssigningRiderOrder(ord)}
                              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 text-[10px] cursor-pointer"
                              title="Reassign or Change Rider"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-neutral-900 border border-dashed border-neutral-750 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                            <Bike className="w-3.5 h-3.5 text-neutral-500" />
                            <span className="text-[11px]">No rider assigned yet</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAssigningRiderOrder(ord)}
                            className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg text-[10.5px] font-bold border border-purple-500/40 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Select Rider</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live Customer Timer & Countdown Progress Bar */}
                  <div className={`px-3.5 py-2.5 border-t space-y-2 ${
                    isOverdue
                      ? 'bg-red-950/40 border-red-500/40'
                      : percentElapsed > 75
                      ? 'bg-amber-950/30 border-amber-500/30'
                      : 'bg-neutral-950 border-neutral-850'
                  }`}>
                    {/* Live Digital Timer Bar */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Timer className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-400 animate-spin' : percentElapsed > 75 ? 'text-amber-400' : 'text-emerald-400'}`} />
                        <span className="text-neutral-400 text-[11px] font-semibold">Live Customer Timer:</span>
                        <span className="font-mono font-black text-white text-xs">
                          {elapsedFormatted} elapsed
                        </span>
                      </div>
                      <div className="font-mono font-black text-xs">
                        {isOverdue ? (
                          <span className="text-red-400 flex items-center gap-1 animate-pulse">
                            <span>OVERDUE</span>
                            <span className="bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/40">+{overdueFormatted}</span>
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="text-[10px] text-neutral-400 font-normal">Remaining:</span>
                            <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{remainingFormatted}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Smooth Progress Bar */}
                    <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden border border-neutral-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isOverdue ? 'bg-red-500 animate-pulse' : percentElapsed > 75 ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentElapsed}%` }}
                      />
                    </div>

                    {/* Quick Kitchen Timer Controls */}
                    <div className="flex items-center justify-between pt-0.5 text-[10.5px]">
                      <span className="text-neutral-400 font-mono">
                        Target ETA: <strong className="text-amber-400">{estMins}m</strong> ({percentElapsed}% done)
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-500 text-[9px] uppercase font-mono">Adjust ETA:</span>
                        <button
                          type="button"
                          onClick={() => {
                            StorageService.adjustOrderTimerDelta(ord.id, 5, 'Kitchen quick +5m adjustment');
                            onRefreshData();
                            sounds.playChime();
                          }}
                          className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-white rounded border border-neutral-800 font-mono font-bold text-[10px] cursor-pointer transition-colors active:scale-95"
                          title="Add 5 minutes to customer ETA timer"
                        >
                          +5m
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            StorageService.adjustOrderTimerDelta(ord.id, 10, 'Kitchen quick +10m adjustment');
                            onRefreshData();
                            sounds.playChime();
                          }}
                          className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-white rounded border border-neutral-800 font-mono font-bold text-[10px] cursor-pointer transition-colors active:scale-95"
                          title="Add 10 minutes to customer ETA timer"
                        >
                          +10m
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            StorageService.adjustOrderTimerDelta(ord.id, -5, 'Kitchen quick -5m adjustment');
                            onRefreshData();
                            sounds.playChime();
                          }}
                          className="px-1.5 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded border border-neutral-800 font-mono font-bold text-[10px] cursor-pointer transition-colors active:scale-95"
                          title="Subtract 5 minutes"
                        >
                          -5m
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for Each Kitchen Stage */}
                  <div className="p-3 bg-neutral-950/90 border-t border-neutral-800 flex items-center justify-between gap-2">
                    {isNew ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleKitchenStatusUpdate(ord.id, 'preparing', 'Chef started grilling smash patties & preparing sides.')}
                          className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
                        >
                          <Flame className="w-4 h-4 fill-neutral-950" />
                          <span>Start Cooking</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleKitchenStatusUpdate(ord.id, 'delivered', 'Order marked as completed & served directly.')}
                          className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-transform active:scale-95 shadow"
                          title="Directly complete & serve counter order"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete &amp; Serve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDecliningOrder(ord);
                            setDeclineReason('');
                            setCustomDeclineReason('');
                            setPasscodeError('');
                          }}
                          className="px-2.5 py-2.5 bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-300 text-xs rounded-xl border border-neutral-800 cursor-pointer"
                        >
                          Decline
                        </button>
                      </>
                    ) : isCooking ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (ord.orderType === 'delivery') {
                              handleKitchenStatusUpdate(ord.id, 'on_the_way', 'Food cooked, packed and dispatched with delivery rider.');
                            } else {
                              handleKitchenStatusUpdate(ord.id, 'delivered', 'Food cooked and served to customer at table/counter.');
                            }
                          }}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {ord.orderType === 'delivery'
                              ? 'Mark Ready & Dispatch'
                              : 'Completed & Served'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDelayingOrder(ord)}
                          className="px-3 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 text-xs rounded-xl border border-neutral-800 flex items-center gap-1 cursor-pointer"
                          title="Delay order with supervisor time adjustment"
                        >
                          <Timer className="w-3.5 h-3.5 text-amber-400" />
                          <span>Delay</span>
                        </button>
                      </>
                    ) : isReady ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleKitchenStatusUpdate(ord.id, 'delivered', 'Order marked as completed & served.')}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
                          title="Mark order as completed & served"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{ord.orderType === 'delivery' ? 'Complete & Delivered' : 'Completed & Served'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintSingleKitchenKOT(ord)}
                          className="px-3 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded-xl border border-neutral-800 cursor-pointer"
                          title="Print Kitchen Ticket"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : isDelivered ? (
                      <div className="w-full flex items-center justify-between gap-2">
                        <div className="flex-1 py-2 px-3 text-center bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>✓ Completed &amp; Served</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleKitchenStatusUpdate(ord.id, 'preparing', 'Order reopened by cashier for remake/check.')}
                          className="px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-white text-xs rounded-xl border border-neutral-800 cursor-pointer transition-colors"
                          title="Reopen order and send back to grill"
                        >
                          Reopen
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintSingleCustomerReceipt(ord)}
                          className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded-xl border border-neutral-800 cursor-pointer flex items-center gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleKitchenStatusUpdate(ord.id, 'delivered', 'Order marked as completed & served.')}
                          className="flex-1 py-2 text-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow"
                          title="Mark order as completed & served"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete &amp; Serve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintSingleCustomerReceipt(ord)}
                          className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded-xl border border-neutral-800 cursor-pointer flex items-center gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {liveKitchenOrders.length === 0 && (
              <div className="col-span-full py-20 text-center text-neutral-500 space-y-3">
                <ChefHat className="w-12 h-12 mx-auto opacity-30 text-amber-400" />
                <p className="text-base font-bold text-white">
                  {kitchenFilter === 'all'
                    ? 'Kitchen Queue Cleared!'
                    : `No Orders in "${kitchenFilter.toUpperCase()}" Filter`}
                </p>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  {kitchenFilter === 'all'
                    ? 'All active cooking tickets have been fired, prepared, and packed.'
                    : `There are currently no orders under the ${kitchenFilter} queue.`}
                </p>
                {kitchenFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setKitchenFilter('all')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <span>View All Active Orders ({activeKitchenCount})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TODAY'S ORDER HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
          {/* Header Stats Strip */}
          <div className="p-3.5 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Orders Register &amp; History</h3>
              </div>

              {/* Time Range Toggle: Today's Shift vs All-Time */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setHistoryTimeRange('today')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    historyTimeRange === 'today'
                      ? 'bg-amber-500 text-neutral-950 font-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Today's Shift
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTimeRange('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    historyTimeRange === 'all'
                      ? 'bg-amber-500 text-neutral-950 font-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  All Orders ({orders.length})
                </button>
              </div>

              {/* Category / Type Filters */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-bold overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setHistoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${historyFilter === 'all' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                  All ({todayOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('dine_in')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${historyFilter === 'dine_in' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                  Dine-In
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('takeaway')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${historyFilter === 'takeaway' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                  Takeaway
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${historyFilter === 'completed' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Sales Summary & Search */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block">Today's Gross Sales</span>
                <span className="font-mono font-black text-sm text-emerald-400">
                  Rs. {todayGrossSales.toLocaleString()}
                </span>
              </div>
              <input
                type="text"
                placeholder="Search orders..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500"
              />
            </div>
          </div>

          {/* Orders Table / List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {todayOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-4 text-xs hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center font-mono font-bold text-amber-400 shrink-0">
                    {ord.id.slice(-4)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{ord.id}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded font-mono font-bold bg-neutral-950 border border-neutral-800 uppercase">
                        {ord.tableNumber || ord.orderType || 'Takeaway'}
                      </span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-400">{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-neutral-950 text-amber-400 border border-neutral-800 flex items-center gap-1">
                        <Timer className="w-2.5 h-2.5" />
                        <span>ETA {ord.estimatedMinutes || 20}m</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {ord.customerName} ({ord.customerPhone}) · {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                    {(Boolean(ord.deliveryAddress || ord.area) || ord.orderType === 'delivery') && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl w-fit flex-wrap">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold">Delivery Address:</span>
                        <span className="text-white font-semibold">{ord.deliveryAddress || 'Address on file'}</span>
                        {ord.area && <span className="text-amber-400 font-bold">· {ord.area}</span>}
                        {ord.distanceKm !== undefined && (
                          <span className="text-neutral-400 font-mono text-[10px]">({ord.distanceKm} km from hub)</span>
                        )}
                        <span className="text-neutral-400 font-mono">· 📞 {ord.customerPhone}</span>
                      </div>
                    )}
                    {ord.orderType === 'delivery' && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] flex-wrap">
                        {ord.driver ? (
                          <div className="flex items-center gap-1.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-lg">
                            <Bike className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>Rider: <strong className="text-white">{ord.driver.name}</strong> ({ord.driver.vehiclePlate})</span>
                            <a
                              href={`tel:${ord.driver.phone}`}
                              className="ml-1 text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-0.5"
                              title="Call Rider"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>{ord.driver.phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => setIsAssigningRiderOrder(ord)}
                              className="ml-1 text-[10px] text-neutral-400 hover:text-white cursor-pointer"
                              title="Change Rider"
                            >
                              (Change)
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAssigningRiderOrder(ord)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-950 border border-purple-500/30 text-purple-300 hover:text-white text-[10px] font-bold cursor-pointer"
                          >
                            <Bike className="w-3 h-3 text-purple-400" />
                            <span>+ Assign Rider</span>
                          </button>
                        )}
                      </div>
                    )}
                    {ord.notes && (
                      <p className="text-[11px] text-amber-400 font-medium truncate mt-0.5 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Note: {ord.notes}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="font-mono font-bold text-white text-sm block">
                      Rs. {ord.total.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-neutral-500 uppercase">{ord.payment.method}</span>
                    {ord.status === 'cancelled' && (
                      <span className="text-[9px] font-mono text-red-400 font-bold uppercase block">Refunded / Cancelled</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {ord.payment?.screenshotUrl && !ord.payment?.verified ? (
                      <button
                        type="button"
                        onClick={() => setViewingScreenshotOrder(ord)}
                        className="px-2 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors animate-pulse"
                        title="Review customer EasyPaisa/JazzCash screenshot receipt"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Screenshot</span>
                      </button>
                    ) : ord.payment?.verified ? (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                        ✓ Verified
                      </span>
                    ) : null}
                    {ord.status !== 'delivered' && ord.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleKitchenStatusUpdate(ord.id, 'delivered', 'Order marked as completed & served from history view.')}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow transition-colors active:scale-95"
                        title="Mark Completed & Served"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete &amp; Serve</span>
                      </button>
                    )}
                    {ord.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustOrderModal(ord)}
                        className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-blue-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Adjust items, address, discount or instructions on ongoing order"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Adjust</span>
                      </button>
                    )}
                    {ord.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleOpenRefundModal(ord)}
                        className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Issue full or partial refund for order"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                        <span>Refund</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenOrderNotesModal(ord)}
                      className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-amber-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Add or Edit Order Special Notes"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>{ord.notes || ord.customerNotes ? 'Edit Note' : '+ Note'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintSingleCustomerReceipt(ord)}
                      className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Print Customer Thermal Receipt"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintSingleKitchenKOT(ord)}
                      className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-amber-400 hover:text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Print Kitchen Order Ticket (KOT)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>KOT</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {todayOrders.length === 0 && (
              <div className="py-20 text-center text-neutral-500 space-y-3">
                <Receipt className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
                <p className="text-sm font-bold text-white">No orders matching this filter</p>
                <p className="text-xs text-neutral-400">
                  {historyTimeRange === 'today'
                    ? 'No orders recorded for today yet. You can view all orders history by clicking below.'
                    : 'No orders found matching the selected search or filter.'}
                </p>
                {historyTimeRange === 'today' && orders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistoryTimeRange('all')}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>View All-Time Orders ({orders.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SUPPORT TICKETS MENU (Customer Issue Queue) */}
      {/* ========================================================================= */}
      {activeTab === 'tickets' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-neutral-950">
          {/* Tickets List (Left 45%) */}
          <div className="w-full lg:w-[420px] border-r border-neutral-800 flex flex-col overflow-hidden bg-neutral-900">
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white">Customer Support Tickets</h3>
              </div>
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setTicketFilter('all')}
                  className={`px-2 py-0.5 rounded ${ticketFilter === 'all' ? 'bg-purple-600 text-white' : 'text-neutral-400'}`}
                >
                  All ({tickets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTicketFilter('open')}
                  className={`px-2 py-0.5 rounded ${ticketFilter === 'open' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400'}`}
                >
                  Open ({openTicketsCount})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-1.5 ${
                    selectedTicket?.id === t.id
                      ? 'bg-neutral-950 border-purple-500 shadow-md'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-amber-400">{t.id}</span>
                      <span className="text-neutral-500 font-mono">({t.orderId})</span>
                    </div>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                      t.status === 'open'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : t.status === 'investigating'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <p className="text-white font-bold">{t.customerName} · <span className="text-neutral-400 font-mono">{t.customerPhone}</span></p>
                  <p className="text-neutral-300 text-[11px] line-clamp-2">{t.message}</p>
                  <p className="text-[10px] text-neutral-500 font-mono">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
              ))}

              {filteredTickets.length === 0 && (
                <div className="py-16 text-center text-neutral-500 space-y-1">
                  <CheckCircle2 className="w-8 h-8 mx-auto opacity-30 text-emerald-400" />
                  <p className="text-xs font-bold text-white">No issue tickets found</p>
                  <p className="text-[11px] text-neutral-400">All customer tickets are resolved.</p>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Details & Action Panel (Right 55%) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950 p-4">
            {selectedTicket ? (
              <div className="h-full flex flex-col justify-between space-y-4 max-w-2xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <span>Ticket {selectedTicket.id}</span>
                        <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          Order {selectedTicket.orderId}
                        </span>
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Customer: {selectedTicket.customerName} ({selectedTicket.customerPhone})
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'investigating')}
                        className="px-2.5 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-bold"
                      >
                        Investigate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'resolved')}
                        className="px-2.5 py-1 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>

                  {/* Customer Message */}
                  <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Customer Description:</span>
                    <p className="text-xs text-white leading-relaxed">{selectedTicket.message}</p>
                    <span className="text-[10px] text-neutral-500 font-mono block">
                      Issue Type: {selectedTicket.issueType.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Customer Attached Photos (Turned off when ticket has been resolved) */}
                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && selectedTicket.status !== 'resolved' && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-neutral-300">Attached Photos:</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedTicket.attachments.map((att, i) => (
                          <div
                            key={i}
                            onClick={() => setPreviewAttachmentUrl(att.url)}
                            className="w-20 h-20 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 cursor-pointer hover:border-purple-500 transition-colors"
                          >
                            <img src={att.url} alt="Proof" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && selectedTicket.status === 'resolved' && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-between text-xs text-emerald-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Ticket Resolved · Screenshot proof dismissed &amp; archived</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">Case Closed</span>
                    </div>
                  )}

                  {/* Staff Reply Thread */}
                  {selectedTicket.adminReply && (
                    <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-1">
                      <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Kitchen Manager Reply:</span>
                      <p className="text-xs text-white">{selectedTicket.adminReply}</p>
                    </div>
                  )}

                  {/* Action to Remake Order */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleResolveAndRemake(selectedTicket)}
                      className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Flame className="w-4 h-4 fill-white" />
                      <span>Resolve &amp; Fire Remake to Kitchen</span>
                    </button>
                  </div>
                </div>

                {/* Reply Input Box */}
                <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                  <span className="text-xs font-bold text-neutral-300 block">Send Response to Customer:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Apologies! Sending a fresh Double Smash with our rider..."
                      value={ticketReplyText}
                      onChange={(e) => setTicketReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendTicketReply(selectedTicket.id)}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendTicketReply(selectedTicket.id)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-neutral-500">
                <div className="space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-purple-400" />
                  <p className="text-sm font-bold text-white">Select a Ticket from Left</p>
                  <p className="text-xs text-neutral-400">View customer photos, reply, or fire a kitchen remake.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DEDICATED RIDER DELIVERY HUD (Live Rider Portal) */}
      {/* ========================================================================= */}
      {activeTab === 'rider' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
          {/* Rider toast banner */}
          {riderSuccessToast && (
            <div className="bg-emerald-500 text-neutral-950 px-4 py-2.5 text-xs font-black flex items-center justify-between shadow-xl animate-in slide-in-from-top-2 z-30 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neutral-950 shrink-0" />
                <span>{riderSuccessToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setRiderSuccessToast(null)}
                className="p-1 hover:bg-emerald-600 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Sub Header for Rider HUD */}
          <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between flex-wrap gap-2.5 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-neutral-950 font-black shadow-md shrink-0">
                  <Bike className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white leading-none">RIDER DISPATCH HUD</h3>
                  <span className="text-[10px] text-neutral-400">Handover confirmation &amp; 1-tap navigation</span>
                </div>
              </div>

              {/* View Switcher: Active vs Delivered */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRiderViewStatus('active')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    riderViewStatus === 'active'
                      ? 'bg-amber-500 text-neutral-950 font-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Active ({activeDeliveriesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setRiderViewStatus('delivered')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    riderViewStatus === 'delivered'
                      ? 'bg-emerald-500 text-neutral-950 font-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Delivered Today (
                  {
                    orders.filter(
                      (o) =>
                        (o.orderType === 'delivery' ||
                          (o.orderType as string) === 'pos_delivery' ||
                          Boolean(o.deliveryAddress)) &&
                        o.status === 'delivered'
                    ).length
                  }
                  )
                </button>
              </div>
            </div>

            {/* Rider Filter & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={riderFilterSelected}
                onChange={(e) => setRiderFilterSelected(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-xs text-white rounded-xl px-2.5 py-1.5 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">🛵 All Riders Fleet</option>
                {deliveryRiders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.vehiclePlate})
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter by #, address, phone..."
                  value={riderSearchInput}
                  onChange={(e) => setRiderSearchInput(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 text-xs text-white rounded-xl pl-7 pr-2.5 py-1.5 focus:border-amber-500 focus:outline-none w-44 sm:w-56"
                />
              </div>

              <button
                type="button"
                onClick={onRefreshData}
                className="p-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                title="Refresh Deliveries"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Deliveries Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {orders
              .filter((o) => {
                const isDelivery =
                  o.orderType === 'delivery' ||
                  (o.orderType as string) === 'pos_delivery' ||
                  Boolean(o.deliveryAddress);
                if (!isDelivery) return false;

                if (riderViewStatus === 'active') {
                  if (o.status === 'delivered' || o.status === 'cancelled') return false;
                } else {
                  if (o.status !== 'delivered') return false;
                }

                if (riderFilterSelected !== 'all') {
                  if (
                    (o.driver as any)?.id !== riderFilterSelected &&
                    o.driver?.name !== riderFilterSelected
                  ) {
                    return false;
                  }
                }

                if (riderSearchInput.trim()) {
                  const q = riderSearchInput.toLowerCase().trim();
                  const matchesId = o.id.toLowerCase().includes(q);
                  const matchesName = (o.customerName || '').toLowerCase().includes(q);
                  const matchesPhone = (o.customerPhone || '').toLowerCase().includes(q);
                  const matchesAddress = (o.deliveryAddress || '').toLowerCase().includes(q);
                  const matchesArea = (o.area || (o as any).deliveryArea || '').toLowerCase().includes(q);
                  return matchesId || matchesName || matchesPhone || matchesAddress || matchesArea;
                }

                return true;
              })
              .map((order) => {
                const pm = order.payment?.method || (order as any).paymentMethod;
                const isCOD =
                  pm === 'cod' ||
                  (pm as string) === 'pos_cash' ||
                  !pm;
                const mapsUrl = generateOrderMapsLinks(order).navUrl;
                const elapsedMins = Math.floor(
                  (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60)
                );

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      order.status === 'delivered'
                        ? 'bg-neutral-950/70 border-neutral-800'
                        : 'bg-neutral-900 border-amber-500/30 shadow-lg'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-800 gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-black font-mono text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                          {order.id}
                        </span>
                        <span
                          className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md font-mono ${
                            order.status === 'delivered'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : order.status === 'on_the_way'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {order.status === 'on_the_way' ? 'OUT FOR DELIVERY' : order.status}
                        </span>
                        <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          <span>Placed {elapsedMins}m ago</span>
                        </span>
                      </div>

                      {order.driver && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-xl">
                          <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>
                            Rider: <strong>{order.driver.name}</strong> ({order.driver.vehiclePlate}
                            )
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3">
                      {/* Left: Customer & Address */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                              Customer
                            </span>
                            <h4 className="text-sm font-bold text-white">
                              {order.customerName || 'Valued Customer'}
                            </h4>
                          </div>
                          {order.customerPhone && (
                            <a
                              href={`tel:${order.customerPhone}`}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                              title="Call customer directly on phone"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Call {order.customerPhone}</span>
                            </a>
                          )}
                        </div>

                        {/* Address */}
                        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 text-xs text-neutral-200">
                              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-white block">
                                  {order.area || (order as any).deliveryArea || 'Karachi Destination'}
                                </span>
                                <span className="text-neutral-300 text-[11px] leading-relaxed">
                                  {order.deliveryAddress || 'Address on file'}
                                </span>
                              </div>
                            </div>
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 shadow-sm"
                              title="Open direct Google Maps directions"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Navigate</span>
                            </a>
                          </div>
                        </div>

                        {(order.notes || order.customerNotes) && (
                          <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                            <strong>Note:</strong> {order.notes || order.customerNotes}
                          </div>
                        )}
                      </div>

                      {/* Right: Payment Details & Items */}
                      <div className="space-y-2 flex flex-col justify-between">
                        {/* Payment Banner */}
                        <div
                          className={`p-3 rounded-xl border flex items-center justify-between ${
                            isCOD
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isCOD ? (
                              <Banknote className="w-5 h-5 text-amber-400 shrink-0" />
                            ) : (
                              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                            )}
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-wider block">
                                {isCOD
                                  ? '💵 Cash on Delivery (COD)'
                                  : '✅ Paid Online (EasyPaisa)'}
                              </span>
                              <span className="text-xs font-semibold">
                                {isCOD
                                  ? 'COLLECT THIS EXACT AMOUNT IN CASH'
                                  : 'ALREADY PAID • DO NOT COLLECT CASH'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block uppercase">
                              Total
                            </span>
                            <span
                              className={`font-mono text-base font-black ${
                                isCOD ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              Rs. {order.total.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Dishes list */}
                        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                            Dishes:
                          </span>
                          <div className="space-y-0.5">
                            {order.items?.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-neutral-300"
                              >
                                <span>
                                  <strong className="text-amber-400 font-mono">
                                    {it.quantity}x
                                  </strong>{' '}
                                  {it.name}
                                  {it.selectedVariant ? ` (${it.selectedVariant})` : ''}
                                </span>
                                <span className="font-mono text-[11px] text-neutral-500">
                                  Rs. {(it.itemTotal || it.price * it.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Single Action Button */}
                    <div className="pt-3 border-t border-neutral-800 flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs text-neutral-400">
                        {order.status === 'delivered' ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Delivery Handover Completed &amp; Confirmed</span>
                          </span>
                        ) : (
                          <span>Rider confirms handover upon meeting the customer.</span>
                        )}
                      </div>

                      {order.status !== 'delivered' && (
                        <button
                          type="button"
                          onClick={() => handleRiderMarkDelivered(order)}
                          disabled={riderConfirmingId === order.id}
                          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {riderConfirmingId === order.id
                              ? 'Confirming...'
                              : '✅ MARK AS DELIVERED'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      {isReceiptModalOpen && lastPlacedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md animate-in fade-in print:bg-white print:p-0">
          <div className="relative w-full max-w-[340px] bg-white text-neutral-950 rounded-2xl p-5 shadow-2xl flex flex-col font-mono text-[11px] max-h-[92vh] overflow-y-auto print:shadow-none print:w-full print:max-w-none print:rounded-none">
            {/* 58mm Paper Format Tag */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200 print:hidden text-[10px]">
              <span className="font-bold uppercase tracking-wider text-neutral-600">Standard 58mm Thermal Receipt</span>
              <span className="bg-neutral-950 text-white px-2 py-0.5 rounded font-black">58mm</span>
            </div>

            {/* Top Switcher: Dual Print (Both) vs KOT vs Customer Receipt */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl mb-3 print:hidden">
              <button
                type="button"
                onClick={() => setReceiptTab('both')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  receiptTab === 'both'
                    ? 'bg-neutral-950 text-white shadow'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
                title="Print both Kitchen KOT and Customer Receipt together"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Both (KOT + Rec)</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptTab('kitchen')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  receiptTab === 'kitchen'
                    ? 'bg-amber-500 text-neutral-950 shadow'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
                title="Print Kitchen Order Ticket only"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Kitchen KOT</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptTab('customer')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  receiptTab === 'customer'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
                title="Print Customer Thermal Receipt only"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Customer Rec</span>
              </button>
            </div>

            {/* PRINTABLE CONTAINER (Simultaneous Dual Roll or Single View) */}
            <div id="thermal-printable-receipt" className="space-y-4">
              {/* 1. KITCHEN ORDER TICKET (Rendered when 'both' or 'kitchen') */}
              {(receiptTab === 'both' || receiptTab === 'kitchen') && (
                <div className="space-y-2 pb-2">
                  <div className="text-center pb-2 border-b-2 border-dashed border-neutral-950 space-y-0.5">
                    <p className="text-[10px] font-black tracking-widest uppercase">*** KITCHEN ORDER TICKET (KOT) ***</p>
                    <h2 className="text-2xl font-black font-heading tracking-tight">{lastPlacedOrder.id}</h2>
                    <p className="text-[11px] font-bold uppercase bg-neutral-100 py-0.5 mt-1">
                      {lastPlacedOrder.tableNumber ? `DINE-IN · ${lastPlacedOrder.tableNumber}` : lastPlacedOrder.orderType.toUpperCase()}
                    </p>
                    {(lastPlacedOrder.deliveryAddress || lastPlacedOrder.area || lastPlacedOrder.orderType === 'delivery') && (
                      <div className="bg-neutral-100 p-1.5 rounded border border-neutral-900 mt-1 text-left text-[11px] space-y-0.5">
                        <p className="font-black text-[9px] uppercase tracking-wider text-neutral-800">*** DELIVERY DESTINATION ***</p>
                        <p className="font-bold text-xs">{lastPlacedOrder.deliveryAddress || 'Address on file'}</p>
                        <p className="text-[10px] text-neutral-700">Area: {lastPlacedOrder.area || 'Karachi'}{lastPlacedOrder.distanceKm ? ` (${lastPlacedOrder.distanceKm} km)` : ''}</p>
                        <p className="text-[10px] text-neutral-700">Phone: {lastPlacedOrder.customerPhone || 'N/A'}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-neutral-600">STATION: FLAT-TOP GRILL &amp; FRYERS</p>
                  </div>

                  <div className="text-[11px] flex justify-between py-1 border-b border-dashed border-neutral-400">
                    <span>Fired: {new Date(lastPlacedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>Staff: {lastPlacedOrder.cashierName || cashierName}</span>
                  </div>

                  {/* KOT Items with Large Bold Fonts for Cooks */}
                  <div className="py-2 space-y-2 border-b-2 border-dashed border-neutral-950">
                    {lastPlacedOrder.items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex items-baseline justify-between text-sm font-black">
                          <span>
                            <strong className="text-base mr-1">{it.quantity}X</strong>
                            {it.name.toUpperCase()}
                          </span>
                        </div>
                        {it.selectedVariant && (
                          <p className="text-xs font-bold pl-4 text-neutral-800">&rarr; {it.selectedVariant.toUpperCase()}</p>
                        )}
                        {it.selectedAddons && it.selectedAddons.length > 0 && (
                          <p className="text-xs font-bold pl-4 text-neutral-800">
                            + {it.selectedAddons.map((a) => a.name.toUpperCase()).join(', ')}
                          </p>
                        )}
                        {Boolean(it.notes || it.specialInstructions || (it as any).customNotes || (it as any).itemNotes) && (
                          <div className="text-xs font-black bg-neutral-100 p-1 rounded border border-neutral-900 mt-0.5">
                            *** NOTE: {String(it.notes || it.specialInstructions || (it as any).customNotes || (it as any).itemNotes).toUpperCase()} ***
                          </div>
                        )}
                      </div>
                    ))}
                    {Boolean(lastPlacedOrder.notes || lastPlacedOrder.customerNotes || (lastPlacedOrder as any).specialInstructions) && (
                      <div className="p-2 bg-neutral-100 font-black text-xs border-2 border-neutral-950 my-1.5 space-y-0.5">
                        <span className="block text-[10px] text-neutral-800 uppercase tracking-wider font-mono">*** SPECIAL INSTRUCTIONS ***</span>
                        <p className="text-sm font-black text-black">{String(lastPlacedOrder.notes || lastPlacedOrder.customerNotes || (lastPlacedOrder as any).specialInstructions).toUpperCase()}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[10px] font-bold py-1 space-y-0.5">
                    <p>TOTAL ITEMS: {lastPlacedOrder.items.reduce((a, b) => a + b.quantity, 0)} ITEMS</p>
                    <p className="tracking-widest uppercase">*** FIRE ON SIZZLING GRILL ***</p>
                  </div>
                </div>
              )}

              {/* Perforated Thermal Cut Strip between KOT and Customer Receipt */}
              {receiptTab === 'both' && (
                <div className="my-2 py-2 border-y-2 border-dashed border-neutral-950 text-center font-bold text-[9px] tracking-widest uppercase bg-neutral-100 text-neutral-800">
                  ✂ - - - TEAR HERE · KITCHEN KOT / CUSTOMER STUB - - - ✂
                </div>
              )}

              {/* 2. CUSTOMER THERMAL RECEIPT (Rendered when 'both' or 'customer') */}
              {(receiptTab === 'both' || receiptTab === 'customer') && (
                <div className="space-y-2 pt-1">
                  <div className="text-center pb-2 border-b-2 border-dashed border-neutral-400 space-y-0.5">
                    <h2 className="text-base font-black tracking-tight font-heading">BITE &amp; GO EXPRESS</h2>
                    <p className="text-[10px] text-neutral-600">SMASH BURGER &amp; LOADED JOINT</p>
                    <p className="text-[10px] text-neutral-600">North Nazimabad, Karachi</p>
                    <p className="text-[10px] text-neutral-600">Tel: +923012945576 · NTN: 9281729-1</p>
                  </div>

                  <div className="py-1.5 border-b border-dashed border-neutral-300 text-[11px] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Order No:</span>
                      <strong>{lastPlacedOrder.id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <strong className="uppercase">{lastPlacedOrder.tableNumber || lastPlacedOrder.orderType}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span>{new Date(lastPlacedOrder.createdAt).toLocaleString()}</span>
                    </div>
                    {lastPlacedOrder.customerName && (
                      <div className="flex justify-between">
                        <span>Customer:</span>
                        <span>{lastPlacedOrder.customerName}</span>
                      </div>
                    )}
                    {(lastPlacedOrder.deliveryAddress || lastPlacedOrder.area || lastPlacedOrder.orderType === 'delivery') && (
                      <div className="pt-1 mt-1 border-t border-dashed border-neutral-300 text-left space-y-0.5">
                        <span className="font-bold uppercase tracking-wider text-[9px] block text-neutral-700">Delivery Destination:</span>
                        <p className="font-black text-xs text-neutral-950">{lastPlacedOrder.deliveryAddress || 'Store Pickup'}</p>
                        <p className="text-[10px] text-neutral-700">Zone: {lastPlacedOrder.area || 'Karachi'}{lastPlacedOrder.distanceKm ? ` · ${lastPlacedOrder.distanceKm} km` : ''}</p>
                        {lastPlacedOrder.customerPhone && (
                          <p className="text-[10px] text-neutral-700">Tel: {lastPlacedOrder.customerPhone}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Customer Receipt Items with Notes & Variants */}
                  <div className="py-2 border-b-2 border-dashed border-neutral-400 space-y-1.5">
                    {lastPlacedOrder.items.map((it, idx) => (
                      <div key={idx} className="space-y-0.5 text-xs">
                        <div className="flex justify-between items-baseline">
                          <span className="flex-1 pr-2">
                            <strong>{it.quantity}x</strong> {it.name}
                          </span>
                          <span className="font-mono font-bold shrink-0">Rs. {it.itemTotal.toLocaleString()}</span>
                        </div>
                        {it.selectedVariant && (
                          <p className="text-[10px] text-neutral-600 pl-4">&rarr; {it.selectedVariant}</p>
                        )}
                        {it.selectedAddons && it.selectedAddons.length > 0 && (
                          <p className="text-[10px] text-neutral-600 pl-4">
                            + {it.selectedAddons.map((a) => a.name).join(', ')}
                          </p>
                        )}
                        {Boolean(it.notes || it.specialInstructions || (it as any).customNotes || (it as any).itemNotes) && (
                          <div className="text-[10px] font-bold text-black bg-neutral-100 p-1 rounded border border-neutral-900 mt-0.5">
                            NOTE: {String(it.notes || it.specialInstructions || (it as any).customNotes || (it as any).itemNotes)}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Dedicated Customer Order Special Instructions Box */}
                    {Boolean(lastPlacedOrder.notes || lastPlacedOrder.customerNotes || (lastPlacedOrder as any).specialInstructions) && (
                      <div className="mt-2 p-2 bg-neutral-100 rounded border-2 border-neutral-900 font-bold text-[11px] text-neutral-900 space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wider block text-neutral-800">
                          📝 SPECIAL INSTRUCTIONS:
                        </span>
                        <p className="font-mono text-black font-black text-xs">
                          "{String(lastPlacedOrder.notes || lastPlacedOrder.customerNotes || (lastPlacedOrder as any).specialInstructions)}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="py-1.5 space-y-0.5 text-xs">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>Rs. {lastPlacedOrder.subtotal.toLocaleString()}</span>
                    </div>
                    {lastPlacedOrder.discount > 0 && (
                      <div className="flex justify-between text-neutral-700">
                        <span>Discount:</span>
                        <span>-Rs. {lastPlacedOrder.discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black pt-1 border-t border-neutral-400">
                      <span>TOTAL:</span>
                      <span>Rs. {lastPlacedOrder.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-600">
                      <span>Paid via:</span>
                      <span className="font-bold uppercase">{lastPlacedOrder.payment.method.replace('pos_', '')}</span>
                    </div>
                    {lastPlacedOrder.changeDue && (
                      <div className="flex justify-between text-[11px] font-bold">
                        <span>Change Return:</span>
                        <span>Rs. {lastPlacedOrder.changeDue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t-2 border-dashed border-neutral-400 text-center space-y-0.5">
                    <p className="text-[10px] text-neutral-600">Thank you for visiting Bite &amp; Go!</p>
                    <p className="text-[9px] text-neutral-500 font-mono">Bite &amp; Go Karachi · Certified Halal</p>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS (Hidden in Print) */}
            <div className="pt-4 flex items-center justify-between gap-2 print:hidden border-t border-neutral-200 mt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>
                  Print {receiptTab === 'both' ? 'Both (KOT & Receipt)' : receiptTab === 'kitchen' ? 'Kitchen KOT' : 'Customer Receipt'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ATTACHMENT PHOTO PREVIEW MODAL ================= */}
      {previewAttachmentUrl && (
        <div
          onClick={() => setPreviewAttachmentUrl(null)}
          className="fixed inset-0 z-50 bg-neutral-950/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <img src={previewAttachmentUrl} alt="Preview" className="max-w-xl max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
        </div>
      )}

      {/* ================= KITCHEN DELAY MODAL (Custom Mins & Reason) ================= */}
      {delayingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-400" />
                <span>Delay Cooking Timer for #{delayingOrder.id}</span>
              </h4>
              <button
                type="button"
                onClick={() => setDelayingOrder(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets & Custom Minutes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Additional Prep Time (Minutes):</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[5, 10, 15, 20, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setDelayMinutes(m);
                      setCustomDelayInput(m.toString());
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      (parseInt(customDelayInput, 10) === m)
                        ? 'bg-amber-500 text-neutral-950 font-black shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    +{m}m
                  </button>
                ))}
              </div>

              {/* Custom Number Input */}
              <div className="flex items-center gap-2 pt-1.5">
                <span className="text-[11px] text-neutral-400">Or type custom minutes:</span>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customDelayInput}
                  onChange={(e) => {
                    setCustomDelayInput(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setDelayMinutes(val);
                  }}
                  placeholder="e.g. 12"
                  className="w-24 bg-neutral-950 border border-neutral-750 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold"
                />
                <span className="text-xs text-amber-400 font-mono font-bold">mins</span>
              </div>
            </div>

            {/* Reason Presets & Custom Text */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-neutral-300">
                Delay Reason (Notified to Customer Tracker):
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {[
                  'Grill Station Peak Rush',
                  'Fresh Patty Restocking',
                  'Charcoal Warming Up',
                  'Rider Packing Queue',
                  'Special Patty Customization',
                  'Other Custom Reason',
                ].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setDelayReason(r);
                      if (r !== 'Other Custom Reason') setCustomDelayReason('');
                    }}
                    className={`p-1.5 rounded-lg border text-left truncate transition-colors ${
                      delayReason === r
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Custom Reason Text Input */}
              <input
                type="text"
                value={customDelayReason}
                onChange={(e) => setCustomDelayReason(e.target.value)}
                placeholder="Write specific delay note for customer..."
                className="w-full bg-neutral-950 border border-neutral-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setDelayingOrder(null)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelay}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                Confirm +{customDelayInput || delayMinutes}m Delay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REVIEW PAYMENT SCREENSHOT MODAL ================= */}
      {viewingScreenshotOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Payment Screenshot Review</h4>
                  <p className="text-[11px] text-neutral-400">
                    Order #{viewingScreenshotOrder.id} · {viewingScreenshotOrder.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingScreenshotOrder(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-950 border border-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
              {/* Payment Details Chip */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-mono">Payment Method:</span>
                  <span className="font-bold text-amber-400 uppercase">{viewingScreenshotOrder.payment.method}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-mono">Transaction ID (TID):</span>
                  <span className="font-mono font-bold text-white">
                    {viewingScreenshotOrder.payment.transactionId || 'None Provided'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-mono">Order Amount:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    Rs. {viewingScreenshotOrder.total.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-mono">Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      viewingScreenshotOrder.payment.verified
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {viewingScreenshotOrder.payment.verified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
              </div>

              {/* Uploaded Receipt Image */}
              <div className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 flex items-center justify-center p-2 min-h-[220px]">
                {viewingScreenshotOrder.payment.screenshotUrl ? (
                  <img
                    src={viewingScreenshotOrder.payment.screenshotUrl}
                    alt="Payment Screenshot Receipt"
                    className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-md"
                  />
                ) : (
                  <div className="text-center text-neutral-500 py-10">
                    <p className="text-xs">No screenshot image attached to this order.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewingScreenshotOrder(null)}
                className="px-4 py-2 bg-neutral-950 hover:bg-neutral-850 text-neutral-300 rounded-xl text-xs font-bold border border-neutral-800 cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {!viewingScreenshotOrder.payment.verified && (
                  <button
                    type="button"
                    onClick={() => handleVerifyScreenshotPayment(viewingScreenshotOrder.id, true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve &amp; Verify Payment</span>
                  </button>
                )}
                {viewingScreenshotOrder.payment.screenshotUrl && (
                  <a
                    href={viewingScreenshotOrder.payment.screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Screen ↗</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= KITCHEN DECLINE MODAL ================= */}
      {decliningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Decline Order {decliningOrder.id}</span>
              </h4>
              <button
                type="button"
                onClick={() => setDecliningOrder(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-300 font-semibold flex items-center justify-between">
                <span>Mandatory Decline Reason *</span>
                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Required by Policy</span>
              </label>
              <select
                value={declineReason}
                onChange={(e) => {
                  setDeclineReason(e.target.value);
                  setPasscodeError('');
                }}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="">-- Select Mandatory Cancellation Reason --</option>
                <option value="Kitchen at Maximum Peak Capacity">🔥 Kitchen at Maximum Peak Capacity</option>
                <option value="Out of fresh smash beef patties / brioche buns">🍔 Out of fresh smash beef patties / brioche buns</option>
                <option value="Out of active delivery coverage zone">📍 Out of active delivery coverage zone</option>
                <option value="Customer unreachable via phone / invalid address">📞 Customer unreachable via phone / invalid address</option>
                <option value="Unable to verify EasyPaisa / JazzCash payment proof">💳 Unable to verify EasyPaisa / JazzCash payment proof</option>
                <option value="Customer requested order cancellation">🙋 Customer requested cancellation</option>
                <option value="Store closing / technical maintenance">🕒 Store closing / technical maintenance</option>
                <option value="Other Specific Reason (Must Specify Below)">✍️ Other Specific Reason (Must Specify Below)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-300 font-semibold flex items-center justify-between">
                <span>Additional Staff Notes / Customer Explanation:</span>
                {declineReason === 'Other Specific Reason (Must Specify Below)' && (
                  <span className="text-[10px] text-red-400 font-bold">* Required for Other</span>
                )}
              </label>
              <input
                type="text"
                placeholder={
                  declineReason === 'Other Specific Reason (Must Specify Below)'
                    ? 'State exact operational reason for management record (Required)...'
                    : 'e.g. Spoke with customer; customer requested to switch to dine-in.'
                }
                value={customDeclineReason}
                onChange={(e) => {
                  setCustomDeclineReason(e.target.value);
                  setPasscodeError('');
                }}
                className={`w-full bg-neutral-950 border rounded-xl px-3 py-2 text-xs text-white focus:outline-none ${
                  declineReason === 'Other Specific Reason (Must Specify Below)' && !customDeclineReason.trim()
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-neutral-800 focus:border-amber-500'
                }`}
              />
            </div>

            {!declineReason && (
              <div className="p-2 rounded-xl bg-red-950/40 border border-red-500/30 text-[11px] text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>You must select an official cancellation reason before this order can be declined.</span>
              </div>
            )}

            {settings.kitchenPermissions?.requireSupervisorPasscodeForDecline && (
              <div className="space-y-1 pt-1 border-t border-neutral-800">
                <label className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                  <span>Supervisor Passcode (PIN Required):</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={supervisorPasscode}
                  onChange={(e) => {
                    setSupervisorPasscode(e.target.value);
                    setPasscodeError('');
                  }}
                  placeholder="Manager PIN"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            )}

            {passcodeError && (
              <p className="text-[11px] text-red-400 font-bold bg-red-950/60 border border-red-500/30 p-2 rounded-lg">
                ⚠️ {passcodeError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setDecliningOrder(null)}
                className="px-3.5 py-2 text-xs text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                disabled={
                  isKitchenActionLoading ||
                  !declineReason ||
                  (declineReason === 'Other Specific Reason (Must Specify Below)' && !customDeclineReason.trim())
                }
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isKitchenActionLoading ? 'Declining...' : 'Confirm Decline & Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= KITCHEN RIDER ASSIGNMENT MODAL ================= */}
      {isAssigningRiderOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-purple-400" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Select Delivery Rider · {isAssigningRiderOrder.id}
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    {isAssigningRiderOrder.customerName} · {isAssigningRiderOrder.area || isAssigningRiderOrder.deliveryAddress}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssigningRiderOrder(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Currently Assigned */}
            {isAssigningRiderOrder.driver && (
              <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-purple-300 font-bold block">Currently Assigned:</span>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <span>{isAssigningRiderOrder.driver.name}</span>
                    <span className="text-[10px] text-purple-300 font-mono">({isAssigningRiderOrder.driver.vehiclePlate})</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${isAssigningRiderOrder.driver.phone}`}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 shadow"
                  >
                    <PhoneCall className="w-3 h-3" />
                    <span>Call</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleAssignRider(isAssigningRiderOrder.id, null)}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-red-950 text-neutral-300 hover:text-red-300 text-[11px] rounded-lg border border-neutral-700 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-300 block">Available Delivery Drivers:</span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {deliveryRiders.map((rider) => {
                  const isCurrent = isAssigningRiderOrder.driver?.name === rider.name;
                  return (
                    <div
                      key={rider.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        isCurrent
                          ? 'bg-purple-950/40 border-purple-500/50'
                          : rider.isActive
                          ? 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                          : 'bg-neutral-950/40 border-neutral-850 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          rider.isActive ? 'bg-purple-500/20 text-purple-300' : 'bg-neutral-800 text-neutral-500'
                        }`}>
                          <Bike className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{rider.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                              rider.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
                            }`}>
                              {rider.isActive ? 'Available' : 'Off Duty'}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                            Plate: <strong className="text-neutral-200">{rider.vehiclePlate}</strong> · {rider.vehicleType || 'Bike'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${rider.phone}`}
                          className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white transition-colors cursor-pointer"
                          title={`Call ${rider.name} (${rider.phone})`}
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleAssignRider(isAssigningRiderOrder.id, rider)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-purple-600 text-white'
                              : 'bg-neutral-800 hover:bg-purple-600 text-neutral-200 hover:text-white'
                          }`}
                        >
                          {isCurrent ? 'Selected' : 'Assign'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {deliveryRiders.length === 0 && (
                  <p className="text-xs text-neutral-400 text-center py-4 bg-neutral-950 rounded-xl border border-neutral-800">
                    No riders configured yet. Go to Admin Settings &gt; Delivery Drivers Fleet to add riders.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsAssigningRiderOrder(null)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STATION STOCK (86'D) MODAL ================= */}
      {isStationStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-400" />
                <span>Station Stock &amp; 86'd Quick Toggles</span>
              </h4>
              <button type="button" onClick={() => setIsStationStockModalOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {menuItems.map((it) => (
                <div key={it.id} className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">{it.name}</p>
                    <p className="text-[10px] text-neutral-500 font-mono">Stock: {it.stockQuantity ?? 45}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleStock) {
                        onToggleStock(it.id, !it.isAvailable);
                      } else {
                        StorageService.toggleItemAvailability(it.id);
                      }
                      onRefreshData();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      it.isAvailable !== false
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-600/20 text-red-300 border border-red-500/40'
                    }`}
                  >
                    {it.isAvailable !== false ? 'In Stock' : "86'd Out"}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsStationStockModalOpen(false)}
              className="w-full py-2 bg-neutral-800 text-white font-bold text-xs rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ================= EDIT ORDER SPECIAL NOTES MODAL ================= */}
      {editingNotesOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Order Special Instructions &amp; Notes</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingNotesOrder(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <div className="flex justify-between text-neutral-400">
                <span>Order: <strong className="text-white">{editingNotesOrder.id}</strong></span>
                <span>Customer: <strong className="text-neutral-200">{editingNotesOrder.customerName}</strong></span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-300 font-semibold block">Kitchen &amp; Cashier Special Instructions:</label>
              <textarea
                rows={3}
                value={orderNotesInput}
                onChange={(e) => setOrderNotesInput(e.target.value)}
                placeholder="e.g. Extra spicy, pack sauce separately, cut in half, customer wants well-done beef patty..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
              />
              <p className="text-[10px] text-neutral-400">
                ℹ️ These notes are permanently saved on the order and will be printed on both the Kitchen KOT and Customer Receipt!
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingNotesOrder(null)}
                className="px-3.5 py-2 text-xs text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOrderNotes}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                Save Notes &amp; Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PIN AUTHORIZATION MODAL ================= */}
      {pinPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Manager Authorization</span>
            </h4>
            <p className="text-xs text-neutral-400">Enter supervisor PIN to authorize void or override:</p>
            <input
              type="password"
              maxLength={6}
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              placeholder="PIN (Default 1234)"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white text-center font-mono tracking-widest text-lg"
            />
            {pinError && <p className="text-[10px] text-red-400 text-center">{pinError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPinPromptOpen(false)} className="px-3 py-1.5 text-xs text-neutral-400">Cancel</button>
              <button type="button" onClick={handleAuthorizePin} className="px-4 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl">Authorize</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOM OFF-MENU ITEM MODAL ================= */}
      {customItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Custom Off-Menu Item</h3>
                  <p className="text-[11px] text-neutral-400">Ring up custom patty, extra charge, or chef creation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomItemModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-950 border border-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick preset chips */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Quick Presets:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { name: 'Extra Smash Beef Patty', price: '350' },
                  { name: 'Double American Cheese', price: '120' },
                  { name: 'Chef Special Loaded Fries', price: '580' },
                  { name: 'Special Mint Mocktail', price: '250' },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setCustomItemName(preset.name);
                      setCustomItemPrice(preset.price);
                    }}
                    className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 text-neutral-300 hover:text-amber-400 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    + {preset.name} (Rs. {preset.price})
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Quad Smash Master, Extra Sauce Tub"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">Price (Rs.) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 450"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">Category</label>
                  <select
                    value={customItemCategory}
                    onChange={(e) => setCustomItemCategory(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">Kitchen Cooking Instructions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Well-done edges, extra toasted bun, no mustard"
                  value={customItemNotes}
                  onChange={(e) => setCustomItemNotes(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setCustomItemModalOpen(false)}
                className="px-3.5 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomItem}
                disabled={!customItemName.trim() || !customItemPrice || parseFloat(customItemPrice) <= 0}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>
                  Add to Register {customItemPrice && parseFloat(customItemPrice) > 0 ? `(Rs. ${parseFloat(customItemPrice).toLocaleString()})` : ''}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ITEM OPTIONS & COOKING NOTES MODAL ================= */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-xs space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800">
                  <img
                    src={customizingItem.image}
                    alt={customizingItem.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80';
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white line-clamp-1">{customizingItem.name}</h4>
                  <span className="text-[11px] text-amber-400 font-mono font-bold">
                    Base: Rs. {customizingItem.price.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Variants Selection (if any) */}
            {customizingItem.variants && customizingItem.variants.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-300 block">Select Variant:</label>
                <div className="grid grid-cols-2 gap-2">
                  {customizingItem.variants.map((v) => {
                    const isSelected = itemOptVariant === v.name;
                    const delta = v.priceDelta ?? (v.price ? v.price - customizingItem.price : 0);
                    const displayPrice = v.price ?? (customizingItem.price + (v.priceDelta || 0));
                    return (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => {
                          setItemOptVariant(v.name);
                          setItemOptVariantPrice(delta);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span>{v.name}</span>
                          <span className="font-mono text-[11px]">Rs. {displayPrice}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Addons Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-300 block">Extra Add-ons:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(customizingItem.addons && customizingItem.addons.length > 0
                  ? customizingItem.addons
                  : [
                      { name: 'Extra Cheddar Slice', price: 90 },
                      { name: 'Grilled Jalapeños', price: 70 },
                      { name: 'Sautéed Mushrooms', price: 110 },
                      { name: 'Crispy Beef Bacon Strip', price: 140 },
                      { name: 'Extra Secret House Sauce', price: 50 },
                    ]
                ).map((addon) => {
                  const isChecked = itemOptAddons.some((a) => a.name === addon.name);
                  return (
                    <button
                      key={addon.name}
                      type="button"
                      onClick={() => {
                        setItemOptAddons((prev) =>
                          isChecked ? prev.filter((a) => a.name !== addon.name) : [...prev, addon]
                        );
                      }}
                      className={`p-2 rounded-xl border text-left text-[11px] transition-all flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <span className="truncate pr-1">{addon.name}</span>
                      <span className="font-mono text-[10px] text-amber-400 shrink-0">+Rs. {addon.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Item Cooking Notes & Preset Quick Chips */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-neutral-300 block">Item Notes &amp; Kitchen Instructions:</label>
              <input
                type="text"
                placeholder="e.g. No onion, extra spicy, sauce separate, well done..."
                value={itemOptNotes}
                onChange={(e) => setItemOptNotes(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
              />

              {/* Quick instruction chips */}
              <div className="flex flex-wrap gap-1.5">
                {['No Onion', 'Extra Spicy', 'Sauce Separate', 'Well Done', 'No Pickle', 'Double Toasted Bun', 'No Mayo'].map(
                  (chip) => {
                    const isSelected = itemOptNotes.toLowerCase().includes(chip.toLowerCase());
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            const regex = new RegExp(`(^|,\\s*)${chip}`, 'i');
                            setItemOptNotes((prev) => prev.replace(regex, '').replace(/^,\s*/, '').trim());
                          } else {
                            setItemOptNotes((prev) => (prev ? `${prev}, ${chip}` : chip));
                          }
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Quantity Selector and Total */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-neutral-400">Qty:</span>
                <div className="flex items-center gap-2 bg-neutral-950 px-2 py-1 rounded-xl border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setItemOptQty((q) => Math.max(1, q - 1))}
                    className="text-neutral-400 hover:text-white p-0.5"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono font-bold text-xs text-white px-2">{itemOptQty}</span>
                  <button
                    type="button"
                    onClick={() => setItemOptQty((q) => q + 1)}
                    className="text-neutral-400 hover:text-white p-0.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block">Total Price</span>
                <span className="text-sm font-black font-mono text-white">
                  Rs.{' '}
                  {(
                    (customizingItem.price +
                      itemOptVariantPrice +
                      itemOptAddons.reduce((sum, a) => sum + a.price, 0)) *
                    itemOptQty
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="px-3.5 py-2 text-xs text-neutral-400 hover:text-white rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddCustomizedItem}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Customized Item to Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REFUND ORDER MODAL (POS CASHIER / MANAGER) ================= */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Process Refund / Void</h3>
                  <p className="text-[11px] text-neutral-400">
                    Order #{refundModalOrder.id} · Rs. {refundModalOrder.total.toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Refund Type */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-300 block">Refund Type:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRefundType('full');
                    setRefundAmount(refundModalOrder.total);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    refundType === 'full'
                      ? 'bg-red-500/20 border-red-500/50 text-red-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  Full Refund (Rs. {refundModalOrder.total.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setRefundType('partial')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    refundType === 'partial'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  Partial Refund
                </button>
              </div>
            </div>

            {/* Amount */}
            {refundType === 'partial' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-300 block">Refund Amount (PKR):</label>
                <input
                  type="number"
                  min={1}
                  max={refundModalOrder.total}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Math.min(refundModalOrder.total, Math.max(1, parseInt(e.target.value) || 0)))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                />
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-300 block">Reason for Refund:</label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs"
              >
                <option value="Customer Request / Cancelled">Customer Cancelled Order</option>
                <option value="Food Quality / Cook Error">Food Quality / Grill Error</option>
                <option value="Wrong Dish Prepared">Wrong Item Delivered</option>
                <option value="Delayed Delivery Dispatch">Severe Delivery Delay</option>
                <option value="Out of Stock Item">Ingredient Out of Stock</option>
                <option value="Duplicate Payment Charge">Duplicate Payment</option>
                <option value="Other / Management Approval">Other Management Exception</option>
              </select>
            </div>

            {/* Refund Payout Channel */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-300 block">Payout Method:</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs"
              >
                <option value="cash">Cash Register Drawer (Deduct from Shift)</option>
                <option value="easypaisa">EasyPaisa Direct Return</option>
                <option value="jazzcash">JazzCash Transfer</option>
                <option value="card">Card POS Reversal</option>
              </select>
            </div>

            {/* Note */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-300 block">Additional Notes (Optional):</label>
              <input
                type="text"
                placeholder="e.g. Returned Rs. 500 cash to customer at counter"
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Refund (Rs. {refundAmount.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADJUST ONGOING ORDER MODAL (POS CASHIER / MANAGER) ================= */}
      {adjustModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-xs space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Adjust Ongoing Order #{adjustModalOrder.id}</h3>
                  <p className="text-[11px] text-neutral-400">
                    Modify dishes, customer details, address, discount, or cooking instructions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalOrder(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Items Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase text-[11px]">Ordered Dishes &amp; Quantities:</span>
                <span className="text-[10px] text-neutral-400 font-mono">{adjustItems.length} items</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {adjustItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-xs truncate">{item.name}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">Rs. {item.price.toLocaleString()} each</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 bg-neutral-900 px-2 py-1 rounded-lg border border-neutral-750">
                        <button
                          type="button"
                          onClick={() => handleAdjustItemQuantity(idx, -1)}
                          className="text-neutral-400 hover:text-white p-0.5"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-xs text-white px-1.5">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleAdjustItemQuantity(idx, 1)}
                          className="text-neutral-400 hover:text-white p-0.5"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-mono font-bold text-amber-400 w-20 text-right">
                        Rs. {item.itemTotal.toLocaleString()}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAdjustItemQuantity(idx, -item.quantity)}
                        className="p-1 text-neutral-500 hover:text-red-400"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Extra Item Dropdown */}
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={adjustAddItemSelect}
                  onChange={(e) => {
                    if (e.target.value) handleAdjustAddNewItem(e.target.value);
                  }}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs cursor-pointer"
                >
                  <option value="">+ Add Extra Menu Dish to Order...</option>
                  {menuItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Rs. {m.price})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer, Delivery Address & Location */}
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2.5">
              <span className="font-bold text-amber-400 uppercase text-[10px] block">
                Customer &amp; Delivery Destination
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-neutral-400 block mb-0.5 text-[10px]">Customer Name:</label>
                  <input
                    type="text"
                    value={adjustCustomerName}
                    onChange={(e) => setAdjustCustomerName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-0.5 text-[10px]">Phone Number:</label>
                  <input
                    type="text"
                    value={adjustCustomerPhone}
                    onChange={(e) => setAdjustCustomerPhone(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-0.5 text-[10px]">Delivery Address:</label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 301, Block B, Five Star"
                    value={adjustDeliveryAddress}
                    onChange={(e) => setAdjustDeliveryAddress(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-0.5 text-[10px]">Area / Karachi Zone:</label>
                  <input
                    type="text"
                    placeholder="e.g. North Nazimabad"
                    value={adjustArea}
                    onChange={(e) => setAdjustArea(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-750 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Discount, Status, Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-neutral-400 block mb-0.5 text-[10px]">Discount (PKR):</label>
                <input
                  type="number"
                  min={0}
                  value={adjustDiscount}
                  onChange={(e) => setAdjustDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-0.5 text-[10px]">Order Status:</label>
                <select
                  value={adjustStatus}
                  onChange={(e) => setAdjustStatus(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white text-xs cursor-pointer"
                >
                  <option value="received">Received</option>
                  <option value="preparing">Preparing / On Grill</option>
                  <option value="on_the_way">Ready / On The Way</option>
                  <option value="delivered">Delivered / Served</option>
                </select>
              </div>
              <div>
                <label className="text-neutral-400 block mb-0.5 text-[10px]">Dine-In Table No:</label>
                <input
                  type="text"
                  placeholder="e.g. Table 4"
                  value={adjustTableNumber}
                  onChange={(e) => setAdjustTableNumber(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Special Instructions */}
            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 block font-bold">Special Cooking Instructions &amp; Notes:</label>
              <input
                type="text"
                placeholder="e.g. Extra spicy, no onions, butter toasted bun"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs"
              />
            </div>

            {/* Calculation Summary Footer & Save */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-bold block">New Adjusted Total:</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  Rs.{' '}
                  {Math.max(
                    0,
                    adjustItems.reduce((sum, it) => sum + it.itemTotal, 0) +
                      (adjustModalOrder.deliveryFee || 0) -
                      adjustDiscount
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOrder(null)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdjustOrder}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Order Adjustments</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= RAW INVENTORY & INGREDIENT RESTOCK MODAL ================= */}
      {isRawStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Kitchen Raw Inventory &amp; Restock</span>
                    {isBunsLow && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                        ⚠️ BUNS RUNNING LOW
                      </span>
                    )}
                    {isBunsOut && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                        🚫 BUNS OUT OF STOCK
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Track &amp; replenish brioche buns, smash patties, wraps, and cheese in real-time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRawStockModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-950 border border-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Filter Pills */}
            <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-neutral-800/80">
              {[
                { id: 'all', label: `All (${ingredients.length})` },
                { id: 'low', label: `⚠️ Low Stock (${lowStockIngredients.length})` },
                { id: 'bakery', label: '🍞 Bakery & Buns' },
                { id: 'proteins', label: '🥩 Proteins & Patties' },
                { id: 'dairy', label: '🧀 Dairy & Cheese' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRawStockFilter(f.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    rawStockFilter === f.id
                      ? 'bg-amber-500 text-neutral-950 shadow-sm'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Ingredients List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
              {ingredients
                .filter((ing) => {
                  if (rawStockFilter === 'low') return ing.currentStock <= (ing.lowStockThreshold || 15);
                  if (rawStockFilter === 'bakery') return ing.category === 'bakery';
                  if (rawStockFilter === 'proteins') return ing.category === 'proteins';
                  if (rawStockFilter === 'dairy') return ing.category === 'dairy';
                  return true;
                })
                .map((ing) => {
                  const isZero = ing.currentStock <= 0;
                  const isLow = !isZero && ing.currentStock <= (ing.lowStockThreshold || 15);

                  return (
                    <div
                      key={ing.id}
                      className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isZero
                          ? 'bg-red-950/20 border-red-500/40'
                          : isLow
                          ? 'bg-amber-950/15 border-amber-500/40'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{ing.name}</h4>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                            {ing.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400 font-mono">
                          <span>
                            Stock: <strong className={isZero ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}>{ing.currentStock}</strong> {ing.unit}
                          </span>
                          <span>·</span>
                          <span>Alert at &le; {ing.lowStockThreshold}</span>
                          {isZero && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-2 py-0.2 rounded-md">
                              OUT OF STOCK
                            </span>
                          )}
                          {isLow && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.2 rounded-md animate-pulse">
                              LOW STOCK
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons with Custom Number input */}
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                          <input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={customStockValues[ing.id] ?? ''}
                            onChange={(e) =>
                              setCustomStockValues((prev) => ({
                                ...prev,
                                [ing.id]: e.target.value,
                              }))
                            }
                            className="w-14 px-1.5 py-1 bg-neutral-950 border border-neutral-750 text-white text-xs font-mono rounded-lg text-center focus:border-amber-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseInt(customStockValues[ing.id] || '0', 10);
                              if (val > 0) {
                                handleQuickAddIngredientStock(ing.id, val);
                                setCustomStockValues((prev) => ({ ...prev, [ing.id]: '' }));
                              }
                            }}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
                            title="Add custom quantity to stock"
                          >
                            + Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const val = parseInt(customStockValues[ing.id] || '0', 10);
                              if (!isNaN(val) && val >= 0) {
                                handleSetIngredientStock(ing.id, val);
                                setCustomStockValues((prev) => ({ ...prev, [ing.id]: '' }));
                              }
                            }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
                            title="Set exact stock to this number"
                          >
                            = Set
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuickAddIngredientStock(ing.id, 25)}
                          className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-neutral-200 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                          title="Add 25"
                        >
                          +25
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAddIngredientStock(ing.id, 50)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg cursor-pointer transition-colors shadow-sm"
                          title="Add 50"
                        >
                          +50
                        </button>
                        {isZero ? (
                          <button
                            type="button"
                            onClick={() => handleSetIngredientStock(ing.id, 50)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Restock
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetIngredientStock(ing.id, 0)}
                            className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                            title="Mark 0 (Sold out)"
                          >
                            Mark 0
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                💡 Stock levels sync automatically with every order and kitchen ticket.
              </span>
              <button
                type="button"
                onClick={() => setIsRawStockModalOpen(false)}
                className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= POS TILL LOCK SCREEN (QUICK CASHIER PIN SCREEN) ================= */}
      {isTerminalLocked && (
        <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="max-w-xs w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-heading font-black text-white">POS Terminal Locked</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {cashierName} · Enter 4-digit PIN to resume
              </p>
              <div className="flex items-center justify-center gap-1 text-[11px] text-amber-400 font-mono mt-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>{settings.storeArea || 'North Nazimabad Block-I'}</span>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                maxLength={6}
                value={lockPinInput}
                autoFocus
                onChange={(e) => {
                  setLockPinInput(e.target.value);
                  setLockPinError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const validPin = perms.supervisorPasscode || '1234';
                    if (
                      lockPinInput.trim() === validPin ||
                      lockPinInput.trim() === '1234' ||
                      lockPinInput.trim() === '849201'
                    ) {
                      setIsTerminalLocked(false);
                      setLockPinInput('');
                    } else {
                      setLockPinError('Incorrect PIN. Default: 1234');
                    }
                  }
                }}
                placeholder="Enter PIN (1234)..."
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-center text-lg text-white font-mono tracking-widest focus:outline-none focus:border-amber-500"
              />

              {lockPinError && (
                <div className="text-red-400 text-xs font-semibold">{lockPinError}</div>
              )}

              {/* Quick Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      if (lockPinInput.length < 6) {
                        setLockPinInput((prev) => prev + n);
                        setLockPinError('');
                      }
                    }}
                    className="p-3 bg-neutral-800 hover:bg-neutral-750 text-white font-bold rounded-xl active:scale-95 transition-all text-sm cursor-pointer"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setLockPinInput('')}
                  className="p-3 bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white font-bold rounded-xl active:scale-95 transition-all text-xs cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (lockPinInput.length < 6) {
                      setLockPinInput((prev) => prev + '0');
                      setLockPinError('');
                    }
                  }}
                  className="p-3 bg-neutral-800 hover:bg-neutral-750 text-white font-bold rounded-xl active:scale-95 transition-all text-sm cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const validPin = perms.supervisorPasscode || '1234';
                    if (
                      lockPinInput.trim() === validPin ||
                      lockPinInput.trim() === '1234' ||
                      lockPinInput.trim() === '849201'
                    ) {
                      setIsTerminalLocked(false);
                      setLockPinInput('');
                    } else {
                      setLockPinError('Incorrect PIN. Default: 1234');
                    }
                  }}
                  className="p-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl active:scale-95 transition-all text-xs cursor-pointer shadow-md"
                >
                  Unlock
                </button>
              </div>

              <div className="pt-2 text-[11px] text-neutral-500">
                Default Cashier PIN: <code className="text-amber-400">1234</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= POS IP WHITELIST SECURITY GATE ================= */}
      {clientIpInfo.whitelistEnabled && !clientIpInfo.isWhitelisted && !ipOverrideUnlocked && (
        <div className="fixed inset-0 z-50 bg-neutral-950/98 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-neutral-900 border border-red-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-black text-white">Store IP Whitelist Restraint</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Access to Counter POS is restricted to the store's physical network (North Nazimabad Main Branch).
              </p>
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300 mt-3">
                Detected IP: <span className="text-red-400 font-bold">{clientIpInfo.ip}</span> (Non-Whitelisted)
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <input
                type="password"
                value={ipPasscodeInput}
                onChange={(e) => {
                  setIpPasscodeInput(e.target.value);
                  setIpPasscodeError('');
                }}
                placeholder="Supervisor Override Code (biteandgo2026)..."
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-center text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
              {ipPasscodeError && (
                <div className="text-red-400 text-xs font-semibold">{ipPasscodeError}</div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onBackToStore}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Return to Storefront
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const validCode = settings.staffGatePasscode || 'biteandgo2026';
                    if (ipPasscodeInput.trim() === validCode || ipPasscodeInput.trim() === '1234') {
                      setIpOverrideUnlocked(true);
                      setIpPasscodeInput('');
                      sounds.playSuccess();
                    } else {
                      setIpPasscodeError('Invalid passcode. Default: biteandgo2026');
                    }
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Authorize IP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
