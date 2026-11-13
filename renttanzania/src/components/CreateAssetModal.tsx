import React, { useState, useRef } from 'react';
import { Asset, Category, User } from '../types/index.js';
import { createAsset, updateAsset } from '../services/api.js';
import { X, Plus, Trash2, Loader2, CheckCircle2, Upload, ImagePlus, Link as LinkIcon, Star } from 'lucide-react';

interface CreateAssetModalProps {
  categories: Category[];
  supportedRegions: string[];
  currentUser: User;
  editingAsset?: Asset | null;
  onClose: () => void;
  onAssetCreated: (asset: any) => void;
}

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
  categories,
  supportedRegions,
  currentUser,
  editingAsset,
  onClose,
  onAssetCreated,
}) => {
  const [title, setTitle] = useState(editingAsset?.title || '');
  const [serialNumber, setSerialNumber] = useState(
    editingAsset?.serialNumber || `TZ-SN-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [categoryId, setCategoryId] = useState(editingAsset?.categoryId || categories[0]?.id || 'cat-construction');
  const [description, setDescription] = useState(editingAsset?.description || '');
  const [purchaseValue, setPurchaseValue] = useState(editingAsset?.pricing?.purchaseValue || 6000000);
  const [dailyHirePercentage, setDailyHirePercentage] = useState(editingAsset?.pricing?.dailyHirePercentage || 2.5);
  const [ratePerHour, setRatePerHour] = useState<number | undefined>(editingAsset?.pricing?.ratePerHour);
  const [minimumRentalDays, setMinimumRentalDays] = useState(editingAsset?.pricing?.minimumRentalDays || 1);

  const isHeavyMachinery = ['cat-construction', 'cat-agriculture', 'cat-transport'].includes(categoryId);
  // The rule of thumb only suggests a rate; the owner's own daily rate is what renters see
  const suggestedRatePerDay = Math.round(purchaseValue * (dailyHirePercentage / 100));
  const [ratePerDay, setRatePerDay] = useState<number>(editingAsset?.pricing?.ratePerDay || suggestedRatePerDay);

  const availableImagePresets = [
    { label: 'Construction: Excavator Fleet', url: '/src/assets/images/hero_equipment_fleet_1792692516554.jpg', categoryId: 'cat-construction' },
    { label: 'Construction: 50kVA Generator', url: '/src/assets/images/asset_diesel_generator_1792692516323.jpg', categoryId: 'cat-construction' },
    { label: 'Construction: 500L Concrete Mixer', url: '/images/equipment/concrete-mixer-500l.jpg', categoryId: 'cat-construction' },
    { label: 'Construction: BOMAG Road Roller', url: '/images/equipment/bomag-roller.jpg', categoryId: 'cat-construction' },
    { label: 'Agriculture: Farm Tractor & Plough', url: '/src/assets/images/asset_farm_tractor_1792692517801.jpg', categoryId: 'cat-agriculture' },
    { label: 'Agriculture: Solar Irrigation Kit', url: '/images/equipment/solar-irrigation-pump.jpg', categoryId: 'cat-agriculture' },
    { label: 'Agriculture: Maize Sheller & Thresher', url: '/images/equipment/maize-sheller.jpg', categoryId: 'cat-agriculture' },
    { label: 'Events: Marquee Tent 500 Pax', url: '/images/equipment/marquee-tent-300pax.jpg', categoryId: 'cat-events' },
    { label: 'Events: JBL Line Array Concert PA', url: '/images/equipment/jbl-line-array-pa.jpg', categoryId: 'cat-events' },
    { label: 'Events: Mobile Cold-Room Chiller', url: '/images/equipment/mobile-catering-chiller.jpg', categoryId: 'cat-events' },
    { label: 'Transport: Hino 10T Hiab Crane Truck', url: '/images/equipment/hino-hiab-crane-truck.jpg', categoryId: 'cat-transport' },
    { label: 'Transport: Toyota 3T Forklift', url: '/images/equipment/toyota-forklift-3t.jpg', categoryId: 'cat-transport' },
    { label: 'Transport: Fuso Canter Cargo Truck', url: '/images/equipment/fuso-canter-cargo.jpg', categoryId: 'cat-transport' },
    { label: 'Media: Sony FX3 Cinema Camera', url: '/src/assets/images/asset_cinema_camera_1792692517378.jpg', categoryId: 'cat-media' },
    { label: 'Media: DJI Inspire 3 8K Drone', url: '/images/equipment/dji-inspire3-cinema-drone.jpg', categoryId: 'cat-media' },
    { label: 'Media: Aputure 600d Studio Lighting', url: '/images/equipment/aputure-600d-lighting.jpg', categoryId: 'cat-media' },
    { label: 'Office: Epson 7000lm Laser Projector', url: '/images/equipment/epson-laser-projector.jpg', categoryId: 'cat-office' },
    { label: 'Office: Enterprise Conference Laptops', url: '/images/equipment/enterprise-conference-kit.jpg', categoryId: 'cat-office' },
    { label: 'Home & Work: Kärcher 200Bar Washer', url: '/images/equipment/karcher-pressure-washer.jpg', categoryId: 'cat-home' },
    { label: 'Home & Work: Aluminum Scaffold Tower', url: '/images/equipment/aluminum-scaffold-tower.jpg', categoryId: 'cat-home' },
    { label: 'Art & Decor: Stage Backdrop & Uplights', url: '/images/equipment/velvet-stage-backdrop.jpg', categoryId: 'cat-art-decor' },
    { label: 'Art & Decor: Gallery Exhibition Plinths', url: '/images/equipment/gallery-exhibition-decor.jpg', categoryId: 'cat-art-decor' },
    { label: 'Specialized: Leica Survey Total Station', url: '/images/equipment/leica-total-station.jpg', categoryId: 'cat-other' },
    { label: 'Specialized: Diesel Welder Generator', url: '/images/equipment/miller-diesel-welder.jpg', categoryId: 'cat-other' },
  ];

  const [images, setImages] = useState<string[]>(
    editingAsset?.images && editingAsset.images.length > 0
      ? editingAsset.images
      : [availableImagePresets[0].url]
  );
  const [hasCustomImportedPhoto, setHasCustomImportedPhoto] = useState(Boolean(editingAsset));

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const nextIsHeavy = ['cat-construction', 'cat-agriculture', 'cat-transport'].includes(newCatId);
    const nextPct = nextIsHeavy ? 2.5 : 4.0;
    setDailyHirePercentage(nextPct);
    if (!hasCustomImportedPhoto) {
      const catPreset = availableImagePresets.find((p) => p.categoryId === newCatId);
      if (catPreset) {
        setImages([catPreset.url]);
      }
    }
  };
  const [region, setRegion] = useState(editingAsset?.location?.region || supportedRegions[0] || 'Dar es Salaam');
  const [district, setDistrict] = useState(editingAsset?.location?.district || 'Kinondoni');
  const [ward, setWard] = useState(editingAsset?.location?.ward || 'Mikocheni');
  const [condition, setCondition] = useState<'excellent' | 'good' | 'fair'>(editingAsset?.condition || 'excellent');
  const [weightKg, setWeightKg] = useState<number>(editingAsset?.weightKg || 50);
  const [deliveryAvailable, setDeliveryAvailable] = useState(editingAsset ? editingAsset.deliveryOptions.deliveryAvailable : true);
  const [flatDeliveryFee, setFlatDeliveryFee] = useState(editingAsset?.deliveryOptions?.flatDeliveryFee || 5000);
  const [operatorAvailable, setOperatorAvailable] = useState(editingAsset ? editingAsset.deliveryOptions.operatorAvailable : false);
  const [operatorDailyRate, setOperatorDailyRate] = useState(editingAsset?.deliveryOptions?.operatorDailyRate || 30000);
  const [ownershipType, setOwnershipType] = useState<'company' | 'third_party'>(
    editingAsset?.ownershipType || (currentUser.role === 'admin' ? 'company' : 'third_party')
  );
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [showUrlImport, setShowUrlImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const compressAndReadImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string;
        if (!rawDataUrl) {
          reject(new Error('Empty image file'));
          return;
        }
        const img = new Image();
        img.onerror = () => resolve(rawDataUrl);
        img.onload = () => {
          try {
            const maxDim = 1200;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawDataUrl);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            resolve(compressed);
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImportFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);
    setIsProcessingPhoto(true);
    try {
      const validFiles = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
      if (validFiles.length === 0) {
        setErrorMsg('Please select valid image files (JPG, PNG, WEBP).');
        return;
      }
      const importedDataUrls = await Promise.all(validFiles.map((file) => compressAndReadImage(file)));
      setImages((prev) => {
        if (!hasCustomImportedPhoto && prev.length === 1 && availableImagePresets.some((p) => p.url === prev[0])) {
          return importedDataUrls;
        }
        return [...prev, ...importedDataUrls];
      });
      setHasCustomImportedPhoto(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not import selected photo.');
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportPhotoByUrl = () => {
    const trimmed = photoUrlInput.trim();
    if (!trimmed) return;
    setImages((prev) => {
      if (!hasCustomImportedPhoto && prev.length === 1 && availableImagePresets.some((p) => p.url === prev[0])) {
        return [trimmed];
      }
      return prev.includes(trimmed) ? prev : [...prev, trimmed];
    });
    setHasCustomImportedPhoto(true);
    setPhotoUrlInput('');
    setShowUrlImport(false);
  };

  const handleSelectPresetImage = (presetUrl: string) => {
    setImages((prev) => {
      if (prev.includes(presetUrl)) {
        // Make it the primary photo if already in list
        return [presetUrl, ...prev.filter((u) => u !== presetUrl)];
      }
      if (!hasCustomImportedPhoto && prev.length === 1) {
        return [presetUrl];
      }
      return [presetUrl, ...prev];
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const chosen = prev[index];
      return [chosen, ...prev.filter((_, i) => i !== index)];
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [availableImagePresets[0].url];
    });
  };

  // Specs & Accessories
  const [accessories, setAccessories] = useState<string[]>(
    editingAsset?.accessoriesIncluded || [
      'Tool kit and operating manuals',
      'Safety gear & emergency shutoff',
    ]
  );
  const [newAccessory, setNewAccessory] = useState('');

  const [specKey, setSpecKey] = useState('');
  const [specVal, setSpecVal] = useState('');
  const [specs, setSpecs] = useState<Record<string, string>>(
    editingAsset?.specifications || {
      'Power / Rating': 'Heavy Duty Commercial',
      'Fuel Type': 'Diesel Engine',
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddAccessory = () => {
    if (!newAccessory.trim()) return;
    setAccessories([...accessories, newAccessory.trim()]);
    setNewAccessory('');
  };

  const handleRemoveAccessory = (index: number) => {
    setAccessories(accessories.filter((_, i) => i !== index));
  };

  const handleAddSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setSpecs({ ...specs, [specKey.trim()]: specVal.trim() });
    setSpecKey('');
    setSpecVal('');
  };

  const handleRemoveSpec = (key: string) => {
    const next = { ...specs };
    delete next[key];
    setSpecs(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setErrorMsg('Asset title is required');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        title,
        serialNumber: serialNumber.trim() || `TZ-SN-${Date.now().toString().slice(-6)}`,
        description,
        categoryId,
        ownershipType,
        weightKg: Number(weightKg),
        pricing: {
          purchaseValue: Number(purchaseValue),
          dailyHirePercentage: Number(dailyHirePercentage),
          ratePerDay: Number(ratePerDay),
          ratePerHour: ratePerHour ? Number(ratePerHour) : undefined,
          minimumRentalDays: Math.max(1, Number(minimumRentalDays) || 1),
        },
        location: {
          region,
          district,
          ward,
        },
        condition,
        specifications: {
          ...specs,
          'Equipment Weight': `${Number(weightKg)} kg`,
        },
        accessoriesIncluded: accessories,
        deliveryOptions: {
          pickupAvailable: true,
          deliveryAvailable,
          flatDeliveryFee: deliveryAvailable ? Number(flatDeliveryFee) : undefined,
          operatorAvailable,
          operatorDailyRate: operatorAvailable ? Number(operatorDailyRate) : undefined,
        },
        images: images.length > 0 ? images : [availableImagePresets[0].url],
      };

      const asset = editingAsset
        ? await updateAsset(editingAsset.id, payload)
        : await createAsset(payload);

      onAssetCreated(asset);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save equipment listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/80">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              {editingAsset ? `Edit Listing: ${editingAsset.title}` : 'List Equipment For Hire'}
            </h3>
            <p className="text-xs text-stone-500">
              {editingAsset
                ? 'Update equipment specifications, pricing, serial number, and availability in Cloud Firestore.'
                : 'List tools, plant machinery, or vehicles across Tanzania (persisted in Cloud Firestore).'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Title, Category & Serial Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-stone-700 mb-1">Equipment Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 100kVA Soundproof Generator"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Serial Number *</label>
              <input
                type="text"
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. CAT-320D-TZ091"
                className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>

          {/* Ownership Type (if admin) */}
          {currentUser.role === 'admin' && (
            <div className="p-3 bg-stone-100 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-800">Ownership Classification</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOwnershipType('company')}
                  className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                    ownershipType === 'company' ? 'bg-amber-700 text-white' : 'bg-white text-stone-700'
                  }`}
                >
                  RENTZ Fleet
                </button>
                <button
                  type="button"
                  onClick={() => setOwnershipType('third_party')}
                  className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                    ownershipType === 'third_party' ? 'bg-amber-700 text-white' : 'bg-white text-stone-700'
                  }`}
                >
                  Third-Party Owner
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Description & Condition Overview</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State key specifications, ideal jobs, fuel requirements, or pickup instructions..."
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          {/* Rule of Thumb Percentage of Asset Value Pricing in TZS */}
          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h4 className="text-xs font-bold text-stone-900">
                  Rule of Thumb Asset Value Pricing
                </h4>
                <p className="text-[11px] text-stone-600">
                  {isHeavyMachinery
                    ? 'Heavy Machinery tier: 2% – 3% of asset purchase value per day'
                    : 'Tools & Other Equipment tier: 3.5% – 5% of asset purchase value per day'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {(isHeavyMachinery ? [2.0, 2.5, 3.0] : [3.5, 4.0, 4.5, 5.0]).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDailyHirePercentage(pct)}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                      dailyHirePercentage === pct
                        ? 'bg-amber-700 text-white'
                        : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Asset Purchase Value (TZS) *
                </label>
                <input
                  type="number"
                  min={10000}
                  step={10000}
                  required
                  value={purchaseValue}
                  onChange={(e) => setPurchaseValue(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Daily Hire % *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0.5}
                    max={15}
                    step={0.1}
                    required
                    value={dailyHirePercentage}
                    onChange={(e) => setDailyHirePercentage(Math.max(0.1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono text-stone-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Your Rate / Day (TZS) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={ratePerDay}
                  onChange={(e) => setRatePerDay(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs font-mono font-extrabold bg-amber-100/80 border border-amber-300 text-amber-950 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
                {ratePerDay !== suggestedRatePerDay && (
                  <button
                    type="button"
                    onClick={() => setRatePerDay(suggestedRatePerDay)}
                    className="mt-1 text-[10px] font-semibold text-amber-800 underline cursor-pointer"
                  >
                    Use suggested TSh {suggestedRatePerDay.toLocaleString()}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Rate / Hour (TZS, optional)
                </label>
                <input
                  type="number"
                  value={ratePerHour || ''}
                  onChange={(e) => setRatePerHour(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={`e.g. ${Math.round(ratePerDay / 6).toLocaleString()}`}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Minimum Hire (days) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={minimumRentalDays}
                  onChange={(e) => setMinimumRentalDays(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Region *</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600 cursor-pointer"
              >
                {supportedRegions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Kinondoni / Ilala"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Ward / Yard Location</label>
              <input
                type="text"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="e.g. Mikocheni B Depot"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>

          {/* Asset Photos Import & Gallery */}
          <div className="space-y-3 p-4 bg-stone-50/70 border border-stone-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-stone-900">
                  Equipment Photographs & Media
                </label>
                <p className="text-[11px] text-stone-500">
                  Import photos from your device or paste an image link. The first photo is used as the primary cover.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImportFiles(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPhoto}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  {isProcessingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Import Asset Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlImport((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Photo URL</span>
                </button>
              </div>
            </div>

            {/* Drag and Drop Import Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingPhoto(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingPhoto(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingPhoto(false);
                handleImportFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                isDraggingPhoto
                  ? 'border-amber-600 bg-amber-50/70'
                  : 'border-stone-300 bg-white hover:border-amber-600/60 hover:bg-stone-50'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ImagePlus className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-stone-800">
                  Click to browse or drag & drop equipment photos here
                </p>
                <p className="text-[11px] text-stone-500">
                  Supports JPG, PNG, WEBP — multiple photos allowed (auto-optimized for fast listing)
                </p>
              </div>
            </div>

            {/* Optional URL Import input */}
            {showUrlImport && (
              <div className="flex gap-2 p-2.5 bg-white border border-stone-200 rounded-lg">
                <input
                  type="url"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://example.com/equipment-photo.jpg"
                  className="flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
                <button
                  type="button"
                  onClick={handleImportPhotoByUrl}
                  className="px-3 py-1.5 text-xs font-bold bg-stone-900 text-white rounded-lg cursor-pointer hover:bg-stone-800"
                >
                  Add Photo
                </button>
              </div>
            )}

            {/* Selected / Imported Photos Preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-stone-700">
                  Selected Listing Photos ({images.length})
                </span>
                {images.length > 1 && (
                  <span className="text-[10px] text-stone-500">
                    Click &ldquo;Set Cover&rdquo; on any photo to make it the primary thumbnail
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {images.map((imgUrl, idx) => (
                  <div
                    key={`${idx}-${imgUrl.slice(0, 24)}`}
                    className={`group relative rounded-xl overflow-hidden border bg-white ${
                      idx === 0 ? 'border-amber-700 ring-2 ring-amber-600/80' : 'border-stone-200'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Equipment photo ${idx + 1}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = availableImagePresets[0].url;
                      }}
                      className="w-full h-20 object-cover"
                    />
                    {idx === 0 ? (
                      <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-700 text-white text-[9px] font-bold shadow-xs">
                        <Star className="w-2.5 h-2.5 fill-white" />
                        Primary Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-stone-900/80 hover:bg-amber-700 text-white text-[9px] font-semibold cursor-pointer transition-colors"
                      >
                        Set Cover
                      </button>
                    )}
                    {images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        title="Remove photo"
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-stone-900/75 hover:bg-red-600 text-white cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Sample Presets */}
            <div className="pt-2 border-t border-stone-200/80">
              <span className="block text-[11px] font-semibold text-stone-600 mb-1.5">
                Or choose from standard equipment templates:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableImagePresets.map((preset, idx) => {
                  const isPrimary = images[0] === preset.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPresetImage(preset.url)}
                      className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer bg-white ${
                        isPrimary ? 'border-amber-700 ring-1 ring-amber-600' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-12 object-cover rounded-lg" />
                      <p className="text-[10px] font-medium text-stone-700 truncate mt-1">{preset.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Delivery & Operator terms */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200">
              <div>
                <label className="font-semibold text-stone-800 block">
                  Equipment Weight (kg) *
                </label>
                <span className="text-[11px] text-stone-500">
                  Used to calculate Go & Return delivery cost by weight & distance
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0.5}
                  step="0.5"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(Math.max(0.5, Number(e.target.value)))}
                  className="w-28 px-2.5 py-1.5 bg-white border border-stone-300 rounded font-mono font-bold text-stone-900"
                />
                <span className="font-mono text-stone-600 font-semibold">kg</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-semibold text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deliveryAvailable}
                  onChange={(e) => setDeliveryAvailable(e.target.checked)}
                  className="rounded text-amber-700 accent-amber-700"
                />
                <span>Go & Return Delivery Available</span>
              </label>
              {deliveryAvailable && (
                <span className="text-[11px] font-mono text-amber-800 font-semibold">
                  Auto-calculated by Weight ({weightKg} kg) & Distance (km)
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
              <label className="flex items-center gap-2 font-semibold text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={operatorAvailable}
                  onChange={(e) => setOperatorAvailable(e.target.checked)}
                  className="rounded text-amber-700 accent-amber-700"
                />
                <span>Certified Operator Available</span>
              </label>
              {operatorAvailable && (
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-500">Daily:</span>
                  <input
                    type="number"
                    value={operatorDailyRate}
                    onChange={(e) => setOperatorDailyRate(Number(e.target.value))}
                    className="w-28 px-2 py-1 bg-white border border-stone-300 rounded font-mono"
                  />
                  <span className="font-mono text-stone-500">TZS</span>
                </div>
              )}
            </div>
          </div>

          {/* Accessories Checklist */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Included Accessories & Handover Gear</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newAccessory}
                onChange={(e) => setNewAccessory(e.target.value)}
                placeholder="e.g. 50m extension cable, spare tire, grease gun..."
                className="flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
              <button
                type="button"
                onClick={handleAddAccessory}
                className="px-3 py-1.5 text-xs font-bold bg-stone-900 text-white rounded-lg cursor-pointer"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {accessories.map((acc, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-stone-100 text-stone-800 rounded-md"
                >
                  <span>{acc}</span>
                  <button type="button" onClick={() => handleRemoveAccessory(idx)} className="text-stone-400 hover:text-red-600">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{editingAsset ? 'Save Changes to Listing' : 'Publish Equipment Listing'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
