export interface Match {
  id: string;
  teamId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  competition: string;
  ageGroup: string;
  notes: string;
  scoutId: string;
  assignedScoutId?: string;
  templateId?: string;
  status: "pending" | "in_progress" | "completed";
}

export interface Attribute {
  name: string;
  description: string;
  id: string;
  active?: boolean;
  category?: string;
}

export interface Template {
  name: string;
  id: string;
  active?: boolean;
  templateAttributes: TemplateAttribute[];
}

export interface TemplateAttribute {
  template_id: string;
  attribute_id: string;
  category: string;
  order?: string;
}

export interface DrillCategory {
  id: string;
  name: string;
}

export interface Drill {
  id: string;
  name: string;
  description: string;
  intensity: string;
  categories?: DrillCategory[];
  coachingPoints: string[];
  videoUrl?: string;
  imageUrl?: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  position: string;
  secondaryPosition?: string;
  dateOfBirth: string;
  nationality: string;
  club?: string;
  school?: string;
  ageGroup: string;
  photoUrl?: string;
  email?: string;
  mobile?: string;
  scoutId: string;
  createdAt: string;
  updatedAt: string;
  shirt?: string;
  shorts?: string;
  /** Total inches — see app/utils/height.ts. Collected as feet + inches. */
  motherHeightInches?: number | null;
  fatherHeightInches?: number | null;
  medicalConditions?: string | null;
  playerAvgScores?: {
    avgOverallScore?: string;
  };
  playerGroupMembers?: { id: string }[];
  mentor?: string;
}

export type SessionItem = {
  id: string;
  title: string;
  description: string;
  duration: string;
  assignedTo: string;
  assignedToNames?: string[];
  eventId: string;
  drillId?: string;
  responsible?: string | string[];
  type: string;
  order?: number;
  events?: Event;
  drills?: Drill;
};

export type SkillRating = {
  technique: number;
  physical: number;
  tactical: number;
  mental: number;
  potential: number;
};

export interface PlayerReport {
  id: string;
  playerId: string;
  matchId?: string;
  eventId?: string;
  scoutId: string;
  position: string;
  suggestedPosition?: string;
  notes: string;
  createdAt: string;
  templateId: string;
  events?: Event;
  matches?: Match;
  reportScores: any[];
}

export interface Scout {
  id: string;
  name: string;
  role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
}

export interface User extends Scout {
  avatar?: string;
  email?: string;
  invitedBy?: string;
  invitedAt?: string;
  status?: "active" | "pending" | "inactive";
  teamMemberships?: TeamMembership[];
  current_team?: string;
  team?: Team;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  type: "mens" | "womens" | "youth" | "junior" | "academy" | "other";
  createdAt: string;
  createdBy: string;
  progresTemplateId?: string;
  defaultGroup?: string;
  /**
   * Bib numbers the club no longer holds, keyed by bib colour id — see
   * supabase/migrations/20260826_team_missing_bib_numbers.sql. The register
   * numbers around these.
   */
  missingBibNumbers?: Record<string, number[]>;
  /**
   * The last number in each bib set, keyed by bib colour id. A colour with no
   * entry is uncapped. See
   * supabase/migrations/20260826_team_highest_bib_numbers.sql.
   */
  highestBibNumbers?: Record<string, number>;
}

export interface TeamMembership {
  teamId: string;
  role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: "ADMIN" | "HEAD_OF_DEPARTMENT" | "SCOUT" | "COACH";
  teamId?: string;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: "pending" | "accepted" | "expired";
  token: string;
}

export interface Event {
  id: string;
  teamId: string;
  name: string;
  description: string;
  date: string;
  endDate?: string;
  /** Wall-clock "HH:MM[:SS]" on `date`. Undefined when no time is set. */
  startTime?: string | null;
  endTime?: string | null;
  location: string;
  ageGroup: string;
  maxParticipants?: number;
  registrationDeadline: string;
  cost?: number;
  requirements?: string;
  scoutId: string;
  createdAt: string;
  templateId: string;
  eventType?: string;
  canRegister?: boolean;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
}

export interface EventRegistration {
  id: string;
  eventId: string;
  playerId: string;
  registeredAt: string;
  status: "registered" | "confirmed" | "attended" | "no_show";
  notes?: string;
  email?: string;
  players: Player;
}

export interface ValidationCode {
  id: string;
  email: string;
  code: string;
  playerId: string;
  expiresAt: string;
  used: boolean;
}

export interface PlayerGroup {
  id: string;
  teamId: string;
  name: string;
  description: string;
  playerIds?: string[];
  createdBy: string;
  createdAt: string;
  type: "selection" | "squad" | "program" | "other";
  status: "active" | "inactive";
  playerGroupMembers?: { players: Player; playerId: string }[];
}

export interface Club {
  id: string;
  name: string;
  type: "professional" | "amateur" | "school" | "youth" | "other";
  location?: string;
  founded?: string;
  website?: string;
  createdAt: string;
  createdBy: string;
  status: "active" | "inactive";
}

export type ProgrammeSection =
  | { type: "text"; content: string }
  | { type: "image"; url: string; caption?: string };

export interface Programme {
  id: string;
  teamId: string;
  name: string;
  url?: string;
  description: string;
  imageUrl?: string;
  registrationDeadline: string;
  canRegister: boolean;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  sections?: ProgrammeSection[];
  availabilityDescription?: string;
  eligibleDobFrom?: string;
  eligibleDobTo?: string;
  /**
   * Optional profile details this programme asks for at registration.
   * Keys are defined in app/utils/programme-fields.ts.
   */
  requestedFields?: string[] | null;
  /** Subset of requestedFields the registrant must fill in. */
  requiredFields?: string[] | null;
  /** Maximum registrations allowed. Null/undefined = unlimited. */
  maxRegistrations?: number | null;
  createdBy: string;
  createdAt: string;
}

export interface ProgrammeEvent {
  id: string;
  programmeId: string;
  eventId: string;
  sortOrder: number;
  events?: Event;
}

export interface ProgrammeRegistration {
  id: string;
  programmeId: string;
  playerId: string;
  email?: string;
  status: "registered" | "confirmed" | "attended" | "no_show";
  registeredAt: string;
  /** Bib colour id from ~/utils/bibs, assigned for this programme. */
  bibColor?: string | null;
  bibNumber?: number | null;
  players?: Player;
  programmes?: Programme;
}

export interface ProgrammeEventAvailability {
  id: string;
  programmeRegistrationId: string;
  eventId: string;
  available: boolean;
}

export interface ProgrammeEventAttendance {
  id: string;
  programmeRegistrationId: string;
  eventId: string;
  attended: boolean;
  recordedAt?: string;
}

export interface ProgrammeAllowedEmail {
  id: string;
  programmeId: string;
  email: string;
  createdAt: string;
}

export interface DepthChartSlot {
  id: string;
  depthChartColumnId: string;
  playerId: string;
  sortOrder: number;
}

export interface DepthChartColumn {
  id: string;
  depthChartId: string;
  name: string;
  sortOrder: number;
  slots?: DepthChartSlot[];
}

export interface DepthChart {
  id: string;
  teamId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  columns?: DepthChartColumn[];
}
