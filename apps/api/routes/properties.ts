import { Router } from "express";
import prisma from "@db/client";
import { authenticate, requireRole } from "../middleware/auth";
import { createPropertySchema, updatePropertySchema } from "@repo/zod";

const router = Router();

// Get all properties with advanced filtering
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      propertyType,
      listingStatus,
      city,
      state,
      zipCode,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      minSquareFeet,
      maxSquareFeet,
      search,
    } = req.query;

    const where: any = {};

    if (propertyType) {
      where.propertyType = propertyType;
    }

    if (listingStatus) {
      where.listingStatus = listingStatus;
    } else {
      // Default to active listings
      where.listingStatus = { in: ["ACTIVE", "PENDING", "COMING_SOON"] };
    }

    if (city) {
      where.city = { contains: city as string, mode: "insensitive" };
    }

    if (state) {
      where.state = { contains: state as string, mode: "insensitive" };
    }

    if (zipCode) {
      where.zipCode = zipCode;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    if (minBedrooms || maxBedrooms) {
      where.bedrooms = {};
      if (minBedrooms) where.bedrooms.gte = parseInt(minBedrooms as string);
      if (maxBedrooms) where.bedrooms.lte = parseInt(maxBedrooms as string);
    }

    if (minBathrooms || maxBathrooms) {
      where.bathrooms = {};
      if (minBathrooms) where.bathrooms.gte = parseFloat(minBathrooms as string);
      if (maxBathrooms) where.bathrooms.lte = parseFloat(maxBathrooms as string);
    }

    if (minSquareFeet || maxSquareFeet) {
      where.squareFeet = {};
      if (minSquareFeet) where.squareFeet.gte = parseInt(minSquareFeet as string);
      if (maxSquareFeet) where.squareFeet.lte = parseInt(maxSquareFeet as string);
    }

    if (search) {
      where.OR = [
        { address: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { mlsNumber: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const properties = await prisma.property.findMany({
      where,
      include: {
        listedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        _count: {
          select: { interests: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(properties);
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// Get property statistics
router.get("/stats", authenticate, async (req, res) => {
  try {
    const [total, active, pending, sold] = await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { listingStatus: "ACTIVE" } }),
      prisma.property.count({ where: { listingStatus: "PENDING" } }),
      prisma.property.count({ where: { listingStatus: "SOLD" } }),
    ]);

    // Average price of active listings
    const avgPrice = await prisma.property.aggregate({
      where: { listingStatus: "ACTIVE" },
      _avg: { price: true },
    });

    res.json({
      total,
      active,
      pending,
      sold,
      averagePrice: avgPrice._avg.price ? Number(avgPrice._avg.price) : null,
    });
  } catch (error) {
    console.error("Error fetching property stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get single property
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        listedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        interests: {
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
                assignedTo: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.json(property);
  } catch (error) {
    console.error("Error fetching property:", error);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

// Get interested leads for a property
router.get("/:id/interests", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const where: any = { propertyId: id };
    if (status) {
      where.status = status;
    }

    const interests = await prisma.propertyInterest.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            mobile: true,
            budgetMin: true,
            budgetMax: true,
            assignedTo: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(interests);
  } catch (error) {
    console.error("Error fetching property interests:", error);
    res.status(500).json({ error: "Failed to fetch interests" });
  }
});

// Create property
router.post("/", authenticate, async (req, res) => {
  try {
    const validatedData = createPropertySchema.parse(req.body);
    const userId = (req as any).user.userId;

    const property = await prisma.property.create({
      data: {
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        country: validatedData.country || "USA",
        propertyType: validatedData.propertyType,
        listingStatus: validatedData.listingStatus,
        price: validatedData.price,
        bedrooms: validatedData.bedrooms,
        bathrooms: validatedData.bathrooms,
        squareFeet: validatedData.squareFeet,
        lotSize: validatedData.lotSize,
        yearBuilt: validatedData.yearBuilt,
        mlsNumber: validatedData.mlsNumber,
        description: validatedData.description,
        virtualTourUrl: validatedData.virtualTourUrl,
        hoaFees: validatedData.hoaFees,
        propertyTax: validatedData.propertyTax,
        features: validatedData.features || [],
        photos: [],
        listedById: validatedData.listedById || userId,
        listedDate: validatedData.listedDate ? new Date(validatedData.listedDate) : new Date(),
      },
      include: {
        listedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    res.status(201).json(property);
  } catch (error: any) {
    console.error("Error creating property:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error.code === "P2002") {
      return res.status(400).json({ error: "MLS number already exists" });
    }
    res.status(500).json({ error: "Failed to create property" });
  }
});

// Update property
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updatePropertySchema.parse(req.body);

    const updateData: any = { ...validatedData };
    if (validatedData.soldDate) {
      updateData.soldDate = new Date(validatedData.soldDate);
    }

    const property = await prisma.property.update({
      where: { id },
      data: updateData,
      include: {
        listedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    res.json(property);
  } catch (error: any) {
    console.error("Error updating property:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Property not found" });
    }
    if (error.code === "P2002") {
      return res.status(400).json({ error: "MLS number already exists" });
    }
    res.status(500).json({ error: "Failed to update property" });
  }
});

// Upload property photos
router.post("/:id/photos", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { photoUrls } = req.body;

    if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
      return res.status(400).json({ error: "Photo URLs array is required" });
    }

    const property = await prisma.property.findUnique({
      where: { id },
      select: { photos: true },
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Append new photos to existing ones
    const updatedProperty = await prisma.property.update({
      where: { id },
      data: {
        photos: [...property.photos, ...photoUrls],
      },
    });

    res.json(updatedProperty);
  } catch (error) {
    console.error("Error uploading photos:", error);
    res.status(500).json({ error: "Failed to upload photos" });
  }
});

// Delete property photo
router.delete("/:id/photos/:photoIndex", authenticate, async (req, res) => {
  try {
    const { id, photoIndex } = req.params;
    const index = parseInt(photoIndex as string);

    const property = await prisma.property.findUnique({
      where: { id },
      select: { photos: true },
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    if (index < 0 || index >= property.photos.length) {
      return res.status(400).json({ error: "Invalid photo index" });
    }

    const updatedPhotos = property.photos.filter((_: any, i: number) => i !== index);

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: { photos: updatedPhotos },
    });

    res.json(updatedProperty);
  } catch (error) {
    console.error("Error deleting photo:", error);
    res.status(500).json({ error: "Failed to delete photo" });
  }
});

// Delete property (admin only)
router.delete("/:id", authenticate, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if property has interests
    const interestsCount = await prisma.propertyInterest.count({
      where: { propertyId: id },
    });

    if (interestsCount > 0) {
      return res.status(400).json({
        error: "Cannot delete property with lead interests. Consider marking as OFF_MARKET instead.",
        interestsCount,
      });
    }

    await prisma.property.delete({
      where: { id },
    });

    res.json({ message: "Property deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting property:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Property not found" });
    }
    res.status(500).json({ error: "Failed to delete property" });
  }
});

// Match properties to lead preferences
router.get("/match/:leadId", authenticate, async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        propertyTypePreference: true,
        budgetMin: true,
        budgetMax: true,
        locationPreference: true,
        bedroomsMin: true,
        bathroomsMin: true,
        squareFeetMin: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const where: any = { listingStatus: "ACTIVE" };

    // Property type filter
    if (lead.propertyTypePreference && lead.propertyTypePreference.length > 0) {
      where.propertyType = { in: lead.propertyTypePreference };
    }

    // Budget filter
    if (lead.budgetMin || lead.budgetMax) {
      where.price = {};
      if (lead.budgetMin) where.price.gte = lead.budgetMin;
      if (lead.budgetMax) where.price.lte = lead.budgetMax;
    }

    // Location filter
    if (lead.locationPreference && lead.locationPreference.length > 0) {
      where.OR = lead.locationPreference.map((loc: string) => ({
        OR: [
          { city: { contains: loc, mode: "insensitive" } },
          { zipCode: loc },
          { state: { contains: loc, mode: "insensitive" } },
        ],
      }));
    }

    // Bedrooms filter
    if (lead.bedroomsMin) {
      where.bedrooms = { gte: lead.bedroomsMin };
    }

    // Bathrooms filter
    if (lead.bathroomsMin) {
      where.bathrooms = { gte: lead.bathroomsMin };
    }

    // Square feet filter
    if (lead.squareFeetMin) {
      where.squareFeet = { gte: lead.squareFeetMin };
    }

    const properties = await prisma.property.findMany({
      where,
      include: {
        listedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        _count: {
          select: { interests: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to top 50 matches
    });

    res.json(properties);
  } catch (error) {
    console.error("Error matching properties:", error);
    res.status(500).json({ error: "Failed to match properties" });
  }
});

export default router;
