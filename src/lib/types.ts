export interface CuppingSession {
  id: string
  name: string
  cuppingDate: string
  // roastDate removed from session
  status: 'draft' | 'completed' | 'synced'
  blindMode?: boolean // Blind cupping mode
  blindLabelType?: 'letter' | 'number' // 'letter' (A, B, C) or 'number' (1, 2, 3)
  type?: 'internal' | 'event' // 'internal' by default, 'event' for public events
  template?: 'standard' | 'voting' // 'standard' for SCA scoring, 'voting' for quick vote
  isGuest?: boolean // Indicate if this session was joined via a share link
  createdAt: string
  updatedAt: string
}

export interface Sample {
  id: string
  sessionId: string
  name: string
  origin: string
  process: string
  // roastDate removed from sample
  type?: 'pre_shipment' | 'processing' | 'arrival' | 'sales' | 'self_drawn' | 'other'
  createdAt: string
}

export interface GlobalSample {
  id: string;
  name: string;
  origin: string;
  process: string;
  // roastDate removed from global sample
  type: 'pre_shipment' | 'processing' | 'arrival' | 'sales' | 'self_drawn' | 'other';
  // Extended fields
  variety?: string;       // 豆种
  defectRate?: string;    // 瑕疵率
  moisture?: string;      // 水分
  waterActivity?: string; // 水活性
  screenSize?: string;    // 目数
  cropYear?: string;      // 产季
  supplier?: string;      // 提供商
  
  createdAt: string;
  updatedAt?: string;
  status?: 'active' | 'archived'; // For soft delete or hiding
  syncStatus?: 'synced' | 'pending';
  feishuRecordId?: string;
}

export interface CuppingScore {
  id: string
  sampleId: string
  cupperName: string // cupperName added
  fragrance: number
  flavor: number
  aftertaste: number
  acidity: number
  body: number
  balance: number
  uniformity: number
  cleanCup: number
  sweetness: number
  overall: number
  totalScore: number
  defects: Defect[]
  notes: string
  isFavorite?: boolean // For voting mode
  createdAt: string
}

export interface Defect {
  type: 'taint' | 'fault'
  intensity: number // 1-5 cups
  cups: number
}

export interface SessionWithSamples extends CuppingSession {
  samples: (Sample & { score?: CuppingScore })[]
}
