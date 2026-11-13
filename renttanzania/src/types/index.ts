export type UserRole = 'renter' | 'owner' | 'admin' | 'operations';
export type AccountType = 'buyer' | 'seller';
// Which sign-in page was used: public (buyers), Seller Centre, or the hidden staff page
export type SignInPortal = 'buyer' | 'seller' | 'staff';

export type OwnerTier = 'ordinary' | 'verified';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  uid?: string;
  name: string;
  displayName?: string;
  email: string;
  phone: string;
  role: UserRole;
  allowedRoles?: UserRole[];
  // Buyers can only rent. Sellers list equipment and can also rent. Fixed at sign-up.
  accountType?: AccountType;
  hasAdminOpsAccess?: boolean;
  ownerTier?: OwnerTier; // 'ordinary' | 'verified' (BRELA/TIN validated trust badge)
  verificationStatus: VerificationStatus;
  verificationCode?: string; // Admin-issued verification code for verified owners
  verificationCodeIssuedAt?: string;
  verifiedByAdminAt?: string;
  verifiedByAdminId?: string;
  nidaNumber?: string;
  tinNumber?: string;
  brelaNumber?: string;
  companyName?: string;
  avatarUrl?: string;
  savedSearches?: SavedSearch[];
  createdAt: string;
  updatedAt?: string;
}

// What an owner sees about a renter before accepting (theft / non-return risk)
export interface RenterTrackRecord {
  verificationStatus: VerificationStatus;
  completedHires: number;
  disputes: number;
  memberSince?: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query?: string;
  categoryId?: string;
  categoryName?: string;
  region?: string;
  ownershipFilter?: 'all' | 'company' | 'third_party';
  createdAt: string;
}

export interface ExtensionRequest {
  requestedEndDate: string;
  additionalDays: number;
  additionalRentalAmount: number; // Estimate only, settled directly with the owner
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
  responseNotes?: string;
}

export type AppLanguage = 'en' | 'sw' | 'fr';

export interface Category {
  id: string;
  name: string;
  nameSwahili: string;
  nameFrench?: string;
  slug: string;
  description: string;
  iconName: string;
  displayOrder: number;
  isActive: boolean;
  assetCount?: number;
}

export type OwnershipType = 'company' | 'third_party';

export type RentalUnit = 'hour' | 'day' | 'week' | 'month';

export interface AssetPricing {
  purchaseValue?: number; // Asset's purchase value in TZS
  dailyHirePercentage?: number; // Daily hire rate percentage (2%-3% for heavy machinery, 3.5%-5% for other items)
  ratePerHour?: number;
  ratePerDay: number;
  ratePerWeek?: number;
  ratePerMonth?: number;
  minimumRentalDays: number;
}

export interface AssetLocation {
  region: string;
  district: string;
  ward?: string;
  landmark?: string;
  yardAddress?: string;
  lat?: number;
  lng?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface AssetDeliveryOptions {
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  deliveryFeePerKm?: number;
  flatDeliveryFee?: number;
  operatorAvailable: boolean;
  operatorDailyRate?: number;
}

export interface Asset {
  id: string;
  title: string;
  description: string;
  category?: string;
  categoryId: string;
  region?: string;
  district?: string;
  fleetTier?: string; // 'RENTZ Fleet' | 'Verified Owner' | 'Ordinary Owner'
  ownershipType: OwnershipType; // 'company' (RentTanzania Fleet) | 'third_party' (Independent Owner)
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerRating: number;
  isVerifiedOwner: boolean;
  ownerTier?: OwnerTier; // 'ordinary' | 'verified'
  weightKg?: number; // Equipment weight in kg used for Go & Return delivery calculation
  dailyRate?: number;
  deliveryRates?: AssetDeliveryOptions;
  pricing: AssetPricing;
  currency: 'TZS';
  location: AssetLocation;
  condition: 'excellent' | 'good' | 'fair';
  specifications: Record<string, string>;
  accessoriesIncluded: string[];
  deliveryOptions: AssetDeliveryOptions;
  images: string[];
  serialNumber?: string;
  gpsTrackerId?: string;
  gpsTrackerUrl?: string;
  gpsProvider?: string;
  telemetryStatus?: 'online_yard' | 'active_site' | 'in_transit';
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'paused';
  isAvailable: boolean;
  qrCodeId: string;
  totalRentals: number;
  rating: number;
  createdAt: string;
  updatedAt?: string;
}

export type BookingStatus =
  | 'draft'
  | 'pending'
  | 'requested' // Waiting for the owner to accept
  | 'confirmed'
  | 'dispatched'
  | 'ready_for_collection'
  | 'active'
  | 'return_due'
  | 'under_inspection'
  | 'completed'
  | 'cancelled'
  | 'disputed';

// RENTZ is free to use and collects no payments. This is an estimate of the owner's
// hire charges; renter and owner settle it directly between themselves.
export interface PriceBreakdown {
  rentalRate: number;
  rentalUnit: RentalUnit;
  billableUnits: number;
  rentalSubtotal: number;
  equipmentWeightKg?: number;
  deliveryDistanceKm?: number;
  operatorFee: number;
  estimatedTotal: number;
  isCompanyOwned: boolean;
}

export interface Booking {
  id: string;
  bookingId?: string;
  bookingCode: string;
  listingId?: string;
  assetId: string;
  listingTitle?: string;
  assetTitle: string;
  assetImage: string;
  categoryId: string;
  ownershipType: OwnershipType;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  customerId?: string;
  renterId: string;
  customerName?: string;
  renterName: string;
  customerPhone?: string;
  renterPhone: string;
  startDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  billingInterval?: RentalUnit;
  rentalUnit: RentalUnit;
  billableUnits: number;
  priceBreakdown: PriceBreakdown;
  status: BookingStatus;
  bookingStatus?: string;
  deliveryRequired: boolean;
  deliveryDistanceKm?: number;
  deliveryDestination?: string;
  deliveryAddress?: string;
  operatorRequired: boolean;
  notes?: string;
  extensionRequest?: ExtensionRequest;
  renterProfile?: RenterTrackRecord; // Added for the owner and staff only
  handoverInspectionId?: string;
  returnInspectionId?: string;
  disputeId?: string;
  digitalContractSigned: boolean;
  signedAt?: string;
  qrHandoverToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionRecord {
  id: string;
  bookingId: string;
  assetId: string;
  type: 'handover' | 'return';
  inspectedBy: string;
  inspectorRole: string;
  timestamp: string;
  conditionRating: 'pristine' | 'normal_wear' | 'minor_damage' | 'severe_damage';
  checklist: { item: string; verified: boolean; comment?: string }[];
  meterReading?: string;
  fuelLevel?: string;
  damageCostEstimate?: number;
  equipmentCategory?: string;
  unitQuantity?: string;
  logisticsMode?: string;
  courierOrHandler?: string;
  returnTiming?: 'on_time' | 'late' | 'early';
  cleanlinessState?: 'clean_ready' | 'needs_cleaning' | 'needs_repair';
  missingOrDamagedItems?: string;
  inspectionNotes: string;
  photoUrls: string[];
  signatureName: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  assetTitle: string;
  raisedByUserId: string;
  raisedByName: string;
  raisedByRole: UserRole;
  reason: string;
  description: string;
  evidencePhotos: string[];
  claimAmount?: number; // Estimated repair cost, settled directly between owner and renter
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export type LogisticsJobStatus =
  | 'pending_assignment'
  | 'assigned'
  | 'en_route_pickup'
  | 'in_transit_to_site'
  | 'delivered_at_site'
  | 'delivered_on_site'
  | 'return_pickup_en_route'
  | 'in_transit_return'
  | 'returned_to_yard';

export interface LogisticsDispatchJob {
  id: string;
  bookingId: string;
  bookingCode: string;
  waybillCode?: string;
  assetId: string;
  assetTitle: string;
  assetImage: string;
  weightKg: number;
  vehicleClass?: string;
  requiredVehicleClass?: string;
  originAddress?: string;
  pickupLocation?: string;
  originCoords?: { lat: number; lng: number };
  destinationAddress?: string;
  dropoffLocation?: string;
  distanceKm: number;
  renterName: string;
  renterPhone: string;
  ownerName: string;
  ownerPhone: string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  status: LogisticsJobStatus;
  recipientSignature?: string;
  recipientSignedBy?: string;
  estimatedEtaMinutes?: number;
  dispatchedAt?: string;
  deliveredAt?: string;
  returnedAt?: string;
  updatedAt: string;
  createdAt?: string;
}

export interface SupportMessage {
  id: string;
  bookingId?: string;
  bookingCode?: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole | 'support';
  senderPhone?: string;
  recipientId?: string; // Who a support-desk reply is addressed to
  message?: string;
  text?: string;
  channel: 'in_app' | 'whatsapp_handoff' | 'sms_alert';
  timestamp: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  userRole: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface PlatformConfig {
  supportedRegions: string[];
}

export interface AdminAnalytics {
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  activeRentals: number;
  overdueReturns: number;
  grossRentalValue: number; // Sum of estimated hire value; no money passes through RENTZ
  disputeCount: number;
  activeOwners: number;
  activeRenters: number;
  averageBookingValue: number;
  repeatCustomerRate: number;
  categoryBreakdown: { categoryName: string; bookingCount: number; revenue: number }[];
}
