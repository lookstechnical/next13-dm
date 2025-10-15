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
