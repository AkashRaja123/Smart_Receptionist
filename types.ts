
export enum DomainType {
  EDUCATIONAL = 'Educational Institution',
  HOSPITAL = 'Hospital'
}

export enum RoleType {
  ADMIN = 'Admin',
  VISITOR = 'Visitor',
  DOCTOR = 'Doctor',
  PATIENT = 'Patient',
  STAFF = 'Staff',
  STUDENT = 'Student'
}

export interface BuildingLayout {
  buildingName: string;
  buildingType: string;
  predictedBlockType?: string; // AI's prediction of block purpose
  floors: Floor[];
  accessRules: AccessRule[];
}

export interface Floor {
  level: number;
  blocks: string[];
  rooms: Room[];
}

export interface Room {
  id: string;
  name: string;
  block: string;
  floor: number;
  description: string;
  coordinates?: { x: number; y: number }; // For map rendering
}

export interface AccessRule {
  area: string;
  restrictedRoles: string[];
  reason: string;
}

export interface UserSession {
  domain: DomainType;
  role: RoleType;
  username: string;
  institutionName: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  navigationData?: {
    path: string[];
    instructions: string[];
    isReached: boolean;
  };
}
