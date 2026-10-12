export interface PlanDetail {
  residentLimit: number;
  features: string[];
}

export type PlanName = 'Basic' | 'Standard' | 'Premium';

/** Single source of truth for what each subscription plan unlocks — read by both Step 6 and the Confirmation step. */
export const PLAN_DETAILS: Record<PlanName, PlanDetail> = {
  Basic: {
    residentLimit: 50,
    features: ['Resident Management', 'Basic Reports'],
  },
  Standard: {
    residentLimit: 150,
    features: ['Resident Management', 'Basic Reports', 'Advanced Reports', 'SMS Notifications'],
  },
  Premium: {
    residentLimit: 500,
    features: [
      'Resident Management',
      'Basic Reports',
      'Advanced Reports',
      'SMS Notifications',
      'API Access',
      'Priority Support',
    ],
  },
};
