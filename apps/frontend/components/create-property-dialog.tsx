"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { properties, type PropertyType, type ListingStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type CreatePropertyDialogProps = {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPropertyCreated?: () => void;
};

const PROPERTY_TYPES: { value: PropertyType; label: string; icon: string }[] = [
  { value: "HOUSE", label: "House", icon: "🏠" },
  { value: "CONDO", label: "Condo", icon: "🏬" },
  { value: "TOWNHOUSE", label: "Townhouse", icon: "🏘️" },
  { value: "LAND", label: "Land", icon: "🌳" },
  { value: "COMMERCIAL", label: "Commercial", icon: "🏢" },
  { value: "MULTI_FAMILY", label: "Multi-Family", icon: "🏘️" },
  { value: "MANUFACTURED", label: "Manufactured", icon: "🏭" },
];

const LISTING_STATUSES: { value: ListingStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "SOLD", label: "Sold" },
  { value: "OFF_MARKET", label: "Off Market" },
  { value: "COMING_SOON", label: "Coming Soon" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const COMMON_FEATURES = [
  "Pool", "Garage", "Fireplace", "Central AC", "Hardwood Floors",
  "Updated Kitchen", "Master Suite", "Walk-in Closet", "Patio/Deck",
  "Fenced Yard", "Granite Countertops", "Stainless Appliances",
  "Security System", "Smart Home", "Energy Efficient", "Laundry Room",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export function CreatePropertyDialog({
  children,
  open,
  onOpenChange,
  onPropertyCreated,
}: CreatePropertyDialogProps) {
  // Controlled/uncontrolled state pattern
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  // Form state - Basic Info
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [zipCode, setZipCode] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("HOUSE");
  const [listingStatus, setListingStatus] = useState<ListingStatus>("ACTIVE");
  
  // Form state - Details
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [parking, setParking] = useState("");
  
  // Form state - Additional
  const [mlsNumber, setMlsNumber] = useState("");
  const [hoaFees, setHoaFees] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customFeature, setCustomFeature] = useState("");

  const [isCreating, setIsCreating] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      setAddress("");
      setCity("");
      setState("CA");
      setZipCode("");
      setPropertyType("HOUSE");
      setListingStatus("ACTIVE");
      setPrice("");
      setBedrooms("");
      setBathrooms("");
      setSquareFeet("");
      setLotSize("");
      setYearBuilt("");
      setParking("");
      setMlsNumber("");
      setHoaFees("");
      setDescription("");
      setSelectedFeatures([]);
      setCustomFeature("");
    }
  }, [dialogOpen]);

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const addCustomFeature = () => {
    if (customFeature.trim() && !selectedFeatures.includes(customFeature.trim())) {
      setSelectedFeatures([...selectedFeatures, customFeature.trim()]);
      setCustomFeature("");
    }
  };

  const removeFeature = (feature: string) => {
    setSelectedFeatures(selectedFeatures.filter((f) => f !== feature));
  };

  const handleCreate = async () => {
    // Comprehensive validation with user-friendly messages
    if (!address.trim()) {
      toast.error("Please enter the property street address");
      return;
    }

    if (!city.trim()) {
      toast.error("Please enter the city");
      return;
    }

    if (!state) {
      toast.error("Please select a state");
      return;
    }

    if (!zipCode.trim()) {
      toast.error("Please enter the ZIP code");
      return;
    }

    if (!propertyType) {
      toast.error("Please select a property type");
      return;
    }

    if (!price || price.trim() === "" || parseFloat(price) <= 0) {
      toast.error("Please enter a valid listing price greater than ₹0");
      return;
    }

    if (!bedrooms || bedrooms.trim() === "") {
      toast.error("Please enter the number of bedrooms");
      return;
    }

    const bedroomsNum = parseInt(bedrooms);
    if (isNaN(bedroomsNum) || bedroomsNum < 0) {
      toast.error("Number of bedrooms must be 0 or greater");
      return;
    }

    if (!bathrooms || bathrooms.trim() === "") {
      toast.error("Please enter the number of bathrooms");
      return;
    }

    const bathroomsNum = parseFloat(bathrooms);
    if (isNaN(bathroomsNum) || bathroomsNum < 0) {
      toast.error("Number of bathrooms must be 0 or greater");
      return;
    }

    // Optional field validations
    if (squareFeet && (isNaN(parseInt(squareFeet)) || parseInt(squareFeet) <= 0)) {
      toast.error("Square footage must be a positive number");
      return;
    }

    if (lotSize && (isNaN(parseFloat(lotSize)) || parseFloat(lotSize) <= 0)) {
      toast.error("Lot size must be a positive number");
      return;
    }

    if (yearBuilt) {
      const year = parseInt(yearBuilt);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1800 || year > currentYear) {
        toast.error(`Year built must be between 1800 and ${currentYear}`);
        return;
      }
    }

    if (parking && (isNaN(parseInt(parking)) || parseInt(parking) < 0)) {
      toast.error("Parking spaces must be 0 or greater");
      return;
    }

    if (hoaFees && (isNaN(parseFloat(hoaFees)) || parseFloat(hoaFees) < 0)) {
      toast.error("HOA fees must be 0 or greater");
      return;
    }

    try {
      setIsCreating(true);

      await properties.create({
        address: address.trim(),
        city: city.trim(),
        state,
        zipCode: zipCode.trim(),
        propertyType,
        listingStatus,
        price: parseFloat(price),
        bedrooms: parseInt(bedrooms),
        bathrooms: parseFloat(bathrooms),
        squareFeet: squareFeet && squareFeet.trim() ? parseInt(squareFeet) : undefined,
        lotSize: lotSize && lotSize.trim() ? parseFloat(lotSize) : undefined,
        yearBuilt: yearBuilt && yearBuilt.trim() ? parseInt(yearBuilt) : undefined,
        parking: parking && parking.trim() ? parseInt(parking) : undefined,
        mlsNumber: mlsNumber.trim() || undefined,
        hoaFees: hoaFees && hoaFees.trim() ? parseFloat(hoaFees) : undefined,
        description: description.trim() || undefined,
        features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
      });

      toast.success("Property listed successfully");
      setDialogOpen(false);
      onPropertyCreated?.();
    } catch (error: any) {
      // Display specific error from API - ensure it's a string
      let errorMessage = "Failed to create property. Please check all fields and try again.";
      
      if (error?.details) {
        // If details is an array (Zod errors), extract messages
        if (Array.isArray(error.details)) {
          errorMessage = error.details.map((err: any) => err.message || String(err)).join(", ");
        } else if (typeof error.details === "string") {
          errorMessage = error.details;
        }
      } else if (error?.message && typeof error.message === "string") {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Add New Property Listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Property Type & Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type *</Label>
              <Select value={propertyType} onValueChange={(value) => setPropertyType(value as PropertyType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="listingStatus">Listing Status *</Label>
              <Select value={listingStatus} onValueChange={(value) => setListingStatus(value as ListingStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-neutral-900">Property Address</h3>
            
            <div className="space-y-2">
              <Label htmlFor="address">Street Address *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street"
                maxLength={200}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Los Angeles"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="90001"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Price & Basic Details */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-neutral-900">Property Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Listing Price * ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="500000"
                  min="0"
                  step="1000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mlsNumber">MLS Number</Label>
                <Input
                  id="mlsNumber"
                  value={mlsNumber}
                  onChange={(e) => setMlsNumber(e.target.value)}
                  placeholder="MLS12345678"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms *</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  placeholder="3"
                  min="0"
                  max="20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms *</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  placeholder="2.5"
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="squareFeet">Sq Ft</Label>
                <Input
                  id="squareFeet"
                  type="number"
                  value={squareFeet}
                  onChange={(e) => setSquareFeet(e.target.value)}
                  placeholder="2000"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parking">Parking</Label>
                <Input
                  id="parking"
                  type="number"
                  value={parking}
                  onChange={(e) => setParking(e.target.value)}
                  placeholder="2"
                  min="0"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="lotSize">Lot Size (acres)</Label>
                <Input
                  id="lotSize"
                  type="number"
                  value={lotSize}
                  onChange={(e) => setLotSize(e.target.value)}
                  placeholder="0.25"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearBuilt">Year Built</Label>
                <Input
                  id="yearBuilt"
                  type="number"
                  value={yearBuilt}
                  onChange={(e) => setYearBuilt(e.target.value)}
                  placeholder="2020"
                  min="1800"
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hoaFees">HOA Fees ($/month)</Label>
                <Input
                  id="hoaFees"
                  type="number"
                  value={hoaFees}
                  onChange={(e) => setHoaFees(e.target.value)}
                  placeholder="150"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-neutral-900">Property Features</h3>
            
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {COMMON_FEATURES.map((feature) => (
                  <Badge
                    key={feature}
                    variant={selectedFeatures.includes(feature) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFeature(feature)}
                  >
                    {feature}
                  </Badge>
                ))}
              </div>

              {selectedFeatures.filter(f => !COMMON_FEATURES.includes(f)).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Custom Features:</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedFeatures
                      .filter(f => !COMMON_FEATURES.includes(f))
                      .map((feature) => (
                        <Badge key={feature} variant="secondary">
                          {feature}
                          <button
                            type="button"
                            onClick={() => removeFeature(feature)}
                            className="ml-2 text-xs hover:text-red-600"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={customFeature}
                  onChange={(e) => setCustomFeature(e.target.value)}
                  placeholder="Add custom feature..."
                  maxLength={50}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomFeature();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addCustomFeature}>
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="description">Property Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the property highlights, neighborhood, and key selling points..."
              maxLength={2000}
              rows={5}
            />
            <p className="text-xs text-neutral-500">
              {description.length}/2000 characters
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "List Property"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
