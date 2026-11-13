import type { Asset, PriceBreakdown, RentalUnit } from '../src/types/index.ts';

// RENTZ is free to use and collects no payments. Everything here is an estimate of the
// owner's own hire charges, which renter and owner settle directly between themselves.

export function calculateBillableUnits(startDateStr: string, endDateStr: string, unit: RentalUnit): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = Math.max(0, end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  switch (unit) {
    case 'hour': {
      const diffHours = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60)));
      return diffHours;
    }
    case 'week': {
      return Math.max(1, Math.ceil(diffDays / 7));
    }
    case 'month': {
      return Math.max(1, Math.ceil(diffDays / 30));
    }
    case 'day':
    default:
      return diffDays;
  }
}

export function resolveAssetWeightKg(asset: Asset): number {
  if (typeof asset.weightKg === 'number' && asset.weightKg > 0) {
    return asset.weightKg;
  }
  for (const [key, val] of Object.entries(asset.specifications || {})) {
    if (key.toLowerCase().includes('weight')) {
      const cleaned = String(val).replace(/,/g, '');
      const match = cleaned.match(/(\d+(\.\d+)?)/);
      if (match) {
        return Number(match[1]);
      }
    }
  }
  return 25;
}

export function getRequiredVehicleClass(weightKg: number): string {
  const w = Math.max(0, Number(weightKg) || 25);
  if (w <= 40) return 'Boda / Cargo Bajaj (<= 40 kg)';
  if (w <= 400) return 'Light Pickup / Townace Van (40–400 kg)';
  if (w <= 1500) return '3-Ton Canter / Tow Trailer (400–1,500 kg)';
  if (w <= 4000) return '7-Ton Fuso / Tilt Flatbed (1.5–4 Tons)';
  return 'Heavy Lowbed Machinery Hauler (4–25+ Tons)';
}

export function isHeavyMachineryAsset(categoryId: string, weightKg?: number): boolean {
  const heavyCategories = ['cat-construction', 'cat-agriculture', 'cat-transport'];
  if (heavyCategories.includes(categoryId)) return true;
  if (typeof weightKg === 'number' && weightKg >= 300) return true;
  return false;
}

// Used only to suggest a daily rate when an owner enters a purchase value but no rate.
export function getDefaultDailyHirePercentage(categoryId: string, weightKg?: number): number {
  if (isHeavyMachineryAsset(categoryId, weightKg)) {
    if (typeof weightKg === 'number' && weightKg >= 3000) return 2.0;
    if (typeof weightKg === 'number' && weightKg <= 500) return 3.0;
    return 2.5;
  }
  return 4.0;
}

export function calculateRuleOfThumbDailyRate(purchaseValue: number, dailyHirePercentage: number): number {
  const val = Math.max(0, Number(purchaseValue) || 0);
  const pct = Math.max(0.1, Number(dailyHirePercentage) || 2.5);
  return Math.round(val * (pct / 100));
}

export function computePriceBreakdown(
  asset: Asset,
  startDateStr: string,
  endDateStr: string,
  options: {
    rentalUnit?: RentalUnit;
    deliveryRequired?: boolean;
    deliveryDistanceKm?: number;
    operatorRequired?: boolean;
  }
): PriceBreakdown {
  const unit: RentalUnit = options.rentalUnit || 'day';
  const billableUnits = calculateBillableUnits(startDateStr, endDateStr, unit);

  // The owner's listed rate is authoritative
  const dailyRate = asset.pricing.ratePerDay;
  let rentalRate = dailyRate;
  if (unit === 'hour') {
    rentalRate = asset.pricing.ratePerHour || Math.round(dailyRate / 6);
  } else if (unit === 'week') {
    rentalRate = asset.pricing.ratePerWeek || dailyRate * 6;
  } else if (unit === 'month') {
    rentalRate = asset.pricing.ratePerMonth || dailyRate * 24;
  }

  const rentalSubtotal = Math.round(rentalRate * billableUnits);

  // Delivery is arranged and priced directly with the owner, so only the distance is recorded
  const deliveryDistanceKm =
    options.deliveryRequired && asset.deliveryOptions.deliveryAvailable
      ? Math.max(0.1, Number(options.deliveryDistanceKm) || 1)
      : undefined;

  let operatorFee = 0;
  if (options.operatorRequired && asset.deliveryOptions.operatorAvailable) {
    const dailyOperatorRate = asset.deliveryOptions.operatorDailyRate || 30000;
    operatorFee = Math.round(
      dailyOperatorRate *
        Math.max(
          1,
          Math.ceil(billableUnits * (unit === 'hour' ? 0.125 : unit === 'week' ? 7 : unit === 'month' ? 30 : 1))
        )
    );
  }

  return {
    rentalRate,
    rentalUnit: unit,
    billableUnits,
    rentalSubtotal,
    equipmentWeightKg: resolveAssetWeightKg(asset),
    deliveryDistanceKm,
    operatorFee,
    estimatedTotal: rentalSubtotal + operatorFee,
    isCompanyOwned: asset.ownershipType === 'company',
  };
}
