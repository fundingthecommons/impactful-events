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
 * Calculates percentages with proper rounding
 * @param count The count for this category
 * @param total The total count
 * @returns Percentage rounded to 1 decimal place
 */
export function calculatePercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10; // Round to 1 decimal place
}