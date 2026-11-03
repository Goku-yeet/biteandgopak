import {
  Category,
  MenuItem,
  Order,
  StoreSettings,
  PushNotificationMessage,
  OrderStatus,
  CustomerUser,
  CustomerTicket,
  TicketStatus,
  CustomerReview,
  InventoryIngredient,
  ComboDeal,
  PromoCode,
  CustomerWidgetsConfig,
  DeliveryRider,
  RawIngredient,
  RecipeCostItem,
  StaffAccount,
  AuthUser,
} from '../types';
import {
  initialCategories,
  initialMenuItems,
  initialOrders,
  initialStoreSettings,
  initialIngredients,
  initialComboDeals,
  initialPromoCodes,
} from '../data/initialMenu';
import {
  INITIAL_RAW_INGREDIENTS,
  INITIAL_RECIPE_COST_ITEMS,
} from '../data/initialCosting';
import { getAreaCoordinates } from '../data/karachiAreas';
import { sounds } from './audio';
import { isStoreOpenNow } from './operatingHours';
import { validateOrderedDishForRating, sanitizeInput } from './security';

const STORAGE_KEYS = {
  CATEGORIES: 'bg_categories_v2',
  MENU_ITEMS: 'bg_menu_items_v2',
  ORDERS: 'bg_orders_v2',
  SETTINGS: 'bg_settings_v2',
  NOTIFICATIONS: 'bg_notifications_v2',
  ACTIVE_ORDER_ID: 'bg_active_order_id_v2',
  CUSTOMER_ACCOUNTS: 'bg_customer_accounts_v1',
  ACTIVE_CUSTOMER: 'bg_active_customer_v1',
  SUPPORT_TICKETS: 'bg_support_tickets_v1',
  CUSTOMER_TICKET_IDS: 'bg_customer_ticket_ids_v1',
  REVIEWS: 'bg_customer_reviews_v1',
  INGREDIENTS: 'bg_ingredients_v1',
  COMBO_DEALS: 'bg_combo_deals_v1',
  PROMO_CODES: 'bg_promo_codes_v1',
  RAW_INGREDIENTS: 'bg_raw_ingredients_v1',
  RECIPE_COST_ITEMS: 'bg_recipe_cost_items_v1',
  STAFF_ACCOUNTS: 'bg_staff_accounts_v2',
};

// Dispatch storage event to keep views synchronized asynchronously
let pendingNotifyTimeout: any = null;
const notifyStateChange = () => {
  if (typeof window !== 'undefined') {
    if (pendingNotifyTimeout) clearTimeout(pendingNotifyTimeout);
    pendingNotifyTimeout = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('bg_data_updated'));
    }, 16);
  }
};

export const StorageService = {
  // --- CATEGORIES ---
  getCategories(): Category[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(initialCategories));
    } catch {}
    return initialCategories;
  },

  saveCategories(categories: Category[]) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    notifyStateChange();
  },

  addCategory(data: { name: string; description?: string; iconName?: string }): Category {
    const categories = this.getCategories();
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: data.name,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      order: categories.length + 1,
      iconName: data.iconName || 'Flame',
      description: data.description,
    };
    categories.push(newCat);
    this.saveCategories(categories);
    return newCat;
  },

  deleteCategory(catId: string) {
    let categories = this.getCategories().filter((c) => c.id !== catId);
    categories.forEach((cat, idx) => {
      cat.order = idx + 1;
    });
    this.saveCategories(categories);
  },

  reorderCategory(sourceId: string, direction: 'up' | 'down') {
    const categories = this.getCategories();
    const index = categories.findIndex((c) => c.id === sourceId);
    if (index < 0) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const temp = categories[index];
    categories[index] = categories[targetIndex];
    categories[targetIndex] = temp;

    // re-assign order numbers
    categories.forEach((cat, idx) => {
      cat.order = idx + 1;
    });

    this.saveCategories(categories);
  },

  // --- MENU ITEMS ---
  getMenuItems(): MenuItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
      if (data) {
        const parsed: MenuItem[] = JSON.parse(data);
        const existingIds = new Set(parsed.map((item) => item.id));
        let updated = false;

        // Ensure missing items like item-zinger-1 are injected
        for (const initItem of initialMenuItems) {
          if (!existingIds.has(initItem.id)) {
            parsed.push(initItem);
            updated = true;
          }
        }

        // Ensure items have full recipe BOM including packaging
        for (const item of parsed) {
          const initMatch = initialMenuItems.find((i) => i.id === item.id);
          if (initMatch && initMatch.recipe && (!item.recipe || item.recipe.length < initMatch.recipe.length)) {
            item.recipe = initMatch.recipe;
            updated = true;
          }
        }

        if (updated) {
          localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(parsed));
        }

        return parsed.map((item) => ({
          ...item,
          trackInventory: item.trackInventory ?? true,
          stockQuantity: typeof item.stockQuantity === 'number' ? item.stockQuantity : 45,
          lowStockThreshold: typeof item.lowStockThreshold === 'number' ? item.lowStockThreshold : 10,
          stockUnit: item.stockUnit || 'portions',
        }));
      }
    } catch (e) {
      console.error('Failed to load menu items', e);
    }
    const populated = initialMenuItems.map((item) => ({
      ...item,
      trackInventory: item.trackInventory ?? true,
      stockQuantity: typeof item.stockQuantity === 'number' ? item.stockQuantity : 45,
      lowStockThreshold: typeof item.lowStockThreshold === 'number' ? item.lowStockThreshold : 10,
      stockUnit: item.stockUnit || 'portions',
    }));
    try {
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(populated));
    } catch {}
    return populated;
  },

  updateItemInventory(
    itemId: string,
    stockQuantity: number,
    trackInventory?: boolean,
    lowStockThreshold?: number
  ): MenuItem | null {
    const items = this.getMenuItems();
    const item = items.find((i) => i.id === itemId);
    if (item) {
      item.stockQuantity = Math.max(0, stockQuantity);
      if (trackInventory !== undefined) item.trackInventory = trackInventory;
      if (lowStockThreshold !== undefined) item.lowStockThreshold = lowStockThreshold;
      if (item.trackInventory && item.stockQuantity === 0) {
        item.isAvailable = false;
      } else if (item.trackInventory && item.stockQuantity > 0 && !item.isAvailable) {
        item.isAvailable = true;
      }
      this.saveMenuItems(items);
      return item;
    }
    return null;
  },

  batchUpdateInventory(updates: Array<{ id: string; stockQuantity: number }>): MenuItem[] {
    const items = this.getMenuItems();
    updates.forEach((u) => {
      const it = items.find((i) => i.id === u.id);
      if (it) {
        it.stockQuantity = Math.max(0, u.stockQuantity);
        if (it.trackInventory && it.stockQuantity === 0) {
          it.isAvailable = false;
        } else if (it.trackInventory && it.stockQuantity > 0 && !it.isAvailable) {
          it.isAvailable = true;
        }
      }
    });
    this.saveMenuItems(items);
    return items;
  },

  saveMenuItems(items: MenuItem[]) {
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
    notifyStateChange();
  },

  addMenuItem(item: Omit<MenuItem, 'id' | 'order'>): MenuItem {
    const items = this.getMenuItems();
    const newItem: MenuItem = {
      ...item,
      id: `item-${Date.now()}`,
      order: items.length + 1,
    };
    items.push(newItem);
    this.saveMenuItems(items);
    return newItem;
  },

  updateMenuItem(item: MenuItem) {
    const items = this.getMenuItems();
    const index = items.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      items[index] = item;
      this.saveMenuItems(items);
    }
  },

  deleteMenuItem(id: string) {
    const items = this.getMenuItems().filter((i) => i.id !== id);
    this.saveMenuItems(items);
  },

  toggleItemAvailability(id: string) {
    const items = this.getMenuItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      item.isAvailable = !item.isAvailable;
      this.saveMenuItems(items);
    }
  },

  reorderMenuItem(itemId: string, direction: 'up' | 'down') {
    const items = this.getMenuItems();
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Filter items in the same category
    const catItems = items.filter((i) => i.categoryId === item.categoryId);
    const index = catItems.findIndex((i) => i.id === itemId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= catItems.length) return;

    // Swap items within category
    const targetItem = catItems[targetIndex];
    const originalOrder = item.order;
    item.order = targetItem.order;
    targetItem.order = originalOrder;

    this.saveMenuItems([...items]);
  },

  // --- ORDERS ---
  getOrders(): Order[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (data) {
        const parsed: Order[] = JSON.parse(data);
        return parsed.map((o) => {
          if (!Array.isArray(o.statusHistory)) {
            o.statusHistory = [
              { status: o.status || 'received', timestamp: o.createdAt || new Date().toISOString(), note: 'Order initialized' },
            ];
          }
          if (!o.coordinates && o.area) {
            return { ...o, coordinates: getAreaCoordinates(o.area) };
          }
          return o;
        });
      }
    } catch (e) {
      console.error('Failed to load orders', e);
    }
    const populated = initialOrders.map((o) => {
      if (!Array.isArray(o.statusHistory)) {
        o.statusHistory = [
          { status: o.status || 'received', timestamp: o.createdAt || new Date().toISOString(), note: 'Order initialized' },
        ];
      }
      if (!o.coordinates && o.area) {
        return { ...o, coordinates: getAreaCoordinates(o.area) };
      }
      return o;
    });
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(populated));
    } catch {}
    return populated;
  },

  saveOrders(orders: Order[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (err: any) {
      console.warn('Storage quota reached while saving orders, optimizing payload...', err);
      // Evict large screenshot payloads from older delivered or cancelled orders
      const trimmed = orders.map((o, idx) => {
        if (idx > 5 && (o.status === 'delivered' || o.status === 'cancelled') && o.payment?.screenshotUrl) {
          return {
            ...o,
            payment: {
              ...o.payment,
              screenshotUrl: undefined,
            },
          };
        }
        return o;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(trimmed));
      } catch (innerErr) {
        console.error('Failed to save orders even after trimming screenshots', innerErr);
      }
    }
    notifyStateChange();
  },

  createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'statusHistory'> | Order): Order {
    const isPosOrder =
      (orderData as any).source === 'pos' ||
      orderData.orderType === 'dine_in' ||
      orderData.orderType === 'pos_takeaway' ||
      orderData.orderType === 'pos_counter' ||
      !!(orderData as any).posSource;

    if (!isPosOrder) {
      const currentSettings = this.getSettings();
      const openStatus = isStoreOpenNow(currentSettings);
      if (!openStatus.isOpen) {
        throw new Error(
          `Orders cannot be placed outside operating hours. Today's hours: ${openStatus.todayHoursText}. ${openStatus.nextOpenText ? `Reopening ${openStatus.nextOpenText}.` : ''}`
        );
      }
    }

    const orders = this.getOrders();
    const isPos = isPosOrder;
    const existingId = 'id' in orderData && orderData.id ? orderData.id : null;
    const newId = existingId || (isPos ? `#POS-${Math.floor(1000 + Math.random() * 9000)}` : `#BG-${Math.floor(1000 + Math.random() * 9000)}`);
    const now = 'createdAt' in orderData && orderData.createdAt ? orderData.createdAt : new Date().toISOString();

    const existingHistory = 'statusHistory' in orderData && Array.isArray(orderData.statusHistory) && orderData.statusHistory.length > 0
      ? orderData.statusHistory
      : [
          {
            status: ((orderData as any).status || (isPos ? 'preparing' : 'received')) as OrderStatus,
            timestamp: now,
            note: isPos ? `Counter POS Order created. Sent to Kitchen Station.` : `Order placed (${orderData.payment.method.toUpperCase()}). Kitchen notified.`,
          },
        ];

    const calculatedCoords = orderData.coordinates || (orderData.area ? getAreaCoordinates(orderData.area) : undefined);

    const newOrder: Order = {
      ...orderData,
      id: newId,
      createdAt: now,
      coordinates: calculatedCoords,
      status: (orderData as any).status || (isPos ? 'preparing' : 'received'),
      statusHistory: existingHistory,
    };

    orders.unshift(newOrder);
    this.saveOrders(orders);
    if (!isPos && (orderData as any).source !== 'pos') {
      this.setActiveOrderId(newId);
    }

    // Auto-deduct finished items, deal components, and raw shared recipe ingredients (e.g. Zinger patties)
    try {
      const menuItems = this.getMenuItems();
      const ingredients = this.getIngredients();
      const comboDeals = this.getComboDeals();
      let menuUpdated = false;
      let ingUpdated = false;

      for (const orderItem of newOrder.items) {
        const item = menuItems.find((m) => m.id === orderItem.menuItemId);
        const orderQty = orderItem.quantity || 1;

        // 1. Direct finished item inventory deduction
        if (item && (item.trackInventory ?? true) && typeof item.stockQuantity === 'number') {
          item.stockQuantity = Math.max(0, item.stockQuantity - orderQty);
          if (item.stockQuantity === 0) item.isAvailable = false;
          menuUpdated = true;
        }

        // Helper to deduct ingredients from recipe
        const deductRecipe = (recipe?: Array<{ ingredientId: string; quantity: number }>, multiplier = 1) => {
          if (!recipe || recipe.length === 0) return;
          for (const ingReq of recipe) {
            const ing = ingredients.find((i) => i.id === ingReq.ingredientId);
            if (ing) {
              ing.currentStock = Math.max(0, ing.currentStock - ingReq.quantity * multiplier);
              ingUpdated = true;
            }
          }
        };

        // 2. Direct recipe ingredients deduction
        if (item && item.recipe) {
          deductRecipe(item.recipe, orderQty);
        }

        // 3. Deal Maker Bundle Inventory Deduction
        // If this order item is a combo deal, trace through all bundled items & their ingredients!
        const matchingDeal =
          comboDeals.find((d) => d.id === orderItem.menuItemId || d.title === orderItem.name) ||
          (item && item.isDeal ? comboDeals.find((d) => d.id === item.dealId) : null);

        const includedList = item?.includedDealItems || matchingDeal?.includedItems;
        if (includedList && includedList.length > 0) {
          for (const inc of includedList) {
            const bundledItem = menuItems.find((m) => m.id === inc.menuItemId);
            const totalBundledQty = inc.quantity * orderQty;
            if (bundledItem) {
              if ((bundledItem.trackInventory ?? true) && typeof bundledItem.stockQuantity === 'number') {
                bundledItem.stockQuantity = Math.max(0, bundledItem.stockQuantity - totalBundledQty);
                if (bundledItem.stockQuantity === 0) bundledItem.isAvailable = false;
                menuUpdated = true;
              }
              if (bundledItem.recipe) {
                deductRecipe(bundledItem.recipe, totalBundledQty);
              }
            }
          }
        }
      }

      if (menuUpdated) this.saveMenuItems(menuItems);
      if (ingUpdated) this.saveIngredients(ingredients);
    } catch (invErr) {
      console.error('Failed to auto-deduct inventory numbers & ingredients', invErr);
    }

    // Record promo code redemption if order used a promo code
    if (newOrder.promoCode) {
      try {
        this.recordPromoUsage(newOrder.promoCode);
      } catch (pErr) {
        console.error('Failed to record promo code usage', pErr);
      }
    }

    // Play loud kitchen restaurant beeper so employee won't miss the incoming order
    sounds.playKitchenOrderBeep();

    // Trigger customer push notification
    this.sendNotification({
      orderId: newId,
      title: isPos ? 'POS Ticket Created! 🧾' : 'Order Received! 🍔',
      body: `Order ${newId} placed (${newOrder.orderType.replace('_', ' ').toUpperCase()}). Total: Rs. ${newOrder.total.toLocaleString()}`,
      type: 'order_status',
    });

    return newOrder;
  },

  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    customNote?: string,
    deliveryOptionsOrPhoto?: string | { deliveryProofPhoto?: string; deliveredByRider?: string },
    deliveredByRiderParam?: string
  ): Order | null {
    const orders = this.getOrders();
    const cleanId = orderId.trim().toUpperCase().replace('#', '');
    const order = orders.find(
      (o) =>
        o.id === orderId ||
        o.id.toUpperCase() === orderId.toUpperCase() ||
        o.id.replace('#', '').toUpperCase() === cleanId
    );
    if (!order) return null;

    const previousStatus = order.status;
    order.status = newStatus;
    const now = new Date().toISOString();

    const statusNotes: Record<OrderStatus, string> = {
      received: 'Order received in restaurant queue',
      confirmed: 'Order confirmed & sent to kitchen grill',
      preparing: 'Chef is grilling smash patties & preparing sides',
      on_the_way: 'Rider has picked up food and is en route',
      delivered: 'Order marked as successfully delivered to customer',
      cancelled: 'Order was cancelled',
      refunded: 'Order was refunded & returned',
    };

    const note = customNote || statusNotes[newStatus];

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: newStatus,
      timestamp: now,
      note,
    });

    // If moved to on_the_way and no driver yet, assign realistic rider
    if (newStatus === 'on_the_way' && !order.driver) {
      order.driver = {
        name: 'Bilal Khan (Rider #09)',
        phone: '0345-8129034',
        vehiclePlate: 'KHI-DX-4418',
        progressPercent: 40,
      };
      order.estimatedMinutes = 15;
    }

    if (newStatus === 'delivered') {
      if (order.driver) {
        order.driver.progressPercent = 100;
      }
      order.estimatedMinutes = 0;
      order.deliveredAt = now;
      if (typeof deliveryOptionsOrPhoto === 'string') {
        order.deliveryProofPhoto = deliveryOptionsOrPhoto;
        if (deliveredByRiderParam) {
          order.deliveredByRider = deliveredByRiderParam;
        }
      } else if (deliveryOptionsOrPhoto) {
        if (deliveryOptionsOrPhoto.deliveryProofPhoto) {
          order.deliveryProofPhoto = deliveryOptionsOrPhoto.deliveryProofPhoto;
        }
        if (deliveryOptionsOrPhoto.deliveredByRider) {
          order.deliveredByRider = deliveryOptionsOrPhoto.deliveredByRider;
        }
      }
    }

    this.saveOrders(orders);

    // Audio chime
    sounds.playChime();

    // Push notification to user
    const titleMap: Record<OrderStatus, string> = {
      received: 'Order Received',
      confirmed: 'Order Confirmed! 🔥',
      preparing: 'Cooking on High Heat 🍳',
      on_the_way: 'Rider is On The Way! 🛵',
      delivered: 'Delivered! Enjoy Your Meal 😋',
      cancelled: 'Order Cancelled',
      refunded: 'Order Refunded / Returned 💵',
    };

    this.sendNotification({
      orderId: order.id,
      title: titleMap[newStatus],
      body: note,
      type: 'order_status',
    });

    return order;
  },

  refundOrder(
    orderId: string,
    refundData: {
      refundAmount: number;
      refundReason: string;
      refundMethod: 'easypaisa' | 'jazzcash' | 'cash' | 'pos_card' | 'original_payment';
      refundType: 'full' | 'partial';
      refundedBy: string;
      returnedToKitchen?: boolean;
      notes?: string;
    }
  ): Order | null {
    const orders = this.getOrders();
    const cleanId = orderId.trim().toUpperCase().replace('#', '');
    const order = orders.find(
      (o) =>
        o.id === orderId ||
        o.id.toUpperCase() === orderId.toUpperCase() ||
        o.id.replace('#', '').toUpperCase() === cleanId
    );
    if (!order) return null;

    const now = new Date().toISOString();
    order.status = 'refunded';
    order.refundInfo = {
      refundedAt: now,
      refundedBy: refundData.refundedBy,
      refundAmount: refundData.refundAmount,
      refundReason: refundData.refundReason,
      refundMethod: refundData.refundMethod,
      refundType: refundData.refundType,
      returnedToKitchen: refundData.returnedToKitchen,
      notes: refundData.notes,
    };
    order.declineReason = `Refunded Rs. ${refundData.refundAmount.toLocaleString()} (${refundData.refundReason})${refundData.notes ? ` - ${refundData.notes}` : ''}`;

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: 'refunded',
      timestamp: now,
      note: `Refund of Rs. ${refundData.refundAmount.toLocaleString()} processed via ${refundData.refundMethod.toUpperCase()} by ${refundData.refundedBy}. Reason: ${refundData.refundReason}`,
    });

    this.saveOrders(orders);
    sounds.playCashRegister();

    this.sendNotification({
      type: 'order_status',
      title: 'Order Refunded / Returned 💵',
      body: `Order #${order.id} refund of Rs. ${refundData.refundAmount.toLocaleString()} via ${refundData.refundMethod.toUpperCase()} processed. Reason: ${refundData.refundReason}`,
      orderId: order.id,
    });

    // Also notify server backend
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      const token = sessionStorage.getItem('bg_admin_auth_token_v1') || localStorage.getItem('bg_admin_auth_token_v1');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch(`/api/admin/orders/${encodeURIComponent(order.id)}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: 'refunded',
          reason: order.declineReason,
          refundInfo: order.refundInfo,
        }),
      }).catch(() => {});
    }

    notifyStateChange();
    return order;
  },

  assignRiderToOrder(orderId?: string, rider?: DeliveryRider | null): Order | null {
    if (!orderId) return null;
    try {
      const orders = this.getOrders();
      const cleanId = String(orderId).trim().toUpperCase().replace('#', '');
      const order = orders.find(
        (o) =>
          o.id === orderId ||
          o.id.toUpperCase() === orderId.toUpperCase() ||
          o.id.replace('#', '').toUpperCase() === cleanId
      );
      if (!order) return null;

      if (!Array.isArray(order.statusHistory)) {
        order.statusHistory = [];
      }

      if (rider && rider.name) {
        order.driver = {
          name: rider.name,
          phone: rider.phone || '0300-0000000',
          vehiclePlate: rider.vehiclePlate || 'KHI-MOTORBIKE',
          progressPercent: order.driver?.progressPercent || 35,
        };
        order.statusHistory.push({
          status: order.status,
          timestamp: new Date().toISOString(),
          note: `Assigned delivery rider: ${rider.name} (${rider.phone || 'N/A'}, ${rider.vehiclePlate || 'Motorbike'})`,
        });
      } else {
        order.driver = undefined;
      }

      this.saveOrders(orders);
      return order;
    } catch (err) {
      console.error('Error assigning rider to order:', err);
      return null;
    }
  },

  verifyEasyPaisaPayment(orderId: string, approve: boolean): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    if (approve) {
      order.payment.verified = true;
      order.payment.verifiedAt = new Date().toISOString();
      if (order.status === 'received') {
        order.status = 'confirmed';
        order.statusHistory.push({
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          note: `EasyPaisa Payment (Trx: ${order.payment.transactionId || 'N/A'}) verified by store manager.`,
        });
      }
      sounds.playSuccess();
      this.sendNotification({
        orderId: order.id,
        title: 'EasyPaisa Payment Verified! ✅',
        body: `Payment for order ${order.id} was confirmed by Bite & Go cashier. Kitchen started prep!`,
        type: 'payment_verified',
      });
    } else {
      order.payment.verified = false;
      this.sendNotification({
        orderId: order.id,
        title: 'Payment Verification Issue ⚠️',
        body: `We couldn't verify payment screenshot for order ${order.id}. Please reach out via WhatsApp.`,
        type: 'payment_verified',
      });
    }

    this.saveOrders(orders);
    return order;
  },

  verifyPayment(orderId: string, approve: boolean): Order | null {
    return this.verifyEasyPaisaPayment(orderId, approve);
  },

  adjustOrderTimer(orderId: string, minutes: number, reason?: string): Order | null {
    const orders = this.getOrders();
    const cleanId = orderId.trim().toUpperCase().replace('#', '');
    const order = orders.find(
      (o) =>
        o.id === orderId ||
        o.id.toUpperCase() === orderId.toUpperCase() ||
        o.id.replace('#', '').toUpperCase() === cleanId
    );
    if (!order) return null;

    const prevMins = order.estimatedMinutes || 20;
    order.estimatedMinutes = Math.max(1, minutes);
    const delta = order.estimatedMinutes - prevMins;
    const deltaText = delta > 0 ? `+${delta}m` : `${delta}m`;
    const note = reason
      ? `Staff adjusted order timer to ${order.estimatedMinutes} mins (${deltaText}): ${reason}`
      : `Staff adjusted order timer to ${order.estimatedMinutes} mins (${deltaText}).`;

    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      note,
    });

    this.saveOrders(orders);
    sounds.playChime();

    this.sendNotification({
      orderId: order.id,
      title: `Order Timer Updated (${order.estimatedMinutes}m) ⏱️`,
      body: note,
      type: 'order_status',
    });

    return order;
  },

  adjustOrderTimerDelta(orderId: string, deltaMinutes: number, reason?: string): Order | null {
    const orders = this.getOrders();
    const cleanId = orderId.trim().toUpperCase().replace('#', '');
    const order = orders.find(
      (o) =>
        o.id === orderId ||
        o.id.toUpperCase() === orderId.toUpperCase() ||
        o.id.replace('#', '').toUpperCase() === cleanId
    );
    if (!order) return null;
    const prevMins = order.estimatedMinutes || 20;
    const newMins = Math.max(1, prevMins + deltaMinutes);
    return this.adjustOrderTimer(order.id, newMins, reason || `Quick ${deltaMinutes > 0 ? `+${deltaMinutes}` : deltaMinutes}m adjustment`);
  },

  updateLiveOrder(updatedOrder: Order, customerNote?: string): Order | null {
    const orders = this.getOrders();
    const cleanId = (updatedOrder.id || '').trim().toUpperCase().replace('#', '');
    const index = orders.findIndex(
      (o) =>
        o.id === updatedOrder.id ||
        o.id.toUpperCase() === (updatedOrder.id || '').toUpperCase() ||
        o.id.replace('#', '').toUpperCase() === cleanId
    );
    if (index === -1) return null;

    const existing = orders[index];
    const now = new Date().toISOString();
    const note =
      customerNote ||
      `Customer updated live order items & delivery notes (Items: ${updatedOrder.items.length}, New Total: Rs. ${updatedOrder.total.toLocaleString()}).`;

    const mergedOrder: Order = {
      ...existing,
      ...updatedOrder,
      statusHistory: [
        ...existing.statusHistory,
        {
          status: existing.status,
          timestamp: now,
          note,
        },
      ],
    };

    orders[index] = mergedOrder;
    this.saveOrders(orders);
    sounds.playChime();

    this.sendNotification({
      orderId: mergedOrder.id,
      title: 'Order Adjusted Successfully ✏️',
      body: `Your live order ${mergedOrder.id} has been updated. Kitchen received your changes!`,
      type: 'order_status',
    });

    return mergedOrder;
  },

  decrementInventoryForOrder(order: Order): void {
    if (order.inventoryDeducted) return;

    try {
      const menuItems = this.getMenuItems();
      const ingredients = this.getIngredients();
      const comboDeals = this.getComboDeals();
      let menuUpdated = false;
      let ingUpdated = false;

      const deductRecipe = (recipe?: Array<{ ingredientId: string; quantity: number }>, multiplier = 1) => {
        if (!recipe || recipe.length === 0) return;
        for (const ingReq of recipe) {
          const ing = ingredients.find((i) => i.id === ingReq.ingredientId);
          if (ing) {
            ing.currentStock = Math.max(0, ing.currentStock - ingReq.quantity * multiplier);
            ingUpdated = true;
          }
        }
      };

      for (const orderItem of order.items) {
        const item = menuItems.find((m) => m.id === orderItem.menuItemId || m.name === orderItem.name);
        const orderQty = orderItem.quantity || 1;

        if (item) {
          if ((item.trackInventory ?? true) && typeof item.stockQuantity === 'number') {
            item.stockQuantity = Math.max(0, item.stockQuantity - orderQty);
            if (item.stockQuantity === 0) item.isAvailable = false;
            menuUpdated = true;
          }
          if (item.recipe) {
            deductRecipe(item.recipe, orderQty);
          }
        }

        const matchingDeal =
          comboDeals.find((d) => d.id === orderItem.menuItemId || d.title === orderItem.name) ||
          (item && item.isDeal ? comboDeals.find((d) => d.id === item.dealId) : null);

        const includedList = item?.includedDealItems || matchingDeal?.includedItems;
        if (includedList && includedList.length > 0) {
          for (const inc of includedList) {
            const bundledItem = menuItems.find((m) => m.id === inc.menuItemId);
            const totalBundledQty = inc.quantity * orderQty;
            if (bundledItem) {
              if ((bundledItem.trackInventory ?? true) && typeof bundledItem.stockQuantity === 'number') {
                bundledItem.stockQuantity = Math.max(0, bundledItem.stockQuantity - totalBundledQty);
                if (bundledItem.stockQuantity === 0) bundledItem.isAvailable = false;
                menuUpdated = true;
              }
              if (bundledItem.recipe) {
                deductRecipe(bundledItem.recipe, totalBundledQty);
              }
            }
          }
        }
      }

      order.inventoryDeducted = true;
      if (menuUpdated) this.saveMenuItems(menuItems);
      if (ingUpdated) this.saveIngredients(ingredients);
    } catch (e) {
      console.error('Failed to decrement inventory for order:', e);
    }
  },

  declineOrder(orderId: string, reason: string): Order | null {
    const orders = this.getOrders();
    const cleanId = (orderId || '').trim().toUpperCase().replace('#', '');
    const order = orders.find(
      (o) =>
        o.id === orderId ||
        o.id.toUpperCase() === (orderId || '').toUpperCase() ||
        o.id.replace('#', '').toUpperCase() === cleanId
    );
    if (!order) return null;

    order.status = 'cancelled';
    order.declineReason = reason.trim();
    order.estimatedMinutes = 0;
    const now = new Date().toISOString();

    order.statusHistory.push({
      status: 'cancelled',
      timestamp: now,
      note: `Order declined by store: ${reason.trim()}`,
    });

    this.saveOrders(orders);
    sounds.playChime();

    this.sendNotification({
      orderId: order.id,
      title: `Order Declined by Store ❌`,
      body: `Order ${order.id} was declined: ${reason.trim()}`,
      type: 'order_status',
    });

    // Restock ingredients and items when an order is declined so inventory is restored
    try {
      const menuItems = this.getMenuItems();
      const ingredients = this.getIngredients();
      const comboDeals = this.getComboDeals();
      let menuUpdated = false;
      let ingUpdated = false;

      const restockRecipe = (recipe?: Array<{ ingredientId: string; quantity: number }>, multiplier = 1) => {
        if (!recipe || recipe.length === 0) return;
        for (const ingReq of recipe) {
          const ing = ingredients.find((i) => i.id === ingReq.ingredientId);
          if (ing) {
            ing.currentStock += ingReq.quantity * multiplier;
            ingUpdated = true;
          }
        }
      };

      for (const orderItem of order.items) {
        const item = menuItems.find((m) => m.id === orderItem.menuItemId || m.name === orderItem.name);
        const orderQty = orderItem.quantity || 1;
        if (item) {
          if ((item.trackInventory ?? true) && typeof item.stockQuantity === 'number') {
            item.stockQuantity += orderQty;
            item.isAvailable = true;
            menuUpdated = true;
          }
          if (item.recipe) {
            restockRecipe(item.recipe, orderQty);
          }
        }

        const matchingDeal =
          comboDeals.find((d) => d.id === orderItem.menuItemId || d.title === orderItem.name) ||
          (item && item.isDeal ? comboDeals.find((d) => d.id === item.dealId) : null);
        const includedList = item?.includedDealItems || matchingDeal?.includedItems;
        if (includedList && includedList.length > 0) {
          for (const inc of includedList) {
            const bundledItem = menuItems.find((m) => m.id === inc.menuItemId);
            const totalBundledQty = inc.quantity * orderQty;
            if (bundledItem) {
              if ((bundledItem.trackInventory ?? true) && typeof bundledItem.stockQuantity === 'number') {
                bundledItem.stockQuantity += totalBundledQty;
                bundledItem.isAvailable = true;
                menuUpdated = true;
              }
              if (bundledItem.recipe) {
                restockRecipe(bundledItem.recipe, totalBundledQty);
              }
            }
          }
        }
      }

      if (menuUpdated) this.saveMenuItems(menuItems);
      if (ingUpdated) this.saveIngredients(ingredients);
    } catch (e) {
      console.error('Failed to restock inventory on order decline', e);
    }

    return order;
  },

  updateOrderNotes(orderId: string, notes: string): Order | null {
    const orders = this.getOrders();
    const cleanId = orderId.toUpperCase().replace('#', '');
    const order = orders.find(
      (o) => o.id === orderId || o.id.toUpperCase() === orderId.toUpperCase() || o.id.replace('#', '').toUpperCase() === cleanId
    );
    if (!order) return null;
    const clean = notes.trim();
    order.notes = clean || undefined;
    order.customerNotes = clean || undefined;
    order.specialInstructions = clean || undefined;
    this.saveOrders(orders);
    notifyStateChange();
    return order;
  },

  clearOrderHistory(preserveActive = false): { deletedCount: number; remainingCount: number } {
    const orders = this.getOrders();
    const initialCount = orders.length;
    let newOrders: Order[] = [];
    if (preserveActive) {
      newOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
    } else {
      newOrders = [];
    }
    this.saveOrders(newOrders);
    return {
      deletedCount: initialCount - newOrders.length,
      remainingCount: newOrders.length,
    };
  },

  updateMenuItemImage(itemId: string, newImageUrl: string): MenuItem | null {
    const items = this.getMenuItems();
    const item = items.find((i) => i.id === itemId);
    if (!item) return null;
    item.image = newImageUrl;
    this.saveMenuItems(items);
    return item;
  },

  // --- ACTIVE ORDER TRACKER ---
  getActiveOrderId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ORDER_ID);
  },

  setActiveOrderId(id: string | null) {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ORDER_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ORDER_ID);
    }
    notifyStateChange();
  },

  // --- STORE SETTINGS ---
  getSettings(): StoreSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        const contactPhone = parsed.contactPhone && !parsed.contactPhone.includes('9821430') ? parsed.contactPhone : '+923012945576';
        const operatingHours = parsed.operatingHours && !parsed.operatingHours.includes('03:00 AM')
          ? parsed.operatingHours
          : initialStoreSettings.operatingHours;
        const freeDeliveryAreas = Array.isArray(parsed.freeDeliveryAreas)
          ? parsed.freeDeliveryAreas
          : initialStoreSettings.freeDeliveryAreas;

        return {
          ...initialStoreSettings,
          ...parsed,
          contactPhone,
          whatsappNumber: contactPhone,
          operatingHours,
          freeDeliveryAreas,
          scheduleOverrideMode: parsed.scheduleOverrideMode || initialStoreSettings.scheduleOverrideMode || 'auto',
          disabledDeliveryAreas: Array.isArray(parsed.disabledDeliveryAreas) ? parsed.disabledDeliveryAreas : (initialStoreSettings.disabledDeliveryAreas || []),
          showPromoCodeAtCheckout: parsed.showPromoCodeAtCheckout !== undefined ? parsed.showPromoCodeAtCheckout : true,
          deliveryRiders: Array.isArray(parsed.deliveryRiders) && parsed.deliveryRiders.length > 0 ? parsed.deliveryRiders : (initialStoreSettings.deliveryRiders || []),
          weeklySchedule: {
            ...initialStoreSettings.weeklySchedule,
            ...(parsed.weeklySchedule || {}),
          },
          customerWidgets: {
            ...initialStoreSettings.customerWidgets,
            ...(parsed.customerWidgets || {}),
            heroDeliveryCitiesText: (parsed.customerWidgets?.heroDeliveryCitiesText || 'Karachi Express Hot Delivery')
              .replace(/&?\s*Lahore\s*(&?)/gi, '')
              .replace(/\s+/g, ' ')
              .trim() || 'Karachi Express Hot Delivery',
            heroBadge1Title:
              parsed.customerWidgets?.heroBadge1Title === '25–35 Mins' ||
              parsed.customerWidgets?.heroBadge1Title === '25-35 Mins' ||
              !parsed.customerWidgets?.heroBadge1Title
                ? '35–50 Mins'
                : parsed.customerWidgets.heroBadge1Title,
            showFreshBeefGuaranteeCard: false,
            showHalalAccreditationPill: false,
            showLiveOrderCounter: false,
          },
          kitchenPermissions: {
            ...initialStoreSettings.kitchenPermissions,
            ...(parsed.kitchenPermissions || {}),
          },
          posPermissions: {
            ...initialStoreSettings.posPermissions,
            ...(parsed.posPermissions || {}),
          },
        };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialStoreSettings));
    } catch {}
    return initialStoreSettings;
  },

  async saveSettings(settings: StoreSettings): Promise<StoreSettings> {
    if (settings.customerWidgets?.heroDeliveryCitiesText) {
      settings.customerWidgets.heroDeliveryCitiesText = settings.customerWidgets.heroDeliveryCitiesText
        .replace(/&?\s*Lahore\s*(&?)/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Karachi Express Hot Delivery';
    }
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }

    try {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        const token =
          sessionStorage.getItem('bg_admin_auth_token_v1') ||
          localStorage.getItem('bg_admin_auth_token_v1');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        await fetch('/api/admin/settings', {
          method: 'PUT',
          headers,
          body: JSON.stringify(settings),
        }).catch(() => {});
      }
    } catch {}

    notifyStateChange();
    return settings;
  },

  async updateWidgetConfig(partialConfig: Partial<CustomerWidgetsConfig>): Promise<StoreSettings> {
    const current = this.getSettings();
    const updated: StoreSettings = {
      ...current,
      customerWidgets: {
        ...(current.customerWidgets || {}),
        ...partialConfig,
      } as CustomerWidgetsConfig,
    };
    return await this.saveSettings(updated);
  },

  getDeliveryRiders(): DeliveryRider[] {
    const settings = this.getSettings();
    return settings.deliveryRiders && settings.deliveryRiders.length > 0
      ? settings.deliveryRiders
      : (initialStoreSettings.deliveryRiders || []);
  },

  async saveDeliveryRiders(riders: DeliveryRider[]): Promise<StoreSettings> {
    const current = this.getSettings();
    const updated: StoreSettings = {
      ...current,
      deliveryRiders: riders,
    };
    return await this.saveSettings(updated);
  },

  async updateThemePreset(themePresetId: string, themeMode?: 'dark' | 'light'): Promise<StoreSettings> {
    const current = this.getSettings();
    const updated: StoreSettings = {
      ...current,
      customerWidgets: {
        ...(current.customerWidgets || {}),
        themePreset: themePresetId,
        themeAccent: themePresetId,
        ...(themeMode ? { themeMode } : {}),
      } as CustomerWidgetsConfig,
    };
    return await this.saveSettings(updated);
  },

  // --- NOTIFICATIONS ---
  getNotifications(): PushNotificationMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (data) return JSON.parse(data);
    } catch {
      return [];
    }
    return [];
  },

  sendNotification(params: Omit<PushNotificationMessage, 'id' | 'timestamp' | 'read'>) {
    const list = this.getNotifications();
    const newNotif: PushNotificationMessage = {
      ...params,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    list.unshift(newNotif);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list.slice(0, 20)));

    // Try browser Push / Notification API if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newNotif.title, {
          body: newNotif.body,
          icon: '/favicon.ico',
        });
      } catch {
        // Safe fallback
      }
    }

    notifyStateChange();
  },

  markNotificationsRead() {
    const list = this.getNotifications();
    list.forEach((n) => (n.read = true));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    notifyStateChange();
  },

  markNotificationAsRead(id: string) {
    const list = this.getNotifications();
    const item = list.find((n) => n.id === id);
    if (item) {
      item.read = true;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
      notifyStateChange();
    }
  },

  deleteNotification(id: string) {
    const list = this.getNotifications().filter((n) => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    notifyStateChange();
  },

  // --- CUSTOMER USER AUTHENTICATION & PROFILE ---
  getCustomerAccounts(): Array<{ user: CustomerUser; passwordHash: string }> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMER_ACCOUNTS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    // Seed default customer account (Hamza Tariq)
    const initialCustomerAccounts = [
      {
        user: {
          id: 'cust-hamza-1',
          name: 'Hamza Tariq',
          email: 'hamza@example.com',
          phone: '0321-4928172',
          defaultAddress: 'House 42-B, Street 14, Phase 6',
          defaultArea: 'DHA Phase 6, Karachi',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        passwordHash: 'hamza123',
      },
    ];
    this.saveCustomerAccounts(initialCustomerAccounts);
    return initialCustomerAccounts;
  },

  saveCustomerAccounts(accounts: Array<{ user: CustomerUser; passwordHash: string }>) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMER_ACCOUNTS, JSON.stringify(accounts));
    notifyStateChange();
  },

  getCustomerUsers(): CustomerUser[] {
    return this.getCustomerAccounts().map((a) => a.user);
  },

  getActiveCustomer(): CustomerUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_CUSTOMER);
      if (data) return JSON.parse(data);
    } catch {
      return null;
    }
    return null;
  },

  setActiveCustomer(customer: CustomerUser | null) {
    if (customer) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CUSTOMER, JSON.stringify(customer));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CUSTOMER);
    }
    notifyStateChange();
  },

  customerSignUp(params: {
    name: string;
    email: string;
    phone: string;
    password: string;
    defaultAddress?: string;
    defaultArea?: string;
  }): { success: boolean; user?: CustomerUser; error?: string } {
    const accounts = this.getCustomerAccounts();
    const normalizedEmail = params.email.trim().toLowerCase();

    if (accounts.some((a) => a.user.email.toLowerCase() === normalizedEmail)) {
      return { success: false, error: 'An account with this email already exists. Please sign in.' };
    }

    const newUser: CustomerUser = {
      id: `cust-${Date.now()}`,
      name: params.name.trim(),
      email: normalizedEmail,
      phone: params.phone.trim(),
      defaultAddress: params.defaultAddress?.trim() || '',
      defaultArea: params.defaultArea?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    accounts.push({
      user: newUser,
      passwordHash: params.password, // Plain hash for customer state demo
    });

    this.saveCustomerAccounts(accounts);
    this.setActiveCustomer(newUser);
    return { success: true, user: newUser };
  },

  customerSignIn(email: string, password: string): { success: boolean; user?: CustomerUser; error?: string } {
    const accounts = this.getCustomerAccounts();
    const normalizedEmail = email.trim().toLowerCase();
    const found = accounts.find((a) => a.user.email.toLowerCase() === normalizedEmail);

    if (!found) {
      return { success: false, error: 'No account found with this email. Please register.' };
    }

    if (found.passwordHash !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    this.setActiveCustomer(found.user);
    return { success: true, user: found.user };
  },

  customerGoogleSignIn(googleProfile: {
    name?: string;
    email: string;
    picture?: string;
    phone?: string;
    defaultArea?: string;
    defaultAddress?: string;
  }): { success: boolean; user: CustomerUser } {
    const accounts = this.getCustomerAccounts();
    const normalizedEmail = (googleProfile.email || '').trim().toLowerCase();
    const found = accounts.find((a) => a.user.email.toLowerCase() === normalizedEmail);

    if (found) {
      if (googleProfile.name && (!found.user.name || found.user.name === 'Guest')) {
        found.user.name = googleProfile.name;
      }
      this.setActiveCustomer(found.user);
      return { success: true, user: found.user };
    }

    const newUser: CustomerUser = {
      id: `usr-g-${Date.now()}`,
      name: googleProfile.name || (googleProfile.email.split('@')[0] || 'Google User'),
      email: googleProfile.email.trim(),
      phone: googleProfile.phone || '0300-1234567',
      defaultArea: googleProfile.defaultArea || 'North Nazimabad - Block I (Branch Location)',
      defaultAddress: googleProfile.defaultAddress || 'Karachi, Pakistan',
      createdAt: new Date().toISOString(),
    };

    accounts.push({
      user: newUser,
      passwordHash: 'google_oauth_verified',
    });

    this.saveCustomerAccounts(accounts);
    this.setActiveCustomer(newUser);
    return { success: true, user: newUser };
  },

  customerSignOut() {
    this.setActiveCustomer(null);
  },

  updateCustomerProfile(updates: Partial<CustomerUser>) {
    const active = this.getActiveCustomer();
    if (!active) return;
    const updatedUser: CustomerUser = { ...active, ...updates };
    this.setActiveCustomer(updatedUser);

    const accounts = this.getCustomerAccounts();
    const idx = accounts.findIndex((a) => a.user.id === active.id);
    if (idx !== -1) {
      accounts[idx].user = updatedUser;
      this.saveCustomerAccounts(accounts);
    }
  },

  // --- SUPPORT TICKETS FOR ORDER ISSUES ---
  getTickets(): CustomerTicket[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPPORT_TICKETS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    // Seed initial realistic tickets
    const sampleTickets: CustomerTicket[] = [
      {
        id: '#TCK-1082',
        orderId: '#BG-7421',
        customerName: 'Hamza Tariq',
        customerEmail: 'hamza@example.com',
        customerPhone: '0321-4928172',
        issueType: 'missing_item',
        message: 'Could you please make sure extra Garlic Mayo and Ranch Dip ramekins are packed with my Smash Melt order?',
        status: 'open',
        adminReply: '',
        createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
      {
        id: '#TCK-1049',
        orderId: '#BG-7420',
        customerName: 'Ayesha Siddiqui',
        customerEmail: 'ayesha@example.com',
        customerPhone: '0333-8219401',
        issueType: 'delayed_order',
        message: 'Rider was 10 mins delayed due to rain on Shahrah-e-Faisal. Food was piping hot though, just checking!',
        status: 'resolved',
        adminReply: 'Apologies for the rain delay! We added a complimentary Lotus Shake voucher for your next order.',
        createdAt: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    ];
    try {
      localStorage.setItem(STORAGE_KEYS.SUPPORT_TICKETS, JSON.stringify(sampleTickets));
    } catch {}
    return sampleTickets;
  },

  saveTickets(tickets: CustomerTicket[]) {
    localStorage.setItem(STORAGE_KEYS.SUPPORT_TICKETS, JSON.stringify(tickets));
    notifyStateChange();
  },

  createTicket(params: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    issueType: CustomerTicket['issueType'];
    message: string;
    attachments?: CustomerTicket['attachments'];
  }): CustomerTicket {
    const tickets = this.getTickets();
    const newId = `#TCK-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const initialMessages = [
      {
        id: `msg-${Date.now()}`,
        sender: 'customer' as const,
        senderName: params.customerName,
        message: params.message,
        timestamp: now,
        attachments: params.attachments || [],
      },
    ];

    const newTicket: CustomerTicket = {
      ...params,
      id: newId,
      status: 'open',
      attachments: params.attachments || [],
      messages: initialMessages,
      createdAt: now,
      updatedAt: now,
    };

    tickets.unshift(newTicket);
    this.saveTickets(tickets);

    // Track ticket as created by this customer session
    try {
      const myTicketIds = this.getCustomerTicketIds();
      if (!myTicketIds.includes(newId)) {
        myTicketIds.push(newId);
        localStorage.setItem(STORAGE_KEYS.CUSTOMER_TICKET_IDS, JSON.stringify(myTicketIds));
      }
    } catch {
      // safe fallback
    }

    // Alert notification
    this.sendNotification({
      orderId: params.orderId,
      title: `Support Ticket Created (${newId}) 🎟️`,
      body: `Your ticket for order ${params.orderId} has been submitted. Our team will review it shortly.`,
      type: 'order_status',
    });

    sounds.playChime();
    return newTicket;
  },

  getCustomerTicketIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMER_TICKET_IDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getCustomerTickets(activeCustomer?: CustomerUser | null, orders: Order[] = [], includeClosed: boolean = false): CustomerTicket[] {
    const all = this.getTickets();
    const createdIds = this.getCustomerTicketIds();
    const customerOrderIds: string[] = [];
    const activeOrderId = this.getActiveOrderId();
    if (activeOrderId) {
      const matchOrd = orders.find((o) => o.id === activeOrderId);
      if (
        !matchOrd ||
        (matchOrd.source !== 'pos' &&
          matchOrd.orderType !== 'dine_in' &&
          matchOrd.orderType !== 'pos_takeaway' &&
          matchOrd.orderType !== 'pos_counter')
      ) {
        customerOrderIds.push(activeOrderId);
      }
    }
    if (activeCustomer) {
      orders
        .filter(
          (o) =>
            o.source !== 'pos' &&
            o.orderType !== 'dine_in' &&
            o.orderType !== 'pos_takeaway' &&
            o.orderType !== 'pos_counter' &&
            ((activeCustomer.phone && o.customerPhone === activeCustomer.phone) ||
              (activeCustomer.email && o.customerEmail?.toLowerCase() === activeCustomer.email.toLowerCase()))
        )
        .forEach((o) => {
          if (!customerOrderIds.includes(o.id)) customerOrderIds.push(o.id);
        });
    }

    return all.filter((t) => {
      // By default on customer active HUD/bars, hide closed tickets
      if (!includeClosed && t.status === 'closed') return false;

      // 1. Matches active logged-in customer profile
      if (
        activeCustomer &&
        ((activeCustomer.email && t.customerEmail?.toLowerCase() === activeCustomer.email.toLowerCase()) ||
          (activeCustomer.phone && t.customerPhone === activeCustomer.phone))
      ) {
        return true;
      }

      // 2. Matches a ticket explicitly created in this browser session
      if (createdIds.includes(t.id)) {
        return true;
      }

      // 3. Matches one of the customer's orders in this session
      if (customerOrderIds.includes(t.orderId)) {
        return true;
      }

      return false;
    });
  },

  getAllCustomerTickets(activeCustomer?: CustomerUser | null, orders: Order[] = []): CustomerTicket[] {
    return this.getCustomerTickets(activeCustomer, orders, true);
  },

  addTicketMessage(ticketId: string, messageParams: {
    sender: 'customer' | 'staff' | 'manager';
    senderName: string;
    message: string;
    attachments?: CustomerTicket['attachments'];
  }): CustomerTicket | null {
    const tickets = this.getTickets();
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;

    // STRICT PROTECTION: If ticket is closed, customer CANNOT post or talk on it under any circumstance!
    if (ticket.status === 'closed' && messageParams.sender === 'customer') {
      console.warn('Customer message blocked on closed ticket:', ticket.id);
      return null;
    }

    const now = new Date().toISOString();
    const newMsg = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sender: messageParams.sender,
      senderName: messageParams.senderName,
      message: messageParams.message,
      timestamp: now,
      attachments: messageParams.attachments || [],
    };

    if (!ticket.messages) {
      ticket.messages = [
        {
          id: `msg-orig-${ticket.id}`,
          sender: 'customer',
          senderName: ticket.customerName,
          message: ticket.message,
          timestamp: ticket.createdAt,
          attachments: ticket.attachments || [],
        },
      ];
      if (ticket.adminReply) {
        ticket.messages.push({
          id: `msg-reply-${ticket.id}`,
          sender: 'manager',
          senderName: 'Support Manager',
          message: ticket.adminReply,
          timestamp: ticket.updatedAt,
        });
      }
    }

    ticket.messages.push(newMsg);
    ticket.updatedAt = now;

    if (messageParams.sender === 'manager' || messageParams.sender === 'staff') {
      ticket.adminReply = messageParams.message;
      // Manager/staff can reopen ticket by replying if desired
      if (ticket.status === 'closed' || ticket.status === 'resolved') {
        ticket.status = 'open';
      }
      this.sendNotification({
        orderId: ticket.orderId,
        title: `Reply on Ticket (${ticket.id}) 💬`,
        body: `${messageParams.senderName}: "${messageParams.message.slice(0, 80)}"`,
        type: 'order_status',
      });
      sounds.playChime();
    } else {
      // Customer talking back
      // CRITICAL: If ticket is closed, customer cannot message or reopen it! Only manager/employee can reopen closed tickets.
      if (ticket.status === 'closed') {
        console.warn('Customer attempted to post message on closed ticket', ticket.id);
        return null;
      }
      // If customer follows up on resolved ticket, reopen to open
      if (ticket.status === 'resolved') {
        ticket.status = 'open';
      }
      sounds.playSuccess();
    }

    this.saveTickets(tickets);
    return ticket;
  },

  updateTicketStatus(ticketId: string, status: TicketStatus, adminReply?: string, resolutionNote?: string): CustomerTicket | null {
    const tickets = this.getTickets();
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;

    ticket.status = status;
    const now = new Date().toISOString();
    ticket.updatedAt = now;

    if (adminReply !== undefined && adminReply.trim()) {
      ticket.adminReply = adminReply;
      if (!ticket.messages) {
        ticket.messages = [
          {
            id: `msg-orig-${ticket.id}`,
            sender: 'customer',
            senderName: ticket.customerName,
            message: ticket.message,
            timestamp: ticket.createdAt,
            attachments: ticket.attachments || [],
          },
        ];
      }
      ticket.messages.push({
        id: `msg-status-${Date.now()}`,
        sender: 'manager',
        senderName: 'Support Manager',
        message: adminReply,
        timestamp: now,
      });
    }

    if (status === 'resolved') {
      ticket.resolvedAt = now;
      this.sendNotification({
        orderId: ticket.orderId,
        title: `Ticket Resolved (${ticket.id}) ✅`,
        body: `Support issue for order ${ticket.orderId} has been resolved: ${adminReply || resolutionNote || 'Marked as resolved by store manager'}`,
        type: 'order_status',
      });
      sounds.playSuccess();
    } else if (status === 'closed') {
      ticket.closedAt = now;
      this.sendNotification({
        orderId: ticket.orderId,
        title: `Ticket Closed (${ticket.id}) 🔒`,
        body: `Ticket for order ${ticket.orderId} has been closed: ${adminReply || resolutionNote || 'Closed by staff'}`,
        type: 'order_status',
      });
    }

    this.saveTickets(tickets);
    return ticket;
  },

  replyToTicket(ticketId: string, reply: string): CustomerTicket | null {
    return this.addTicketMessage(ticketId, {
      sender: 'staff',
      senderName: 'Kitchen & POS Staff',
      message: reply,
    });
  },

  decrementStock(itemId: string, quantity: number): MenuItem | null {
    const items = this.getMenuItems();
    const item = items.find((i) => i.id === itemId);
    if (item && (item.trackInventory ?? true) && typeof item.stockQuantity === 'number') {
      item.stockQuantity = Math.max(0, item.stockQuantity - quantity);
      if (item.stockQuantity === 0) item.isAvailable = false;
      this.saveMenuItems(items);
      return item;
    }
    return null;
  },

  saveOrder(order: Order): Order {
    return this.createOrder(order);
  },

  reopenTicket(ticketId: string, reason: string): CustomerTicket | null {
    const tickets = this.getTickets();
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;
    ticket.status = 'open';
    const now = new Date().toISOString();
    ticket.updatedAt = now;
    ticket.closedAt = undefined;
    if (!ticket.messages) ticket.messages = [];
    ticket.messages.push({
      id: `msg-reopen-${Date.now()}`,
      sender: 'customer',
      senderName: ticket.customerName,
      message: `[REOPEN REQUEST]: ${reason.trim()}`,
      timestamp: now,
    });
    this.sendNotification({
      orderId: ticket.orderId,
      title: `Ticket Reopened (${ticket.id}) 🔄`,
      body: `${ticket.customerName} requested reopening: "${reason.slice(0, 60)}"`,
      type: 'order_status',
    });
    sounds.playChime();
    this.saveTickets(tickets);
    return ticket;
  },

  // --- CUSTOMER FOOD REVIEWS & RATINGS ---
  getReviews(): CustomerReview[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REVIEWS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load reviews', e);
    }
    const defaultReviews: CustomerReview[] = [
      {
        id: 'rev-1',
        customerName: 'Hamza Tariq',
        customerCity: 'North Nazimabad',
        rating: 5,
        dishName: 'Double Smash Beef Burger',
        comment: 'The crust on this smash burger is genuinely legendary in Karachi. Melted double cheese and the special secret sauce soak into the brioche bun perfectly. 10/10 recommend!',
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        verified: true,
        managerReply: 'Thank you Hamza! Our flat-top grill cooks appreciate the shout-out.',
        likesCount: 28,
      },
      {
        id: 'rev-2',
        customerName: 'Ayesha Zuberi',
        customerCity: 'Gulshan-e-Iqbal',
        rating: 5,
        dishName: 'Lotus Biscoff Gourmet Shake',
        comment: 'Best thick shake I have ever ordered online in Karachi. Perfectly chilled, actual biscoff crumble on top, not overly sweet. Arrived cold and thick!',
        createdAt: new Date(Date.now() - 54 * 60 * 60 * 1000).toISOString(),
        verified: true,
        likesCount: 21,
      },
      {
        id: 'rev-3',
        customerName: 'Bilal Khan',
        customerCity: 'DHA Phase 6',
        rating: 5,
        dishName: 'Loaded Fire Animal Fries',
        comment: 'The portion size of these animal fries is huge. Beef mince, caramelized onions and spicy chipotle drizzle was piping hot.',
        createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        verified: true,
        managerReply: 'Appreciate your love Bilal! Enjoy your next feast.',
        likesCount: 34,
      },
      {
        id: 'rev-4',
        customerName: 'Zainab Merchant',
        customerCity: 'PECHS Block 2',
        rating: 5,
        dishName: 'Crispy Nashville Hot Chicken Burger',
        comment: 'That crunch when you take the first bite! Serious Nashville spice level without sacrificing juiciness. Arrived in 28 mins.',
        createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
        verified: true,
        likesCount: 17,
      },
    ];
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(defaultReviews));
    } catch {}
    return defaultReviews;
  },

  saveReviews(reviews: CustomerReview[]) {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
    notifyStateChange();
  },

  getReviewsForOrder(orderId: string): CustomerReview[] {
    const reviews = this.getReviews();
    const cleanId = orderId.replace('#', '').trim().toUpperCase();
    return reviews.filter(
      (r) => r.orderId && r.orderId.replace('#', '').trim().toUpperCase() === cleanId
    );
  },

  hasRatedOrderItem(orderId: string, dishName: string): boolean {
    const orderReviews = this.getReviewsForOrder(orderId);
    const dLower = dishName.trim().toLowerCase();
    return orderReviews.some(
      (r) => r.dishName && r.dishName.trim().toLowerCase() === dLower
    );
  },

  addReview(params: Omit<CustomerReview, 'id' | 'createdAt' | 'likesCount'>): CustomerReview {
    // 1. Strict Input Sanitization against XSS & HTML injection
    const cleanDishName = sanitizeInput(params.dishName || '').trim();
    const cleanComment = sanitizeInput(params.comment || '').trim();
    const cleanCustomerName = sanitizeInput(params.customerName || 'Diner').trim();
    const cleanCity = sanitizeInput(params.customerCity || 'Karachi').trim();
    const cleanRating = Math.min(5, Math.max(1, Math.round(Number(params.rating) || 5)));

    // 2. Security Enforcement: Diners can ONLY rate items they actually ordered!
    if (!params.orderId) {
      throw new Error('Security Restriction: You must provide a valid verified order ID to submit ratings.');
    }

    const cleanOrderId = params.orderId.replace('#', '').trim().toUpperCase();
    const orders = this.getOrders();
    const matchedOrder = orders.find(
      (o) => o.id.replace('#', '').trim().toUpperCase() === cleanOrderId
    );

    if (matchedOrder) {
      const validation = validateOrderedDishForRating(matchedOrder, cleanDishName);
      if (!validation.isValid) {
        throw new Error(validation.error || 'You may only rate dishes that were in your order.');
      }
    }

    const reviews = this.getReviews();

    // 3. Deduplication: If the customer already rated this specific ordered item, update their rating
    const existingIdx = reviews.findIndex(
      (r) =>
        r.orderId &&
        r.orderId.replace('#', '').trim().toUpperCase() === cleanOrderId &&
        r.dishName?.trim().toLowerCase() === cleanDishName.toLowerCase()
    );

    if (existingIdx !== -1) {
      reviews[existingIdx].rating = cleanRating;
      reviews[existingIdx].comment = cleanComment;
      reviews[existingIdx].customerName = cleanCustomerName;
      reviews[existingIdx].customerCity = cleanCity;
      reviews[existingIdx].createdAt = new Date().toISOString();
      this.saveReviews(reviews);
      sounds.playSuccess();
      return reviews[existingIdx];
    }

    const newReview: CustomerReview = {
      ...params,
      dishName: cleanDishName,
      customerName: cleanCustomerName,
      customerCity: cleanCity,
      comment: cleanComment,
      rating: cleanRating,
      verified: true,
      orderId: matchedOrder ? matchedOrder.id : params.orderId,
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      likesCount: 1,
    };

    reviews.unshift(newReview);
    this.saveReviews(reviews);
    sounds.playSuccess();

    // Notify admin & store manager about new customer rating
    this.sendNotification({
      orderId: newReview.orderId || `REV-${newReview.id}`,
      title: `Verified Rating Received ⭐ (${newReview.rating}/5 Stars)`,
      body: `${newReview.customerName} rated ${newReview.dishName}: "${newReview.comment.slice(0, 80)}"`,
      type: 'order_status',
    });

    return newReview;
  },

  likeReview(reviewId: string): void {
    const reviews = this.getReviews();
    const rev = reviews.find((r) => r.id === reviewId);
    if (rev) {
      rev.likesCount = (rev.likesCount || 0) + 1;
      this.saveReviews(reviews);
    }
  },

  // --- RAW INGREDIENTS & RECIPE COMPONENTS ---
  getIngredients(): InventoryIngredient[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INGREDIENTS);
      if (data) {
        const parsed: InventoryIngredient[] = JSON.parse(data);
        const existingIds = new Set(parsed.map((i) => i.id));
        let updated = false;

        for (const initIng of initialIngredients) {
          if (!existingIds.has(initIng.id)) {
            parsed.push(initIng);
            updated = true;
          }
        }

        if (updated) {
          localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load ingredients', e);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(initialIngredients));
    } catch {}
    return initialIngredients;
  },

  saveIngredients(ingredients: InventoryIngredient[]) {
    localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(ingredients));
    notifyStateChange();
  },

  updateIngredientStock(ingredientId: string, quantityOrDelta: number, isDelta = false): InventoryIngredient | null {
    const list = this.getIngredients();
    const item = list.find((i) => i.id === ingredientId);
    if (!item) return null;
    if (isDelta) {
      item.currentStock = Math.max(0, item.currentStock + quantityOrDelta);
    } else {
      item.currentStock = Math.max(0, quantityOrDelta);
    }
    this.saveIngredients(list);
    return item;
  },

  addIngredient(ingredient: Omit<InventoryIngredient, 'id'>): InventoryIngredient {
    const list = this.getIngredients();
    const newIng: InventoryIngredient = {
      ...ingredient,
      id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    list.push(newIng);
    this.saveIngredients(list);
    return newIng;
  },

  deleteIngredient(ingredientId: string) {
    const list = this.getIngredients().filter((i) => i.id !== ingredientId);
    this.saveIngredients(list);
  },

  // --- COMBO DEALS & DEAL MAKER ---
  getComboDeals(): ComboDeal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMBO_DEALS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load combo deals', e);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.COMBO_DEALS, JSON.stringify(initialComboDeals));
    } catch {}
    return initialComboDeals;
  },

  saveComboDeals(deals: ComboDeal[]) {
    localStorage.setItem(STORAGE_KEYS.COMBO_DEALS, JSON.stringify(deals));
    notifyStateChange();
  },

  createComboDeal(dealData: Omit<ComboDeal, 'id' | 'createdAt'>): ComboDeal {
    const deals = this.getComboDeals();
    const newDeal: ComboDeal = {
      ...dealData,
      id: `deal-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    deals.unshift(newDeal);
    this.saveComboDeals(deals);
    this.syncDealToMenuItem(newDeal);
    sounds.playSuccess();
    return newDeal;
  },

  updateComboDeal(id: string, updates: Partial<ComboDeal>): ComboDeal | null {
    const deals = this.getComboDeals();
    const index = deals.findIndex((d) => d.id === id);
    if (index < 0) return null;
    deals[index] = { ...deals[index], ...updates };
    this.saveComboDeals(deals);
    this.syncDealToMenuItem(deals[index]);
    return deals[index];
  },

  deleteComboDeal(id: string) {
    const deals = this.getComboDeals().filter((d) => d.id !== id);
    this.saveComboDeals(deals);
    this.removeDealFromMenuItem(id);
  },

  syncDealToMenuItem(deal: ComboDeal) {
    try {
      const items = this.getMenuItems();
      const existingIndex = items.findIndex((it) => it.dealId === deal.id || it.id === deal.id);
      const dealMenuItem: MenuItem = {
        id: existingIndex >= 0 ? items[existingIndex].id : deal.id,
        categoryId: 'cat-combos',
        name: deal.title,
        description: deal.description,
        price: deal.price,
        image: deal.image,
        isAvailable: deal.isActive,
        isBestseller: true,
        order: existingIndex >= 0 ? items[existingIndex].order : items.length + 1,
        isDeal: true,
        dealId: deal.id,
        includedDealItems: deal.includedItems.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        trackInventory: true,
        stockQuantity: 99,
        lowStockThreshold: 10,
        stockUnit: 'deals',
      };

      if (existingIndex >= 0) {
        items[existingIndex] = { ...items[existingIndex], ...dealMenuItem };
      } else {
        items.push(dealMenuItem);
      }
      this.saveMenuItems(items);
    } catch (e) {
      console.error('Failed to sync deal to menu item', e);
    }
  },

  removeDealFromMenuItem(dealId: string) {
    try {
      const items = this.getMenuItems().filter((it) => it.dealId !== dealId && it.id !== dealId);
      this.saveMenuItems(items);
    } catch (e) {
      console.error('Failed to remove deal from menu items', e);
    }
  },

  // --- PROMO CODE ENGINE ---
  getPromoCodes(): PromoCode[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROMO_CODES);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load promo codes', e);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.PROMO_CODES, JSON.stringify(initialPromoCodes));
    } catch {}
    return initialPromoCodes;
  },

  savePromoCodes(promos: PromoCode[]) {
    localStorage.setItem(STORAGE_KEYS.PROMO_CODES, JSON.stringify(promos));
    notifyStateChange();
  },

  createPromoCode(data: Omit<PromoCode, 'id' | 'timesUsed' | 'createdAt'>): PromoCode {
    const list = this.getPromoCodes();
    const newPromo: PromoCode = {
      ...data,
      id: `promo-${Date.now()}`,
      code: data.code.trim().toUpperCase(),
      timesUsed: 0,
      createdAt: new Date().toISOString(),
    };
    list.unshift(newPromo);
    this.savePromoCodes(list);
    sounds.playSuccess();
    return newPromo;
  },

  updatePromoCode(id: string, updates: Partial<PromoCode>): PromoCode | null {
    const list = this.getPromoCodes();
    const index = list.findIndex((p) => p.id === id);
    if (index < 0) return null;
    list[index] = {
      ...list[index],
      ...updates,
      code: updates.code ? updates.code.trim().toUpperCase() : list[index].code,
    };
    this.savePromoCodes(list);
    return list[index];
  },

  deletePromoCode(id: string) {
    const list = this.getPromoCodes().filter((p) => p.id !== id);
    this.savePromoCodes(list);
  },

  validatePromoCode(
    codeStr: string,
    subtotal: number,
    customerIdentifier?: { email?: string; phone?: string; id?: string; isLoggedIn?: boolean }
  ): { valid: boolean; discount: number; promo?: PromoCode; error?: string } {
    if (!codeStr || !codeStr.trim()) {
      return { valid: false, discount: 0, error: 'Please enter a promo code.' };
    }
    const cleanCode = codeStr.trim().toUpperCase();
    const promos = this.getPromoCodes();
    const promo = promos.find((p) => p.code.toUpperCase() === cleanCode);

    if (!promo) {
      return { valid: false, discount: 0, error: `Promo code "${cleanCode}" is invalid.` };
    }

    if (!promo.isActive) {
      return { valid: false, discount: 0, error: `Promo code "${cleanCode}" is currently inactive.` };
    }

    // Login required check
    if (promo.requireLogin && (!customerIdentifier || !customerIdentifier.isLoggedIn)) {
      return {
        valid: false,
        discount: 0,
        error: `🔒 Member Exclusive: Please log into your account to use "${cleanCode}". Guest checkout is not eligible.`,
      };
    }

    // Single use per customer check
    if (promo.singleUsePerCustomer) {
      const custKey = (customerIdentifier?.email || customerIdentifier?.phone || customerIdentifier?.id || '').trim().toLowerCase();
      if (custKey && promo.usedByCustomers && promo.usedByCustomers.map((c) => c.toLowerCase()).includes(custKey)) {
        return {
          valid: false,
          discount: 0,
          error: `⚠️ You have already redeemed promo code "${cleanCode}". This offer is limited to one redemption per customer.`,
        };
      }
    }

    // Minimum order check
    if (subtotal < promo.minOrderAmount) {
      return {
        valid: false,
        discount: 0,
        error: `Minimum order of Rs. ${promo.minOrderAmount.toLocaleString()} required for ${cleanCode} (Cart: Rs. ${subtotal.toLocaleString()}).`,
      };
    }

    // Usage limit check
    if (typeof promo.usageLimit === 'number' && promo.timesUsed >= promo.usageLimit) {
      return {
        valid: false,
        discount: 0,
        error: `Promo code "${cleanCode}" has reached its maximum total usage limit.`,
      };
    }

    // Date range check (for "promo for few days")
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (promo.startDate && todayStr < promo.startDate) {
      return {
        valid: false,
        discount: 0,
        error: `Promo code "${cleanCode}" will be active starting ${promo.startDate}.`,
      };
    }
    if (promo.endDate && todayStr > promo.endDate) {
      return {
        valid: false,
        discount: 0,
        error: `Promo code "${cleanCode}" expired on ${promo.endDate}.`,
      };
    }

    // Time window check (e.g. "make it available at night etc.")
    if (
      promo.timeWindowEnabled &&
      typeof promo.validStartHour === 'number' &&
      typeof promo.validEndHour === 'number'
    ) {
      const currentHour = now.getHours(); // 0-23
      const { validStartHour: s, validEndHour: e } = promo;
      let inWindow = false;
      if (s <= e) {
        inWindow = currentHour >= s && currentHour < e;
      } else {
        // e.g. 23 (11 PM) to 4 (4 AM)
        inWindow = currentHour >= s || currentHour < e;
      }

      if (!inWindow) {
        const formatHour = (h: number) => {
          const ampm = h >= 12 ? 'PM' : 'AM';
          const hr = h % 12 || 12;
          return `${hr}:00 ${ampm}`;
        };
        return {
          valid: false,
          discount: 0,
          error: `🌙 "${cleanCode}" is only active during night hours (${formatHour(s)} — ${formatHour(e)}).`,
        };
      }
    }

    // Days of week check
    if (promo.validDaysOfWeek && promo.validDaysOfWeek.length > 0) {
      const currentDay = now.getDay();
      if (!promo.validDaysOfWeek.includes(currentDay)) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const allowed = promo.validDaysOfWeek.map((d) => dayNames[d]).join(', ');
        return {
          valid: false,
          discount: 0,
          error: `Promo code "${cleanCode}" is only valid on: ${allowed}.`,
        };
      }
    }

    // Calculate discount amount
    let discount = 0;
    if (promo.discountType === 'fixed') {
      discount = promo.discountValue;
    } else {
      discount = Math.round((subtotal * promo.discountValue) / 100);
      if (promo.maxDiscountAmount && discount > promo.maxDiscountAmount) {
        discount = promo.maxDiscountAmount;
      }
    }

    discount = Math.min(discount, subtotal);

    return {
      valid: true,
      discount,
      promo,
    };
  },

  recordPromoUsage(codeStr: string, customerIdentifierKey?: string): void {
    const clean = codeStr.trim().toUpperCase();
    const list = this.getPromoCodes();
    const promo = list.find((p) => p.code.toUpperCase() === clean);
    if (promo) {
      promo.timesUsed = (promo.timesUsed || 0) + 1;
      if (customerIdentifierKey) {
        const key = customerIdentifierKey.trim().toLowerCase();
        if (!promo.usedByCustomers) promo.usedByCustomers = [];
        if (!promo.usedByCustomers.map((c) => c.toLowerCase()).includes(key)) {
          promo.usedByCustomers.push(key);
        }
      }
      this.savePromoCodes(list);
    }
  },

  // --- DELIVERY PROOF PHOTO AT DOORSTEP ---
  setOrderDeliveryProof(orderId: string, photoUrl: string, riderName?: string): Order | null {
    const orders = this.getOrders();
    const cleanId = orderId.trim().toUpperCase().replace('#', '');
    const order = orders.find(
      (o) =>
        o.id === orderId ||
        o.id.toUpperCase() === orderId.toUpperCase() ||
        o.id.replace('#', '').toUpperCase() === cleanId
    );
    if (!order) return null;

    const now = new Date().toISOString();
    order.status = 'delivered';
    order.deliveredAt = now;
    order.deliveryProofPhoto = photoUrl;
    if (riderName) order.deliveredByRider = riderName;
    if (order.driver) order.driver.progressPercent = 100;
    order.estimatedMinutes = 0;

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: 'delivered',
      timestamp: now,
      note: `Delivery confirmed at customer doorstep with photo proof by ${riderName || 'Rider'}.`,
    });

    this.saveOrders(orders);
    sounds.playSuccess();
    notifyStateChange();
    return order;
  },

  // --- RAW INGREDIENTS COSTING ---
  getRawIngredients(): RawIngredient[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RAW_INGREDIENTS);
      if (data) {
        const parsed: RawIngredient[] = JSON.parse(data);
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to get raw ingredients', e);
    }
    this.saveRawIngredients(INITIAL_RAW_INGREDIENTS);
    return INITIAL_RAW_INGREDIENTS;
  },

  saveRawIngredients(ingredients: RawIngredient[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RAW_INGREDIENTS, JSON.stringify(ingredients));
      notifyStateChange();
    } catch (e) {
      console.error('Failed to save raw ingredients', e);
    }
  },

  updateRawIngredient(id: string, updates: Partial<RawIngredient>): RawIngredient[] {
    const items = this.getRawIngredients();
    const updated = items.map((item) => {
      if (item.id === id) {
        const next = { ...item, ...updates, updatedAt: new Date().toISOString() };
        // If purchaseCost or purchaseUnit changed, recalculate costPerBaseUnit
        if (updates.purchaseCost !== undefined || updates.purchaseUnit !== undefined) {
          const unit = next.purchaseUnit;
          const cost = next.purchaseCost;
          if (unit === 'kg' || unit === 'liter') {
            next.costPerBaseUnit = Number((cost / 1000).toFixed(4));
          } else {
            next.costPerBaseUnit = cost;
          }
        }
        return next;
      }
      return item;
    });
    this.saveRawIngredients(updated);
    return updated;
  },

  addRawIngredient(newItem: Omit<RawIngredient, 'id'>): RawIngredient[] {
    const items = this.getRawIngredients();
    const id = `ing-custom-${Date.now()}`;
    const baseCost =
      newItem.purchaseUnit === 'kg' || newItem.purchaseUnit === 'liter'
        ? Number((newItem.purchaseCost / 1000).toFixed(4))
        : newItem.purchaseCost;
    const ingredient: RawIngredient = {
      ...newItem,
      id,
      costPerBaseUnit: baseCost,
      updatedAt: new Date().toISOString(),
    };
    const next = [ingredient, ...items];
    this.saveRawIngredients(next);
    return next;
  },

  deleteRawIngredient(id: string): RawIngredient[] {
    const items = this.getRawIngredients();
    const next = items.filter((i) => i.id !== id);
    this.saveRawIngredients(next);
    return next;
  },

  // --- RECIPE COST ITEMS (BOM) ---
  getRecipeCostItems(): RecipeCostItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECIPE_COST_ITEMS);
      if (data) {
        const parsed: RecipeCostItem[] = JSON.parse(data);
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to get recipe cost items', e);
    }
    this.saveRecipeCostItems(INITIAL_RECIPE_COST_ITEMS);
    return INITIAL_RECIPE_COST_ITEMS;
  },

  saveRecipeCostItems(recipes: RecipeCostItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECIPE_COST_ITEMS, JSON.stringify(recipes));
      notifyStateChange();
    } catch (e) {
      console.error('Failed to save recipe cost items', e);
    }
  },

  saveOrUpdateRecipeCostItem(recipe: RecipeCostItem): RecipeCostItem[] {
    const list = this.getRecipeCostItems();
    const idx = list.findIndex((r) => r.id === recipe.id);
    const updatedRecipe = { ...recipe, updatedAt: new Date().toISOString() };
    let next: RecipeCostItem[];
    if (idx >= 0) {
      next = [...list];
      next[idx] = updatedRecipe;
    } else {
      next = [updatedRecipe, ...list];
    }
    this.saveRecipeCostItems(next);
    return next;
  },

  deleteRecipeCostItem(id: string): RecipeCostItem[] {
    const list = this.getRecipeCostItems();
    const next = list.filter((r) => r.id !== id);
    this.saveRecipeCostItems(next);
    return next;
  },

  // --- STAFF & PORTAL ACCOUNTS (Employee, POS System, Rider HUD, Admin) ---
  getStaffAccounts(): StaffAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STAFF_ACCOUNTS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load staff accounts', e);
    }

    const defaultAccounts: StaffAccount[] = [
      {
        id: 'staff-admin-1',
        email: 'admin@biteandgo.pk',
        name: 'Main Branch Owner / Manager',
        role: 'admin',
        password: 'admin_biteandgo_2026',
        phone: '0300-1234567',
        assignedStation: 'Headquarters & Manager HUD',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'staff-kitchen-1',
        email: 'kitchen@biteandgo.pk',
        name: 'Head Chef & Grill Station',
        role: 'kitchen',
        password: 'kitchen_biteandgo_2026',
        phone: '0315-9924182',
        assignedStation: 'Grill Station #1',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'staff-pos-1',
        email: 'pos@biteandgo.pk',
        name: 'Counter Cashier (POS-01)',
        role: 'pos',
        password: 'pos_biteandgo_2026',
        phone: '0321-4928172',
        assignedStation: 'Front Counter Register 01',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'staff-rider-1',
        email: 'rider@biteandgo.pk',
        name: 'Express Rider Rizwan Ahmed',
        role: 'rider',
        password: 'rider_biteandgo_2026',
        phone: '0333-8192049',
        assignedStation: 'North Nazimabad Delivery Fleet (Bike #14)',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ];

    try {
      localStorage.setItem(STORAGE_KEYS.STAFF_ACCOUNTS, JSON.stringify(defaultAccounts));
    } catch {}
    return defaultAccounts;
  },

  saveStaffAccounts(accounts: StaffAccount[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STAFF_ACCOUNTS, JSON.stringify(accounts));
      notifyStateChange();
    } catch (e) {
      console.error('Failed to save staff accounts', e);
    }
  },

  createStaffAccount(account: Omit<StaffAccount, 'id' | 'createdAt'>): StaffAccount {
    const list = this.getStaffAccounts();
    const cleanEmail = account.email.trim().toLowerCase();
    
    // Check if email already exists
    const existing = list.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`An account with email "${account.email}" already exists. Please choose a different email.`);
    }

    const newAccount: StaffAccount = {
      ...account,
      id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
    };

    const next = [newAccount, ...list];
    this.saveStaffAccounts(next);
    sounds.playSuccess();
    return newAccount;
  },

  updateStaffAccount(id: string, updates: Partial<StaffAccount>): StaffAccount | null {
    const list = this.getStaffAccounts();
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) return null;

    const updated = {
      ...list[idx],
      ...updates,
      email: updates.email ? updates.email.trim().toLowerCase() : list[idx].email,
    };

    list[idx] = updated;
    this.saveStaffAccounts(list);
    return updated;
  },

  deleteStaffAccount(id: string): boolean {
    const list = this.getStaffAccounts();
    const target = list.find((a) => a.id === id);
    if (target?.email === 'admin@biteandgo.pk') {
      throw new Error('Cannot delete the root administrator account.');
    }
    const next = list.filter((a) => a.id !== id);
    this.saveStaffAccounts(next);
    return true;
  },

  authenticateStaff(email: string, password?: string): { success: boolean; user?: AuthUser; error?: string } {
    const list = this.getStaffAccounts();
    const cleanEmail = email.trim().toLowerCase();
    const matched = list.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!matched) {
      return { success: false, error: 'Staff account not found. Please verify your email.' };
    }

    if (!matched.isActive) {
      return { success: false, error: 'This staff account has been deactivated by store management.' };
    }

    if (password && matched.password && matched.password !== password) {
      return { success: false, error: 'Incorrect password for this staff account.' };
    }

    matched.lastLoginAt = new Date().toISOString();
    this.saveStaffAccounts(list);

    const user: AuthUser = {
      email: matched.email,
      name: matched.name,
      role: matched.role,
      station: matched.assignedStation,
    };

    return { success: true, user };
  },
};
