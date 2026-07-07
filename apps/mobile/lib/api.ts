// Use relative proxy paths in production to leverage Next.js API rewrites and avoid cross-origin cookie issues
export const API_BASE_URL = process.env.NODE_ENV === "production" ? "/api/proxy" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const config: RequestInit = {
    method,
    credentials: "include", // Include cookies
    cache: "no-store", // Prevent Next.js or browser fetch caching
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    if (body instanceof FormData) {
      config.body = body;
      // Let browser set the correct content type with boundary for FormData
      const newHeaders = { ...config.headers as Record<string, string> };
      delete newHeaders["Content-Type"];
      config.headers = newHeaders;
    } else {
      config.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!isJson) {
      if (!response.ok) {
        console.error(`[API Error] ${method} ${endpoint} - ${response.status} ${response.statusText}`);
        throw new ApiError(response.status, `Server error: ${response.statusText}`);
      }
      return {} as T;
    }

    const data = await response.json();

    if (!response.ok) {
      // Don't log expected auth-related errors that occur during normal flow
      const isExpectedAuthError =
        (endpoint === "/auth/me" && response.status === 401) || // Not logged in check
        (endpoint === "/auth/check-setup"); // Setup check on first visit

      if (!isExpectedAuthError) {
        console.error(`[API Error] ${method} ${endpoint}:`, {
          status: response.status,
          error: data.error || response.statusText,
          details: data.details,
        });
      }

      throw new ApiError(
        response.status,
        data.error || response.statusText,
        data.details
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error(`[Network Error] ${method} ${endpoint}:`, error);
    throw new ApiError(
      0,
      error instanceof Error ? error.message : "Network request failed"
    );
  }
}

// ================================
// AUTH TYPES
// ================================

export type Role = "ADMIN" | "MANAGER" | "TEAM_LEADER" | "TELE_CALLER" | "FIELD_EXECUTIVE";

export type User = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  email: string | null;
  contactNumber: string | null;
  employeeId: string | null;
  isActive: boolean;
  needsPasswordChange: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

// ================================
// PIPELINE & CAMPAIGN TYPES
// ================================

export type PipelineType = "BUYER" | "SELLER" | "INVESTOR" | "RENTER";
export type CampaignStatus = "ACTIVE" | "PAUSED" | "COMPLETED";
export type CampaignSource =
  | "GOOGLE_ADS"
  | "FACEBOOK_ADS"
  | "LINKEDIN_ADS"
  | "REFERRAL"
  | "WEBSITE"
  | "WALK_IN"
  | "PHONE_INQUIRY"
  | "EMAIL"
  | "OTHER";

export type PipelineStage = {
  id: string;
  pipelineId: string;
  name: string;
  description: string | null;
  color: string;
  order: number;
  isDefault: boolean;
  isFinal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Pipeline = {
  id: string;
  name: string;
  description: string | null;
  type: PipelineType;
  isActive: boolean;
  createdById: string;
  stages: PipelineStage[];
  _count?: {
    campaigns: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  source: CampaignSource;
  budget: number | null;
  actualSpend: number | null;
  startDate: string;
  endDate: string | null;
  pipelineId: string;
  pipeline: {
    id: string;
    name: string;
    type: PipelineType;
  };
  createdById: string;
  assignedToIds: string[];
  assignedTo?: {
    id: string;
    fullName: string;
    email: string;
  }[];
  _count?: {
    leads: number;
  };
  createdAt: string;
  updatedAt: string;
};

// ================================
// LEAD TYPES (REAL ESTATE)
// ================================

export type LeadType = "BUYER" | "SELLER" | "INVESTOR" | "RENTER";
export type PropertyType =
  | "HOUSE"
  | "CONDO"
  | "TOWNHOUSE"
  | "LAND"
  | "COMMERCIAL"
  | "MULTI_FAMILY"
  | "MANUFACTURED";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type PreApprovalStatus = "NOT_STARTED" | "IN_PROGRESS" | "APPROVED" | "DENIED";
export type HousingStatus = "RENTING" | "OWNING" | "LIVING_WITH_FAMILY" | "OTHER";
export type MoveInTimeline = "IMMEDIATE" | "1_3_MONTHS" | "3_6_MONTHS" | "6_PLUS_MONTHS" | "FLEXIBLE";

export type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  mobile: string | null;
  alternatePhone: string | null;
  leadType: LeadType;
  propertyTypePreference: PropertyType[];
  budgetMin: number | null;
  budgetMax: number | null;
  locationPreference: string[];
  bedroomsMin: number | null;
  bathroomsMin: number | null;
  squareFeetMin: number | null;
  moveInTimeline: MoveInTimeline | null;
  currentHousingStatus: HousingStatus | null;
  preApprovalStatus: PreApprovalStatus;
  preApprovalAmount: number | null;
  campaignId: string;
  campaign: {
    id: string;
    name: string;
    pipeline: {
      id: string;
      name: string;
      type: PipelineType;
      stages?: PipelineStage[];
    };
  };
  currentStageId: string;
  currentStage: {
    id: string;
    name: string;
    color: string;
    order: number;
  };
  priority: Priority;
  tags: string[];
  assignedToId: string;
  assignedTo: {
    id: string;
    fullName: string;
    email: string;
  };
  initialNotes: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  archivedReason: string | null;
  interactions?: Interaction[];
  _count?: {
    interactions: number;
    propertyInterests: number;
    tasks: number;
    meetings: number;
    notes: number;
    documents: number;
  };
  createdAt: string;
  updatedAt: string;
};

// ================================
// PROPERTY TYPES
// ================================

export type ListingStatus =
  | "ACTIVE"
  | "PENDING"
  | "SOLD"
  | "OFF_MARKET"
  | "COMING_SOON"
  | "WITHDRAWN";

export type Property = {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: PropertyType;
  listingStatus: ListingStatus;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  description: string | null;
  features: string[];
  photos: string[];
  mlsNumber: string | null;
  hoaFees: number | null;
  parking: number | null;
  listedById: string;
  listedBy: {
    id: string;
    fullName: string;
  };
  _count?: {
    interests: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type PropertyInterestStatus =
  | "INTERESTED"
  | "TOURED"
  | "OFFER_MADE"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "NOT_INTERESTED";

export type PropertyInterest = {
  id: string;
  leadId: string;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
  };
  propertyId: string;
  property: Property;
  status: PropertyInterestStatus;
  notes: string | null;
  tourDate: string | null;
  offerAmount: number | null;
  createdAt: string;
  updatedAt: string;
};

// ================================
// INTERACTION TYPES
// ================================

export type InteractionType =
  | "CALL"
  | "EMAIL"
  | "SMS"
  | "WHATSAPP"
  | "MEETING"
  | "PROPERTY_SHOWING"
  | "NOTE"
  | "SYSTEM";

export type InteractionDirection = "INBOUND" | "OUTBOUND";

export type Interaction = {
  id: string;
  leadId: string;
  type: InteractionType;
  direction: InteractionDirection;
  subject: string | null;
  content: string | null;
  duration: number | null;
  emailFrom: string | null;
  emailTo: string | null;
  emailCc: string | null;
  emailBcc: string | null;
  emailBody: string | null;
  meetingId: string | null;
  createdById: string;
  createdBy: {
    id: string;
    fullName: string;
  };
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  occurredAt: string;
  createdAt: string;
};

// ================================
// OTHER SHARED TYPES
// ================================

export type Note = {
  id: string;
  content: string;
  isPinned: boolean;
  leadId: string | null;
  authorId: string;
  author: {
    id: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  type: "GENERAL" | "CALL" | "EMAIL" | "FOLLOW_UP" | "PROPERTY_SHOWING" | "PAPERWORK";
  isCompleted: boolean;
  completedAt: string | null;
  dueDate: string;
  leadId: string | null;
  lead: { id: string; firstName: string; lastName: string } | null;
  assignedToId: string;
  assignedTo: { id: string; fullName: string };
  createdAt: string;
  updatedAt: string;
};

export type MeetingAttendeeStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export type MeetingAttendee = {
  id: string;
  userId: string;
  status: MeetingAttendeeStatus;
  user: {
    id: string;
    fullName: string;
    email: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type Meeting = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  organizerId: string;
  organizer: {
    id: string;
    fullName: string;
  };
  leadId: string | null;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  attendees?: MeetingAttendee[];
  googleEventId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Document = {
  id: string;
  name: string;
  url: string;
  fileType: string;
  fileSize: number | null;
  isLink: boolean;
  category: string | null;
  uploadedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  type: "SHARED" | "PERSONAL";
  parentId: string | null;
  createdBy: {
    id: string;
    fullName: string;
  };
  sharedWithUsers?: {
    id: string;
    fullName: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type ManagedDocument = {
  id: string;
  name: string;
  s3Key: string;
  fileType: string;
  fileSize: number;
  type: "SHARED" | "PERSONAL";
  folderId: string | null;
  folder?: {
    id: string;
    name: string;
  };
  uploadedBy: {
    id: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
};

// ================================
// AUTH API
// ================================

export const auth = {
  checkSetup: () =>
    request<{ setupRequired: boolean }>("/auth/check-setup"),

  setup: (data: { username: string; password: string; fullName: string }) =>
    request<{ message: string; user: User }>("/auth/setup", {
      method: "POST",
      body: data,
    }),

  signin: (data: { username: string; password: string }) =>
    request<{ message: string; user: User }>("/auth/signin", {
      method: "POST",
      body: data,
    }),

  signout: () =>
    request<{ message: string }>("/auth/signout", { method: "POST" }),

  me: () => request<{ user: User }>(`/auth/me?t=${Date.now()}`),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: data,
    }),

  dismissPasswordChange: () =>
    request<{ message: string }>("/auth/dismiss-password-change", {
      method: "POST",
    }),

  createUser: (data: { 
    username: string; 
    fullName: string; 
    role: "MANAGER" | "TEAM_LEADER" | "TELE_CALLER" | "FIELD_EXECUTIVE"; 
    email?: string;
    contactNumber?: string;
    employeeId?: string;
    password?: string 
  }) =>
    request<{ message: string; user: User; temporaryPassword: string }>("/auth/users", {
      method: "POST",
      body: data,
    }),

  listUsers: async () => {
    const data = await request<{ users: User[] }>("/auth/users");
    return data.users;
  },

  toggleUserActive: (id: string) =>
    request<{ message: string; user: User }>(`/auth/users/${id}/toggle-active`, {
      method: "PATCH",
    }),

  getGoogleAuthUrl: () =>
    request<{ authUrl: string }>("/auth/google/connect"),
};

// ================================
// PIPELINES API
// ================================

export const pipelines = {
  list: () => request<Pipeline[]>("/pipelines"),

  get: (id: string) => request<Pipeline>(`/pipelines/${id}`),

  create: (data: {
    name: string;
    description?: string;
    type: PipelineType;
    stages: {
      name: string;
      description?: string;
      color?: string;
      isDefault?: boolean;
    }[];
  }) =>
    request<Pipeline>("/pipelines", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: { name?: string; description?: string; isActive?: boolean }) =>
    request<Pipeline>(`/pipelines/${id}`, {
      method: "PATCH",
      body: data,
    }),

  addStage: (id: string, data: {
    name: string;
    description?: string;
    color?: string;
    insertBefore?: string;
    insertAfter?: string;
  }) =>
    request<PipelineStage>(`/pipelines/${id}/stages`, {
      method: "POST",
      body: data,
    }),

  updateStage: (id: string, stageId: string, data: {
    name?: string;
    description?: string;
    color?: string;
    order?: number;
  }) =>
    request<PipelineStage>(`/pipelines/${id}/stages/${stageId}`, {
      method: "PATCH",
      body: data,
    }),

  deleteStage: (id: string, stageId: string) =>
    request<{ message: string }>(`/pipelines/${id}/stages/${stageId}`, {
      method: "DELETE",
    }),
};

// ================================
// CAMPAIGNS API
// ================================

export const campaigns = {
  list: (params?: { status?: string; pipelineId?: string }) =>
    request<Campaign[]>(`/campaigns${params ? "?" + new URLSearchParams(params as any).toString() : ""}`),

  get: (id: string) => request<Campaign>(`/campaigns/${id}`),

  getLeads: (id: string, params?: { stageId?: string; assignedToId?: string }) =>
    request<Lead[]>(`/campaigns/${id}/leads${params ? "?" + new URLSearchParams(params as any).toString() : ""}`),

  getStats: (id: string) =>
    request<{
      totalLeads: number;
      budget: number | null;
      actualSpend: number | null;
      costPerLead: number | null;
      stageDistribution: {
        stageId: string;
        stageName: string;
        stageColor: string;
        count: number;
      }[];
      timeline: { date: string; count: number }[];
    }>(`/campaigns/${id}/stats`),

  create: (data: {
    name: string;
    description?: string;
    status?: CampaignStatus;
    source: CampaignSource;
    budget?: number;
    actualSpend?: number;
    startDate: string;
    endDate?: string;
    pipelineId: string;
    assignedToIds: string[];
  }) =>
    request<Campaign>("/campaigns", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: {
    name?: string;
    description?: string;
    status?: CampaignStatus;
    budget?: number;
    actualSpend?: number;
    endDate?: string;
    assignedToIds?: string[];
  }) =>
    request<Campaign>(`/campaigns/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/campaigns/${id}`, {
      method: "DELETE",
    }),

  // Campaign Properties
  getProperties: (campaignId: string) =>
    request<any[]>(`/campaigns/${campaignId}/properties`),

  addProperty: (campaignId: string, data: {
    propertyId: string;
    isFeatured?: boolean;
    order?: number;
    notes?: string;
  }) =>
    request<any>(`/campaigns/${campaignId}/properties`, {
      method: "POST",
      body: data,
    }),

  updateProperty: (campaignId: string, propertyId: string, data: {
    isFeatured?: boolean;
    order?: number;
    notes?: string;
  }) =>
    request<any>(`/campaigns/${campaignId}/properties/${propertyId}`, {
      method: "PUT",
      body: data,
    }),

  removeProperty: (campaignId: string, propertyId: string) =>
    request<{ message: string }>(`/campaigns/${campaignId}/properties/${propertyId}`, {
      method: "DELETE",
    }),

  bulkAddProperties: (campaignId: string, propertyIds: string[]) =>
    request<{ message: string; added: number; skipped: number }>(`/campaigns/${campaignId}/properties/bulk`, {
      method: "POST",
      body: { propertyIds },
    }),

  // Lead Stage Management
  moveLeadToStage: (campaignId: string, leadId: string, stageId: string) =>
    request<Lead>(`/campaigns/${campaignId}/leads/${leadId}/stage`, {
      method: "PUT",
      body: { stageId },
    }),

  // Lead Archiving
  archiveLead: (campaignId: string, leadId: string, reason?: string) =>
    request<Lead>(`/campaigns/${campaignId}/leads/${leadId}/archive`, {
      method: "PUT",
      body: { isArchived: true, reason },
    }),

  unarchiveLead: (campaignId: string, leadId: string) =>
    request<Lead>(`/campaigns/${campaignId}/leads/${leadId}/archive`, {
      method: "PUT",
      body: { isArchived: false },
    }),

  bulkArchiveLeads: (campaignId: string, leadIds: string[], reason?: string) =>
    request<{ message: string; count: number }>(`/campaigns/${campaignId}/leads/bulk-archive`, {
      method: "POST",
      body: { leadIds, reason },
    }),

  // Convert archived lead back to active
  convertToLead: (campaignId: string, leadId: string, stageId: string) =>
    request<Lead>(`/campaigns/${campaignId}/leads/${leadId}/convert-to-lead`, {
      method: "PUT",
      body: { stageId },
    }),
};

// ================================
// LEADS API
// ================================

export const leads = {
  list: (params?: {
    campaignId?: string;
    stageId?: string;
    assignedToId?: string;
    leadType?: LeadType;
    isArchived?: boolean;
  }) =>
    request<Lead[]>(`/leads${params ? "?" + new URLSearchParams(params as any).toString() : ""}`),

  get: (id: string) => request<Lead>(`/leads/${id}`),

  getTimeline: (id: string) => request<Interaction[]>(`/leads/${id}/timeline`),

  create: (data: {
    firstName: string;
    lastName: string;
    email?: string;
    mobile?: string;
    alternatePhone?: string;
    leadType: LeadType;
    propertyTypePreference?: PropertyType[];
    budgetMin?: number;
    budgetMax?: number;
    locationPreference?: string[];
    bedroomsMin?: number;
    bathroomsMin?: number;
    squareFeetMin?: number;
    moveInTimeline?: MoveInTimeline;
    currentHousingStatus?: HousingStatus;
    preApprovalStatus?: PreApprovalStatus;
    preApprovalAmount?: number;
    campaignId: string;
    currentStageId: string;
    priority?: Priority;
    tags?: string[];
    assignedToId?: string;
    initialNotes?: string;
    nextFollowUpAt?: string;
  }) =>
    request<Lead>("/leads", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    alternatePhone: string;
    leadType: LeadType;
    propertyTypePreference: PropertyType[];
    budgetMin: number;
    budgetMax: number;
    locationPreference: string[];
    bedroomsMin: number;
    bathroomsMin: number;
    squareFeetMin: number;
    moveInTimeline: MoveInTimeline;
    currentHousingStatus: HousingStatus;
    preApprovalStatus: PreApprovalStatus;
    preApprovalAmount: number;
    priority: Priority;
    tags: string[];
    assignedToId: string;
    nextFollowUpAt: string | null;
  }>) =>
    request<Lead>(`/leads/${id}`, {
      method: "PUT",
      body: data,
    }),

  updateStage: (id: string, stageId: string) =>
    request<Lead>(`/leads/${id}/stage`, {
      method: "PATCH",
      body: { currentStageId: stageId },
    }),

  addPropertyInterest: (id: string, data: {
    propertyId: string;
    status?: PropertyInterestStatus;
    notes?: string;
    tourDate?: string;
    offerAmount?: number;
  }) =>
    request<PropertyInterest>(`/leads/${id}/properties`, {
      method: "POST",
      body: data,
    }),

  updatePropertyInterest: (id: string, propertyInterestId: string, data: {
    status?: PropertyInterestStatus;
    notes?: string;
    tourDate?: string;
    offerAmount?: number;
  }) =>
    request<PropertyInterest>(`/leads/${id}/properties/${propertyInterestId}`, {
      method: "PATCH",
      body: data,
    }),

  getPropertyInterests: (id: string) =>
    request<PropertyInterest[]>(`/leads/${id}/properties`),

  archive: (id: string) =>
    request<{ message: string }>(`/leads/${id}/archive`, {
      method: "PATCH",
    }),

  unarchive: (id: string) =>
    request<{ message: string }>(`/leads/${id}/unarchive`, {
      method: "PATCH",
    }),

  bulkAssign: (leadIds: string[], assignedToId: string) =>
    request<{ message: string; count: number }>("/leads/bulk-assign", {
      method: "POST",
      body: { leadIds, assignedToId },
    }),

  // Import APIs
  parseImport: async (data: { sourceType: "FILE" | "GOOGLE_SHEETS_URL"; file?: File; url?: string }) => {
    const formData = new FormData();
    formData.append("sourceType", data.sourceType);

    if (data.sourceType === "GOOGLE_SHEETS_URL" && data.url) {
      formData.append("url", data.url);
    } else if (data.file) {
      formData.append("file", data.file);
    }

    const response = await fetch(`${API_BASE_URL}/leads/import/parse`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, result.error || "Failed to parse spreadsheet", result.details);
    }

    return result as {
      headers: string[];
      preview: Record<string, any>[];
      totalRows: number;
      sheetName: string;
      allRows: Record<string, any>[];
    };
  },

  bulkImport: async (data: {
    importData: {
      campaignId: string;
      defaultStageId: string;
      defaultAssignedToId?: string;
      defaultPriority?: Priority;
      duplicateHandling: "SKIP" | "UPDATE" | "CREATE_NEW";
      duplicateCheckFields: ("email" | "mobile" | "both")[];
      columnMappings: Array<{
        sourceColumn: string;
        targetField: string;
        transformFunction?: "NONE" | "UPPERCASE" | "LOWERCASE" | "TRIM" | "SPLIT_COMMA" | "PARSE_NUMBER" | "PARSE_DATE";
      }>;
      rows: Record<string, any>[];
    };
  }) => {
    const formData = new FormData();
    formData.append("importData", JSON.stringify(data.importData));

    const response = await fetch(`${API_BASE_URL}/leads/import/bulk`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, result.error || "Failed to import leads", result.details);
    }

    return result as {
      summary: {
        totalRows: number;
        successful: number;
        skipped: number;
        failed: number;
      };
      results: Array<{
        row: number;
        status: "success" | "error" | "skipped";
        message?: string;
        leadId?: string;
      }>;
      leadIds: string[];
    };
  },
};

// ================================
// PROPERTIES API
// ================================

export const properties = {
  list: (params?: {
    propertyType?: PropertyType;
    listingStatus?: ListingStatus;
    city?: string;
    state?: string;
    zipCode?: string;
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    maxBedrooms?: number;
    minBathrooms?: number;
    maxBathrooms?: number;
    minSquareFeet?: number;
    maxSquareFeet?: number;
    search?: string;
  }) =>
    request<Property[]>(`/properties${params ? "?" + new URLSearchParams(params as any).toString() : ""}`),

  get: (id: string) => request<Property>(`/properties/${id}`),

  getInterests: (id: string, params?: { status?: PropertyInterestStatus }) =>
    request<PropertyInterest[]>(`/properties/${id}/interests${params ? "?" + new URLSearchParams(params as any).toString() : ""}`),

  matchLeads: (id: string) =>
    request<{
      lead: Lead;
      matchScore: number;
      matchReasons: string[];
    }[]>(`/properties/${id}/match-leads`),

  create: (data: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType: PropertyType;
    listingStatus?: ListingStatus;
    price: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
    lotSize?: number;
    yearBuilt?: number;
    description?: string;
    features?: string[];
    photos?: string[];
    mlsNumber?: string;
    hoaFees?: number;
    parking?: number;
  }) =>
    request<Property>("/properties", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: Partial<{
    address: string;
    city: string;
    state: string;
    zipCode: string;
    propertyType: PropertyType;
    listingStatus: ListingStatus;
    price: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    lotSize: number;
    yearBuilt: number;
    description: string;
    features: string[];
    photos: string[];
    mlsNumber: string;
    hoaFees: number;
    parking: number;
  }>) =>
    request<Property>(`/properties/${id}`, {
      method: "PUT",
      body: data,
    }),

  uploadPhotos: async (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("photos", file));

    const response = await fetch(`${API_BASE_URL}/properties/${id}/photos`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, result.error || "Upload failed", result.details);
    }

    return result as Property;
  },

  deletePhoto: (id: string, photoIndex: number) =>
    request<Property>(`/properties/${id}/photos/${photoIndex}`, {
      method: "DELETE",
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/properties/${id}`, {
      method: "DELETE",
    }),
};

// ================================
// INTERACTIONS API
// ================================

export const interactions = {
  list: (params?: {
    leadId?: string;
    type?: InteractionType;
    startDate?: string;
    endDate?: string;
  }) =>
    request<Interaction[]>(`/interactions${params ? "?" + new URLSearchParams(params as any).toString() : ""}`),

  get: (id: string) => request<Interaction>(`/interactions/${id}`),

  getStats: (params?: { leadId?: string; startDate?: string; endDate?: string }) =>
    request<{
      totalInteractions: number;
      byType: Record<InteractionType, number>;
      byDirection: Record<InteractionDirection, number>;
      averageCallDuration: number | null;
    }>(`/interactions/stats${params ? "?" + new URLSearchParams(params as any).toString() : ""}`),

  create: (data: {
    leadId: string;
    type: InteractionType;
    direction: InteractionDirection;
    subject?: string;
    content?: string;
    duration?: number;
    emailFrom?: string;
    emailTo?: string;
    emailCc?: string;
    emailBcc?: string;
    emailBody?: string;
    occurredAt?: string;
  }) =>
    request<Interaction>("/interactions", {
      method: "POST",
      body: data,
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/interactions/${id}`, {
      method: "DELETE",
    }),
};

// ================================
// TASKS API
// ================================

export const tasks = {
  list: async (params?: { leadId?: string }) => {
    const data = await request<{ tasks: Task[] }>(`/tasks${params ? "?" + new URLSearchParams(params as any).toString() : ""}`);
    return data.tasks;
  },

  create: (data: {
    title: string;
    description?: string;
    priority?: Priority;
    type?: Task["type"];
    dueDate: string;
    leadId?: string;
    assignedToId?: string;
  }) =>
    request<Task>("/tasks", {
      method: "POST",
      body: data,
    }),

  toggleComplete: (id: string) =>
    request<Task>(`/tasks/${id}/complete`, {
      method: "PATCH",
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/tasks/${id}`, {
      method: "DELETE",
    }),

  followUps: {
    list: async () => {
      const data = await request<{ followUps: any[] }>("/tasks/follow-ups");
      return data.followUps;
    },
  },
};

// ================================
// MEETINGS API
// ================================

export const meetings = {
  list: async () => {
    const data = await request<{ meetings: Meeting[] }>("/meetings");
    return data.meetings;
  },

  create: (data: {
    title: string;
    description?: string;
    location?: string;
    meetingUrl?: string;
    startTime: string;
    endTime: string;
    leadId?: string;
    attendeeIds?: string[];
  }) =>
    request<Meeting>("/meetings", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: {
    title?: string;
    description?: string;
    location?: string;
    meetingUrl?: string;
    startTime?: string;
    endTime?: string;
    status?: Meeting["status"];
  }) =>
    request<Meeting>(`/meetings/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/meetings/${id}`, {
      method: "DELETE",
    }),

  invite: (id: string, userIds: string[]) =>
    request<Meeting>(`/meetings/${id}/invite`, {
      method: "POST",
      body: { userIds },
    }),

  respond: (id: string, response: "ACCEPTED" | "DECLINED") =>
    request<{ message: string }>(`/meetings/${id}/respond`, {
      method: "PATCH",
      body: { response },
    }),

  getInvites: async () => {
    const data = await request<{ invites: { id: string; meeting: Meeting; status: MeetingAttendeeStatus }[] }>("/meetings/invites");
    return data.invites;
  },
};

// ================================
// DOCUMENTS & FOLDERS API
// ================================

export const folders = {
  list: () => request<Folder[]>("/folders"),

  get: (id: string) => request<Folder>(`/folders/${id}`),

  create: (data: {
    name: string;
    type: "SHARED" | "PERSONAL";
    parentId?: string;
    sharedWithUserIds?: string[];
  }) =>
    request<Folder>("/folders", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: {
    name?: string;
    sharedWithUserIds?: string[];
  }) =>
    request<Folder>(`/folders/${id}`, {
      method: "PATCH",
      body: data,
    }),

  delete: (id: string) =>
    request<{ message: string; documentsDeleted: number }>(`/folders/${id}`, {
      method: "DELETE",
    }),
};

export const documents = {
  list: () => request<ManagedDocument[]>("/documents"),

  get: (id: string) => request<ManagedDocument>(`/documents/${id}`),

  getViewUrl: (id: string) =>
    request<{ url: string; fileName: string; fileType: string; expiresIn: number }>(
      `/documents/${id}/view`
    ),

  upload: async (data: {
    file: File;
    name?: string;
    type: "SHARED" | "PERSONAL";
    folderId?: string;
    sharedWithUserIds?: string[];
  }) => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("name", data.name || data.file.name);
    formData.append("type", data.type);
    if (data.folderId) formData.append("folderId", data.folderId);
    if (data.sharedWithUserIds?.length) {
      formData.append("sharedWithUserIds", JSON.stringify(data.sharedWithUserIds));
    }

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, result.error || "Upload failed", result.details);
    }

    return result as ManagedDocument;
  },

  update: (id: string, data: {
    name?: string;
    sharedWithUserIds?: string[];
  }) =>
    request<ManagedDocument>(`/documents/${id}`, {
      method: "PATCH",
      body: data,
    }),

  delete: (id: string) =>
    request<{ message: string; fileName: string }>(`/documents/${id}`, {
      method: "DELETE",
    }),
};

// ================================
// USERS API
// ================================

export const users = {
  list: () => request<{ users: User[]; total: number }>("/users"),
};

// ================================
// GOOGLE CALENDAR API
// ================================

export type GoogleCalendarStatus = {
  connected: boolean;
  email?: string;
};

export const googleCalendar = {
  getStatus: () =>
    request<GoogleCalendarStatus>("/auth/google/status"),

  getConnectUrl: () =>
    request<{ authUrl: string }>("/auth/google/connect"),

  disconnect: () =>
    request<{ message: string }>("/auth/google/disconnect", {
      method: "POST",
    }),
};

// ================================
// INTEGRATIONS API
// ================================

export const integrations = {
  getGoogleSheetsStatus: () => 
    request<{ connected: boolean }>("/integrations/google-sheets/status"),
  
  getGoogleSheetsHeaders: (spreadsheetId: string, range: string) => 
    request<{ headers: string[] }>(`/integrations/google-sheets/headers?spreadsheetId=${spreadsheetId}&range=${encodeURIComponent(range)}`),
  
  syncGoogleSheets: (data: {
    spreadsheetId: string;
    range: string;
    campaignId: string;
    currentStageId: string;
    mapping: Record<string, string>;
  }) => 
    request<{ message: string; imported: number; updated: number; errors: any[] }>( "/integrations/google-sheets/sync", {
      method: "POST",
      body: data,
    }),

  getGoogleFormsQuestions: (formId: string) => 
    request<{ questions: { id: string; title: string }[] }>(`/integrations/google-forms/questions?formId=${formId}`),
  
  syncGoogleForms: (data: {
    formId: string;
    campaignId: string;
    currentStageId: string;
    mapping: Record<string, string>;
  }) => 
    request<{ message: string; imported: number; updated: number; errors: any[] }>( "/integrations/google-forms/sync", {
      method: "POST",
      body: data,
    }),

  getGoogleDriveFolders: () =>
    request<{ folders: { id: string; name: string }[] }>("/integrations/google-drive/folders"),

  saveGoogleDriveConfig: (folderId: string) =>
    request<{ message: string; folderId: string }>("/integrations/google-drive/config", {
      method: "POST",
      body: { folderId },
    }),

  uploadExcelLeads: (formData: FormData) =>
    request<{ message: string; imported: number; updated: number; errors: any[] }>("/integrations/upload-excel", {
      method: "POST",
      body: formData,
    }),
};

// ================================
// PIPELINES API
// ================================

export const pipelinesApi = {
  list: () => request<Pipeline[]>("/pipelines"),
};

// ================================
// WORKFLOWS API
// ================================

export type Workflow = {
  id: string;
  name: string;
  trigger: string;
  sourceCampaignId: string | null;
  stageId: string | null;
  tag: string | null;
  action: string;
  destinationCampaignId: string | null;
  destinationStageId: string | null;
  assignmentOption: string | null;
  status: string;
  lastRun: string | null;
  createdAt: string;
  updatedAt: string;
};

export const workflowsApi = {
  list: () => request<Workflow[]>("/workflows"),
  create: (data: Partial<Workflow>) =>
    request<Workflow>("/workflows", {
      method: "POST",
      body: data,
    }),
  update: (id: string, data: Partial<Workflow>) =>
    request<Workflow>(`/workflows/${id}`, {
      method: "PATCH",
      body: data,
    }),
  delete: (id: string) =>
    request<{ message: string }>(`/workflows/${id}`, {
      method: "DELETE",
    }),
};

// ================================
// NOTIFICATIONS API
// ================================

export const notificationsApi = {
  getPublicKey: () => request<{ publicKey: string }>("/notifications/public-key"),
  subscribe: (subscription: PushSubscriptionJSON) =>
    request<{ message: string }>("/notifications/subscribe", {
      method: "POST",
      body: subscription,
    }),
  unsubscribe: (endpoint: string) =>
    request<{ message: string }>("/notifications/unsubscribe", {
      method: "POST",
      body: { endpoint },
    }),
};

export { ApiError };
