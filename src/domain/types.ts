import type { ISODate } from './dates';

export type Species = 'cat' | 'dog';
export type Look = 'juzi' | 'zhima' | 'doubao' | 'kele';
export type Pose = 'happy' | 'calm' | 'unwell';
export type Weather = 'sun' | 'cloud' | 'rain' | 'alert';
export type Visibility = 'private' | 'family' | 'friends' | 'nearby' | 'public';
export type Layer = 'friends' | 'nearby' | 'city' | 'interest';
export type Size = 'S' | 'M' | 'L';
export type PlanKind = 'deworm_in' | 'deworm_out' | 'vaccine_core' | 'vaccine_rabies' | 'weigh' | 'checkup' | 'nails' | 'teeth' | 'med' | 'revisit';
export type TriageLevel = 'emergency' | 'appointment' | 'observe';
export type EventType = 'daily' | 'care' | 'weight' | 'moment' | 'visit' | 'walk' | 'help' | 'check';

export interface Member { id: string; name: string }

export interface Pet {
  id: string; name: string; species: Species; breed: string; look: Look; adoptedAt: ISODate;
  birthday?: ISODate; sex?: 'm' | 'f'; neutered?: boolean; lifestyle?: 'indoor' | 'outdoor' | 'multi';
  allergies?: string; chip?: string; hospital?: string; weightRange?: [number, number]; size?: Size; lost?: boolean;
}

export interface Plan {
  id: string; petId: string; kind: PlanKind; title: string; intervalDays: number;
  lastDone?: ISODate; dueDate?: ISODate; product?: string; unknown?: boolean; endDate?: ISODate;
}

export interface PetEvent {
  id: string; petId: string; type: EventType; date: ISODate; by: string; title: string;
  detail?: string; visibility: Visibility; image?: string;
  data?: { kg?: number; issues?: string[]; ok?: boolean; onTime?: boolean; kind?: PlanKind; level?: TriageLevel };
}

export interface DailyEntry { petId: string; ok: boolean; issues: string[] }

export interface CheckSession {
  id: string; petId: string; date: ISODate; createdAt: number; redFlags: string[]; parts: string[];
  symptoms: string[]; duration: string; level: TriageLevel;
}

export interface Post {
  id: string; author: string; look: Look; layer: Layer; circle: string; text: string; tags: string[];
  ask?: boolean; fish: number; answers: number; adopted?: boolean; mine?: boolean; liked?: boolean; ago: string; image?: string; cover?: string;
}

export interface Sighting { at: string; note: string; by: string }
export interface LostAlert {
  id: string; petId?: string; petName: string; look?: Look; desc: string; area: string; since: string;
  radiusKm: number; sightings: Sighting[]; mine: boolean; resolved: boolean;
}

export interface WalkProfile {
  petId: string; size: Size; temper: string[]; slots: string[]; places: string[]; scaredOfBig: boolean; inHeat: boolean;
}
export interface WalkDog { name: string; look: Look; size: Size }
/** 遛狗局：多人、公共地点、固定时段；dogs 不含自家狗 */
export interface WalkEvent {
  id: string; host: string; mine?: boolean; when: string; slot: string; place: string; geohash: string;
  sizes: Size[]; vibe: string; capacity: number; dogs: WalkDog[]; joined: boolean;
  status: 'open' | 'checkedIn' | 'rated'; rating?: 'great' | 'ok' | 'bad';
}
export interface Foster {
  id: string; petId: string; from: ISODate; to: ISODate; services: string[]; status: 'open' | 'accepted' | 'done';
  helper?: string; checkins: { date: ISODate; note: string }[]; rating?: string;
}
export interface Home { id: string; owner: string; petName: string; look: Look; friend: boolean }
export interface Settings { dailyTime: string; leadMonthly: number; leadYearly: number }

export interface State {
  version: number; nickname: string; members: Member[]; me: string; fish: number; badges: string[]; settings: Settings;
  pets: Pet[]; plans: Plan[]; events: PetEvent[]; sunnyDays: Record<string, number>;
  dailyDone: Record<ISODate, boolean>; dailySkipped: Record<ISODate, boolean>; followUp: Record<string, ISODate>;
  checks: CheckSession[]; posts: Post[]; lost: LostAlert[]; walk: WalkProfile; walkEvents: WalkEvent[];
  hiddenHosts: string[]; friends: string[];
  fosters: Foster[]; homes: Home[]; visitsSent: Record<string, number>; likesToday: Record<ISODate, number>;
  myGeohash: string; toast?: string;
}
