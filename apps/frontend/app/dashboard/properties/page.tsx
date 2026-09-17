"use client";

import { useDeferredValue, useEffect, useState } from "react";
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
import { properties as propertiesApi, type Property, type PagedResponse, type PropertyStats } from "@/lib/api";
import { CACHE_TTLS, invalidateCache, useCachedFetch } from "@/lib/cached-fetch";
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

const PAGE_SIZE = 50;

export default function PropertiesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  // Debounced server search — avoids a request per keystroke
  const deferredSearch = useDeferredValue(searchQuery);
  const [page, setPage] = useState(1);

  const canManageProperties = user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "EMPLOYEE";

  const searchParam = deferredSearch.trim() === "" ? undefined : deferredSearch.trim();
  const cacheKey = `properties:page:${page}:${searchParam ?? "all"}`;
  const {
    data: pagedData,
    loading,
    refreshing,
    refresh,
  } = useCachedFetch<PagedResponse<Property>>(
    cacheKey,
    () =>
      propertiesApi
        .listPaged({ search: searchParam, page, limit: PAGE_SIZE })
        .catch((error: any) => {
          toast.error(error.message || "Failed to load properties");
          throw error;
        }),
    { ttl: CACHE_TTLS.realtime }
  );
  const properties = pagedData?.data ?? [];
  const total = pagedData?.total ?? 0;
  const totalPages = pagedData?.totalPages ?? 1;

  // Summary cards come from the lightweight /stats endpoint
  const { data: stats } = useCachedFetch<PropertyStats>(
    "property-stats",
    () => propertiesApi.getStats(),
    { ttl: CACHE_TTLS.realtime }
  );

  // Reset to first page whenever search changes
  useEffect(() => {
    setPage(1);
  }, [searchParam]);

  async function loadProperties() {
    invalidateCache("property-stats");
    await refresh();
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredProperties = properties;

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
              {stats?.total ?? "—"}
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
              {stats?.active ?? "—"}
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
              {stats?.pending ?? "—"}
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
              {stats?.sold ?? "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              All Properties ({total})
              {refreshing && (
                <span className="ml-2 text-xs font-normal text-neutral-400">Updating…</span>
              )}
            </CardTitle>
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
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <p className="text-sm text-neutral-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of{" "}
                {total} properties
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </Button>
                <span className="text-sm font-medium text-neutral-700">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
