/**
 * Demographics utility functions for application statistics
 */

// Comprehensive list of Latin American countries and territories
const LATAM_COUNTRIES = [
  // South America
  'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 
  'Ecuador', 'Guyana', 'Paraguay', 'Peru', 'Suriname', 
  'Uruguay', 'Venezuela', 'French Guiana',
  
  // Central America
  'Belize', 'Costa Rica', 'El Salvador', 'Guatemala',
  'Honduras', 'Nicaragua', 'Panama',
  
  // Caribbean (Spanish/Portuguese speaking)
  'Cuba', 'Dominican Republic', 'Puerto Rico',
  
  // North America (Mexico)
  'Mexico',
  
  // Alternative names and variations
  'Brasil', 'México', 'Perú', 'República Dominicana',
  'El Salvador', 'Costa Rica', 'Puerto Rico',
  
  // Common abbreviations
  'DR', 'PR', 'CR'
];

/**
 * Determines if a nationality/country is from Latin America
 * @param nationality The nationality string from application responses
 * @returns true if the nationality is from a LATAM country
 */
export function isLatamCountry(nationality: string): boolean {
  if (!nationality || typeof nationality !== 'string') {
    return false;
  }

  const normalizedNationality = nationality.trim().toLowerCase();
  
  return LATAM_COUNTRIES.some(country => 
    normalizedNationality.includes(country.toLowerCase()) ||
    country.toLowerCase().includes(normalizedNationality)
  );
}

/**
 * Normalizes gender responses to standard categories
 * @param genderResponse The raw gender response from applications
 * @returns Normalized gender category
 */
export function normalizeGender(genderResponse: string): 'male' | 'female' | 'other' | 'prefer_not_to_say' | 'unspecified' {
  if (!genderResponse || typeof genderResponse !== 'string') {
    return 'unspecified';
  }

  const normalized = genderResponse.trim().toLowerCase();
  
  // Male variations
  if (normalized.includes('male') && !normalized.includes('female') || 
      normalized.includes('man') || normalized.includes('hombre') || 
      normalized === 'm' || normalized === 'masculino') {
    return 'male';
  }
  
  // Female variations  
  if (normalized.includes('female') || normalized.includes('woman') || 
      normalized.includes('mujer') || normalized === 'f' || 
      normalized === 'femenino') {
    return 'female';
  }
  
  // Prefer not to say variations
  if (normalized.includes('prefer not') || normalized.includes('prefiero no') ||
      normalized.includes('decline') || normalized.includes('no answer')) {
    return 'prefer_not_to_say';
  }
  
  // Non-binary and other variations
  if (normalized.includes('non-binary') || normalized.includes('non binary') ||
      normalized.includes('other') || normalized.includes('otro') ||
      normalized.includes('genderfluid') || normalized.includes('gender fluid') ||
      normalized.includes('agender') || normalized.includes('bigender') ||
      normalized.includes('pangender') || normalized.includes('genderqueer')) {
    return 'other';
  }
  
  return 'unspecified';
}

/**
 * Interface for demographic statistics
 */
export interface DemographicStats {
  total: number;
  gender: {
    male: number;
    female: number;
    other: number;
    prefer_not_to_say: number;
    unspecified: number;
    percentages: {
      male: number;
      female: number;
      other: number;
      prefer_not_to_say: number;
      unspecified: number;
    };
  };
  region: {
    latam: number;
    non_latam: number;
    unspecified: number;
    percentages: {
      latam: number;
      non_latam: number;
      unspecified: number;
    };
  };
}

/**
 * Professional role categories for curation tracking
 */
export type ProfessionalRole = 
  | 'entrepreneur' 
  | 'developer' 
  | 'academic' 
  | 'designer' 
  | 'product_manager' 
  | 'solo_builder' 
  | 'unspecified';

/**
 * Role categorization keywords for matching professional backgrounds
 */
const ROLE_KEYWORDS = {
  entrepreneur: [
    'entrepreneur', 'founder', 'co-founder', 'startup', 'ceo', 'chief executive',
    'business owner', 'company owner', 'venture', 'emprendedor', 'fundador'
  ],
  developer: [
    'developer', 'programmer', 'software engineer', 'engineer', 'dev', 
    'full stack', 'frontend', 'backend', 'web developer', 'mobile developer',
    'desarrollador', 'programador', 'ingeniero'
  ],
  academic: [
    'professor', 'researcher', 'phd', 'ph.d', 'doctor', 'academic', 'university',
    'postdoc', 'graduate student', 'research', 'scholar', 'profesor', 'investigador'
  ],
  designer: [
    'designer', 'ux', 'ui', 'user experience', 'user interface', 'graphic designer',
    'product designer', 'visual designer', 'design', 'diseñador'
  ],
  product_manager: [
    'product manager', 'pm', 'product owner', 'product lead', 'product',
    'gerente de producto', 'jefe de producto'
  ],
  solo_builder: [
    'solo builder', 'indie hacker', 'independent developer', 'freelancer',
    'consultant', 'solo founder', 'independent', 'autónomo', 'freelance'
  ]
};

/**
 * Normalizes professional role/background responses to standard categories
 * @param roleResponse The raw professional background response from applications
 * @returns Normalized professional role category
 */
export function normalizeProfessionalRole(roleResponse: string): ProfessionalRole {
  if (!roleResponse || typeof roleResponse !== 'string') {
    return 'unspecified';
  }

  const normalized = roleResponse.trim().toLowerCase();
  
  // Check each role category against keywords
  for (const [role, keywords] of Object.entries(ROLE_KEYWORDS)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return role as ProfessionalRole;
    }
  }
  
  return 'unspecified';
}

/**
 * Interface for professional role statistics
 */
export interface RoleStats {
  total: number;
  roles: {
    entrepreneur: number;
    developer: number;
    academic: number;
    designer: number;
    product_manager: number;
    solo_builder: number;
    unspecified: number;
    percentages: {
      entrepreneur: number;
      developer: number;
      academic: number;
      designer: number;
      product_manager: number;
      solo_builder: number;
      unspecified: number;
    };
  };
}

/**
 * Curation spec targets for residency balance
 */
export const CURATION_TARGETS = {
  region: {
    latam: 40,      // 40% LATAM
    global: 60      // 60% Global (non-LATAM)
  },
  roles: {
    entrepreneur: 60,     // 60% Entrepreneurs
    developer: 30,        // 30% Developers
    academic: 10,         // 10% Academics
    designer: 8,          // 7-10% Designers (using 8% as middle)
    product_manager: 10,  // 10% Product Managers
    solo_builder: 10      // 10% Solo Builders
  }
} as const;

/**
 * Enhanced demographic statistics including role tracking
 */
export interface ExtendedDemographicStats extends DemographicStats {
  roleStats: RoleStats;
  curationBalance: {
    region: {
      latamTarget: number;
      latamActual: number;
      latamDifference: number;
      globalTarget: number;
      globalActual: number;
      globalDifference: number;
    };
    roles: Record<ProfessionalRole, {
      target: number;
      actual: number;
      difference: number;
    }>;
  };
}

/**
 * Calculates percentages with proper rounding
 * @param count The count for this category
 * @param total The total count
 * @returns Percentage rounded to 1 decimal place
 */
export function calculatePercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10; // Round to 1 decimal place
}

/**
 * Calculates difference from target percentage
 * @param actual The actual percentage
 * @param target The target percentage
 * @returns Difference (positive means over target, negative means under target)
 */
export function calculateTargetDifference(actual: number, target: number): number {
  return Math.round((actual - target) * 10) / 10; // Round to 1 decimal place
}