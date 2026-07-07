"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { properties as propertiesApi, type Property } from "@/lib/api";
import { toast } from "sonner";
import { CreatePropertyDialog } from "@/components/create-property-dialog";
import { useAuth } from "@/lib/auth-context";

const STATUS_COLORS = {
  ACTIVE: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  SOLD: "bg-blue-100 text-blue-700",
  OFF_MARKET: "bg-neutral-100 text-neutral-700",
  COMING_SOON: "bg-purple-100 text-purple-700",
  WITHDRAWN: "bg-red-100 text-red-700",
};

export default function PropertiesPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const canManageProperties = user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "EMPLOYEE";

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    try {
      setLoading(true);
      const data = await propertiesApi.list();
      setProperties(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load properties");
    } finally {
      setLoading(false);
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
    const query = searchQuery.toLowerCase();
    return (
      property.address.toLowerCase().includes(query) ||
      property.city.toLowerCase().includes(query) ||
      property.state.toLowerCase().includes(query) ||
      property.zipCode.includes(query) ||
      property.mlsNumber?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Properties</h1>
          <p className="text-neutral-600 mt-1">Real estate listings and inventory</p>
        </div>
        {canManageProperties && (
          <CreatePropertyDialog onPropertyCreated={loadProperties}>
            <Button>Add Property</Button>
          </CreatePropertyDialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              Total Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-neutral-900">
              {properties.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              Active Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {properties.filter((p) => p.listingStatus === "ACTIVE").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {properties.filter((p) => p.listingStatus === "PENDING").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {properties.filter((p) => p.listingStatus === "SOLD").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Properties</CardTitle>
            <Input
              placeholder="Search by address, city, MLS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-neutral-600 mb-4">
                {searchQuery ? "No properties match your search" : "No properties found"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Beds</TableHead>
                    <TableHead>Baths</TableHead>
                    <TableHead>Sq Ft</TableHead>
                    <TableHead>MLS #</TableHead>
                    <TableHead>Interests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-[200px]">
                          <div className="truncate">{property.address}</div>
                          <div className="text-xs text-neutral-500">
                            {property.state} {property.zipCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{property.city}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {property.propertyType.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[property.listingStatus]}>
                          {property.listingStatus.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(property.price)}
                      </TableCell>
                      <TableCell className="text-center">{property.bedrooms}</TableCell>
                      <TableCell className="text-center">{property.bathrooms}</TableCell>
                      <TableCell>
                        {property.squareFeet?.toLocaleString() || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {property.mlsNumber || "-"}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {property._count?.interests || 0}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
