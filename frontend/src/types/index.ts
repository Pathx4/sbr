export type ActivityType = 'training' | 'meeting' | 'field_trip' | '';

export interface BudgetFormData {
  regulation: string;
  activityType: ActivityType;
  
  // Common
  date: string;
  days: string;
  
  // Training
  projectName: string;
  location: string;
  totalAttendees: string;
  speakerThaiNormal: string;
  speakerThaiExpert: string;
  speakerForeign: string;
  speakerForeignNeedsTravel: boolean;
  speakerNeedsTravel: boolean;
  
  staffCount: string;
  staffNames: string[];
  staffRooms: { id: string; person1: string; person2: string }[];
  
  // Accommodation
  staffNeedsRoom: boolean;
  staffDoubleRooms: string;
  staffSingleRooms: string;
  executivesNeedRoom: boolean;
  directorsNeedRoom: boolean;
  
  executiveNames: string[]; // List of selected executives from JSON
  directorNames: string[]; // List of selected directors from JSON
  
  // Meeting & Field Trip
  committeeCount: string;
  
  // Explicit additional costs
  tollFee: string;
  roomRental: string;
  documentFee: string;
  carRental: string;
  insurance: string;
  
  // Food & Regulation
  foodBreakMorning: boolean;
  foodBreakMorningDays: number[];
  foodBreakAfternoon: boolean;
  foodBreakAfternoonDays: number[];
  foodLunch: boolean;
  foodLunchDays: number[];
  foodReception: boolean;
  foodReceptionDays: number[];

  // New customizable costs
  speakerForeignFlightFees: string[];
  speakerTaxiFee: string;
  foodOthersAmount: string;
  foodOthersDetails: string;
}

export const initialFormData: BudgetFormData = {
  regulation: '',
  activityType: '',
  date: '',
  days: '',
  projectName: '',
  location: '',
  totalAttendees: '',
  committeeCount: '',
  staffCount: '',
  staffNames: [],
  staffRooms: [],
  executiveNames: [],
  directorNames: [],
  speakerThaiNormal: '',
  speakerThaiExpert: '',
  speakerForeign: '',
  speakerForeignNeedsTravel: false,
  speakerNeedsTravel: false,
  staffNeedsRoom: false,
  staffDoubleRooms: '',
  staffSingleRooms: '',
  executivesNeedRoom: false,
  directorsNeedRoom: false,
  tollFee: '',
  roomRental: '',
  documentFee: '',
  carRental: '',
  insurance: '',
  foodBreakMorning: false,
  foodBreakMorningDays: [],
  foodBreakAfternoon: false,
  foodBreakAfternoonDays: [],
  foodLunch: false,
  foodLunchDays: [],
  foodReception: false,
  foodReceptionDays: [],
  speakerForeignFlightFees: [],
  speakerTaxiFee: '',
  foodOthersAmount: '',
  foodOthersDetails: '',
};
