# RENTZ (RentTanzania) — Master Completion & Ecosystem Integration Plan

## 1. Executive Summary & Architectural Vision
**RENTZ (RentTanzania)** is an industrial-grade, multi-portal equipment rental marketplace tailored for Tanzania's construction, agriculture, events, film, solar, marine, medical, IT, and art/decor sectors.

Currently, the platform features a complete four-role foundation (**Renter**, **Equipment Owner**, **Field Operations**, and **Administrator**), Google Maps distance-based Go & Return delivery calculation, Rule-of-Thumb asset valuation pricing, photo import for asset listings, and dedicated all-category Dispatch & Return inspection forms.

This plan outlines the **four-phase architecture** to finish the core production platform and link it seamlessly with **supportive external web platforms, government/tax registries, payment gateways, and companion mobile apps**.

---

## 2. Ecosystem Architecture: How RENTZ Links with Supportive Apps & Webs

```
                         ┌───────────────────────────────────────────┐
                         │      RENTZ CORE PLATFORM (Web & API)      │
                         │  Renter · Owner · Field Ops · Admin · Logistics│
                         └─────────────────────┬─────────────────────┘
                                               │
        ┌──────────────────────────────────────┼──────────────────────────────────────┐
        ▼                                      ▼                                      ▼
┌───────────────────────────────┐    ┌───────────────────────────────┐    ┌───────────────────────────────┐
│   EXTERNAL WEB INTEGRATIONS   │    │  COMPANION APPS & PORTALS     │    │  CORE PRODUCTION & FINANCE    │
├───────────────────────────────┤    ├───────────────────────────────┤    ├───────────────────────────────┤
│ • AzamPay / Selcom Webhooks   │    │ • Installable PWA Mobile App  │    │ • Cloud DB & Storage (Firebase│
│   (M-Pesa, Airtel, Mixx, Halo)│    │   with Offline Field Ops Queue│    │   Firestore + Local Sync)     │
│ • WhatsApp Business & SMS Hub │    │ • Dedicated Logistics & Driver│    │ • Automated Escrow Release &  │
│   (Booking alerts & support)  │    │   Dispatch Companion Portal   │    │   Owner Payout Settlements    │
│ • Google Workspace Sync       │    │ • Public Shareable Listing    │    │ • Printable PDF Contracts,    │
│   (Sheets, Calendar, Drive)   │    │   Deep Links & QR Asset Cards │    │   TRA Invoices & Gate Passes  │
│ • NIDA, BRELA & TRA EFD VFD   │    │ • Real-Time Support Chat      │    │ • Insurance Coverage Calc &   │
│   Verification & Tax Receipts │    │   with WhatsApp Handoff       │    │   Damage Claim Resolution     │
│ • GPS Fleet & Telematics Links│    │                               │    │                               │
└───────────────────────────────┘    └───────────────────────────────┘    └───────────────────────────────┘
```

---

## 3. Detailed Feature & Integration Specifications

### Pillar A: External Web Services & Supportive Platforms Integration

1. **Live Mobile Money Gateways (AzamPay / Selcom API & Webhook Hub)**
   - **What it does**: Connects the checkout flow to Tanzanian payment aggregators (AzamPay / Selcom) for real-time USSD push prompts across **M-Pesa, Airtel Money, Mixx by Yass (Tigo Pesa), HaloPesa, and Visa/Mastercard**, plus a webhook callback listener (`/api/webhooks/payments`) that transitions bookings from `pending_payment` to `escrow_held`.
   - **Interactive Gateway Console**: Includes an Integrations & Webhook Status drawer where admins and testers can configure live API credentials or trigger signed webhook callbacks for end-to-end payment verification.

2. **WhatsApp Business & SMS Notification Hub (Africa's Talking / Beem Africa + Click-to-Chat)**
   - **What it does**: Automatically dispatches formatted SMS/WhatsApp notifications on booking creation, payment confirmation, driver dispatch, and return sign-off.
   - **Direct WhatsApp Handoff**: Every booking card, dispatch record, and support thread includes one-click deep links (`https://wa.me/255...`) pre-populated with structured booking references, asset details, and Google Maps coordinates.

3. **Google Workspace Sync (Google Sheets, Google Calendar, and Google Drive)**
   - **What it does**: Uses client-side Google OAuth (`set_up_oauth` with `spreadsheets`, `calendar.events`, and `drive.file` scopes) so Equipment Owners and Admins can:
     - **Google Sheets**: One-click export/sync of the financial ledger, owner payouts, and tax records to a live Google Sheet.
     - **Google Calendar**: Sync equipment rental schedules, maintenance windows, and dispatch/return deadlines to the user's Google Calendar.
     - **Google Drive**: Archive signed inspection reports, PDF rental contracts, and TRA EFD receipts directly into a designated Google Drive folder.

4. **NIDA, BRELA & TRA EFD Tax Receipt Verification**
   - **What it does**:
     - **NIDA & BRELA Verification Workflow**: Validates 20-digit Tanzanian National ID (NIDA) format and BRELA Certificate of Incorporation / TIN numbers during Renter KYC and Equipment Owner verification.
     - **TRA EFD / VFD Fiscal Receipt Generator**: Generates compliant Electronic Fiscal Device (EFD) receipt numbers, verification codes, and QR verification links (`verify.tra.go.tz` format) on every settled invoice.

5. **GPS Fleet Tracking & Telematics Web Links**
   - **What it does**: Allows owners and field ops to attach external GPS tracker URLs (e.g., Tramigo, Teltonika, Cartrack Tanzania, or custom fleet URLs) and live telemetry coordinates to each asset. Renter and Field Ops views can open the live tracker feed or view real-time geofence status on the embedded Google Map.

---

### Pillar B: Companion Mobile Apps & Supportive Portals

1. **Installable Progressive Web App (PWA) with Offline Field Ops Queue**
   - **What it does**: Configures `vite-plugin-pwa` with a standalone Web App Manifest, iOS/Android home-screen icons, an in-app **"Install RENTZ App"** prompt (`PWAInstallButton`), and an `OfflineIndicator`.
   - **Offline Field Ops Synchronization**: Field Operations officers working in remote construction sites or farms without cellular coverage can fill out **Dispatch** and **Return** inspection forms offline; submissions queue in `localStorage` and automatically sync to the server once connectivity returns.

2. **Dedicated Logistics & Delivery Driver Dispatch Portal (`LogisticsView`)**
   - **What it does**: Adds a dedicated **Driver & Logistics Portal** tab for transport partners carrying out Go & Return equipment deliveries:
     - View assigned pickup and drop-off jobs with weight tier, vehicle class requirement (Boda/Bajaj, Canter, Flatbed, Lowbed Trailer), and calculated distance.
     - One-click **"Navigate in Google Maps"** (`https://www.google.com/maps/dir/...`) from the equipment yard to the customer destination.
     - Step-by-step delivery status updates (`Assigned` → `En Route to Pickup` → `Loaded & In Transit` → `Delivered at Site` → `Return Pickup Completed`) with digital recipient sign-off.

3. **Public Shareable Links & Printable QR Asset Tags**
   - **What it does**:
     - Deep-linking via URL query parameters (`?asset=ast-1` or `?booking=bk-1&portal=ops`) so listings and inspection forms can be shared across WhatsApp, email, or social web platforms and open directly to the target modal.
     - Printable **Weatherproof QR Asset Sticker modal** for equipment owners and field officers to affix physical QR codes onto machinery for instant mobile scanning.

4. **Real-Time Customer & Owner Support Chat with WhatsApp Handoff**
   - **What it does**: Server-backed live support & booking messaging drawer (using WebSockets / real-time state sync) connecting Renters, Owners, and Support Agents, paired with an instant **"Continue on WhatsApp"** button for mobile handoff.

---

### Pillar C: Core Production & Financial Readiness

1. **Printable PDF Rental Contracts, TRA EFD Invoices & Gate Passes**
   - **What it does**: A dedicated **Document & Print Center Modal** (`DocumentPreviewModal`) for every booking that generates clean, print-ready / PDF-exportable documents:
     - **Equipment Hire Agreement (Contract)**: Full legal terms, Renter KYC, Owner details, asset serial number, daily rate, escrow deposit, and digital signatures.
     - **Tax Invoice & TRA EFD Receipt**: Itemized rental subtotal, Go & Return delivery fee, insurance fee, 18% VAT breakdown, and fiscal QR code.
     - **Official Yard Gate Pass & Waybill**: Authorized dispatch/return clearance pass for security guards and traffic checkpoints showing driver details, vehicle plate, and QR verification badge.

2. **Cloud Database Migration & Persistent Storage Readiness**
   - **What it does**: Prepares the backend persistence layer for seamless dual-mode operation—supporting provisioned **Firebase Firestore + Auth** (`firebase-blueprint.json`, hardened `firestore.rules`, and real-time sync) alongside the resilient server-side `.data/renttanzania-db.json` engine and cloud-ready asset photo storage.

3. **Automated Escrow Release & Owner Payout Settlements**
   - **What it does**:
     - Tracks the complete financial lifecycle of every booking: `Customer Paid (Escrow Held)` → `Equipment Returned & Inspected` → `Damage Deducted (if any)` → `Commission Deducted (12% Verified / 18% Ordinary)` → `Net Owner Payout Disbursed` + `Deposit Refunded to Renter`.
     - Adds an **Escrow & Payout Settlement Console** in the Owner and Admin portals to trigger instant M-Pesa / Bank payouts with audit trail receipts.

4. **Insurance Coverage Calculator & Damage Claim Workflow**
   - **What it does**:
     - **Dynamic Insurance Tiers**: Renters can choose between **Basic Liability (5%)**, **Standard Comprehensive (8%)**, or **Heavy-Duty All-Risk (12%)** during booking, with clear deductible and coverage limits calculated from the asset's purchase value.
     - **Structured Damage Claim Workflow**: When a Field Ops Return Inspection logs damage (`damaged_minor` or `damaged_major`), the system automatically calculates the repair cost vs. security deposit and insurance deductible, creating an actionable **Insurance & Damage Claim** record in the Owner and Admin portals.

---

## 4. Phased Implementation Roadmap

### Phase 1: Companion Portals, PWA Offline Mode & Deep Linking
- Configure `vite-plugin-pwa`, manifest icons, `usePWAInstall`, `PWAInstallButton` in header, and offline inspection queue sync.
- Build the **Logistics & Driver Dispatch Portal (`src/components/LogisticsView.tsx`)** with Google Maps turn-by-turn navigation links and live transit status updates.
- Add URL deep-linking (`?asset=...`, `?booking=...`) and printable **QR Asset Tag Cards**.

### Phase 2: Printable Documents, Insurance Claims & Escrow Payouts
- Build the **Printable PDF Document Center (`src/components/DocumentPreviewModal.tsx`)** for **Rental Contracts**, **TRA EFD Tax Invoices**, and **Yard Gate Passes**.
- Upgrade the booking & return engines with the **Insurance Coverage Calculator (Basic / Standard / All-Risk)**, **Automated Damage Claim Generator**, and **Escrow Release & Owner Payout Settlement workflow**.

### Phase 3: External Web Links, WhatsApp/SMS Hub, NIDA/BRELA/TRA & GPS Telematics
- Build the **Connected Ecosystems & Integrations Hub (`src/components/IntegrationsHubModal.tsx`)** and backend endpoints (`/api/integrations/*`, `/api/webhooks/payments`).
- Add **WhatsApp Business Click-to-Chat & SMS alert triggers**, **AzamPay/Selcom webhook simulator & live config**, **NIDA/BRELA/TRA EFD verification badges**, and **GPS Fleet Telematics links** on assets and maps.
- Add the **Live Support & Booking Chat Drawer (`src/components/SupportChatDrawer.tsx`)** with WebSocket real-time sync and WhatsApp handoff.

### Phase 4: Google Workspace OAuth & Cloud Database Provisioning
- Integrate **Google Workspace APIs** (Sheets financial export, Calendar booking sync, Drive contract backup) via `set_up_oauth`.
- Provision **Firebase (Firestore & Auth)** via the guided setup flow (`firebase-blueprint.json` + hardened `firestore.rules`) for multi-device cloud persistence.
- Run full TypeScript compilation (`compile_applet`) and lint verification (`lint_applet`).
