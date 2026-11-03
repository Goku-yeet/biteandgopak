export type PaymentMethod = 'easypaisa' | 'jazzcash' | 'cod' | 'pos_cash' | 'pos_card' | 'split';

export type OrderStatus = 'received' | 'confirmed' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled' | 'refunded';

export type UserRole = 'admin' | 'kitchen' | 'pos' | 'employee' | 'rider';

export interface AuthUser {
  email: string;
  role: UserRole;
  name: string;
  station?: string;
}

export interface StaffAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  phone?: string;
  assignedStation?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  iconName: string;
  description?: string;
}

export interface ItemVariant {
  id: string;
  name: string;
  priceDelta: number;
  price?: number;
  isDefault?: boolean;
}

export interface ItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number; // in PKR
  image: string;
  isAvailable: boolean;
  isBestseller?: boolean;
  isSpicy?: boolean;
  spicinessOptions?: string[]; // e.g., ['Mild', 'Spicy', 'Nashville Fire']
  order: number;
  variants?: ItemVariant[];
  addons?: ItemAddon[];
  calories?: string;
  prepTimeMinutes?: number;
  // Inventory Management
  trackInventory?: boolean; // If true, tracks custom stock numbers
  stockQuantity?: number; // Custom number in inventory (e.g. 50, 100)
  lowStockThreshold?: number; // Low stock warning threshold (default 10)
  stockUnit?: string; // Unit name e.g. 'portions', 'burgers', 'items'
  // Recipe & Shared Ingredients Link (e.g. Zinger Patty, Brioche Bun)
  recipe?: RecipeItem[];
  // Deal Maker & Bundles
  isDeal?: boolean;
  dealId?: string;
  includedDealItems?: Array<{ menuItemId: string; quantity: number }>;
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number; // e.g. 1 patty, 2 slices
}

export interface ChefSignatureItem {
  id: string;
  badge?: string;
  title: string;
  subtitle: string;
  price: string;
  imageUrl: string;
  tagline?: string;
  chefName?: string;
  menuItemId?: string;
  isSpicy?: boolean;
}

export interface InventoryIngredient {
  id: string;
  name: string;
  category: 'proteins' | 'bakery' | 'dairy' | 'produce' | 'sauces' | 'packaging' | 'beverages';
  currentStock: number;
  unit: string; // 'patties', 'buns', 'slices', 'portions', 'liters', 'pieces'
  lowStockThreshold: number;
  costPerUnit?: number;
}

export interface ComboDeal {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice: number;
  badge?: string; // e.g. 'HOT COMBO', 'MIDNIGHT SPECIAL'
  image: string;
  isActive: boolean;
  dealCategory: 'combos' | 'midnight' | 'family' | 'budget';
  includedItems: Array<{ menuItemId: string; quantity: number; label?: string }>;
  createdAt?: string;
}

export interface PromoCode {
  id: string;
  code: string; // e.g. 'BITEGO', 'NIGHTOWL', 'MIDNIGHT15'
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // e.g. 15 for 15% or 200 for Rs. 200
  maxDiscountAmount?: number; // Max discount in PKR for percentage
  minOrderAmount: number; // Minimum subtotal required in PKR
  usageLimit?: number; // Total redemptions allowed across store
  timesUsed: number; // How many times it has been redeemed
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  timeWindowEnabled?: boolean; // Restrict to specific hours (e.g. night promo)
  validStartHour?: number; // 0-23 (e.g. 23 for 11 PM)
  validEndHour?: number; // 0-23 (e.g. 4 for 4 AM)
  validDaysOfWeek?: number[]; // [0, 5, 6] for Fri, Sat, Sun
  isActive: boolean;
  createdAt?: string;
  requireLogin?: boolean; // Only logged in accounts can redeem this promo code
  singleUsePerCustomer?: boolean; // Each customer can only redeem once (matched by email/phone/user ID)
  usedByCustomers?: string[]; // Array of customer identifiers (email, phone, or userId) who have redeemed
}

export interface OrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
  selectedVariant?: string;
  selectedSpiciness?: string;
  selectedAddons: Array<{ name: string; price: number }>;
  specialInstructions?: string;
  notes?: string;
  image?: string;
  itemTotal: number;
}

export interface PaymentDetails {
  method: PaymentMethod;
  transactionId?: string;
  screenshotUrl?: string; // Base64 data URL or uploaded image
  verified: boolean;
  verifiedAt?: string;
  accountTitle: string;
  accountNumber: string;
  isPaid?: boolean;
  details?: string;
}

export interface DriverInfo {
  name: string;
  phone: string;
  vehiclePlate: string;
  progressPercent: number; // 0 to 100
}

export interface DeliveryRider {
  id: string;
  name: string;
  phone: string;
  vehiclePlate: string;
  vehicleType?: string; // e.g. Honda CD-70, Yamaha YBR-125
  isActive: boolean;
  totalDeliveries?: number;
  notes?: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface Order {
  id: string; // e.g. #BG-8921 or #POS-1042
  createdAt: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  deliveryAddress: string;
  area: string;
  distanceKm?: number;
  coordinates?: { lat: number; lng: number };
  orderType: 'delivery' | 'pickup' | 'dine_in' | 'pos_takeaway' | 'pos_counter';
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  payment: PaymentDetails;
  status: OrderStatus;
  estimatedMinutes: number;
  declineReason?: string;
  driver?: DriverInfo;
  statusHistory: StatusHistoryEntry[];
  customerNotes?: string;
  notes?: string;
  specialInstructions?: string;
  source?: 'web' | 'pos' | string;
  promoCode?: string;
  promoDiscount?: number;
  // POS Specific Fields
  posSource?: 'web' | 'pos_counter' | 'pos_dine_in';
  tableNumber?: string;
  cashierName?: string;
  cashTendered?: number;
  changeDue?: number;
  posDiscountPercent?: number;
  posDiscountAmount?: number;
  taxAmount?: number;
  inventoryDeducted?: boolean;
  deliveryProofPhoto?: string;
  deliveredAt?: string;
  deliveredByRider?: string;
  refundInfo?: {
    refundedAt: string;
    refundedBy: string;
    refundAmount: number;
    refundReason: string;
    refundMethod: 'easypaisa' | 'jazzcash' | 'cash' | 'pos_card' | 'original_payment';
    refundType: 'full' | 'partial';
    returnedToKitchen?: boolean;
    notes?: string;
  };
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  defaultAddress?: string;
  defaultArea?: string;
  createdAt: string;
}

export interface CustomerCrmProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  primaryAddress?: string;
  primaryArea?: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  firstOrderDate: string;
  lastOrderDate: string;
  customerTier: 'vip' | 'regular' | 'new' | 'guest';
  isRegisteredAccount: boolean;
  orders: Order[];
  notes?: string;
  favoriteItems?: Array<{ name: string; count: number }>;
}

export type TicketStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export interface TicketAttachment {
  name: string;
  url: string; // Base64 or object URL
  type?: string;
  size?: number;
}

export interface TicketMessage {
  id: string;
  sender: 'customer' | 'staff' | 'manager';
  senderName: string;
  message: string;
  timestamp: string;
  attachments?: TicketAttachment[];
}

export interface CustomerTicket {
  id: string; // e.g. #TCK-3918
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  issueType: 'missing_item' | 'delayed_order' | 'wrong_order' | 'food_quality' | 'payment_issue' | 'order_decline_request' | 'other';
  message: string;
  attachments?: TicketAttachment[];
  status: TicketStatus;
  adminReply?: string;
  messages?: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

export interface CustomerReview {
  id: string;
  orderId?: string;
  customerName: string;
  customerCity?: string;
  rating: number; // 1 to 5
  dishName?: string;
  comment: string;
  createdAt: string;
  verified: boolean;
  managerReply?: string;
  likesCount?: number;
}

export interface PaymentMethodsConfig {
  easypaisaEnabled: boolean;
  jazzcashEnabled: boolean;
  codEnabled: boolean;
  easypaisaAccountTitle: string;
  easypaisaAccountNumber: string;
  jazzcashAccountTitle: string;
  jazzcashAccountNumber: string;
  codNotes?: string;
}

export interface CustomerWidgetsConfig {
  topBarDisplayMode?: 'unified' | 'stacked';
  announcementBarEnabled: boolean;
  announcementText: string;
  announcementBadge?: string;
  announcementTheme: 'amber' | 'emerald' | 'crimson' | 'indigo' | 'dark';
  showLiveKitchenStatus: boolean;
  kitchenStatusCustomText?: string;
  showDealOfTheDay: boolean;
  dealTitle: string;
  dealDescription: string;
  dealBadge: string;
  dealDiscountText?: string;
  dealItemId?: string;
  showLoyaltyBanner: boolean;
  loyaltyHeadline: string;
  loyaltySubtext: string;
  showQuickHelpBubble: boolean;
  showQualityGuarantee: boolean;
  themeAccent: 'amber' | 'emerald' | 'crimson' | 'indigo' | 'orange' | 'cyan' | 'rose' | 'violet';
  themePreset?: string;
  themeMode?: 'light' | 'dark';
  layoutDensity: 'comfortable' | 'compact';
  showCalorieCounters: boolean;
  showSpicinessMeters: boolean;
  // Enhanced Website HUD & Widget Options
  showCustomerTicketBar?: boolean;
  showFreeDeliveryGoalMeter?: boolean;
  freeDeliveryGoalAmount?: number;
  freeDeliveryGoalCustomText?: string;
  showRushHourAlert?: boolean;
  rushHourText?: string;
  enableTickerAnimation?: boolean;
  announcementSpeed?: 'slow' | 'normal' | 'fast';
  showSatisfactionGuarantee?: boolean;
  showRiderTrackingHud?: boolean;
  showHalalCertificateBadge?: boolean;
  showWhatsAppOrderWidget?: boolean;
  whatsAppWidgetNumber?: string;
  showSocialProofReviews?: boolean;
  showLateNightBadge?: boolean;
  showDealCountdownTimer?: boolean;
  // New Website HUD & Interactive Widgets
  showGoogleMapsRiderLiveTicker?: boolean;
  googleMapsRiderTickerText?: string;
  showMonsoonRainAlert?: boolean;
  monsoonRainText?: string;
  showFloatingQuickOrderWidget?: boolean;
  showLiveOrderCounter?: boolean;
  liveOrderCounterText?: string;
  showChefSpecialPin?: boolean;
  chefSpecialCustomText?: string;
  showEstimatedPrepTimeBadge?: boolean;
  estimatedPrepMinutes?: number;
  showCustomerFeedbackBanner?: boolean;
  customerFeedbackHeadline?: string;
  hudCardGlassmorphism?: boolean;
  // Additional Website HUD & Widgets Options
  showLiveVisitorCounter?: boolean;
  liveVisitorText?: string;
  showNightOwlDealBanner?: boolean;
  nightOwlDealText?: string;
  showDeliveryZonePill?: boolean;
  deliveryZoneText?: string;
  showSpecialHoursNotice?: boolean;
  specialHoursNoticeText?: string;
  showSoundEffectsToggle?: boolean;
  showFloatingAiAssistantWidget?: boolean;

  // Big Chef's Signature Showcase & Hero Banner Customizer (HUD Controls)
  showChefSignatureShowcase?: boolean;
  chefSignatureBadge?: string;
  chefSignatureDishTitle?: string;
  chefSignatureDishSubtitle?: string;
  chefSignaturePrice?: string;
  chefSignatureImageUrl?: string;
  chefSignatureTagline?: string;
  chefSignatureChefName?: string;
  chefSignatureSlides?: ChefSignatureItem[];
  heroHeadline?: string;
  heroSubheadline?: string;
  heroKickerText?: string;
  heroDeliveryCitiesText?: string;
  heroPrimaryButtonText?: string;
  heroSecondaryButtonText?: string;
  heroBadge1Title?: string;
  heroBadge1Subtitle?: string;
  heroBadge2Title?: string;
  heroBadge2Subtitle?: string;
  heroBadge3Title?: string;
  heroBadge3Subtitle?: string;

  // More Interactive Storefront HUDs & Widgets
  showBiteClubPointsTicker?: boolean;
  biteClubPointsText?: string;
  showLiveKitchenCamNotice?: boolean;
  liveKitchenCamText?: string;
  showFreshBeefGuaranteeCard?: boolean;
  showHalalAccreditationPill?: boolean;
  showFreeDeliveryProgressBanner?: boolean;
  showPreviousOrdersWidget?: boolean;
  previousOrdersWidgetText?: string;
}

export interface KitchenPermissionsConfig {
  canAcceptOrders: boolean; // Accept received orders & trigger grilling
  canMarkReady: boolean; // Mark orders ready & hand over to dispatch rider
  canDelayOrders: boolean; // Adjust order timer & add delay minutes
  canDeclineOrders: boolean; // Decline / cancel orders from kitchen display
  canManageTickets: boolean; // View customer issue tickets & remake meals
  canReopenTickets: boolean; // Re-open closed customer tickets
  canViewCustomerPhone: boolean; // View customer phone numbers on tickets
  canViewOrderPrices: boolean; // View item prices and total amounts in PKR
  canToggleStockFromKitchen: boolean; // Mark dishes or ingredients out of stock
  requireSupervisorPasscodeForDecline: boolean; // Require supervisor passcode to decline order
  supervisorPasscode: string; // PIN code for authorized declines
}

export const DEFAULT_KITCHEN_PERMISSIONS: KitchenPermissionsConfig = {
  canAcceptOrders: true,
  canMarkReady: true,
  canDelayOrders: true,
  canDeclineOrders: true,
  canManageTickets: true,
  canReopenTickets: false,
  canViewCustomerPhone: true,
  canViewOrderPrices: true,
  canToggleStockFromKitchen: true,
  requireSupervisorPasscodeForDecline: false,
  supervisorPasscode: '1234',
};

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DaySchedule {
  isOpen: boolean;
  openTime: string; // Format "HH:mm" in 24hr e.g. "12:00"
  closeTime: string; // Format "HH:mm" in 24hr e.g. "03:00" (overnight if <= openTime)
}

export type WeeklyOperatingHours = Record<DayOfWeek, DaySchedule>;

export interface PosPermissionsConfig {
  canApplyDiscounts: boolean; // Allow staff to apply custom discounts on POS
  canCustomPrice: boolean; // Allow staff to adjust item prices on POS
  canVoidOrders: boolean; // Allow staff to void active/held POS orders
  canViewReports: boolean; // View shift end / Z-Report & daily total summary
  canOpenCashDrawer: boolean; // Manual cash drawer open trigger
  requireManagerPinForVoid: boolean; // Require supervisor PIN to void / refund
  requireManagerPinForDiscount: boolean; // Require supervisor passcode for discount > 20%
  supervisorPasscode: string; // PIN code for authorized manager override (default: "1234")
  allowSplitBill: boolean; // Allow splitting payment across cash/card
  defaultTaxRatePercent: number; // e.g. 0 or 13% (Sindh Sales Tax SST)
  allowCustomOrderItems: boolean; // Add off-menu item with custom price
  // Employee Portal & POS Display Controls (Adjustable from Admin Portal)
  hiddenCategoryIdsForEmployees?: string[]; // IDs of categories hidden from employee portal (e.g. ['cat-smash'] to turn off grill)
  hideOutOfStockItemsForEmployees?: boolean; // Hide sold out / 86'd items from employee POS screen
  allowEmployeeShiftClose?: boolean; // Allow employees to close register & generate Z-Report
  showGrillStationOnlyInKitchen?: boolean; // Only show grill station items in kitchen
  employeePortalTitle?: string; // Custom title for POS / employee portal
}

export const DEFAULT_POS_PERMISSIONS: PosPermissionsConfig = {
  canApplyDiscounts: true,
  canCustomPrice: true,
  canVoidOrders: true,
  canViewReports: true,
  canOpenCashDrawer: true,
  requireManagerPinForVoid: true,
  requireManagerPinForDiscount: false,
  supervisorPasscode: '1234',
  allowSplitBill: true,
  defaultTaxRatePercent: 0,
  allowCustomOrderItems: true,
  hiddenCategoryIdsForEmployees: [],
  hideOutOfStockItemsForEmployees: false,
  allowEmployeeShiftClose: true,
  showGrillStationOnlyInKitchen: false,
  employeePortalTitle: 'Express Cashier POS',
};

export interface StoreSettings {
  storeName: string;
  tagline: string;
  storeAddress: string;
  storeArea: string;
  contactPhone: string;
  whatsappNumber: string;
  deliveryFee: number;
  baseDeliveryFee: number;
  deliveryRatePerKm: number;
  deliveryRadiusKm: number;
  freeDeliveryThreshold: number;
  freeDeliveryAreas?: string[];
  freeDeliveryRadiusKm?: number;
  freeDeliveryMinOrder?: number;
  freeDeliveryMode?: 'threshold_or_selected_areas' | 'selected_areas_only' | 'threshold_only' | 'all_areas';
  customAreaDeliveryFees?: Record<string, number>;
  disabledDeliveryAreas?: string[]; // Specific areas disabled/paused from delivery
  showPromoCodeAtCheckout?: boolean; // Toggle whether promo code input is displayed at checkout (default: true)
  deliveryRiders?: DeliveryRider[]; // Pre-configured fleet of delivery drivers
  isOpen: boolean;
  operatingHours: string;
  scheduleOverrideMode?: 'auto' | 'force_open' | 'force_closed';
  weeklySchedule?: WeeklyOperatingHours;
  timezone?: string;
  orderClosedMessage?: string;
  easyPaisaAccountTitle: string;
  easyPaisaAccountNumber: string;
  jazzCashAccountTitle: string;
  jazzCashAccountNumber: string;
  paymentMethodsConfig?: PaymentMethodsConfig;
  ipWhitelistEnabled?: boolean;
  staffIpWhitelist?: string[];
  staffGatePasscode?: string;
  admin2FaPin?: string;
  customerWidgets?: CustomerWidgetsConfig;
  kitchenPermissions?: KitchenPermissionsConfig;
  posPermissions?: PosPermissionsConfig;
}

export interface PushNotificationMessage {
  id: string;
  orderId: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'order_status' | 'payment_verified' | 'promo';
  read: boolean;
}

// ================= RECIPE & INGREDIENT FOOD COSTING CALCULATOR =================
export type IngredientUnit = 'kg' | 'g' | 'liter' | 'ml' | 'piece' | 'packet';

export interface RawIngredient {
  id: string;
  name: string;
  category: 'meat' | 'dairy' | 'bakery' | 'sauce' | 'spices' | 'produce' | 'packaging' | 'other';
  purchaseUnit: IngredientUnit; // Bulk purchase unit (e.g. kg, liter, piece)
  purchaseCost: number; // Bulk purchase price in PKR (e.g. 750 for 1 kg)
  costPerBaseUnit: number; // Calculated cost per smallest unit (per gram, per ml, per piece)
  yieldPercent?: number; // Usable product yield percentage (e.g. 100% or 90% after trim)
  supplier?: string;
  notes?: string;
  updatedAt?: string;
}

export interface RecipeIngredientUsage {
  ingredientId: string;
  ingredientName: string;
  quantity: number; // e.g. 180 for 180g chicken, 25 for 25ml sauce, 1 for 1 bun
  unit: 'g' | 'ml' | 'piece';
  unitCost: number; // Cost per g, ml, or piece
  lineCost: number; // quantity * unitCost
}

export interface RecipeCostItem {
  id: string;
  name: string; // e.g. "Zinger Patty Prep", "Karachi Crispy Zinger Burger", "Secret Relish Sauce"
  category: 'component' | 'burger' | 'chicken' | 'sides' | 'sauce' | 'beverage' | 'combo';
  portionYield: number; // Number of portions this recipe batch yields (usually 1)
  ingredients: RecipeIngredientUsage[];
  totalBatchCost: number;
  costPerPortion: number; // totalBatchCost / portionYield
  sellingPrice: number; // Current menu price (e.g. 750)
  targetFoodCostPercent?: number; // Target benchmark (e.g. 30%)
  foodCostPercent: number; // (costPerPortion / sellingPrice) * 100
  grossProfit: number; // sellingPrice - costPerPortion
  grossMarginPercent: number; // ((sellingPrice - costPerPortion) / sellingPrice) * 100
  recommendedSellingPrice: number; // costPerPortion / 0.30
  notes?: string;
  updatedAt?: string;
}

