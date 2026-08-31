import { z } from "zod";

export interface MatchingSettings {
  matchThreshold: number;
  potentialFloor: number;
  titleWeight: number;
  categoryWeight: number;
  geoWeight: number;
  descWeight: number;
  maxRadiusKm: number;
  autoScanOnCreate: boolean;
}

export interface SupportSettings {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  operatingCity: string;
  workingHours: string;
}

export interface RecoverySettings {
  maxClaimAttempts: number;
  otpExpiryMinutes: number;
  pickupWindowDays: number;
  requireProofDetails: boolean;
}

export interface FeatureSettings {
  enableAutoMatching: boolean;
  enableSmsNotifications: boolean;
  enablePublicRegistration: boolean;
  maintenanceMode: boolean;
}

export interface PlatformSettings {
  matching: MatchingSettings;
  support: SupportSettings;
  recovery: RecoverySettings;
  features: FeatureSettings;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  matching: {
    matchThreshold: 0.6,
    potentialFloor: 0.35,
    titleWeight: 0.4,
    categoryWeight: 0.25,
    geoWeight: 0.2,
    descWeight: 0.15,
    maxRadiusKm: 50,
    autoScanOnCreate: true,
  },
  support: {
    siteName: "واصل — منصة المفقودات والمعثورات",
    supportEmail: "support@wasel.ye",
    supportPhone: "+967 770 000 000",
    operatingCity: "عتق - محافظة شبوة",
    workingHours: "السبت - الخميس: 8:00 ص - 8:30 م",
  },
  recovery: {
    maxClaimAttempts: 3,
    otpExpiryMinutes: 30,
    pickupWindowDays: 7,
    requireProofDetails: true,
  },
  features: {
    enableAutoMatching: true,
    enableSmsNotifications: false,
    enablePublicRegistration: true,
    maintenanceMode: false,
  },
};

export const updateSettingsSchema = z.object({
  matching: z
    .object({
      matchThreshold: z.number().min(0).max(1).optional(),
      potentialFloor: z.number().min(0).max(1).optional(),
      titleWeight: z.number().min(0).max(1).optional(),
      categoryWeight: z.number().min(0).max(1).optional(),
      geoWeight: z.number().min(0).max(1).optional(),
      descWeight: z.number().min(0).max(1).optional(),
      maxRadiusKm: z.number().min(1).max(500).optional(),
      autoScanOnCreate: z.boolean().optional(),
    })
    .optional(),
  support: z
    .object({
      siteName: z.string().min(1).max(120).optional(),
      supportEmail: z.string().email().optional(),
      supportPhone: z.string().min(3).max(50).optional(),
      operatingCity: z.string().min(1).max(100).optional(),
      workingHours: z.string().min(1).max(150).optional(),
    })
    .optional(),
  recovery: z
    .object({
      maxClaimAttempts: z.number().min(1).max(20).optional(),
      otpExpiryMinutes: z.number().min(5).max(1440).optional(),
      pickupWindowDays: z.number().min(1).max(60).optional(),
      requireProofDetails: z.boolean().optional(),
    })
    .optional(),
  features: z
    .object({
      enableAutoMatching: z.boolean().optional(),
      enableSmsNotifications: z.boolean().optional(),
      enablePublicRegistration: z.boolean().optional(),
      maintenanceMode: z.boolean().optional(),
    })
    .optional(),
});
