export interface CuppingSession {
  id: string
  name: string
  cuppingDate: string
  // roastDate removed from session
  status: 'draft' | 'completed' | 'synced'
  createdAt: string
  updatedAt: string
}

export interface Sample {
  id: string
  sessionId: string
  name: string
  origin: string
  process: string
  roastDate: string // roastDate added to sample
  createdAt: string
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
