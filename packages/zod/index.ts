import { z } from "zod";


// Setup - First admin creation
export const setupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters"),
});

// Sign in
export const signinSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Change password
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// Create user (Admin only)
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters"),
  role: z.enum(["MANAGER", "TEAM_LEADER", "TELE_CALLER", "FIELD_EXECUTIVE"], {
    errorMap: () => ({ message: "Role must be either MANAGER, TEAM_LEADER, TELE_CALLER, or FIELD_EXECUTIVE" }),
  }),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  contactNumber: z.string().max(20).optional().nullable(),
  employeeId: z.string().max(50).optional().nullable(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
});

// ================================
// REAL ESTATE CRM ENUMS
// ================================

export const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const pipelineTypeEnum = z.enum(["BUYER", "SELLER", "INVESTOR", "RENTER"]);

export const campaignStatusEnum = z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]);

export const leadTypeEnum = z.enum(["BUYER", "SELLER", "INVESTOR", "RENTER", "BUYER_SELLER"]);

export const propertyTypeEnum = z.enum([
  "HOUSE",
  "CONDO",
  "TOWNHOUSE",
  "LAND",
  "COMMERCIAL",
  "MULTI_FAMILY",
  "MANUFACTURED",
]);

export const moveInTimelineEnum = z.enum([
  "ASAP",
  "ONE_TO_THREE_MONTHS",
  "THREE_TO_SIX_MONTHS",
  "SIX_TO_TWELVE_MONTHS",
  "OVER_A_YEAR",
  "JUST_BROWSING",
]);

export const housingStatusEnum = z.enum([
  "RENTING",
  "OWNS_HOME",
  "LIVING_WITH_FAMILY",
  "OTHER",
]);

export const preApprovalStatusEnum = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "PRE_QUALIFIED",
  "PRE_APPROVED",
  "NOT_NEEDED",
]);

export const listingStatusEnum = z.enum([
  "ACTIVE",
  "PENDING",
  "SOLD",
  "OFF_MARKET",
  "COMING_SOON",
]);

export const interestStatusEnum = z.enum([
  "INTERESTED",
  "TOURED",
  "FAVORITED",
  "OFFER_MADE",
  "OFFER_ACCEPTED",
  "OFFER_REJECTED",
  "NOT_INTERESTED",
]);

export const interactionTypeEnum = z.enum([
  "CALL",
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "MEETING",
  "NOTE",
  "PROPERTY_SHOWING",
  "OFFER_SUBMITTED",
  "STAGE_CHANGE",
  "DOCUMENT_SENT",
  "AUTOMATED_EMAIL",
  "AUTOMATED_SMS",
]);

export const directionEnum = z.enum(["INBOUND", "OUTBOUND"]);

// ================================
// PIPELINE SCHEMAS
// ================================

export const createPipelineSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional().nullable(),
  type: pipelineTypeEnum,
  stages: z.array(z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").default("#3B82F6"),
    isDefault: z.boolean().default(false),
  })).min(1, "At least one stage is required"),
});

export const updatePipelineSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createPipelineStageSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").default("#3B82F6"),
  order: z.number().int().min(0),
  isDefault: z.boolean().default(false),
});

export const updatePipelineStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  order: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});

// ================================
// CAMPAIGN SCHEMAS
// ================================

export const createCampaignSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(1000).optional().nullable(),
  pipelineId: z.string().uuid("Invalid pipeline ID"),
  status: campaignStatusEnum.default("ACTIVE"),
  startDate: z.string(), // ISO date string
  endDate: z.string().optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  sourceDetails: z.string().max(500).optional().nullable(),
  assignedToIds: z.array(z.string().uuid()).default([]),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: campaignStatusEnum.optional(),
  endDate: z.string().optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  actualSpend: z.number().min(0).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  sourceDetails: z.string().max(500).optional().nullable(),
  assignedToIds: z.array(z.string().uuid()).optional(),
});

// ================================
// LEAD SCHEMAS (Real Estate)
// ================================

export const createLeadSchema = z.object({
  firstName: z.string().max(100).optional().nullable().or(z.literal("")),
  lastName: z.string().max(100).optional().nullable().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  mobile: z.string().max(20).optional().nullable(),
  alternatePhone: z.string().max(20).optional().nullable(),
  leadType: leadTypeEnum.default("BUYER"),
  propertyTypePreference: z.array(propertyTypeEnum).default([]),
  budgetMin: z.number().min(0).optional().nullable(),
  budgetMax: z.number().min(0).optional().nullable(),
  locationPreference: z.array(z.string().max(100)).default([]),
  bedroomsMin: z.number().int().min(0).max(20).optional().nullable(),
  bathroomsMin: z.number().min(0).max(20).optional().nullable(),
  squareFeetMin: z.number().int().min(0).optional().nullable(),
  moveInTimeline: moveInTimelineEnum.optional().nullable(),
  currentHousingStatus: housingStatusEnum.optional().nullable(),
  preApprovalStatus: preApprovalStatusEnum.optional().nullable(),
  preApprovalAmount: z.number().min(0).optional().nullable(),
  campaignId: z.string().uuid("Invalid campaign ID"),
  currentStageId: z.string().uuid("Invalid stage ID"),
  priority: priorityEnum.default("MEDIUM"),
  tags: z.array(z.string().max(50)).default([]),
  assignedToId: z.string().uuid("Invalid user ID").optional(),
  initialNotes: z.string().max(2000).optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
});

export const updateLeadSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  mobile: z.string().max(20).optional().nullable(),
  alternatePhone: z.string().max(20).optional().nullable(),
  leadType: leadTypeEnum.optional(),
  propertyTypePreference: z.array(propertyTypeEnum).optional(),
  budgetMin: z.number().min(0).optional().nullable(),
  budgetMax: z.number().min(0).optional().nullable(),
  locationPreference: z.array(z.string().max(100)).optional(),
  bedroomsMin: z.number().int().min(0).max(20).optional().nullable(),
  bathroomsMin: z.number().min(0).max(20).optional().nullable(),
  squareFeetMin: z.number().int().min(0).optional().nullable(),
  moveInTimeline: moveInTimelineEnum.optional().nullable(),
  currentHousingStatus: housingStatusEnum.optional().nullable(),
  preApprovalStatus: preApprovalStatusEnum.optional().nullable(),
  preApprovalAmount: z.number().min(0).optional().nullable(),
  currentStageId: z.string().uuid().optional(),
  score: z.number().min(0).max(100).optional(),
  priority: priorityEnum.optional(),
  tags: z.array(z.string().max(50)).optional(),
  assignedToId: z.string().uuid().optional(),
  nextFollowUpAt: z.string().optional().nullable(),
  isArchived: z.boolean().optional(),
  archivedReason: z.string().max(500).optional().nullable(),
});

// ================================
// PROPERTY SCHEMAS
// ================================

export const createPropertySchema = z.object({
  address: z.string().min(5, "Address is required").max(255),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  zipCode: z.string().min(4, "ZIP code is required").max(20),
  country: z.string().max(100).default("USA"),
  propertyType: propertyTypeEnum,
  listingStatus: listingStatusEnum.default("ACTIVE"),
  price: z.number().min(0, "Price must be positive"),
  bedrooms: z.number().int().min(0).max(50),
  bathrooms: z.number().min(0).max(50),
  squareFeet: z.number().int().min(0).optional().nullable(),
  lotSize: z.number().min(0).optional().nullable(),
  yearBuilt: z.number().int().min(1700).max(new Date().getFullYear() + 5).optional().nullable(),
  mlsNumber: z.string().max(50).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  virtualTourUrl: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  hoaFees: z.number().min(0).optional().nullable(),
  propertyTax: z.number().min(0).optional().nullable(),
  features: z.array(z.string().max(100)).default([]),
  listedById: z.string().uuid().optional().nullable(),
  listedDate: z.string().optional().nullable(),
});

export const updatePropertySchema = z.object({
  address: z.string().min(5).max(255).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  zipCode: z.string().min(4).max(20).optional(),
  propertyType: propertyTypeEnum.optional(),
  listingStatus: listingStatusEnum.optional(),
  price: z.number().min(0).optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  squareFeet: z.number().int().min(0).optional().nullable(),
  lotSize: z.number().min(0).optional().nullable(),
  yearBuilt: z.number().int().min(1700).max(new Date().getFullYear() + 5).optional().nullable(),
  mlsNumber: z.string().max(50).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  virtualTourUrl: z.string().url().optional().nullable().or(z.literal("")),
  hoaFees: z.number().min(0).optional().nullable(),
  propertyTax: z.number().min(0).optional().nullable(),
  features: z.array(z.string().max(100)).optional(),
  soldDate: z.string().optional().nullable(),
  soldPrice: z.number().min(0).optional().nullable(),
});

// ================================
// PROPERTY INTEREST SCHEMAS
// ================================

export const createPropertyInterestSchema = z.object({
  propertyId: z.string().uuid("Invalid property ID"),
  status: interestStatusEnum.default("INTERESTED"),
  notes: z.string().max(1000).optional().nullable(),
  viewedAt: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

export const updatePropertyInterestSchema = z.object({
  status: interestStatusEnum.optional(),
  notes: z.string().max(1000).optional().nullable(),
  viewedAt: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

// ================================
// INTERACTION SCHEMAS
// ================================

export const createInteractionSchema = z.object({
  leadId: z.string().uuid("Invalid lead ID"),
  type: interactionTypeEnum,
  subject: z.string().max(255).optional().nullable(),
  content: z.string().max(10000).optional().nullable(),
  direction: directionEnum.default("OUTBOUND"),
  duration: z.number().int().min(0).optional().nullable(), // seconds
  recordingUrl: z.string().url().optional().nullable().or(z.literal("")),
  emailFrom: z.string().email().optional().nullable().or(z.literal("")),
  emailTo: z.string().email().optional().nullable().or(z.literal("")),
  emailCc: z.string().optional().nullable(),
  phoneNumber: z.string().max(20).optional().nullable(),
  occurredAt: z.string().optional(), // ISO datetime, defaults to now
});

// ================================
// TYPE EXPORTS
// ================================

export type SetupInput = z.infer<typeof setupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;

// Real Estate Types
export type Priority = z.infer<typeof priorityEnum>;
export type PipelineType = z.infer<typeof pipelineTypeEnum>;
export type CampaignStatus = z.infer<typeof campaignStatusEnum>;
export type LeadType = z.infer<typeof leadTypeEnum>;
export type PropertyType = z.infer<typeof propertyTypeEnum>;
export type MoveInTimeline = z.infer<typeof moveInTimelineEnum>;
export type HousingStatus = z.infer<typeof housingStatusEnum>;
export type PreApprovalStatus = z.infer<typeof preApprovalStatusEnum>;
export type ListingStatus = z.infer<typeof listingStatusEnum>;
export type InterestStatus = z.infer<typeof interestStatusEnum>;
export type InteractionType = z.infer<typeof interactionTypeEnum>;
export type Direction = z.infer<typeof directionEnum>;

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>;
export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type CreatePropertyInterestInput = z.infer<typeof createPropertyInterestSchema>;
export type UpdatePropertyInterestInput = z.infer<typeof updatePropertyInterestSchema>;
export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;

// Task and Meeting Types
export type TaskType = z.infer<typeof taskTypeEnum>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MeetingStatus = z.infer<typeof meetingStatusEnum>;
export type MeetingAttendeeStatus = z.infer<typeof meetingAttendeeStatusEnum>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type InviteToMeetingInput = z.infer<typeof inviteToMeetingSchema>;
export type RespondToMeetingInput = z.infer<typeof respondToMeetingSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// ================================
// TASK SCHEMAS
// ================================

export const taskTypeEnum = z.enum(["GENERAL", "CALL", "EMAIL", "FOLLOW_UP", "PROPOSAL", "CONTRACT"]);

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(2000).optional().nullable(),
  priority: priorityEnum.default("MEDIUM"),
  type: taskTypeEnum.default("GENERAL"),
  dueDate: z.string(), // ISO date string
  leadId: z.string().uuid().optional().nullable(),
  assignedToId: z.string().uuid().optional(), // If not provided, assign to current user
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  priority: priorityEnum.optional(),
  type: taskTypeEnum.optional(),
  dueDate: z.string().optional(),
  isCompleted: z.boolean().optional(),
  assignedToId: z.string().uuid().optional(),
});

// ================================
// MEETING SCHEMAS
// ================================

export const meetingStatusEnum = z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]);
export const meetingAttendeeStatusEnum = z.enum(["PENDING", "ACCEPTED", "DECLINED"]);

export const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(2000).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  startTime: z.string(), // ISO datetime string
  endTime: z.string(), // ISO datetime string
  leadId: z.string().uuid().optional().nullable(),
  attendeeIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateMeetingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: meetingStatusEnum.optional(),
});

export const inviteToMeetingSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "At least one user ID is required"),
});

export const respondToMeetingSchema = z.object({
  response: z.enum(["ACCEPTED", "DECLINED"]),
});

// ================================
// NOTE SCHEMAS
// ================================

export const createNoteSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000),
  isPinned: z.boolean().default(false),
  leadId: z.string().uuid().optional().nullable(),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  isPinned: z.boolean().optional(),
});

// ================================
// DOCUMENT SCHEMAS  
// ================================

export const createDocumentSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  category: z.string().max(100).optional().nullable(),
  isLink: z.boolean().default(false),
  url: z.string().optional(), // For links
  leadId: z.string().uuid().optional().nullable(),
});

// ================================
// DOCUMENT MANAGEMENT SCHEMAS
// ================================

export const folderTypeEnum = z.enum(["SHARED", "PERSONAL"]);
export const documentTypeEnum = z.enum(["SHARED", "PERSONAL"]);

// Allowed file types (txt, pdf, png, jpeg, jpg)
export const ALLOWED_FILE_TYPES = [
  "text/plain",
  "application/pdf",
  "image/png",
  "image/jpeg",
];

export const MAX_FILE_SIZE = 1048576; // 1MB in bytes

// Create folder
export const createFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(100),
  type: folderTypeEnum.default("SHARED"),
  parentId: z.string().uuid().optional().nullable(),
  sharedWithUserIds: z.array(z.string().uuid()).optional().default([]),
});

// Update folder (rename)
export const updateFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(100).optional(),
  sharedWithUserIds: z.array(z.string().uuid()).optional(),
});

// Upload document metadata (file handled separately via multipart)
export const uploadDocumentSchema = z.object({
  name: z.string().min(1).max(255), // Filename
  type: documentTypeEnum.default("SHARED"),
  folderId: z.string().uuid().optional().nullable(),
  sharedWithUserIds: z.array(z.string().uuid()).optional().default([]),
});

// Update document
export const updateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sharedWithUserIds: z.array(z.string().uuid()).optional(),
});

export type FolderType = z.infer<typeof folderTypeEnum>;
export type DocumentType = z.infer<typeof documentTypeEnum>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

// ================================
// LEADS IMPORT SCHEMAS
// ================================

export const importSourceTypeEnum = z.enum(["FILE", "GOOGLE_SHEETS_URL", "GOOGLE_DRIVE_FILE"]);

export const parseImportSchema = z.object({
  sourceType: importSourceTypeEnum,
  url: z.string().url().optional(),
});

export const duplicateHandlingEnum = z.enum(["SKIP", "UPDATE", "CREATE_NEW"]);

export const assignmentModeEnum = z.enum(["MANUAL", "AUTO"]);

export const importMappingSchema = z.object({
  sourceColumn: z.string().min(1, "Source column is required"),
  targetField: z.string().min(1, "Target field is required"),
  transformFunction: z.enum(["NONE", "UPPERCASE", "LOWERCASE", "TRIM", "SPLIT_COMMA", "PARSE_NUMBER", "PARSE_DATE"]).optional().default("NONE"),
});

export const bulkImportLeadsSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign ID"),
  defaultStageId: z.string().uuid("Invalid default stage ID"),
  defaultAssignedToId: z.string().uuid("Invalid assigned user ID").optional(),
  defaultPriority: priorityEnum.optional().default("MEDIUM"),
  duplicateHandling: duplicateHandlingEnum.default("SKIP"),
  duplicateCheckFields: z.array(z.enum(["email", "mobile", "both"])).default(["email"]),
  columnMappings: z.array(importMappingSchema),
  rows: z.array(z.record(z.string(), z.any())),
  assignmentMode: assignmentModeEnum.optional().default("AUTO"),
});

export type ImportSourceType = z.infer<typeof importSourceTypeEnum>;
export type DuplicateHandling = z.infer<typeof duplicateHandlingEnum>;
export type AssignmentMode = z.infer<typeof assignmentModeEnum>;
export type ImportMapping = z.infer<typeof importMappingSchema>;
export type BulkImportLeadsInput = z.infer<typeof bulkImportLeadsSchema>;