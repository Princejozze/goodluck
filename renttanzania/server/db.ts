import fs from 'fs';
import path from 'path';
import { loadCollections, writeChanges, type CollectionChanges } from './firestoreStore.ts';
import type {
  User,
  Category,
  Asset,
  Booking,
  InspectionRecord,
  Dispute,
  AuditLog,
  PlatformConfig,
  AdminAnalytics,
  SavedSearch,
  LogisticsDispatchJob,
  LogisticsJobStatus,
  SupportMessage,
} from '../src/types/index.ts';

// Server-only auth records, kept apart from User so they are never sent to clients
export interface UserCredential {
  userId: string;
  passwordHash: string;
  updatedAt: string;
}

export interface AuthSession {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface DatabaseSchema {
  users: User[];
  categories: Category[];
  assets: Asset[];
  bookings: Booking[];
  inspections: InspectionRecord[];
  disputes: Dispute[];
  logisticsJobs: LogisticsDispatchJob[];
  supportMessages: SupportMessage[];
  auditLogs: AuditLog[];
  config: PlatformConfig;
  credentials: UserCredential[];
  sessions: AuthSession[];
}

// Old local JSON database: read once to import its data into an empty Firestore, never written
const LEGACY_DB_FILE = path.resolve(process.cwd(), '.data', 'renttanzania-db.json');

const FABRICATED_GPS_PROVIDERS = ['Cartrack TZ Telematics', 'RENTZ Asset Tag QR+GPS'];
const INVENTED_DRIVER_NAMES = ['Juma Mwakasege (Lowbed Fleet)', 'Bakari Kimaro (Canter / Dispatch)'];
// Seed jobs used status names the dispatch screen does not know
const LEGACY_JOB_STATUSES: Record<string, LogisticsJobStatus> = {
  delivered_on_site: 'delivered_at_site',
  in_transit_return: 'return_pickup_en_route',
};

// Firestore collection -> the field used as its document id
const COLLECTION_KEYS = {
  users: 'id',
  categories: 'id',
  assets: 'id',
  bookings: 'id',
  inspections: 'id',
  disputes: 'id',
  logisticsJobs: 'id',
  supportMessages: 'id',
  auditLogs: 'id',
  credentials: 'userId',
  sessions: 'tokenHash',
} as const;
type CollectionName = keyof typeof COLLECTION_KEYS;
const COLLECTION_NAMES = Object.keys(COLLECTION_KEYS) as CollectionName[];
// Platform config is a single document
const CONFIG_COLLECTION = 'config';
const CONFIG_DOC_ID = 'platform';
const STORED_COLLECTIONS = [...COLLECTION_NAMES, CONFIG_COLLECTION];

const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-construction',
    name: 'Construction & Plant Hire',
    nameSwahili: 'Ujenzi na Mitambo',
    nameFrench: 'Construction et Engins de Chantier',
    slug: 'construction',
    description: 'Excavators, concrete mixers, scaffolding, power tools, compactors, generators, and pumps',
    iconName: 'HardHat',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'cat-agriculture',
    name: 'Agriculture & Farming',
    nameSwahili: 'Kilimo na Ufugaji',
    nameFrench: 'Agriculture et Équipement Agricole',
    slug: 'agriculture',
    description: 'Tractors, disc ploughs, solar irrigation pumps, harvesters, and crop sprayers',
    iconName: 'Tractor',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'cat-events',
    name: 'Events & Hospitality',
    nameSwahili: 'Sherehe na Matukio',
    nameFrench: 'Événements et Réceptions',
    slug: 'events',
    description: 'Marquee tents, banquet chairs, PA sound systems, lighting trusses, and mobile chillers',
    iconName: 'PartyPopper',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'cat-transport',
    name: 'Transport & Logistics',
    nameSwahili: 'Usafirishaji na Malori',
    nameFrench: 'Transport et Logistique',
    slug: 'transport',
    description: 'Tilt trucks, 7-ton flatbeds, refrigerated vans, and heavy equipment low-bed haulers',
    iconName: 'Truck',
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'cat-media',
    name: 'Media & Creative Production',
    nameSwahili: 'Habari na Filamu',
    nameFrench: 'Médias et Production Audiovisuelle',
    slug: 'media',
    description: 'Cinema cameras, drones, wireless audio kits, prime cinema lenses, and studio lighting',
    iconName: 'Video',
    displayOrder: 5,
    isActive: true,
  },
  {
    id: 'cat-office',
    name: 'Office & Technology',
    nameSwahili: 'Ofisi na Teknolojia',
    nameFrench: 'Bureautique et Informatique',
    slug: 'office',
    description: 'High-lumen projectors, temporary servers, office workstations, and PA conference sets',
    iconName: 'Laptop',
    displayOrder: 6,
    isActive: true,
  },
  {
    id: 'cat-home',
    name: 'Home & Personal Work',
    nameSwahili: 'Vifaa vya Nyumbani',
    nameFrench: 'Maison et Bricolage',
    slug: 'home',
    description: 'High-pressure washers, floor sanders, aluminum ladders, and industrial lawnmowers',
    iconName: 'Home',
    displayOrder: 7,
    isActive: true,
  },
  {
    id: 'cat-art-decor',
    name: 'Art & Decor',
    nameSwahili: 'Sanaa na Mapambo',
    nameFrench: 'Art et Décoration',
    slug: 'art-decor',
    description: 'Gallery display easels, stage backdrops, luxury floral arches, ambient uplighting, and exhibition installations',
    iconName: 'Palette',
    displayOrder: 8,
    isActive: true,
  },
  {
    id: 'cat-other',
    name: 'Specialized & Industrial Tools',
    nameSwahili: 'Vifaa Vingine Maalum',
    nameFrench: 'Outils Spécialisés et Industriels',
    slug: 'other',
    description: 'Mining detectors, marine outboard motors, borehole drills, and survey total stations',
    iconName: 'Wrench',
    displayOrder: 9,
    isActive: true,
  },
];

const INITIAL_USERS: User[] = [
  {
    id: 'user-renter-1',
    uid: 'user-renter-1',
    name: 'Safari Goodluck',
    email: 'safarigoodluck35@gmail.com',
    phone: '255793481147',
    role: 'admin',
    allowedRoles: ['admin', 'operations', 'owner', 'renter'],
    hasAdminOpsAccess: true,
    verificationStatus: 'verified',
    nidaNumber: '19900812-14102-00001-28',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Safari+Goodluck&backgroundColor=0284c7',
    savedSearches: [
      {
        id: 'saved-01',
        userId: 'user-renter-1',
        name: 'Arusha Farm Machinery',
        query: 'Tractor',
        categoryId: 'cat-agriculture',
        categoryName: 'Agriculture & Farming',
        region: 'Arusha',
        ownershipFilter: 'all',
        createdAt: '2026-02-10T11:00:00Z',
      },
      {
        id: 'saved-02',
        userId: 'user-renter-1',
        name: 'Dar Soundproof Generators',
        query: 'Generator',
        categoryId: 'cat-construction',
        categoryName: 'Construction & Plant Hire',
        region: 'Dar es Salaam',
        ownershipFilter: 'company',
        createdAt: '2026-02-14T09:30:00Z',
      },
    ],
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'user-owner-1',
    uid: 'user-owner-1',
    name: 'Simba Agro & Plant Services Ltd',
    email: 'owner@simbaagro.co.tz',
    phone: '+255 768 445 678',
    role: 'owner',
    allowedRoles: ['owner', 'renter'],
    hasAdminOpsAccess: false,
    ownerTier: 'verified',
    verificationStatus: 'verified',
    verificationCode: 'RTZ-VER-8821',
    verificationCodeIssuedAt: '2026-01-10T10:30:00Z',
    nidaNumber: '19840219-21105-00003-12',
    tinNumber: '109-882-941',
    companyName: 'Simba Agro & Plant Services Ltd (BRELA 149021)',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Simba+Agro&backgroundColor=16a34a',
    createdAt: '2026-01-10T10:30:00Z',
  },
  {
    id: 'user-owner-2',
    uid: 'user-owner-2',
    name: 'Hamisi Mrema (Mrema Plant & Tools)',
    email: 'mrema@rentz.co.tz',
    phone: '+255 714 621 884',
    role: 'owner',
    allowedRoles: ['owner', 'renter'],
    hasAdminOpsAccess: false,
    ownerTier: 'ordinary',
    verificationStatus: 'unverified',
    companyName: 'Mrema Plant & Tools (Ordinary Owner)',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Hamisi+Mrema&backgroundColor=b45309',
    createdAt: '2026-02-15T14:20:00Z',
  },
  {
    id: 'user-owner-3',
    uid: 'user-owner-3',
    name: 'Swahili Cine Arts Media',
    email: 'production@swahilicine.co.tz',
    phone: '+255 713 552 901',
    role: 'owner',
    allowedRoles: ['owner', 'renter'],
    hasAdminOpsAccess: false,
    ownerTier: 'verified',
    verificationStatus: 'verified',
    verificationCode: 'RTZ-VER-7742',
    verificationCodeIssuedAt: '2026-02-01T12:00:00Z',
    nidaNumber: '19920511-11101-00004-99',
    tinNumber: '112-704-551',
    companyName: 'Swahili Cine Arts Ltd',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Swahili+Cine&backgroundColor=7c3aed',
    createdAt: '2026-02-01T12:00:00Z',
  },
  {
    id: 'user-admin-1',
    uid: 'user-admin-1',
    name: 'Safari Goodluck (Admin & Ops Director)',
    email: 'safarigoodluck35@gmail.com',
    phone: '255793481147 / 255743801992',
    role: 'admin',
    allowedRoles: ['admin', 'operations', 'owner', 'renter'],
    hasAdminOpsAccess: true,
    verificationStatus: 'verified',
    nidaNumber: '19870314-11102-00002-45',
    tinNumber: '140-559-201',
    companyName: 'RENTZ Technologies Limited',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Safari+Goodluck&backgroundColor=0f766e',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'user-ops-1',
    uid: 'user-ops-1',
    name: 'Gift J. (Admin & Field Ops Lead)',
    email: 'giftj964@gmail.com',
    phone: '255743801992',
    role: 'operations',
    allowedRoles: ['admin', 'operations', 'owner', 'renter'],
    hasAdminOpsAccess: true,
    verificationStatus: 'verified',
    companyName: 'RENTZ Technologies Limited',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Gift+J&backgroundColor=d97706',
    createdAt: '2026-01-20T09:15:00Z',
  },
];

const INITIAL_ASSETS: Asset[] = [
  {
    id: 'asset-generator-50kva',
    title: '50kVA Silent Soundproof Diesel Generator (Cummins)',
    description: 'Commercial 3-phase soundproof canopy generator. Built-in automatic transfer switch (ATS), digital control panel, low fuel consumption. Ideal for wedding events, commercial construction, mining camps, and hospital backup.',
    categoryId: 'cat-construction',
    ownershipType: 'company', // RENTZ Direct Fleet
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    ownerRating: 4.95,
    isVerifiedOwner: true,
    weightKg: 1150,
    pricing: {
      purchaseValue: 8800000,
      ratePerHour: 35000,
      ratePerDay: 220000,
      ratePerWeek: 1250000,
      ratePerMonth: 4400000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Mikocheni B',
      landmark: 'Near Mwai Kibaki Road Depot',
      coordinates: { lat: -6.7584, lng: 39.2458 },
    },
    condition: 'excellent',
    specifications: {
      'Power Output': '50 kVA / 40 kW',
      'Engine': 'Cummins 4BTA 3.9-G2 Diesel',
      'Phase': '3-Phase / 400V / 230V',
      'Noise Level': '68 dB(A) at 7m (Super Silent)',
      'Fuel Tank': '160 Liters (12 hrs continuous run)',
    },
    accessoriesIncluded: [
      'Heavy-duty 50m 3-Phase power extension cable',
      'Automatic Transfer Switch (ATS) cabinet',
      'Spill kit & 2x CO2 fire extinguishers',
      'Full tank starter diesel',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 65000,
      operatorAvailable: true,
      operatorDailyRate: 35000,
    },
    images: [
      '/src/assets/images/asset_diesel_generator_1792692516323.jpg',
      '/src/assets/images/hero_equipment_fleet_1792692516554.jpg',
    ],
    serialNumber: 'RTZ-GEN-2025-084',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-RTZ-ASSET-084',
    totalRentals: 42,
    rating: 4.9,
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'asset-tractor-mf290',
    title: 'Massey Ferguson 290 Farm Tractor (82 HP) + Disc Plough',
    description: 'Reliable workhorse for tilling, disc ploughing, and farm haulage in Arusha and Kilimanjaro regions. Equipped with 4-disc heavy Baldan plough and hydraulic PTO hookup.',
    categoryId: 'cat-agriculture',
    ownershipType: 'third_party',
    ownerId: 'user-owner-1',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    ownerRating: 4.88,
    isVerifiedOwner: true,
    weightKg: 3150,
    pricing: {
      purchaseValue: 9000000,
      ratePerDay: 180000,
      ratePerWeek: 1050000,
      ratePerMonth: 3800000,
      minimumRentalDays: 2,
    },
    currency: 'TZS',
    location: {
      region: 'Arusha',
      district: 'Arusha Urban',
      ward: 'Njiro',
      landmark: 'Simba Yard opposite Complex',
      coordinates: { lat: -3.3869, lng: 36.683 },
    },
    condition: 'excellent',
    specifications: {
      'Horsepower': '82 HP Perkins 4.248 Diesel Engine',
      'Drive': '4WD Heavy Front Axle',
      'Implements': '4-Disc Heavy Baldan Plough included',
      'Fuel Capacity': '80 Liters',
      'Capacity': 'Till up to 10-15 acres per working day',
    },
    accessoriesIncluded: [
      'Hydraulic 4-disc plough attachment',
      'Operator canopy and sun guard',
      'Tool set and spare shear pins',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      deliveryFeePerKm: 2500,
      flatDeliveryFee: 80000,
      operatorAvailable: true,
      operatorDailyRate: 40000,
    },
    images: [
      '/src/assets/images/asset_farm_tractor_1792692517801.jpg',
      '/src/assets/images/hero_equipment_fleet_1792692516554.jpg',
    ],
    serialNumber: 'SBA-TRAC-290-TZ',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-SBA-TRAC-0290',
    totalRentals: 31,
    rating: 4.85,
    createdAt: '2026-01-25T11:00:00Z',
  },
  {
    id: 'asset-sony-fx3-package',
    title: 'Sony FX3 Cinema Package with GM Lenses & Wireless Audio',
    description: 'Full Netflix-approved digital cinema camera setup. Includes Sony FX3 Body, 24-70mm f/2.8 GM II lens, 50mm f/1.2 GM, Atomos Ninja V recorder, DJI RS3 Pro gimbal, and Sennheiser AVX wireless mic kit.',
    categoryId: 'cat-media',
    ownershipType: 'third_party',
    ownerId: 'user-owner-2',
    ownerName: 'Swahili Cine Arts Media',
    ownerPhone: '+255 713 552 901',
    ownerRating: 4.96,
    isVerifiedOwner: true,
    weightKg: 12,
    pricing: {
      purchaseValue: 4875000,
      ratePerDay: 195000,
      ratePerWeek: 1100000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dar es Salaam',
      district: 'Ilala',
      ward: 'Upanga East',
      landmark: 'Near Diamond Plaza',
      coordinates: { lat: -6.8089, lng: 39.2801 },
    },
    condition: 'excellent',
    specifications: {
      'Sensor': '12.1MP Full-Frame Exmor R BSI CMOS',
      'Video Modes': 'UHD 4K up to 120p, 10-Bit 4:2:2 XAVC S-I',
      'Dynamic Range': '15+ Stops Dynamic Range with S-Cinetone',
      'Stabilization': '5-Axis In-Body Image Stabilization',
      'Recording': 'Dual CFexpress Type A / SDXC slots',
    },
    accessoriesIncluded: [
      'Sony FE 24-70mm f/2.8 GM II Lens',
      'Atomos Ninja V 5-inch HDR monitor with 1TB SSD',
      '4x Sony NP-FZ100 batteries with dual fast charger',
      'DJI RS3 Pro 3-Axis Gimbal Stabilizer',
      'Sennheiser AVX wireless lavalier kit',
      'Pelican 1510 waterproof hard flight case',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 30000,
      operatorAvailable: true,
      operatorDailyRate: 60000,
    },
    images: [
      '/src/assets/images/asset_cinema_camera_1792692517378.jpg',
    ],
    serialNumber: 'SCA-FX3-TZ-884',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-SCA-FX3-008',
    totalRentals: 27,
    rating: 4.95,
    createdAt: '2026-02-05T09:30:00Z',
  },
  {
    id: 'asset-cat-excavator-320',
    title: 'Caterpillar 320D Hydraulic Excavator (21 Tons)',
    description: 'Heavy earthmoving tracked excavator for large civil projects, road excavation, quarry work, and site leveling. Fully serviced with certified operator options across Lake Zone and coastal projects.',
    categoryId: 'cat-construction',
    ownershipType: 'company', // RENTZ Direct Fleet
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    ownerRating: 5.0,
    isVerifiedOwner: true,
    weightKg: 9500,
    pricing: {
      purchaseValue: 30000000,
      ratePerHour: 95000,
      ratePerDay: 750000,
      ratePerWeek: 4800000,
      ratePerMonth: 18500000,
      minimumRentalDays: 3,
    },
    currency: 'TZS',
    location: {
      region: 'Mwanza',
      district: 'Nyamagana',
      ward: 'Nyegezi',
      landmark: 'Near Nyegezi Bus Terminal Depot',
      coordinates: { lat: -2.5542, lng: 32.9247 },
    },
    condition: 'excellent',
    specifications: {
      'Operating Weight': '21,600 kg (21.6 Tons)',
      'Engine Power': '140 HP CAT C6.4 ACERT',
      'Bucket Capacity': '1.0 m³ Heavy Rock Bucket',
      'Max Digging Depth': '6.65 meters',
    },
    accessoriesIncluded: [
      'Rock trenching bucket with reinforced teeth',
      'GPS telemetry tracking and telemetry hour meter',
      'Full safety beacons and ROPS certified cabin',
    ],
    deliveryOptions: {
      pickupAvailable: false,
      deliveryAvailable: true,
      flatDeliveryFee: 350000, // lowbed mobilization fee
      operatorAvailable: true,
      operatorDailyRate: 50000,
    },
    images: [
      '/src/assets/images/hero_equipment_fleet_1792692516554.jpg',
    ],
    serialNumber: 'RTZ-EXC-320D-01',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-RTZ-EXC-001',
    totalRentals: 19,
    rating: 4.92,
    createdAt: '2026-01-18T14:00:00Z',
  },
  {
    id: 'asset-concrete-mixer-500l',
    title: 'Heavy Duty 500L Diesel Concrete Mixer with Hydraulic Hopper',
    description: 'High-volume site concrete mixer with Yanmar diesel engine and mechanical loading hopper. Built on heavy-duty towable chassis with pneumatic wheels for easy site relocation.',
    categoryId: 'cat-construction',
    ownershipType: 'third_party',
    ownerId: 'user-owner-2',
    ownerName: 'Hamisi Mrema (Mrema Plant & Tools)',
    ownerPhone: '+255 714 621 884',
    ownerRating: 4.75,
    isVerifiedOwner: false,
    ownerTier: 'ordinary',
    weightKg: 450,
    pricing: {
      purchaseValue: 2500000,
      ratePerDay: 75000,
      ratePerWeek: 450000,
      ratePerMonth: 1600000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dodoma',
      district: 'Dodoma Urban',
      ward: 'Tambukareli',
      landmark: 'Dodoma Industrial Area Yard',
      coordinates: { lat: -6.1731, lng: 35.742 },
    },
    condition: 'good',
    specifications: {
      'Drum Capacity': '500 Liters (unmixed) / 375 Liters (output)',
      'Engine': '10 HP Water-cooled Diesel Engine with electric key start',
      'Production Speed': '25-30 batches per hour',
      'Chassis': 'Heavy channel frame with pneumatic road wheels',
    },
    accessoriesIncluded: [
      'Drum wash-down hose',
      'Grease gun and daily maintenance pack',
      'Heavy tow hitch connector',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 45000,
      operatorAvailable: true,
      operatorDailyRate: 30000,
    },
    images: [
      '/images/equipment/concrete-mixer-500l.jpg',
    ],
    serialNumber: 'SBA-MIX-500-TZ',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-SBA-MIX-005',
    totalRentals: 38,
    rating: 4.8,
    createdAt: '2026-02-10T08:00:00Z',
  },
  {
    id: 'asset-compactor-bomag',
    title: 'BOMAG BW 120 AD-5 Double Drum Vibratory Roller (2.7 Ton)',
    description: 'Articulated tandem vibratory road roller designed for asphalt compaction, estate road paving, and granular sub-base works across Tanzania. Pressurized water sprinkler system and Kubota diesel engine.',
    categoryId: 'cat-construction',
    ownershipType: 'third_party',
    ownerId: 'user-owner-1',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    ownerRating: 4.88,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 2700,
    pricing: {
      purchaseValue: 14000000,
      ratePerDay: 350000,
      ratePerWeek: 2100000,
      ratePerMonth: 7500000,
      minimumRentalDays: 2,
    },
    currency: 'TZS',
    location: {
      region: 'Dodoma',
      district: 'Dodoma Urban',
      ward: 'Njedengwa',
      landmark: 'Government City Infrastructure Yard',
      coordinates: { lat: -6.1659, lng: 35.7516 },
    },
    condition: 'excellent',
    specifications: {
      'Drum Width': '1,200 mm Double Steel Vibratory Drums',
      'Operating Weight': '2,700 kg (2.7 Tons)',
      'Engine': 'Kubota D1703 24.8 kW Water-Cooled Diesel',
      'Centrifugal Force': '34 / 41 kN Dual Frequency',
    },
    accessoriesIncluded: [
      '200L pressurized drum water sprinkler system',
      'ROPS foldable safety bar & amber LED strobe beacon',
      'Qualified compaction operator available',
    ],
    deliveryOptions: {
      pickupAvailable: false,
      deliveryAvailable: true,
      flatDeliveryFee: 150000,
      operatorAvailable: true,
      operatorDailyRate: 45000,
    },
    images: [
      '/images/equipment/bomag-roller.jpg',
    ],
    serialNumber: 'BMG-120AD-2025-04',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-BMG-120-004',
    totalRentals: 16,
    rating: 4.91,
    createdAt: '2026-02-11T09:30:00Z',
  },
  {
    id: 'asset-solar-irrigation-pump',
    title: 'Grundfos SQFlex Solar Submersible Borehole Irrigation Kit (1.2kW PV)',
    description: 'Complete off-grid solar water pumping package for commercial horticulture, drip irrigation, and livestock estates. Includes stainless steel submersible pump, foldable solar array, MPPT controller, and 100m layflat delivery hose.',
    categoryId: 'cat-agriculture',
    ownershipType: 'third_party',
    ownerId: 'user-owner-1',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    ownerRating: 4.88,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 115,
    pricing: {
      purchaseValue: 3250000,
      ratePerDay: 130000,
      ratePerWeek: 750000,
      ratePerMonth: 2600000,
      minimumRentalDays: 2,
    },
    currency: 'TZS',
    location: {
      region: 'Morogoro',
      district: 'Kilombero',
      ward: 'Ifakara',
      landmark: 'Kilombero Agro-Machinery Hub',
      coordinates: { lat: -8.1333, lng: 36.6833 },
    },
    condition: 'excellent',
    specifications: {
      'Max Pumping Head': '120 meters vertical lift',
      'Flow Output': 'Up to 9,500 Liters / hour',
      'Solar Array': '4x 330W Monocrystalline Folding Ground Array',
      'Discharge Hose': '100m Heavy-Duty 2-Inch Layflat Hose',
    },
    accessoriesIncluded: [
      'CU200 Dry-run protection & MPPT control box',
      'Submersible safety stainless cable & borehole wellhead cap',
      '100m heavy-duty layflat hose & quick-camlock couplings',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 55000,
      operatorAvailable: true,
      operatorDailyRate: 30000,
    },
    images: [
      '/images/equipment/solar-irrigation-pump.jpg',
    ],
    serialNumber: 'AGR-SQF-2026-08',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-AGR-SQF-008',
    totalRentals: 22,
    rating: 4.94,
    createdAt: '2026-02-14T11:00:00Z',
  },
  {
    id: 'asset-maize-sheller-thresher',
    title: 'Multi-Crop Diesel Maize Sheller & Paddy Thresher (3.5 Ton/Hr)',
    description: 'High-efficiency towable diesel maize sheller, sunflower, and sorghum thresher with cyclone grain cleaner and bagging chutes. Built for smallholder cooperatives and commercial grain estates in the Southern Highlands.',
    categoryId: 'cat-agriculture',
    ownershipType: 'third_party',
    ownerId: 'user-owner-2',
    ownerName: 'Hamisi Mrema (Mrema Plant & Tools)',
    ownerPhone: '+255 714 621 884',
    ownerRating: 4.75,
    isVerifiedOwner: false,
    ownerTier: 'ordinary',
    weightKg: 380,
    pricing: {
      purchaseValue: 3800000,
      ratePerDay: 95000,
      ratePerWeek: 560000,
      ratePerMonth: 1950000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Mbeya',
      district: 'Mbeya Urban',
      ward: 'Uyole',
      landmark: 'Uyole Agricultural Research Junction',
      coordinates: { lat: -8.9167, lng: 33.5167 },
    },
    condition: 'good',
    specifications: {
      'Shelling Output': '3,000 – 3,800 kg per hour (Maize)',
      'Prime Mover': '18 HP Changfa Single-Cylinder Water-Cooled Diesel',
      'Shelling Rate': '99.2% Clean Grain Separation, <1.2% Breakage',
      'Mobility': 'Pneumatic Towable Axle with Drawbar Hitch',
    },
    accessoriesIncluded: [
      'Interchangeable concave sieves for maize, beans & sorghum',
      'Twin 100kg sack bagging holders',
      'Belt guard & tool kit',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 60000,
      operatorAvailable: true,
      operatorDailyRate: 30000,
    },
    images: [
      '/images/equipment/maize-sheller.jpg',
    ],
    serialNumber: 'AGR-SHL-3500-MBY',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-AGR-SHL-011',
    totalRentals: 31,
    rating: 4.83,
    createdAt: '2026-02-15T08:30:00Z',
  },
  {
    id: 'asset-event-marquee-tent',
    title: 'Luxury Marquee A-Frame Tent (15m x 30m, 500 Guests Capacity)',
    description: 'High-peak heavy PVC commercial marquee tent suitable for corporate galas, VIP weddings, summits, and exhibitions. Water-tight, fire-retardant white blackout fabric with side clear windows.',
    categoryId: 'cat-events',
    ownershipType: 'third_party',
    ownerId: 'user-owner-1',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    ownerRating: 4.88,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 850,
    pricing: {
      purchaseValue: 12000000,
      ratePerDay: 480000,
      ratePerWeek: 1900000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Oysterbay',
      landmark: 'Near Coco Beach Area',
      coordinates: { lat: -6.7725, lng: 39.2789 },
    },
    condition: 'excellent',
    specifications: {
      'Dimensions': '15 meters width × 30 meters length (450 m²)',
      'Capacity': '450–550 guests banquet seating / 800 standing',
      'Frame': 'Hard-pressed extruded structural aluminum 6061-T6',
      'Fabric': '850g/m² blackout white PVC, UV resistant and fire rated',
    },
    accessoriesIncluded: [
      'Complete anchoring pegs & ballast plates',
      'French clear window sidewalls and solid white panels',
      'Full setup and dismantling crew included',
    ],
    deliveryOptions: {
      pickupAvailable: false,
      deliveryAvailable: true,
      flatDeliveryFee: 90000,
      operatorAvailable: false,
    },
    images: [
      '/images/equipment/marquee-tent-300pax.jpg',
    ],
    serialNumber: 'EVT-MRQ-1530-01',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-EVT-MRQ-015',
    totalRentals: 24,
    rating: 4.9,
    createdAt: '2026-02-12T13:00:00Z',
  },
  {
    id: 'asset-pa-jbl-linearray',
    title: 'JBL VTX Line Array Concert PA System (12kW + 32ch Digital Mixer)',
    description: 'Tour-grade concert and festival sound reinforcement package. Includes 8x JBL VTX line array tops, 4x dual-18 subwoofers, Crown I-Tech HD power amp racks, Soundcraft 32-channel digital console, and 4x Shure UHF wireless mics.',
    categoryId: 'cat-events',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    ownerRating: 4.98,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 620,
    pricing: {
      purchaseValue: 10500000,
      ratePerDay: 420000,
      ratePerWeek: 2100000,
      ratePerMonth: 6800000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Mikocheni B',
      landmark: 'RENTZ Audio & Events Depot',
      coordinates: { lat: -6.7584, lng: 39.2458 },
    },
    condition: 'excellent',
    specifications: {
      'System Output': '12,000W RMS Continuous / 24kW Peak',
      'Line Array Tops': '8x JBL Dual 8-Inch Two-Way Line Array Elements',
      'Subwoofers': '4x Dual 18-Inch High-Output Ground Subwoofers',
      'FOH Console': 'Soundcraft Si Impact 32-Channel Digital Mixer + Stagebox',
    },
    accessoriesIncluded: [
      '4x Shure QLXD4 Digital Wireless Handheld & Lapel Microphones',
      '2x Heavy-duty aluminum crank-up line array Genie lifts',
      '3-phase power distro box & full XLR snake loom',
    ],
    deliveryOptions: {
      pickupAvailable: false,
      deliveryAvailable: true,
      flatDeliveryFee: 85000,
      operatorAvailable: true,
      operatorDailyRate: 60000,
    },
    images: [
      '/images/equipment/jbl-line-array-pa.jpg',
    ],
    serialNumber: 'RTZ-EVT-JBL12K-02',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-RTZ-JBL-002',
    totalRentals: 29,
    rating: 4.96,
    createdAt: '2026-02-14T15:00:00Z',
  },
  {
    id: 'asset-mobile-chiller-trailer',
    title: 'Mobile Cold-Room Walk-In Refrigerated Catering Trailer (12m³)',
    description: 'Towable walk-in cold room & beverage chiller trailer for beach weddings, hotel banquets, and outdoor festivals. Operates on standard 220V single-phase mains or portable 6kVA generator.',
    categoryId: 'cat-events',
    ownershipType: 'third_party',
    ownerId: 'user-owner-1',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    ownerRating: 4.88,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 980,
    pricing: {
      purchaseValue: 6500000,
      ratePerDay: 260000,
      ratePerWeek: 1450000,
      ratePerMonth: 4800000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Zanzibar',
      district: 'Mjini Magharibi',
      ward: 'Stone Town',
      landmark: 'Maruhubi Hospitality Depot',
      coordinates: { lat: -6.145, lng: 39.208 },
    },
    condition: 'excellent',
    specifications: {
      'Internal Volume': '12.4 Cubic Meters (3.6m × 1.8m × 1.9m)',
      'Temperature Range': '-5°C Freezer to +8°C Beverage Chiller',
      'Power Input': '220V Single-Phase 16A Industrial Plug',
      'Shelving': '3-Tier Food-Grade Stainless Steel Racking',
    },
    accessoriesIncluded: [
      '25m heavy-duty waterproof 16A power extension lead',
      'Non-slip aluminum rear loading step & internal safety release',
      '4x heavy corner stabilizing jacks & hitch lock',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 75000,
      operatorAvailable: false,
    },
    images: [
      '/images/equipment/mobile-catering-chiller.jpg',
    ],
    serialNumber: 'EVT-CHL-ZNZ-04',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-EVT-CHL-004',
    totalRentals: 18,
    rating: 4.92,
    createdAt: '2026-02-16T09:00:00Z',
  },
  {
    id: 'asset-truck-hino-hiab',
    title: 'Hino 500 Series 10-Ton Flatbed Truck with Palfinger 5T Hiab Crane',
    description: 'Self-loading 10-ton drop-side flatbed truck equipped with a hydraulic Palfinger PK11002 knuckle-boom crane. Ideal for moving generators, shipping containers, transformers, and heavy plant across Tanzania.',
    categoryId: 'cat-transport',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    ownerRating: 4.98,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 9400,
    pricing: {
      purchaseValue: 18000000,
      ratePerDay: 450000,
      ratePerWeek: 2600000,
      ratePerMonth: 9200000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dar es Salaam',
      district: 'Temeke',
      ward: 'Kurasini',
      landmark: 'Port Logistics Corridor Gate 3',
      coordinates: { lat: -6.8452, lng: 39.2869 },
    },
    condition: 'excellent',
    specifications: {
      'Deck Payload': '10,000 kg (6.8m × 2.45m Steel Drop-Side Bed)',
      'Crane Capacity': '5,000 kg at 2.2m / 1,450 kg at 8.2m Hydraulic Reach',
      'Engine': 'Hino J08E 260 HP Turbo Intercooled Diesel',
      'Safety': 'Hydraulic Outrigger Stabilizers & OSHA Certified Rigging',
    },
    accessoriesIncluded: [
      '4-leg certified 10-ton chain sling & polyester webbing straps',
      'Heavy-duty ratchet tie-downs & container twist-locks',
      'Licensed Hiab crane operator & rigger included',
    ],
    deliveryOptions: {
      pickupAvailable: false,
      deliveryAvailable: true,
      flatDeliveryFee: 80000,
      operatorAvailable: true,
      operatorDailyRate: 55000,
    },
    images: [
      '/images/equipment/hino-hiab-crane-truck.jpg',
    ],
    serialNumber: 'RTZ-TRK-HINO500-01',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-RTZ-TRK-001',
    totalRentals: 34,
    rating: 4.97,
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'asset-forklift-toyota-3t',
    title: 'Toyota 8FD30 3.0-Ton Diesel Warehouse & Yard Forklift (4.5m Mast)',
    description: 'Industrial 3-ton Toyota counterbalance diesel forklift with 3-stage container-entry mast and hydraulic side-shifter. Built for port yards, manufacturing warehouses, and construction material offloading.',
    categoryId: 'cat-transport',
    ownershipType: 'third_party',
    ownerId: 'user-owner-1',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    ownerRating: 4.88,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 4250,
    pricing: {
      purchaseValue: 9600000,
      ratePerDay: 240000,
      ratePerWeek: 1400000,
      ratePerMonth: 4900000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Tanga',
      district: 'Tanga Urban',
      ward: 'Chumbageni',
      landmark: 'Tanga Port Industrial Zone',
      coordinates: { lat: -5.0689, lng: 39.0988 },
    },
    condition: 'excellent',
    specifications: {
      'Rated Lift Capacity': '3,000 kg at 500mm Load Center',
      'Mast Height': '4,500 mm Triplex Full-Free Lift (Container Spec)',
      'Engine': 'Toyota 1DZ-III Industrial Diesel with SAS Stability',
      'Tires': 'Solid Puncture-Proof Superelastic Yard Tires',
    },
    accessoriesIncluded: [
      '1,220mm standard pallet forks + 1,800mm heavy fork extensions',
      'Blue pedestrian safety spot-beam & reverse alarm',
      'Daily pre-shift checklist logbook',
    ],
    deliveryOptions: {
      pickupAvailable: false,
      deliveryAvailable: true,
      flatDeliveryFee: 110000,
      operatorAvailable: true,
      operatorDailyRate: 40000,
    },
    images: [
      '/images/equipment/toyota-forklift-3t.jpg',
    ],
    serialNumber: 'TYT-8FD30-TNG-09',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-TYT-8FD-009',
    totalRentals: 21,
    rating: 4.89,
    createdAt: '2026-02-05T10:00:00Z',
  },
  {
    id: 'asset-canter-box-3t',
    title: 'Mitsubishi Fuso Canter 3.5-Ton Enclosed Tail-Lift Cargo Truck',
    description: 'Weatherproof aluminum box truck fitted with a 1,000kg hydraulic rear tail-lift. Ideal for transporting AV production racks, corporate office relocations, fragile exhibition gear, and palletized goods.',
    categoryId: 'cat-transport',
    ownershipType: 'third_party',
    ownerId: 'user-owner-2',
    ownerName: 'Hamisi Mrema (Mrema Plant & Tools)',
    ownerPhone: '+255 714 621 884',
    ownerRating: 4.75,
    isVerifiedOwner: false,
    ownerTier: 'ordinary',
    weightKg: 3200,
    pricing: {
      purchaseValue: 7200000,
      ratePerDay: 180000,
      ratePerWeek: 1050000,
      ratePerMonth: 3800000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Arusha',
      district: 'Arusha Urban',
      ward: 'Sakina',
      landmark: 'Nairobi Road Logistics Yard',
      coordinates: { lat: -3.3621, lng: 36.6645 },
    },
    condition: 'good',
    specifications: {
      'Payload Capacity': '3,500 kg Enclosed Lockable Cargo Box',
      'Cargo Volume': '18.5 m³ (4.3m Length × 2.1m Width × 2.05m Height)',
      'Hydraulic Tail-Lift': '1,000 kg Electro-Hydraulic Rear Platform',
      'Tracking': 'Live Cartrack GPS & Cargo Door Sensor',
    },
    accessoriesIncluded: [
      'Hand pallet jack (2.0-Ton) stored inside cargo bay',
      '6x E-track cargo load bars & padded moving blankets',
      'Comprehensive goods-in-transit insurance cover',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 45000,
      operatorAvailable: true,
      operatorDailyRate: 35000,
    },
    images: [
      '/images/equipment/fuso-canter-cargo.jpg',
    ],
    serialNumber: 'FUS-FE85-ARU-12',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-FUS-FE85-012',
    totalRentals: 27,
    rating: 4.79,
    createdAt: '2026-02-08T14:00:00Z',
  },
  {
    id: 'asset-drone-dji-inspire3',
    title: 'DJI Inspire 3 8K Cinema Drone + Zenmuse X9-8K Air Gimbal Kit',
    description: 'Flagship full-frame 8K aerial cinematography system for feature films, tourism documentaries, and infrastructure progress surveys. Includes Zenmuse X9-8K Air gimbal, DL 24mm/35mm/50mm lenses, dual RC Plus controllers, and TCAA permit support.',
    categoryId: 'cat-media',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    ownerRating: 4.98,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 28,
    pricing: {
      purchaseValue: 8750000,
      ratePerDay: 350000,
      ratePerWeek: 1950000,
      ratePerMonth: 6400000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Arusha',
      district: 'Arusha Urban',
      ward: 'Uzunguni',
      landmark: 'Clock Tower Cine & Safari Hub',
      coordinates: { lat: -3.3731, lng: 36.6944 },
    },
    condition: 'excellent',
    specifications: {
      'Camera Sensor': 'Full-Frame 8K 75fps ProRes RAW / CinemaDNG',
      'Lens Set': 'DJI DL 24mm, 35mm & 50mm F2.8 Carbon Lenses',
      'Flight Battery Kit': '6x TB51 Intelligent Dual-Battery Sets + Charging Hub',
      'Positioning': 'RTK Centimeter-Level Waypoint Pro Navigation',
    },
    accessoriesIncluded: [
      '2x DJI RC Plus 7-inch High-Bright Monitors (Pilot + Gimbal Op)',
      '3x 1TB DJI PROSSD High-Speed Media Drives',
      'Pelican rolling flight case & TCAA licensed RPAS pilot option',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 35000,
      operatorAvailable: true,
      operatorDailyRate: 85000,
    },
    images: [
      '/images/equipment/dji-inspire3-cinema-drone.jpg',
    ],
    serialNumber: 'RTZ-MED-INSP3-01',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-RTZ-DRN-001',
    totalRentals: 15,
    rating: 4.98,
    createdAt: '2026-02-15T12:00:00Z',
  },
  {
    id: 'asset-lighting-aputure-600d',
    title: 'Aputure LS 600d Pro Daylight COB LED 3-Light Studio Kit + C-Stands',
    description: 'High-output weather-resistant 600W daylight COB LED film lighting package. Includes 2x Aputure LS 600d Pro heads, 1x Aputure 300x Bi-Color key light, Light Dome II softboxes, F10 Fresnel, and 3x stainless steel Century C-stands.',
    categoryId: 'cat-media',
    ownershipType: 'third_party',
    ownerId: 'user-owner-3',
    ownerName: 'Swahili Cine Arts Media',
    ownerPhone: '+255 713 552 901',
    ownerRating: 4.92,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 65,
    pricing: {
      purchaseValue: 4000000,
      ratePerDay: 160000,
      ratePerWeek: 900000,
      ratePerMonth: 2900000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Mikocheni',
      landmark: 'Coca-Cola Road Studio Complex',
      coordinates: { lat: -6.7641, lng: 39.2512 },
    },
    condition: 'excellent',
    specifications: {
      'Illuminance': '98,500+ Lux at 1m with F10 Fresnel',
      'Color Accuracy': 'CRI 96+, TLCI 96+, 5600K Daylight Balanced',
      'Power Options': 'AC Mains or Dual 26V/14.4V V-Mount Battery Power',
      'Control': 'Sidus Link Bluetooth Mesh & 5-Pin DMX512',
    },
    accessoriesIncluded: [
      '2x Light Dome II 35-inch Quick-Release Octabank Softboxes',
      '3x Matthews 40-inch Chrome C-Stands with Grip Arms & Sandbags',
      'Rolling hard cases & Neutrik powerCON TRUE1 cables',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 30000,
      operatorAvailable: true,
      operatorDailyRate: 45000,
    },
    images: [
      '/images/equipment/aputure-600d-lighting.jpg',
    ],
    serialNumber: 'SCA-LGT-600D-03',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-SCA-LGT-003',
    totalRentals: 33,
    rating: 4.93,
    createdAt: '2026-02-16T11:30:00Z',
  },
  {
    id: 'asset-projector-epson-7000',
    title: 'Epson EB-PU1007W 7,000-Lumen WUXGA Laser Projector + 150" Fast-Fold Screen',
    description: 'High-brightness 3LCD laser installation projector paired with an aluminum 150-inch front/rear projection fast-fold screen. Engineered for AGM conferences, diplomatic summits, and daylight boardroom presentations.',
    categoryId: 'cat-office',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    ownerRating: 4.98,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 42,
    pricing: {
      purchaseValue: 4500000,
      ratePerDay: 180000,
      ratePerWeek: 980000,
      ratePerMonth: 3200000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dar es Salaam',
      district: 'Ilala',
      ward: 'Kivukoni (Posta)',
      landmark: 'Samora Avenue Corporate Tech Hub',
      coordinates: { lat: -6.8161, lng: 39.2894 },
    },
    condition: 'excellent',
    specifications: {
      'Brightness': '7,000 ANSI Lumens Laser Light Source',
      'Resolution': 'WUXGA (1920 × 1200) with 4K Enhancement',
      'Projection Screen': '150-Inch (3.3m × 2.1m) Da-Lite Aluminum Fast-Fold',
      'Connectivity': 'HDBaseT, 3G-SDI, HDMI, DVI-D & Wireless Presentation',
    },
    accessoriesIncluded: [
      '150-inch Fast-Fold screen with front & rear surfaces + skirt',
      '20m optical HDMI 2.1 cable + wireless clicker',
      'Adjustable projector truss stand & wheeled flight case',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 30000,
      operatorAvailable: true,
      operatorDailyRate: 35000,
    },
    images: [
      '/images/equipment/epson-laser-projector.jpg',
    ],
    serialNumber: 'RTZ-OFF-EPS7K-01',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-RTZ-OFF-001',
    totalRentals: 41,
    rating: 4.95,
    createdAt: '2026-02-09T09:00:00Z',
  },
  {
    id: 'asset-starlink-conference-kit',
    title: 'Enterprise Pop-Up Conference Kit (High-Speed Satellite Router + APC 3kVA UPS + 8 Laptops)',
    description: 'Turnkey mobile training room and summit IT infrastructure kit. Includes 8x Dell Latitude Core i7 laptops, enterprise Wi-Fi 6 mesh router with high-speed satellite/5G failover, and an APC Smart-UPS 3000VA pure sine wave power backup.',
    categoryId: 'cat-office',
    ownershipType: 'third_party',
    ownerId: 'user-owner-1',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    ownerRating: 4.88,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 78,
    pricing: {
      purchaseValue: 5500000,
      ratePerDay: 220000,
      ratePerWeek: 1250000,
      ratePerMonth: 4100000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dodoma',
      district: 'Dodoma Urban',
      ward: 'Area D',
      landmark: 'Parliamentary Avenue Business Center',
      coordinates: { lat: -6.1789, lng: 35.7495 },
    },
    condition: 'excellent',
    specifications: {
      'Workstations': '8x Dell Latitude 5540 (Intel Core i7, 16GB RAM, 512GB NVMe)',
      'Power Backup': 'APC Smart-UPS 3000VA LCD 230V Pure Sine Wave',
      'Connectivity': 'Dual-WAN Enterprise Wi-Fi 6 Gateway (Supports 150 Users)',
      'Transit Protection': 'Foam-lined 10-Bay Pelican Hard Case',
    },
    accessoriesIncluded: [
      '8x Wireless mice, power bricks & Kensington security locks',
      '24-port Gigabit PoE switch & 4x surge-protected PDU strips',
      'Pre-configured clean Windows 11 Pro & Office 365 environment',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 40000,
      operatorAvailable: true,
      operatorDailyRate: 40000,
    },
    images: [
      '/images/equipment/enterprise-conference-kit.jpg',
    ],
    serialNumber: 'OFF-CNF-DOM-05',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-OFF-CNF-005',
    totalRentals: 19,
    rating: 4.91,
    createdAt: '2026-02-14T10:30:00Z',
  },
  {
    id: 'asset-washer-karcher-hd',
    title: 'Kärcher HD 9/20-4 Classic Commercial High-Pressure Washer (200 Bar)',
    description: 'Heavy-duty commercial cold-water high-pressure cleaner with crankshaft pump and ceramic pistons. Perfect for deep cleaning paved driveways, warehouse floors, roofs, façade stone, and heavy fleet vehicles.',
    categoryId: 'cat-home',
    ownershipType: 'third_party',
    ownerId: 'user-owner-2',
    ownerName: 'Hamisi Mrema (Mrema Plant & Tools)',
    ownerPhone: '+255 714 621 884',
    ownerRating: 4.75,
    isVerifiedOwner: false,
    ownerTier: 'ordinary',
    weightKg: 56,
    pricing: {
      purchaseValue: 1625000,
      ratePerDay: 65000,
      ratePerWeek: 360000,
      ratePerMonth: 1200000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Mwenge',
      landmark: 'Mwenge Sam Nujoma Tool Yard',
      coordinates: { lat: -6.7712, lng: 39.2264 },
    },
    condition: 'excellent',
    specifications: {
      'Working Pressure': '70 – 200 Bar (Max 240 Bar)',
      'Water Flow Rate': '500 – 900 Liters per hour',
      'Lance & Nozzles': '850mm Stainless Steel Lance + Rotary Dirt Blaster',
      'High-Pressure Hose': '15m Steel-Braided Non-Marking Hose',
    },
    accessoriesIncluded: [
      'FR 30 Rotary Hard-Surface Driveway Cleaner Attachment',
      'Foam cannon detergent injector bottle',
      '25m water supply hose with brass GEKA couplings',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 20000,
      operatorAvailable: true,
      operatorDailyRate: 25000,
    },
    images: [
      '/images/equipment/karcher-pressure-washer.jpg',
    ],
    serialNumber: 'HOM-KRC-200B-07',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-HOM-KRC-007',
    totalRentals: 46,
    rating: 4.86,
    createdAt: '2026-02-07T08:30:00Z',
  },
  {
    id: 'asset-scaffold-mobile-tower',
    title: '6.5m Double-Width Aluminum Mobile Scaffolding Tower + Outriggers',
    description: 'Lightweight EN1004 certified industrial aluminum mobile access tower for high-ceiling painting, chandelier installation, HVAC maintenance, and residential exterior renovation.',
    categoryId: 'cat-home',
    ownershipType: 'third_party',
    ownerId: 'user-owner-1',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    ownerRating: 4.88,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 165,
    pricing: {
      purchaseValue: 2125000,
      ratePerDay: 85000,
      ratePerWeek: 480000,
      ratePerMonth: 1650000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Mwanza',
      district: 'Nyamagana',
      ward: 'Mabatini',
      landmark: 'Mwanza Builders Equipment Depot',
      coordinates: { lat: -2.5186, lng: 32.9089 },
    },
    condition: 'excellent',
    specifications: {
      'Working Height': '6.5 meters (Platform Height 4.5 meters)',
      'Deck Dimensions': '1.45m Double Width × 2.5m Length',
      'Safe Working Load': '275 kg per platform level (750 kg tower total)',
      'Wheels': '4x 200mm Heavy-Duty Adjustable Locking Castors',
    },
    accessoriesIncluded: [
      '2x Non-slip trapdoor marine plywood decks withアルミ toe-boards',
      '4x Telescopic corner outrigger stabilizers',
      '2x Full-body safety harnesses with shock-absorbing lanyards',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 35000,
      operatorAvailable: false,
    },
    images: [
      '/images/equipment/aluminum-scaffold-tower.jpg',
    ],
    serialNumber: 'HOM-SCF-65M-MWZ',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-HOM-SCF-014',
    totalRentals: 28,
    rating: 4.89,
    createdAt: '2026-02-11T14:15:00Z',
  },
  {
    id: 'asset-art-decor-backdrop-01',
    title: 'Luxury Velvet Stage Backdrop, Floral Arch & Gallery Uplighting Kit',
    description: 'Complete modular art exhibition & event decor installation kit. Includes telescopic 6m x 3m heavy-duty pipe-and-drape frame, gold-finished geometric floral arches, 8 wireless RGBWA+UV battery uplights, and 4 solid beechwood gallery display easels.',
    categoryId: 'cat-art-decor',
    ownershipType: 'third_party',
    ownerId: 'user-owner-3',
    ownerName: 'Swahili Cine Arts Media',
    ownerPhone: '+255 713 552 901',
    ownerRating: 4.92,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 55,
    pricing: {
      purchaseValue: 3625000,
      ratePerDay: 145000,
      ratePerWeek: 780000,
      ratePerMonth: 2500000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dar es Salaam',
      district: 'Kinondoni',
      ward: 'Oysterbay',
      landmark: 'Coco Beach Art & Cultural Center',
    },
    condition: 'excellent',
    specifications: {
      'Backdrop Span': 'Adjustable 3m to 6m width × 3.2m height',
      'Lighting': '8x 108W Wireless DMX Battery LED Par Uplights',
      'Display Easels': '4x Adjustable Beechwood Studio Gallery Easels',
      'Arch Frame': '2.4m Gold Powder-Coated Steel Circular & Hex Arches',
    },
    accessoriesIncluded: [
      '8x Wireless RGBWA+UV Uplights with charging flight case',
      '4x Gallery display easels & spotlights',
      'Heavy-duty base weights & flame-retardant drapes',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 45000,
      operatorAvailable: true,
      operatorDailyRate: 35000,
    },
    images: [
      '/images/equipment/velvet-stage-backdrop.jpg',
    ],
    serialNumber: 'ART-DEC-2026-09',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-ART-DEC-009',
    totalRentals: 14,
    rating: 4.95,
    createdAt: '2026-02-18T10:00:00Z',
  },
  {
    id: 'asset-decor-gallery-easels',
    title: 'Swahili Carved Hardwood Lounge Set, Brass Stanchions & 12 Gallery Display Plinths',
    description: 'Curated cultural heritage & fine art gallery furniture collection. Features authentic Zanzibar hand-carved teak lounge benches, 12 museum-grade matte white sculpture plinths, and 8 polished brass VIP stanchions with crimson velvet ropes.',
    categoryId: 'cat-art-decor',
    ownershipType: 'third_party',
    ownerId: 'user-owner-3',
    ownerName: 'Swahili Cine Arts Media',
    ownerPhone: '+255 713 552 901',
    ownerRating: 4.92,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 210,
    pricing: {
      purchaseValue: 4750000,
      ratePerDay: 190000,
      ratePerWeek: 1050000,
      ratePerMonth: 3400000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Zanzibar',
      district: 'Mjini Magharibi',
      ward: 'Shangani',
      landmark: 'Old Fort Cultural Arts Depot',
      coordinates: { lat: -6.1612, lng: 39.1889 },
    },
    condition: 'excellent',
    specifications: {
      'Museum Plinths': '12x Matte White MDF & Steel Plinths (Assorted 80cm–120cm Heights)',
      'Lounge Seating': '2x 3-Seater Carved Zanzibar Teak Baraza Benches + Cream Cushions',
      'Crowd Control': '8x Polished Brass Ball-Top Stanchions + 6x Velvet Ropes',
      'Spotlights': '12x Rechargeable Warm-White Clip-On Gallery Art Lights',
    },
    accessoriesIncluded: [
      'Padded transit blankets & corner protectors for plinths',
      '12x Rechargeable warm-white museum art spotlights',
      'White-glove placement & layout styling team available',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 50000,
      operatorAvailable: true,
      operatorDailyRate: 35000,
    },
    images: [
      '/images/equipment/gallery-exhibition-decor.jpg',
    ],
    serialNumber: 'ART-ZNZ-CUR-02',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-ART-ZNZ-002',
    totalRentals: 17,
    rating: 4.96,
    createdAt: '2026-02-19T11:00:00Z',
  },
  {
    id: 'asset-survey-leica-ts16',
    title: 'Leica Viva TS16 1" Robotic Total Station + GNSS RTK Rover Surveying Kit',
    description: 'High-precision robotic engineering total station and dual-frequency GNSS RTK rover kit for cadastral boundary surveys, road corridor setting-out, and bridge alignment. Valid calibration certificate included.',
    categoryId: 'cat-other',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    ownerRating: 4.98,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 18,
    pricing: {
      purchaseValue: 6250000,
      ratePerDay: 250000,
      ratePerWeek: 1400000,
      ratePerMonth: 4600000,
      minimumRentalDays: 1,
    },
    currency: 'TZS',
    location: {
      region: 'Dodoma',
      district: 'Dodoma Urban',
      ward: 'Kilimani',
      landmark: 'RENTZ Engineering & Survey Instrument Hub',
      coordinates: { lat: -6.1822, lng: 35.7568 },
    },
    condition: 'excellent',
    specifications: {
      'Angular Accuracy': '1" (One Arc-Second) Automated Target Tracking',
      'Reflectorless Range': 'PinPoint R1000 (Up to 1,000m Prismless, 3,500m Prism)',
      'Field Controller': 'Leica CS20 LTE Rugged Controller with Captivate Software',
      'Calibration': 'ISO 17123-3 Certified (Valid through Dec 2026)',
    },
    accessoriesIncluded: [
      'Heavy-duty wooden tripod, tribrach & 360° robotic prism pole',
      '4x GEB222 Li-Ion batteries + dual charger in Leica hard case',
      'USB/SD CAD & DXF direct export dongle',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 30000,
      operatorAvailable: true,
      operatorDailyRate: 65000,
    },
    images: [
      '/images/equipment/leica-total-station.jpg',
    ],
    serialNumber: 'RTZ-SRV-TS16-01',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-RTZ-SRV-001',
    totalRentals: 26,
    rating: 4.97,
    createdAt: '2026-02-04T08:00:00Z',
  },
  {
    id: 'asset-welder-miller-trailblazer',
    title: 'Miller Trailblazer 325 Diesel Engine-Driven Welder/Generator (TIG/MIG/Stick)',
    description: 'Towable Kubota diesel-powered multiprocess welder and 12kW auxiliary power generator for pipeline fabrication, structural steel erection, and mining plant maintenance.',
    categoryId: 'cat-other',
    ownershipType: 'third_party',
    ownerId: 'user-owner-1',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    ownerRating: 4.88,
    isVerifiedOwner: true,
    ownerTier: 'verified',
    weightKg: 460,
    pricing: {
      purchaseValue: 5500000,
      ratePerDay: 165000,
      ratePerWeek: 950000,
      ratePerMonth: 3300000,
      minimumRentalDays: 2,
    },
    currency: 'TZS',
    location: {
      region: 'Mwanza',
      district: 'Ilemela',
      ward: 'Igoma',
      landmark: 'Igoma Heavy Fabrication Yard',
      coordinates: { lat: -2.4958, lng: 32.9612 },
    },
    condition: 'excellent',
    specifications: {
      'Welding Output': '20 – 325 Amps DC (CC/CV Stick, MIG, Flux-Cored, DC TIG)',
      'Auxiliary Power': '12,000 Watts Peak / 10,500 Watts Continuous Accu-Rated',
      'Engine': 'Kubota D1005 24.8 HP Liquid-Cooled Diesel with Auto-Speed',
      'Duty Cycle': '100% at 275A / 60% at 325A',
    },
    accessoriesIncluded: [
      '30m 50mm² copper electrode lead + 25m heavy earth clamp lead',
      'Auto-darkening welding helmet, chipping hammer & spark arrestor',
      'Road-towable 2-wheel trailer chassis with safety chains',
    ],
    deliveryOptions: {
      pickupAvailable: true,
      deliveryAvailable: true,
      flatDeliveryFee: 50000,
      operatorAvailable: true,
      operatorDailyRate: 45000,
    },
    images: [
      '/images/equipment/miller-diesel-welder.jpg',
    ],
    serialNumber: 'IND-MLR-325-MWZ',
    approvalStatus: 'approved',
    isAvailable: true,
    qrCodeId: 'QR-IND-MLR-006',
    totalRentals: 23,
    rating: 4.91,
    createdAt: '2026-02-13T09:45:00Z',
  },
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'book-2026-01',
    bookingCode: 'RT-2026-8812',
    assetId: 'asset-generator-50kva',
    assetTitle: '50kVA Silent Soundproof Diesel Generator (Cummins)',
    assetImage: '/src/assets/images/asset_diesel_generator_1792692516323.jpg',
    categoryId: 'cat-construction',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    renterId: 'user-renter-1',
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    startDate: '2026-10-25',
    endDate: '2026-10-28',
    rentalUnit: 'day',
    billableUnits: 3,
    priceBreakdown: {
      rentalRate: 220000,
      rentalUnit: 'day',
      billableUnits: 3,
      rentalSubtotal: 660000,
      operatorFee: 105000,
      estimatedTotal: 765000,
      isCompanyOwned: true,
    },
    status: 'confirmed',
    deliveryRequired: true,
    deliveryAddress: 'Plot 44, New Bagamoyo Rd, Masaki, Dar es Salaam',
    operatorRequired: true,
    notes: 'Power backup for corporate summit. Delivery required before 08:00 AM.',
    digitalContractSigned: true,
    signedAt: '2026-10-22T09:30:00Z',
    qrHandoverToken: 'RTZ-HANDOVER-8812',
    createdAt: '2026-10-22T08:15:00Z',
    updatedAt: '2026-10-22T09:30:00Z',
  },
  {
    id: 'book-2026-02',
    bookingCode: 'RT-2026-7241',
    assetId: 'asset-tractor-mf290',
    assetTitle: 'Massey Ferguson 290 Farm Tractor (82 HP) + Disc Plough',
    assetImage: '/src/assets/images/asset_farm_tractor_1792692517801.jpg',
    categoryId: 'cat-agriculture',
    ownershipType: 'third_party',
    ownerId: 'user-owner-1',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    renterId: 'user-renter-1',
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    startDate: '2026-10-18',
    endDate: '2026-10-23',
    rentalUnit: 'day',
    billableUnits: 5,
    priceBreakdown: {
      rentalRate: 180000,
      rentalUnit: 'day',
      billableUnits: 5,
      rentalSubtotal: 900000,
      operatorFee: 200000,
      estimatedTotal: 1100000,
      isCompanyOwned: false,
    },
    status: 'under_inspection',
    deliveryRequired: true,
    deliveryAddress: 'Kilimanjaro Green Acre Estate, Moshi Rural',
    operatorRequired: true,
    handoverInspectionId: 'insp-ho-02',
    notes: 'Primary maize field preparation completed on schedule. Tractor returned to Arusha depot for check.',
    digitalContractSigned: true,
    signedAt: '2026-10-17T16:00:00Z',
    qrHandoverToken: 'RTZ-HANDOVER-7241',
    createdAt: '2026-10-17T14:00:00Z',
    updatedAt: '2026-10-23T11:00:00Z',
  },
  {
    id: 'book-2026-03',
    bookingCode: 'RT-2026-9104',
    assetId: 'asset-pa-jbl-linearray',
    assetTitle: 'JBL VTX Line Array Concert PA System (12kW + 32ch Digital Mixer)',
    assetImage: '/images/equipment/jbl-line-array-pa.jpg',
    categoryId: 'cat-events',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    renterId: 'user-renter-1',
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    startDate: '2026-10-24',
    endDate: '2026-10-26',
    rentalUnit: 'day',
    billableUnits: 2,
    priceBreakdown: {
      rentalRate: 420000,
      rentalUnit: 'day',
      billableUnits: 2,
      rentalSubtotal: 840000,
      operatorFee: 120000,
      estimatedTotal: 960000,
      isCompanyOwned: true,
    },
    status: 'active',
    deliveryRequired: true,
    deliveryAddress: 'Julius Nyerere International Convention Centre (JNICC), Ilala, Dar es Salaam',
    operatorRequired: true,
    handoverInspectionId: 'insp-ho-03',
    notes: 'East Africa Fintech & Infrastructure Gala Dinner — FOH sound engineer on site.',
    digitalContractSigned: true,
    signedAt: '2026-10-23T18:20:00Z',
    qrHandoverToken: 'RTZ-HANDOVER-9104',
    createdAt: '2026-10-23T15:00:00Z',
    updatedAt: '2026-10-24T07:30:00Z',
  },
  {
    id: 'book-2026-04',
    bookingCode: 'RT-2026-6390',
    assetId: 'asset-truck-hino-hiab',
    assetTitle: 'Hino 500 Series 10-Ton Flatbed Truck with Palfinger 5T Hiab Crane',
    assetImage: '/images/equipment/hino-hiab-crane-truck.jpg',
    categoryId: 'cat-transport',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    renterId: 'user-renter-1',
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    startDate: '2026-10-25',
    endDate: '2026-10-27',
    rentalUnit: 'day',
    billableUnits: 2,
    priceBreakdown: {
      rentalRate: 450000,
      rentalUnit: 'day',
      billableUnits: 2,
      rentalSubtotal: 900000,
      operatorFee: 110000,
      estimatedTotal: 1010000,
      isCompanyOwned: true,
    },
    status: 'ready_for_collection',
    deliveryRequired: true,
    deliveryAddress: 'TANESCO Substation Site, Kibaha Industrial Park, Pwani',
    operatorRequired: true,
    notes: 'Lifting and transporting 2x 33kV step-down transformers from Kurasini Port yard to Kibaha.',
    digitalContractSigned: true,
    signedAt: '2026-10-24T14:10:00Z',
    qrHandoverToken: 'RTZ-HANDOVER-6390',
    createdAt: '2026-10-24T11:45:00Z',
    updatedAt: '2026-10-25T06:30:00Z',
  },
  {
    id: 'book-2026-05',
    bookingCode: 'RT-2026-5528',
    assetId: 'asset-drone-dji-inspire3',
    assetTitle: 'DJI Inspire 3 8K Cinema Drone + Zenmuse X9-8K Air Gimbal Kit',
    assetImage: '/images/equipment/dji-inspire3-cinema-drone.jpg',
    categoryId: 'cat-media',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    renterId: 'user-renter-1',
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    startDate: '2026-10-21',
    endDate: '2026-10-25',
    rentalUnit: 'day',
    billableUnits: 4,
    priceBreakdown: {
      rentalRate: 350000,
      rentalUnit: 'day',
      billableUnits: 4,
      rentalSubtotal: 1400000,
      operatorFee: 340000,
      estimatedTotal: 1740000,
      isCompanyOwned: true,
    },
    status: 'return_due',
    deliveryRequired: true,
    deliveryAddress: 'Ngorongoro Serena Safari Film Camp, Karatu, Arusha',
    operatorRequired: true,
    handoverInspectionId: 'insp-ho-05',
    notes: 'Tourism conservation aerial commercial shoot completed. Returning to Arusha Clock Tower depot today.',
    digitalContractSigned: true,
    signedAt: '2026-10-20T17:00:00Z',
    qrHandoverToken: 'RTZ-HANDOVER-5528',
    createdAt: '2026-10-20T12:00:00Z',
    updatedAt: '2026-10-25T07:00:00Z',
  },
  {
    id: 'book-2026-06',
    bookingCode: 'RT-2026-4190',
    assetId: 'asset-projector-epson-7000',
    assetTitle: 'Epson EB-PU1007W 7,000-Lumen WUXGA Laser Projector + 150" Fast-Fold Screen',
    assetImage: '/images/equipment/epson-laser-projector.jpg',
    categoryId: 'cat-office',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    renterId: 'user-renter-1',
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    startDate: '2026-10-24',
    endDate: '2026-10-26',
    rentalUnit: 'day',
    billableUnits: 2,
    priceBreakdown: {
      rentalRate: 180000,
      rentalUnit: 'day',
      billableUnits: 2,
      rentalSubtotal: 360000,
      operatorFee: 70000,
      estimatedTotal: 430000,
      isCompanyOwned: true,
    },
    status: 'active',
    deliveryRequired: true,
    deliveryAddress: 'Johari Rotana Ballroom, Sokoine Drive, Dar es Salaam',
    operatorRequired: true,
    handoverInspectionId: 'insp-ho-06',
    notes: 'Annual Shareholders Meeting projection setup.',
    digitalContractSigned: true,
    signedAt: '2026-10-23T19:00:00Z',
    qrHandoverToken: 'RTZ-HANDOVER-4190',
    createdAt: '2026-10-23T16:40:00Z',
    updatedAt: '2026-10-24T08:00:00Z',
  },
  {
    id: 'book-2026-07',
    bookingCode: 'RT-2026-3905',
    assetId: 'asset-washer-karcher-hd',
    assetTitle: 'Kärcher HD 9/20-4 Classic Commercial High-Pressure Washer (200 Bar)',
    assetImage: '/images/equipment/karcher-pressure-washer.jpg',
    categoryId: 'cat-home',
    ownershipType: 'third_party',
    ownerId: 'user-owner-2',
    ownerName: 'Hamisi Mrema (Mrema Plant & Tools)',
    ownerPhone: '+255 714 621 884',
    renterId: 'user-renter-1',
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    startDate: '2026-10-14',
    endDate: '2026-10-16',
    rentalUnit: 'day',
    billableUnits: 2,
    priceBreakdown: {
      rentalRate: 65000,
      rentalUnit: 'day',
      billableUnits: 2,
      rentalSubtotal: 130000,
      operatorFee: 0,
      estimatedTotal: 130000,
      isCompanyOwned: false,
    },
    status: 'completed',
    deliveryRequired: true,
    deliveryAddress: 'Mbezi Beach Tanki Bovu Villa Plot 118, Dar es Salaam',
    operatorRequired: false,
    handoverInspectionId: 'insp-ho-07',
    returnInspectionId: 'insp-ret-07',
    notes: 'Post-renovation paving & driveway deep wash completed. Returned clean.',
    digitalContractSigned: true,
    signedAt: '2026-10-13T17:30:00Z',
    qrHandoverToken: 'RTZ-HANDOVER-3905',
    createdAt: '2026-10-13T15:20:00Z',
    updatedAt: '2026-10-16T18:00:00Z',
  },
  {
    id: 'book-2026-08',
    bookingCode: 'RT-2026-7719',
    assetId: 'asset-art-decor-backdrop-01',
    assetTitle: 'Luxury Velvet Stage Backdrop, Floral Arch & Gallery Uplighting Kit',
    assetImage: '/images/equipment/velvet-stage-backdrop.jpg',
    categoryId: 'cat-art-decor',
    ownershipType: 'third_party',
    ownerId: 'user-owner-3',
    ownerName: 'Swahili Cine Arts Media',
    ownerPhone: '+255 713 552 901',
    renterId: 'user-renter-1',
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    startDate: '2026-10-26',
    endDate: '2026-10-28',
    rentalUnit: 'day',
    billableUnits: 2,
    priceBreakdown: {
      rentalRate: 145000,
      rentalUnit: 'day',
      billableUnits: 2,
      rentalSubtotal: 290000,
      operatorFee: 70000,
      estimatedTotal: 360000,
      isCompanyOwned: false,
    },
    status: 'confirmed',
    deliveryRequired: true,
    deliveryAddress: 'Serena Hotel Marquee Lawn, Ohio Street, Dar es Salaam',
    operatorRequired: true,
    notes: 'Corporate Award Night stage backdrop & warm gold uplighting setup.',
    digitalContractSigned: true,
    signedAt: '2026-10-24T20:15:00Z',
    qrHandoverToken: 'RTZ-HANDOVER-7719',
    createdAt: '2026-10-24T19:00:00Z',
    updatedAt: '2026-10-24T20:15:00Z',
  },
  {
    id: 'book-2026-09',
    bookingCode: 'RT-2026-8045',
    assetId: 'asset-survey-leica-ts16',
    assetTitle: 'Leica Viva TS16 1" Robotic Total Station + GNSS RTK Rover Surveying Kit',
    assetImage: '/images/equipment/leica-total-station.jpg',
    categoryId: 'cat-other',
    ownershipType: 'company',
    ownerId: 'user-admin-1',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    renterId: 'user-renter-1',
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    startDate: '2026-10-23',
    endDate: '2026-10-26',
    rentalUnit: 'day',
    billableUnits: 3,
    priceBreakdown: {
      rentalRate: 250000,
      rentalUnit: 'day',
      billableUnits: 3,
      rentalSubtotal: 750000,
      operatorFee: 195000,
      estimatedTotal: 945000,
      isCompanyOwned: true,
    },
    status: 'active',
    deliveryRequired: true,
    deliveryAddress: 'SGR Feeder Road Alignment Lot 3, Chamwino, Dodoma',
    operatorRequired: true,
    handoverInspectionId: 'insp-ho-09',
    notes: 'Topographic & culvert alignment survey for 12km feeder road.',
    digitalContractSigned: true,
    signedAt: '2026-10-22T18:00:00Z',
    qrHandoverToken: 'RTZ-HANDOVER-8045',
    createdAt: '2026-10-22T15:00:00Z',
    updatedAt: '2026-10-23T07:15:00Z',
  },
  {
    id: 'book-2026-10',
    bookingCode: 'RT-2026-9450',
    assetId: 'asset-concrete-mixer-500l',
    assetTitle: 'Heavy Duty 500L Diesel Concrete Mixer with Hydraulic Hopper',
    assetImage: '/images/equipment/concrete-mixer-500l.jpg',
    categoryId: 'cat-construction',
    ownershipType: 'third_party',
    ownerId: 'user-owner-2',
    ownerName: 'Hamisi Mrema (Mrema Plant & Tools)',
    ownerPhone: '+255 714 621 884',
    renterId: 'user-renter-1',
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    startDate: '2026-10-27',
    endDate: '2026-10-31',
    rentalUnit: 'day',
    billableUnits: 4,
    priceBreakdown: {
      rentalRate: 75000,
      rentalUnit: 'day',
      billableUnits: 4,
      rentalSubtotal: 300000,
      operatorFee: 120000,
      estimatedTotal: 420000,
      isCompanyOwned: false,
    },
    status: 'ready_for_collection',
    deliveryRequired: true,
    deliveryAddress: 'Njedengwa Commercial Complex Site, Block G, Dodoma',
    operatorRequired: true,
    notes: 'First-floor slab pour scheduled for Tuesday morning.',
    digitalContractSigned: true,
    signedAt: '2026-10-25T10:15:00Z',
    qrHandoverToken: 'RTZ-HANDOVER-9450',
    createdAt: '2026-10-25T09:40:00Z',
    updatedAt: '2026-10-25T10:15:00Z',
  },
];

const INITIAL_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'insp-ho-02',
    bookingId: 'book-2026-02',
    assetId: 'asset-tractor-mf290',
    type: 'handover',
    inspectedBy: 'Juma Bakari',
    inspectorRole: 'RENTZ Operations',
    timestamp: '2026-10-18T07:45:00Z',
    conditionRating: 'pristine',
    checklist: [
      { item: 'Engine oil level & coolant verified', verified: true },
      { item: 'Hydraulic 4-disc plough attached & torqued', verified: true },
      { item: 'Tire pressure & tread condition inspected', verified: true },
      { item: 'Safety beacons & electrical lights verified', verified: true },
      { item: 'Tanzania registration card & insurance copy handed over', verified: true },
    ],
    meterReading: '2,845.2 Operating Hours',
    fuelLevel: '100% Full Tank',
    inspectionNotes: 'Tractor and implements handed over in clean condition at Arusha yard. Certified operator assigned.',
    photoUrls: ['/src/assets/images/asset_farm_tractor_1792692517801.jpg'],
    signatureName: 'Safari Goodluck (Renter) & Juma Bakari (Inspector)',
  },
  {
    id: 'insp-ho-03',
    bookingId: 'book-2026-03',
    assetId: 'asset-pa-jbl-linearray',
    type: 'handover',
    inspectedBy: 'Juma Bakari',
    inspectorRole: 'RENTZ Operations',
    timestamp: '2026-10-24T07:20:00Z',
    conditionRating: 'pristine',
    checklist: [
      { item: 'All 8 JBL VTX line array tops & 4 dual-18 subs frequency sweep tested', verified: true },
      { item: 'Soundcraft Si Impact 32ch digital console & Cat6 stagebox verified', verified: true },
      { item: '4x Shure UHF wireless mics & antenna distro checked', verified: true },
      { item: 'Flight cases, rigging pins & Genie crank towers secured', verified: true },
    ],
    meterReading: '100% Piece Count Verified (22 Flight Cases)',
    fuelLevel: 'AC Mains / Cable Powered (Tested OK)',
    inspectionNotes: 'Dispatched to JNICC Main Hall with FOH audio engineer.',
    photoUrls: ['/images/equipment/jbl-line-array-pa.jpg'],
    signatureName: 'Safari Goodluck & Juma Bakari',
  },
  {
    id: 'insp-ho-05',
    bookingId: 'book-2026-05',
    assetId: 'asset-drone-dji-inspire3',
    type: 'handover',
    inspectedBy: 'Juma Bakari',
    inspectorRole: 'RENTZ Operations',
    timestamp: '2026-10-21T06:40:00Z',
    conditionRating: 'pristine',
    checklist: [
      { item: 'Zenmuse X9-8K sensor clean, 0 dead pixels & gimbal calibrated', verified: true },
      { item: 'DL 24mm, 35mm & 50mm lens elements spotless in Pelican case', verified: true },
      { item: 'All 6x TB51 intelligent battery pairs charged to 100% (12 Cycles)', verified: true },
      { item: 'Dual DJI RC Plus monitors & 3x 1TB PROSSD drives verified', verified: true },
    ],
    meterReading: '0 Dead Pixels / 18.4 Flight Hrs',
    fuelLevel: '100% Full Tank / Charged',
    inspectionNotes: 'Handed over at Arusha Clock Tower depot with TCAA permit logbook.',
    photoUrls: ['/images/equipment/dji-inspire3-cinema-drone.jpg'],
    signatureName: 'Safari Goodluck & Juma Bakari',
  },
  {
    id: 'insp-ho-06',
    bookingId: 'book-2026-06',
    assetId: 'asset-projector-epson-7000',
    type: 'handover',
    inspectedBy: 'Juma Bakari',
    inspectorRole: 'RENTZ Operations',
    timestamp: '2026-10-24T07:55:00Z',
    conditionRating: 'pristine',
    checklist: [
      { item: 'Epson 7,000-Lumen laser optics & motorized lens shift verified', verified: true },
      { item: '150-inch Fast-Fold aluminum frame & front/rear fabrics spotless', verified: true },
      { item: '20m fiber HDMI 2.1 loom, SDI converter & presenter remote included', verified: true },
    ],
    meterReading: '412 Laser Hrs / Diagnostics OK',
    fuelLevel: 'AC Mains / Cable Powered (Tested OK)',
    inspectionNotes: 'Installed and keystoned at Johari Rotana Ballroom.',
    photoUrls: ['/images/equipment/epson-laser-projector.jpg'],
    signatureName: 'Safari Goodluck & Juma Bakari',
  },
  {
    id: 'insp-ho-07',
    bookingId: 'book-2026-07',
    assetId: 'asset-washer-karcher-hd',
    type: 'handover',
    inspectedBy: 'Juma Bakari',
    inspectorRole: 'RENTZ Operations',
    timestamp: '2026-10-14T08:15:00Z',
    conditionRating: 'pristine',
    checklist: [
      { item: '200 Bar pump pressure gauge test & unloader valve verified', verified: true },
      { item: '15m steel-braided hose, trigger gun & rotary surface cleaner included', verified: true },
      { item: 'RCD electrical safety plug & brass water inlet filter checked', verified: true },
    ],
    meterReading: 'Tested 200 Bar Operational',
    fuelLevel: 'AC Mains / Cable Powered (Tested OK)',
    inspectionNotes: 'Dispatched from Mwenge depot to Mbezi Beach site.',
    photoUrls: ['/images/equipment/karcher-pressure-washer.jpg'],
    signatureName: 'Safari Goodluck & Juma Bakari',
  },
  {
    id: 'insp-ret-07',
    bookingId: 'book-2026-07',
    assetId: 'asset-washer-karcher-hd',
    type: 'return',
    inspectedBy: 'Juma Bakari',
    inspectorRole: 'RENTZ Operations',
    timestamp: '2026-10-16T17:40:00Z',
    conditionRating: 'pristine',
    checklist: [
      { item: 'No new structural damage, cracks, tears, or surface defects', verified: true },
      { item: 'Post-hire functional test passed (200 Bar pressure steady)', verified: true },
      { item: 'Full kit & piece count reconciled against dispatch manifest', verified: true },
      { item: 'Cleaned, decontaminated & cleared for depot storage', verified: true },
    ],
    meterReading: 'Tested 200 Bar Operational',
    fuelLevel: 'AC Mains / Cable Powered (Tested OK)',
    damageCostEstimate: 0,
    inspectionNotes: '[Universal Return • Category: Home & Personal Work • Returned Qty: 1 Tool + Hose/Attachment Kit • Timing: ON TIME • Cleanliness: CLEAN READY • Missing/Consumables: None] Returned in spotless condition.',
    photoUrls: ['/images/equipment/karcher-pressure-washer.jpg'],
    signatureName: 'Safari Goodluck & Juma Bakari',
  },
  {
    id: 'insp-ho-09',
    bookingId: 'book-2026-09',
    assetId: 'asset-survey-leica-ts16',
    type: 'handover',
    inspectedBy: 'Juma Bakari',
    inspectorRole: 'RENTZ Operations',
    timestamp: '2026-10-23T07:10:00Z',
    conditionRating: 'pristine',
    checklist: [
      { item: '1" angular collimation & laser plummet calibration verified', verified: true },
      { item: 'CS20 field controller, 360° prism & wooden tripod intact', verified: true },
      { item: '4x GEB222 Li-Ion batteries charged 100% + hard transit case sealed', verified: true },
    ],
    meterReading: 'Calibrated & Verified (ISO 17123-3)',
    fuelLevel: '100% Full Tank / Charged',
    inspectionNotes: 'Handed over at Dodoma engineering hub for SGR feeder road survey.',
    photoUrls: ['/images/equipment/leica-total-station.jpg'],
    signatureName: 'Safari Goodluck & Juma Bakari',
  },
];

const INITIAL_CONFIG: PlatformConfig = {
  supportedRegions: [
    'Dar es Salaam',
    'Arusha',
    'Mwanza',
    'Dodoma',
    'Zanzibar',
    'Mbeya',
    'Morogoro',
    'Tanga',
    'Moshi',
  ],
};

const INITIAL_LOGISTICS_JOBS: LogisticsDispatchJob[] = [
  {
    id: 'logjob-2026-01',
    bookingId: 'book-2026-01',
    bookingCode: 'RT-2026-8812',
    assetId: 'asset-generator-50kva',
    assetTitle: '50kVA Silent Soundproof Diesel Generator (Cummins)',
    assetImage: '/src/assets/images/asset_diesel_generator_1792692516323.jpg',
    weightKg: 1150,
    vehicleClass: '3-Ton Canter / Tow Trailer (400–1,500 kg)',
    originAddress: 'Mikocheni B, Kinondoni, Dar es Salaam',
    originCoords: { lat: -6.7584, lng: 39.2458 },
    destinationAddress: 'Plot 44, New Bagamoyo Rd, Masaki, Dar es Salaam',
    distanceKm: 6.4,
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    driverName: 'Selemani Mwakasege',
    driverPhone: '+255 715 902 331',
    vehiclePlate: 'T 448 DKR (Mitsubishi Canter)',
    status: 'in_transit_to_site',
    updatedAt: '2026-10-25T08:15:00Z',
    createdAt: '2026-10-22T09:35:00Z',
  },
  {
    id: 'logjob-2026-02',
    bookingId: 'book-2026-02',
    bookingCode: 'RT-2026-7241',
    assetId: 'asset-tractor-mf290',
    assetTitle: 'Massey Ferguson 290 Farm Tractor (82 HP) + Disc Plough',
    assetImage: '/src/assets/images/asset_farm_tractor_1792692517801.jpg',
    weightKg: 3150,
    vehicleClass: '7-Ton Fuso / Tilt Flatbed (1.5–4 Tons)',
    originAddress: 'Njiro, Arusha Urban, Arusha',
    originCoords: { lat: -3.3869, lng: 36.683 },
    destinationAddress: 'Kilimanjaro Green Acre Estate, Moshi Rural',
    distanceKm: 68.0,
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    ownerName: 'Simba Agro & Plant Services Ltd',
    ownerPhone: '+255 768 445 678',
    driverName: 'Ezekiel Kimaro',
    driverPhone: '+255 752 601 889',
    vehiclePlate: 'T 812 EAA (Fuso Tilt Flatbed)',
    status: 'returned_to_yard',
    recipientSignature: 'Safari Goodluck & Juma Bakari',
    updatedAt: '2026-10-23T11:00:00Z',
    createdAt: '2026-10-17T16:10:00Z',
  },
  {
    id: 'logjob-2026-03',
    bookingId: 'book-2026-03',
    bookingCode: 'RT-2026-9104',
    assetId: 'asset-pa-jbl-linearray',
    assetTitle: 'JBL VTX Line Array Concert PA System (12kW + 32ch Digital Mixer)',
    assetImage: '/images/equipment/jbl-line-array-pa.jpg',
    weightKg: 620,
    vehicleClass: '3-Ton Canter / Tow Trailer (400–1,500 kg)',
    originAddress: 'Mikocheni B, Kinondoni, Dar es Salaam',
    originCoords: { lat: -6.7584, lng: 39.2458 },
    destinationAddress: 'JNICC Main Hall, Shaaban Robert St, Ilala, Dar es Salaam',
    distanceKm: 9.8,
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    driverName: 'Omary Kipingu',
    driverPhone: '+255 718 440 219',
    vehiclePlate: 'T 609 Dsm (Fuso Box Tail-Lift)',
    status: 'delivered_on_site',
    recipientSignature: 'Safari Goodluck (JNICC Stage Manager)',
    updatedAt: '2026-10-24T07:30:00Z',
    createdAt: '2026-10-23T18:25:00Z',
  },
  {
    id: 'logjob-2026-04',
    bookingId: 'book-2026-04',
    bookingCode: 'RT-2026-6390',
    assetId: 'asset-truck-hino-hiab',
    assetTitle: 'Hino 500 Series 10-Ton Flatbed Truck with Palfinger 5T Hiab Crane',
    assetImage: '/images/equipment/hino-hiab-crane-truck.jpg',
    weightKg: 9400,
    vehicleClass: '20T Lowbed Trailer / Heavy Haulage (>4 Tons)',
    originAddress: 'Kurasini Port Corridor, Temeke, Dar es Salaam',
    originCoords: { lat: -6.8452, lng: 39.2869 },
    destinationAddress: 'TANESCO Substation Site, Kibaha Industrial Park, Pwani',
    distanceKm: 38.5,
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    driverName: 'Abdallah Mtulia',
    driverPhone: '+255 755 819 004',
    vehiclePlate: 'T 901 EBC (Hino 500 Hiab Crane)',
    status: 'assigned',
    updatedAt: '2026-10-25T06:45:00Z',
    createdAt: '2026-10-24T14:15:00Z',
  },
  {
    id: 'logjob-2026-05',
    bookingId: 'book-2026-05',
    bookingCode: 'RT-2026-5528',
    assetId: 'asset-drone-dji-inspire3',
    assetTitle: 'DJI Inspire 3 8K Cinema Drone + Zenmuse X9-8K Air Gimbal Kit',
    assetImage: '/images/equipment/dji-inspire3-cinema-drone.jpg',
    weightKg: 28,
    vehicleClass: 'Boda / Three-Wheeler Bajaj (<60 kg)',
    originAddress: 'Uzunguni Clock Tower Depot, Arusha Urban',
    originCoords: { lat: -3.3731, lng: 36.6944 },
    destinationAddress: 'Ngorongoro Serena Film Base, Karatu, Arusha',
    distanceKm: 138.0,
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    driverName: 'Godfrey Mollel',
    driverPhone: '+255 764 119 832',
    vehiclePlate: 'T 229 DZZ (Toyota Hilux 4x4 Escort)',
    status: 'in_transit_return',
    updatedAt: '2026-10-25T09:10:00Z',
    createdAt: '2026-10-20T17:10:00Z',
  },
  {
    id: 'logjob-2026-06',
    bookingId: 'book-2026-08',
    bookingCode: 'RT-2026-7719',
    assetId: 'asset-art-decor-backdrop-01',
    assetTitle: 'Luxury Velvet Stage Backdrop, Floral Arch & Gallery Uplighting Kit',
    assetImage: '/images/equipment/velvet-stage-backdrop.jpg',
    weightKg: 55,
    vehicleClass: 'Pickup / TownAce Van (60–400 kg)',
    originAddress: 'Oysterbay Coco Beach Center, Kinondoni, Dar es Salaam',
    originCoords: { lat: -6.7725, lng: 39.2789 },
    destinationAddress: 'Serena Hotel Marquee Lawn, Ohio Street, Dar es Salaam',
    distanceKm: 7.2,
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    ownerName: 'Swahili Cine Arts Media',
    ownerPhone: '+255 713 552 901',
    status: 'pending_assignment',
    updatedAt: '2026-10-25T08:00:00Z',
    createdAt: '2026-10-24T20:20:00Z',
  },
  {
    id: 'logjob-2026-07',
    bookingId: 'book-2026-09',
    bookingCode: 'RT-2026-8045',
    assetId: 'asset-survey-leica-ts16',
    assetTitle: 'Leica Viva TS16 1" Robotic Total Station + GNSS RTK Rover Surveying Kit',
    assetImage: '/images/equipment/leica-total-station.jpg',
    weightKg: 18,
    vehicleClass: 'Boda / Three-Wheeler Bajaj (<60 kg)',
    originAddress: 'Kilimani Engineering Hub, Dodoma Urban',
    originCoords: { lat: -6.1822, lng: 35.7568 },
    destinationAddress: 'SGR Feeder Road Alignment Lot 3, Chamwino, Dodoma',
    distanceKm: 28.4,
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    ownerName: 'RENTZ Fleet Depot',
    ownerPhone: '255793481147 / 255743801992',
    driverName: 'Baraka Mazengo',
    driverPhone: '+255 712 883 410',
    vehiclePlate: 'MC 741 DDM (TVS King Deluxe Bajaj)',
    status: 'delivered_on_site',
    recipientSignature: 'Safari Goodluck (Lead Surveyor)',
    updatedAt: '2026-10-23T08:30:00Z',
    createdAt: '2026-10-22T18:10:00Z',
  },
  {
    id: 'logjob-2026-08',
    bookingId: 'book-2026-10',
    bookingCode: 'RT-2026-9450',
    assetId: 'asset-concrete-mixer-500l',
    assetTitle: 'Heavy Duty 500L Diesel Concrete Mixer with Hydraulic Hopper',
    assetImage: '/images/equipment/concrete-mixer-500l.jpg',
    weightKg: 450,
    vehicleClass: '3-Ton Canter / Tow Trailer (400–1,500 kg)',
    originAddress: 'Tambukareli Industrial Yard, Dodoma Urban',
    originCoords: { lat: -6.1731, lng: 35.742 },
    destinationAddress: 'Njedengwa Commercial Complex Site, Block G, Dodoma',
    distanceKm: 5.6,
    renterName: 'Safari Goodluck',
    renterPhone: '255793481147',
    ownerName: 'Hamisi Mrema (Mrema Plant & Tools)',
    ownerPhone: '+255 714 621 884',
    status: 'pending_assignment',
    updatedAt: '2026-10-25T10:20:00Z',
    createdAt: '2026-10-25T10:18:00Z',
  },
];

const INITIAL_SUPPORT_MESSAGES: SupportMessage[] = [
  {
    id: 'msg-101',
    bookingCode: 'RT-2026-8812',
    senderId: 'user-ops-1',
    senderName: 'Juma Bakari (Field Ops)',
    senderRole: 'operations',
    senderPhone: '+255 655 330 440',
    message: 'Habari Safari! The 50kVA Cummins Generator has passed pre-dispatch load testing at Mikocheni yard and is loaded onto Canter T 448 DKR.',
    channel: 'in_app',
    timestamp: '2026-10-25T07:50:00Z',
  },
  {
    id: 'msg-102',
    bookingCode: 'RT-2026-8812',
    senderId: 'user-renter-1',
    senderName: 'Safari Goodluck',
    senderRole: 'renter',
    senderPhone: '255793481147',
    message: 'Asante sana! Our site electrician is ready at Plot 44 Masaki gate to receive the unit and sign the QR handover pass.',
    channel: 'in_app',
    timestamp: '2026-10-25T08:02:00Z',
  },
  {
    id: 'msg-103',
    bookingCode: 'RT-2026-9104',
    senderId: 'user-ops-1',
    senderName: 'Juma Bakari (Field Ops)',
    senderRole: 'operations',
    senderPhone: '+255 655 330 440',
    message: 'JBL VTX 12kW Line Array PA and 32ch Soundcraft console are rigged and sound-checked at JNICC Main Hall.',
    channel: 'whatsapp_handoff',
    timestamp: '2026-10-24T08:15:00Z',
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-101',
    action: 'PLATFORM_INIT',
    userId: 'user-admin-1',
    userEmail: 'admin@renttanzania.co.tz',
    userRole: 'admin',
    details: 'RENTZ catalog initialized with 24 equipment items across all 9 categories',
    timestamp: '2026-10-22T06:00:00Z',
  },
  {
    id: 'log-103',
    action: 'QR_HANDOVER_COMPLETED',
    userId: 'user-ops-1',
    userEmail: 'ops@renttanzania.co.tz',
    userRole: 'operations',
    details: 'Outward dispatch inspection insp-ho-03 logged for JBL VTX Line Array PA (RT-2026-9104)',
    timestamp: '2026-10-24T07:20:00Z',
  },
];

const LEGACY_PAYMENT_BOOKING_FIELDS = [
  'paymentStatus',
  'paymentReference',
  'paymentMethod',
  'escrowStatus',
  'ownerPayoutSettledAt',
  'ownerPayoutReference',
  'depositRefundedAmount',
  'traEfdReceiptNumber',
  'traVerificationCode',
  'insuranceTier',
  'totalDue',
];

// RENTZ no longer handles payments: drop payment state from bookings saved by older versions
function stripLegacyPaymentFields(booking: Booking): Booking {
  const cleaned: Record<string, any> = { ...booking };
  LEGACY_PAYMENT_BOOKING_FIELDS.forEach((key) => delete cleaned[key]);
  const pb: Record<string, any> = booking.priceBreakdown || {};
  cleaned.priceBreakdown = {
    rentalRate: pb.rentalRate || 0,
    rentalUnit: pb.rentalUnit || booking.rentalUnit || 'day',
    billableUnits: pb.billableUnits || booking.billableUnits || 1,
    rentalSubtotal: pb.rentalSubtotal || 0,
    equipmentWeightKg: pb.equipmentWeightKg,
    deliveryDistanceKm: pb.deliveryDistanceKm,
    operatorFee: pb.operatorFee || 0,
    estimatedTotal: pb.estimatedTotal ?? (pb.rentalSubtotal || 0) + (pb.operatorFee || 0),
    isCompanyOwned: !!pb.isCompanyOwned,
  };
  if (cleaned.status === 'awaiting_payment') cleaned.status = 'requested';
  if (cleaned.extensionRequest) {
    cleaned.extensionRequest = { ...cleaned.extensionRequest };
    delete cleaned.extensionRequest.additionalTaxAmount;
    delete cleaned.extensionRequest.additionalTotalDue;
  }
  return cleaned as Booking;
}

// All data is held in memory and written through to Firestore. This assumes ONE server
// instance (Cloud Run: max instances = 1); several instances would each hold their own copy.
class Database {
  private data!: DatabaseSchema;
  private ready = false;
  // What Firestore holds: collection -> document id -> serialised document
  private persisted = new Map<string, Map<string, string>>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushChain: Promise<void> = Promise.resolve();

  // Loads everything from Firestore before the server accepts requests.
  // Returns where the data came from.
  async init(): Promise<string> {
    const stored = await loadCollections(STORED_COLLECTIONS);
    let parsed: any = null;
    let source: string;
    if (stored) {
      parsed = { ...stored, config: stored[CONFIG_COLLECTION]?.[0] };
      for (const name of STORED_COLLECTIONS) {
        this.persisted.set(name, this.serialise(name, stored[name] as any[]));
      }
      source = 'Firestore';
    } else if (fs.existsSync(LEGACY_DB_FILE)) {
      parsed = JSON.parse(fs.readFileSync(LEGACY_DB_FILE, 'utf-8'));
      source = `one-time import of ${LEGACY_DB_FILE}`;
    } else {
      source = 'seed data';
    }
    this.data = parsed ? this.hydrate(parsed, !stored) : this.initialData();
    this.ready = true;
    await this.flush(!stored);
    return source;
  }

  private hydrate(parsed: any, reseed: boolean): DatabaseSchema {
    // Ensure users have savedSearches, ownerTier, updated contact info, and automatic Admin/Ops access for safarigoodluck35@gmail.com and giftj964@gmail.com
    const ADMIN_OPS_EMAILS = ['safarigoodluck35@gmail.com', 'giftj964@gmail.com'];
    let loadedUsers = (parsed.users || INITIAL_USERS).map((u: User) => {
      const init = INITIAL_USERS.find((iu) => iu.id === u.id);
      const resolvedEmail =
        u.id === 'user-renter-1' || u.id === 'user-admin-1'
          ? 'safarigoodluck35@gmail.com'
          : u.id === 'user-ops-1'
          ? 'giftj964@gmail.com'
          : u.email;
      const isAutoAdminOps = ADMIN_OPS_EMAILS.includes((resolvedEmail || '').trim().toLowerCase());
      const ownerTier = u.role === 'owner'
        ? (u.ownerTier || (u.verificationStatus === 'verified' ? 'verified' : 'ordinary'))
        : undefined;
      const verificationCode = u.verificationCode || init?.verificationCode;
      return {
        ...u,
        accountType: u.accountType || (u.role === 'owner' || u.ownerTier ? 'seller' : 'buyer'),
        uid: u.uid || u.id,
        name: u.id === 'user-ops-1' ? 'Gift J. (Admin & Field Ops Lead)' : u.id === 'user-admin-1' ? 'Safari Goodluck (Admin & Ops Director)' : u.name,
        email: resolvedEmail,
        phone: u.id === 'user-renter-1' ? '255793481147' : u.id === 'user-admin-1' ? '255793481147 / 255743801992' : u.id === 'user-ops-1' ? '255743801992' : u.phone,
        hasAdminOpsAccess: isAutoAdminOps || u.role === 'admin' || u.role === 'operations',
        allowedRoles: isAutoAdminOps
          ? ['admin', 'operations', 'owner', 'renter']
          : u.allowedRoles || [u.role],
        verificationStatus: isAutoAdminOps ? 'verified' : u.verificationStatus,
        ownerTier,
        verificationCode,
        savedSearches: u.savedSearches && u.savedSearches.length > 0 ? u.savedSearches : init?.savedSearches || [],
      };
    });

    if (reseed) INITIAL_USERS.forEach((initUser) => {
      if (!loadedUsers.some((u: User) => u.id === initUser.id)) {
        loadedUsers.push(initUser);
      }
    });

    // Ensure assets have ownerTier, weightKg, Rule of Thumb pricing, updated images, and merge any new INITIAL_ASSETS
    const loadedAssets: Asset[] = (parsed.assets || INITIAL_ASSETS).map((a: Asset) => {
      const owner = loadedUsers.find((u: User) => u.id === a.ownerId);
      const init = INITIAL_ASSETS.find((ia) => ia.id === a.id);
      const tier = a.ownerTier || (owner?.ownerTier ? owner.ownerTier : a.isVerifiedOwner ? 'verified' : 'ordinary');
      const weightKg = a.weightKg ?? init?.weightKg ?? 25;
      const isHeavy = ['cat-construction', 'cat-agriculture', 'cat-transport'].includes(a.categoryId) || weightKg >= 300;
      const dailyHirePercentage =
        a.pricing?.dailyHirePercentage ??
        init?.pricing?.dailyHirePercentage ??
        (isHeavy ? 2.5 : 4.0);
      const purchaseValue =
        a.pricing?.purchaseValue ??
        init?.pricing?.purchaseValue ??
        Math.round((a.pricing?.ratePerDay || 100000) / (dailyHirePercentage / 100));
      const ratePerDay = a.pricing?.ratePerDay || Math.round(purchaseValue * (dailyHirePercentage / 100));

      return {
        ...a,
        images: a.images && a.images.length > 0 ? a.images : init?.images || [],
        ownerTier: tier,
        isVerifiedOwner: tier === 'verified',
        weightKg,
        // Earlier versions invented these for every listing; keep only a real tracker link
        gpsProvider: FABRICATED_GPS_PROVIDERS.includes(a.gpsProvider || '') ? undefined : a.gpsProvider,
        gpsTrackerUrl: a.gpsTrackerUrl?.startsWith('https://www.google.com/maps/search/') ? undefined : a.gpsTrackerUrl,
        telemetryStatus: undefined,
        pricing: {
          // Drop the security deposit saved by older versions; RENTZ holds no money
          ...Object.fromEntries(Object.entries(a.pricing || {}).filter(([key]) => key !== 'depositAmount')),
          purchaseValue,
          dailyHirePercentage,
          ratePerDay,
        },
      };
    });
    if (reseed) INITIAL_ASSETS.forEach((initAsset) => {
      if (!loadedAssets.some((a) => a.id === initAsset.id)) {
        loadedAssets.push(initAsset);
      }
    });

    // Ensure categories have nameFrench from INITIAL_CATEGORIES and merge any new INITIAL_CATEGORIES
    const loadedCategories: Category[] = (parsed.categories || INITIAL_CATEGORIES).map((c: Category) => {
      const init = INITIAL_CATEGORIES.find((ic) => ic.id === c.id);
      return {
        ...c,
        nameFrench: c.nameFrench || init?.nameFrench,
      };
    });
    if (reseed) INITIAL_CATEGORIES.forEach((initCat) => {
      if (!loadedCategories.some((c) => c.id === initCat.id)) {
        loadedCategories.push(initCat);
      }
    });
    loadedCategories.sort((a, b) => a.displayOrder - b.displayOrder);

    const loadedBookings: Booking[] = (parsed.bookings || INITIAL_BOOKINGS).map((b: Booking) => {
      const initB = INITIAL_BOOKINGS.find((ib) => ib.id === b.id);
      return {
        ...b,
        customerId: b.customerId || b.renterId,
        assetImage: initB?.assetImage || b.assetImage,
      };
    }).map(stripLegacyPaymentFields);
    if (reseed) INITIAL_BOOKINGS.forEach((initBooking) => {
      if (!loadedBookings.some((b) => b.id === initBooking.id)) {
        loadedBookings.push({
          ...initBooking,
          customerId: initBooking.customerId || initBooking.renterId,
        });
      }
    });

    const loadedInspections: InspectionRecord[] = (parsed.inspections || [...INITIAL_INSPECTIONS]).map((insp: InspectionRecord) => {
      const initI = INITIAL_INSPECTIONS.find((ii) => ii.id === insp.id);
      return {
        ...insp,
        photoUrls: initI?.photoUrls || insp.photoUrls,
      };
    });
    if (reseed) INITIAL_INSPECTIONS.forEach((initInsp) => {
      if (!loadedInspections.some((i) => i.id === initInsp.id)) {
        loadedInspections.push(initInsp);
      }
    });

    const loadedLogisticsJobs: LogisticsDispatchJob[] = (
      parsed.logisticsJobs && parsed.logisticsJobs.length > 0 ? parsed.logisticsJobs : [...INITIAL_LOGISTICS_JOBS]
    ).map((job: LogisticsDispatchJob) => {
      const initJ = INITIAL_LOGISTICS_JOBS.find((ij) => ij.id === job.id);
      const status = (LEGACY_JOB_STATUSES[job.status as string] || job.status) as LogisticsJobStatus;
      // Earlier versions assigned one of two invented drivers to every new delivery
      const hasInventedDriver = INVENTED_DRIVER_NAMES.includes(job.driverName || '');
      return {
        ...job,
        status: hasInventedDriver && status === 'assigned' ? 'pending_assignment' : status,
        ...(hasInventedDriver ? { driverName: undefined, driverPhone: undefined, vehiclePlate: undefined } : {}),
        assetImage: initJ?.assetImage || job.assetImage,
      };
    });
    if (reseed) INITIAL_LOGISTICS_JOBS.forEach((initJob) => {
      if (!loadedLogisticsJobs.some((j) => j.id === initJob.id)) {
        loadedLogisticsJobs.push(initJob);
      }
    });

    const loadedSupportMessages: SupportMessage[] =
      parsed.supportMessages && parsed.supportMessages.length > 0 ? parsed.supportMessages : [...INITIAL_SUPPORT_MESSAGES];
    if (reseed) INITIAL_SUPPORT_MESSAGES.forEach((initMsg) => {
      if (!loadedSupportMessages.some((m) => m.id === initMsg.id)) {
        loadedSupportMessages.push(initMsg);
      }
    });

    const loadedAuditLogs: AuditLog[] = parsed.auditLogs || [...INITIAL_AUDIT_LOGS];
    if (reseed) INITIAL_AUDIT_LOGS.forEach((initLog) => {
      if (!loadedAuditLogs.some((l) => l.id === initLog.id)) {
        loadedAuditLogs.push(initLog);
      }
    });

    const hydrated: DatabaseSchema = {
      users: loadedUsers,
      categories: loadedCategories,
      assets: loadedAssets,
      bookings: loadedBookings,
      inspections: loadedInspections,
      disputes: parsed.disputes || [],
      logisticsJobs: loadedLogisticsJobs,
      supportMessages: loadedSupportMessages,
      auditLogs: loadedAuditLogs,
      config: {
        supportedRegions: parsed.config?.supportedRegions || INITIAL_CONFIG.supportedRegions,
      },
      credentials: parsed.credentials || [],
      sessions: (parsed.sessions || []).filter((s: AuthSession) => new Date(s.expiresAt).getTime() > Date.now()),
    };
    return hydrated;
  }

  private initialData(): DatabaseSchema {
    return {
      users: INITIAL_USERS,
      categories: INITIAL_CATEGORIES,
      assets: INITIAL_ASSETS,
      bookings: INITIAL_BOOKINGS.map((b) => ({ ...b, customerId: b.customerId || b.renterId })),
      inspections: INITIAL_INSPECTIONS,
      disputes: [],
      logisticsJobs: INITIAL_LOGISTICS_JOBS,
      supportMessages: INITIAL_SUPPORT_MESSAGES,
      auditLogs: INITIAL_AUDIT_LOGS,
      config: INITIAL_CONFIG,
      credentials: [],
      sessions: [],
    };
  }

  private currentDocs(name: string): any[] {
    return name === CONFIG_COLLECTION ? [this.data.config] : this.data[name as CollectionName];
  }

  private serialise(name: string, docs: any[]): Map<string, string> {
    const key = name === CONFIG_COLLECTION ? null : COLLECTION_KEYS[name as CollectionName];
    return new Map((docs || []).map((doc) => [key ? String(doc[key]) : CONFIG_DOC_ID, JSON.stringify(doc)]));
  }

  // Every mutation calls save(); changes are written to Firestore shortly after, in order
  private save() {
    if (!this.ready) return;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 25);
  }

  // Writes only the documents that changed since the last successful flush.
  // A failed write is retried with the next change (or the next flush).
  flush(markInitialised = false): Promise<void> {
    this.flushChain = this.flushChain
      .then(() => this.writeDiff(markInitialised))
      .catch((err) => console.error('Failed to write changes to Firestore:', err));
    return this.flushChain;
  }

  private async writeDiff(markInitialised: boolean): Promise<void> {
    const changes: CollectionChanges[] = [];
    const next = new Map<string, Map<string, string>>();
    for (const name of STORED_COLLECTIONS) {
      const current = this.serialise(name, this.currentDocs(name));
      const previous = this.persisted.get(name) || new Map<string, string>();
      const upserts: [string, unknown][] = [...current]
        .filter(([id, json]) => previous.get(id) !== json)
        .map(([id, json]) => [id, JSON.parse(json)]);
      const deletes = [...previous.keys()].filter((id) => !current.has(id));
      if (upserts.length || deletes.length) changes.push({ name, upserts, deletes });
      next.set(name, current);
    }
    if (!changes.length && !markInitialised) return;
    await writeChanges(changes, markInitialised);
    this.persisted = next;
  }

  // Users
  getUsers(): User[] {
    return this.data.users;
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.save();
    return this.data.users[idx];
  }

  // Credentials
  getCredential(userId: string): UserCredential | undefined {
    return this.data.credentials.find((c) => c.userId === userId);
  }

  setPassword(userId: string, passwordHash: string): void {
    const updatedAt = new Date().toISOString();
    const existing = this.getCredential(userId);
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.updatedAt = updatedAt;
    } else {
      this.data.credentials.push({ userId, passwordHash, updatedAt });
    }
    this.save();
  }

  removePassword(userId: string): boolean {
    const before = this.data.credentials.length;
    this.data.credentials = this.data.credentials.filter((c) => c.userId !== userId);
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    this.save();
    return this.data.credentials.length < before;
  }

  // Sessions
  createSession(session: AuthSession): void {
    this.data.sessions.push(session);
    this.save();
  }

  getSession(tokenHash: string): AuthSession | undefined {
    return this.data.sessions.find((s) => s.tokenHash === tokenHash);
  }

  deleteSession(tokenHash: string): void {
    this.data.sessions = this.data.sessions.filter((s) => s.tokenHash !== tokenHash);
    this.save();
  }

  // Saved Searches
  getSavedSearches(userId: string): SavedSearch[] {
    const user = this.getUserById(userId);
    return user?.savedSearches || [];
  }

  addSavedSearch(userId: string, search: Omit<SavedSearch, 'id' | 'createdAt'>): SavedSearch {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');
    const newSearch: SavedSearch = {
      ...search,
      id: `saved-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    user.savedSearches = user.savedSearches || [];
    user.savedSearches.unshift(newSearch);
    this.save();
    return newSearch;
  }

  deleteSavedSearch(userId: string, searchId: string): boolean {
    const user = this.getUserById(userId);
    if (!user || !user.savedSearches) return false;
    const initialLen = user.savedSearches.length;
    user.savedSearches = user.savedSearches.filter((s) => s.id !== searchId);
    this.save();
    return user.savedSearches.length < initialLen;
  }

  // Categories
  getCategories(): Category[] {
    const counts = this.data.assets.reduce((acc, curr) => {
      acc[curr.categoryId] = (acc[curr.categoryId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return this.data.categories.map((c) => ({
      ...c,
      assetCount: counts[c.id] || 0,
    }));
  }

  createCategory(category: Category): Category {
    this.data.categories.push(category);
    this.save();
    return category;
  }

  updateCategory(id: string, updates: Partial<Category>): Category | undefined {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.data.categories[idx] = { ...this.data.categories[idx], ...updates };
    this.save();
    return this.data.categories[idx];
  }

  deleteCategory(id: string): boolean {
    const initialLen = this.data.categories.length;
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    this.save();
    return this.data.categories.length < initialLen;
  }

  // Assets
  getAssets(filter?: {
    categoryId?: string;
    region?: string;
    ownershipType?: 'company' | 'third_party';
    query?: string;
    availableOnly?: boolean;
    ownerId?: string;
    approvalStatus?: string;
  }): Asset[] {
    return this.data.assets.filter((a) => {
      if (filter?.categoryId && filter.categoryId !== 'all' && a.categoryId !== filter.categoryId) {
        return false;
      }
      if (filter?.region && filter.region !== 'all' && a.location.region.toLowerCase() !== filter.region.toLowerCase()) {
        return false;
      }
      if (filter?.ownershipType && a.ownershipType !== filter.ownershipType) {
        return false;
      }
      if (filter?.ownerId && a.ownerId !== filter.ownerId) {
        return false;
      }
      if (filter?.approvalStatus && a.approvalStatus !== filter.approvalStatus) {
        return false;
      }
      if (filter?.availableOnly && !a.isAvailable) {
        return false;
      }
      if (filter?.query) {
        const q = filter.query.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchDesc = a.description.toLowerCase().includes(q);
        const matchLoc = a.location.region.toLowerCase().includes(q) || a.location.district.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc) return false;
      }
      return true;
    });
  }

  getAssetById(id: string): Asset | undefined {
    return this.data.assets.find((a) => a.id === id);
  }

  createAsset(asset: Asset): Asset {
    this.data.assets.unshift(asset);
    this.save();
    return asset;
  }

  updateAsset(id: string, updates: Partial<Asset>): Asset | undefined {
    const idx = this.data.assets.findIndex((a) => a.id === id);
    if (idx === -1) return undefined;
    this.data.assets[idx] = { ...this.data.assets[idx], ...updates };
    this.save();
    return this.data.assets[idx];
  }

  deleteAsset(id: string): boolean {
    const initialLen = this.data.assets.length;
    this.data.assets = this.data.assets.filter((a) => a.id !== id);
    this.save();
    return this.data.assets.length < initialLen;
  }

  // Bookings
  getBookings(filter?: { customerId?: string; renterId?: string; ownerId?: string; status?: string }): Booking[] {
    return this.data.bookings.filter((b) => {
      const bookingCustomerId = b.customerId || b.renterId;
      if (filter?.customerId && bookingCustomerId !== filter.customerId) return false;
      if (filter?.renterId && bookingCustomerId !== filter.renterId && b.renterId !== filter.renterId) return false;
      if (filter?.ownerId && b.ownerId !== filter.ownerId) return false;
      if (filter?.status && filter.status !== 'all' && b.status !== filter.status) return false;
      return true;
    });
  }

  getBookingById(id: string): Booking | undefined {
    return this.data.bookings.find((b) => b.id === id || b.bookingCode === id);
  }

  // Check double-booking conflicts (Master Prompt Section 5 #5 & Section 13 #3)
  hasBookingConflict(assetId: string, startDateStr: string, endDateStr: string, excludeBookingId?: string): boolean {
    const reqStart = new Date(startDateStr).getTime();
    const reqEnd = new Date(endDateStr).getTime();

    return this.data.bookings.some((b) => {
      if (b.assetId !== assetId) return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;
      // Only active or confirmed bookings block the calendar
      const blockingStatuses = ['confirmed', 'ready_for_collection', 'active', 'return_due', 'under_inspection'];
      if (!blockingStatuses.includes(b.status)) return false;

      const existingStart = new Date(b.startDate).getTime();
      const existingEnd = new Date(b.endDate).getTime();

      // Overlap formula: (StartA <= EndB) and (EndA >= StartB)
      return reqStart <= existingEnd && reqEnd >= existingStart;
    });
  }

  createBooking(booking: Booking): Booking {
    const normalized: Booking = {
      ...booking,
      customerId: booking.customerId || booking.renterId,
    };
    this.data.bookings.unshift(normalized);
    this.save();
    return normalized;
  }

  updateBooking(id: string, updates: Partial<Booking>): Booking | undefined {
    const idx = this.data.bookings.findIndex((b) => b.id === id);
    if (idx === -1) return undefined;
    this.data.bookings[idx] = {
      ...this.data.bookings[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.bookings[idx];
  }

  respondBookingExtension(bookingId: string, action: 'approve' | 'reject', responseNotes?: string): Booking | undefined {
    const booking = this.getBookingById(bookingId);
    if (!booking || !booking.extensionRequest) return undefined;

    const ext = booking.extensionRequest;
    if (action === 'approve') {
      booking.endDate = ext.requestedEndDate;
      booking.billableUnits += ext.additionalDays;
      booking.priceBreakdown.rentalSubtotal += ext.additionalRentalAmount;
      booking.priceBreakdown.estimatedTotal += ext.additionalRentalAmount;

      booking.extensionRequest = {
        ...ext,
        status: 'approved',
        respondedAt: new Date().toISOString(),
        responseNotes: responseNotes || 'Extension approved by owner',
      };
    } else {
      booking.extensionRequest = {
        ...ext,
        status: 'rejected',
        respondedAt: new Date().toISOString(),
        responseNotes: responseNotes || 'Extension request declined due to operational scheduling',
      };
    }

    booking.updatedAt = new Date().toISOString();
    this.save();
    return booking;
  }

  // Inspections
  getInspections(bookingId?: string): InspectionRecord[] {
    if (bookingId) {
      return this.data.inspections.filter((i) => i.bookingId === bookingId);
    }
    return this.data.inspections;
  }

  createInspection(inspection: InspectionRecord): InspectionRecord {
    this.data.inspections.unshift(inspection);
    this.save();
    return inspection;
  }

  // Disputes
  getDisputes(): Dispute[] {
    return this.data.disputes;
  }

  createDispute(dispute: Dispute): Dispute {
    this.data.disputes.unshift(dispute);
    this.save();
    return dispute;
  }

  updateDispute(id: string, updates: Partial<Dispute>): Dispute | undefined {
    const idx = this.data.disputes.findIndex((d) => d.id === id);
    if (idx === -1) return undefined;
    this.data.disputes[idx] = { ...this.data.disputes[idx], ...updates };
    this.save();
    return this.data.disputes[idx];
  }

  // Logistics Dispatch Jobs
  getLogisticsJobs(): LogisticsDispatchJob[] {
    return this.data.logisticsJobs || [];
  }

  getLogisticsJobById(id: string): LogisticsDispatchJob | undefined {
    return (this.data.logisticsJobs || []).find((j) => j.id === id || j.bookingId === id);
  }

  createLogisticsJob(job: LogisticsDispatchJob): LogisticsDispatchJob {
    this.data.logisticsJobs = this.data.logisticsJobs || [];
    this.data.logisticsJobs.unshift(job);
    this.save();
    return job;
  }

  updateLogisticsJob(id: string, updates: Partial<LogisticsDispatchJob>): LogisticsDispatchJob | undefined {
    this.data.logisticsJobs = this.data.logisticsJobs || [];
    const idx = this.data.logisticsJobs.findIndex((j) => j.id === id);
    if (idx === -1) return undefined;
    this.data.logisticsJobs[idx] = {
      ...this.data.logisticsJobs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.logisticsJobs[idx];
  }

  // Support Messages
  getSupportMessages(bookingCode?: string): SupportMessage[] {
    const msgs = this.data.supportMessages || [];
    if (bookingCode) {
      return msgs.filter((m) => !m.bookingCode || m.bookingCode === bookingCode);
    }
    return msgs;
  }

  addSupportMessage(msg: SupportMessage): SupportMessage {
    this.data.supportMessages = this.data.supportMessages || [];
    this.data.supportMessages.push(msg);
    this.save();
    return msg;
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  addAuditLog(action: string, user: { id: string; email: string; role: string }, details: string, ipAddress?: string): AuditLog {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      details,
      ipAddress,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 300) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 300);
    }
    this.save();
    return log;
  }

  // Platform Config
  getConfig(): PlatformConfig {
    return this.data.config;
  }

  updateConfig(updates: Partial<PlatformConfig>): PlatformConfig {
    this.data.config = { ...this.data.config, ...updates };
    this.save();
    return this.data.config;
  }

  // Analytics Engine
  getAnalytics(): AdminAnalytics {
    const bookings = this.data.bookings;
    const assets = this.data.assets;
    const users = this.data.users;

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => ['confirmed', 'ready_for_collection', 'active', 'return_due', 'under_inspection', 'completed'].includes(b.status)).length;
    const completedBookings = bookings.filter((b) => b.status === 'completed').length;
    const activeRentals = bookings.filter((b) => ['active', 'return_due'].includes(b.status)).length;
    const overdueReturns = bookings.filter((b) => b.status === 'return_due').length;

    // Estimated hire value of accepted bookings (no money passes through RENTZ)
    const validBookings = bookings.filter((b) => ['confirmed', 'ready_for_collection', 'active', 'return_due', 'under_inspection', 'completed'].includes(b.status));

    const grossRentalValue = validBookings.reduce((sum, b) => sum + b.priceBreakdown.rentalSubtotal, 0);

    const disputeCount = this.data.disputes.filter((d) => d.status === 'open' || d.status === 'under_review').length;
    const activeOwners = users.filter((u) => u.role === 'owner').length;
    const activeRenters = users.filter((u) => u.role === 'renter').length;

    const averageBookingValue = validBookings.length > 0 ? Math.round(grossRentalValue / validBookings.length) : 0;

    // Repeat customer rate
    const renterBookingCounts: Record<string, number> = {};
    validBookings.forEach((b) => {
      renterBookingCounts[b.renterId] = (renterBookingCounts[b.renterId] || 0) + 1;
    });
    const repeatRenters = Object.values(renterBookingCounts).filter((cnt) => cnt > 1).length;
    const totalDistinctRenters = Object.keys(renterBookingCounts).length;
    const repeatCustomerRate = totalDistinctRenters > 0 ? Math.round((repeatRenters / totalDistinctRenters) * 100) : 0;

    // Category breakdown
    const categoryRevenueMap: Record<string, { count: number; rev: number; name: string }> = {};
    this.data.categories.forEach((c) => {
      categoryRevenueMap[c.id] = { count: 0, rev: 0, name: c.name };
    });

    validBookings.forEach((b) => {
      if (categoryRevenueMap[b.categoryId]) {
        categoryRevenueMap[b.categoryId].count += 1;
        categoryRevenueMap[b.categoryId].rev += b.priceBreakdown.rentalSubtotal;
      }
    });

    const categoryBreakdown = Object.values(categoryRevenueMap).map((item) => ({
      categoryName: item.name,
      bookingCount: item.count,
      revenue: item.rev,
    }));

    return {
      totalBookings,
      confirmedBookings,
      completedBookings,
      activeRentals,
      overdueReturns,
      grossRentalValue,
      disputeCount,
      activeOwners,
      activeRenters,
      averageBookingValue,
      repeatCustomerRate,
      categoryBreakdown,
    };
  }
}

export const db = new Database();
