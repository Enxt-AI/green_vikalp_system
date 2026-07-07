"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { properties as propertiesApi, campaigns as campaignsApi } from "@/lib/api";
import { toast } from "sonner";
import { Search, MapPin, Building2 } from "lucide-react";

type AddPropertiesDialogProps = {
  campaignId: string;
  existingPropertyIds: string[];
  onPropertiesAdded: () => void;
  children: React.ReactNode;
};

export function AddPropertiesDialog({
  campaignId,
  existingPropertyIds,
  onPropertiesAdded,
  children,
}: AddPropertiesDialogProps) {
  const [open, setOpen] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) {
      loadProperties();
    }
  }, [open]);

  async function loadProperties() {
    try {
      setLoading(true);
      const data = await propertiesApi.list({ listingStatus: "ACTIVE" });
      // Filter out properties already in campaign
      const available = data.filter((p) => !existingPropertyIds.includes(p.id));
      setProperties(available);
    } catch (error: any) {
      toast.error(error.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  }

  function handleToggleProperty(propertyId: string) {
    setSelectedPropertyIds((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  }

  async function handleAddProperties() {
    if (selectedPropertyIds.length === 0) {
      toast.error("Please select at least one property");
      return;
    }

    try {
      setAdding(true);
      await campaignsApi.bulkAddProperties(campaignId, selectedPropertyIds);
      toast.success(`Added ${selectedPropertyIds.length} properties to campaign`);
      setOpen(false);
      setSelectedPropertyIds([]);
      onPropertiesAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to add properties");
    } finally {
      setAdding(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredProperties = properties.filter((property) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      property.address.toLowerCase().includes(searchLower) ||
      property.city.toLowerCase().includes(searchLower) ||
      property.state.toLowerCase().includes(searchLower) ||
      property.zipCode.includes(searchLower)
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Properties to Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search by address, city, state, or zip..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected count */}
          {selectedPropertyIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-900">
                {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? "property" : "properties"} selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedPropertyIds([])}
              >
                Clear selection
              </Button>
            </div>
          )}

          {/* Properties list */}
          <div className="flex-1 overflow-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600">
                  {searchTerm
                    ? "No properties found matching your search"
                    : "No available properties to add"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Beds/Baths</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow
                      key={property.id}
                      className="cursor-pointer hover:bg-neutral-50"
                      onClick={() => handleToggleProperty(property.id)}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedPropertyIds.includes(property.id)}
                          onChange={() => handleToggleProperty(property.id)}
                          className="h-4 w-4 rounded border-neutral-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{property.address}</div>
                          <div className="flex items-center text-sm text-neutral-600">
                            <MapPin className="h-3 w-3 mr-1" />
                            {property.city}, {property.state} {property.zipCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{property.propertyType}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(Number(property.price))}</TableCell>
                      <TableCell>
                        {property.bedrooms} bd / {property.bathrooms} ba
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">
                          {property.listingStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddProperties}
              disabled={selectedPropertyIds.length === 0 || adding}
            >
              {adding ? "Adding..." : `Add ${selectedPropertyIds.length || ""} ${selectedPropertyIds.length === 1 ? "Property" : "Properties"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
