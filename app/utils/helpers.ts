/**
 * Generate a unique ID with a prefix
 */
export const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const POSITIONS = [
  "Fullback",
  "Winger",
  "Centre",
  "Stand-off",
  "Scrum-half",
  "Prop",
  "Hooker",
  "Second Row",
  "Loose Forward",
];
/**
 * Format date from ISO string to readable format
 */
export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;

  const today = new Date();
  const birthDate = new Date(dateOfBirth);

  // Validate the date
  if (isNaN(birthDate.getTime())) {
    console.warn(`Invalid date of birth for age calculation: ${dateOfBirth}`);
    return 0;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birth month hasn't occurred yet this year
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

export const calculateAgeGroup = (dateOfBirth: string): string => {
  if (!dateOfBirth) return "Unknown";

  // Parse date safely without timezone shift
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birthDate = new Date(year, month - 1, day);

  if (isNaN(birthDate.getTime())) {
    console.warn(`Invalid date of birth: ${dateOfBirth}`);
    return "Unknown";
  }

  const today = new Date();

  // Determine academic year
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const academicYear = currentMonth >= 8 ? currentYear : currentYear - 1;

  // Age on 1 September
  let ageOnSept1st = academicYear - birthDate.getFullYear();
  if (
    birthDate.getMonth() > 8 ||
    (birthDate.getMonth() === 8 && birthDate.getDate() > 1)
  ) {
    ageOnSept1st--;
  }

  if (ageOnSept1st >= 18) {
    return "Senior";
  }

  // Clamp to minimum U12
  const uGroupNumber = Math.max(12, ageOnSept1st + 1);

  // Clamp to U18 maximum
  if (uGroupNumber > 18) {
    return "Senior";
  }

  return `U${uGroupNumber}`;
};

/**
 * Calculate relative age quartile within school year (September to August)
 * Q1 = Sept-Nov (oldest), Q2 = Dec-Feb, Q3 = Mar-May, Q4 = Jun-Aug (youngest)
 */
export const calculateRelativeAgeQuartile = (
  dateOfBirth: string
): {
  quartile: 1 | 2 | 3 | 4;
  label: string;
  description: string;
} => {
  if (!dateOfBirth) {
    return {
      quartile: 1,
      label: "Q?",
      description: "Unknown birth date",
    };
  }

  // Handle Supabase date format (YYYY-MM-DD) properly
  const birthDate = new Date(dateOfBirth + "T00:00:00.000Z");

  // Validate the date
  if (isNaN(birthDate.getTime())) {
    console.warn(
      `Invalid date of birth for quartile calculation: ${dateOfBirth}`
    );
    return {
      quartile: 1,
      label: "Q?",
      description: "Invalid birth date",
    };
  }

  const birthMonth = birthDate.getMonth(); // 0-11 (Jan=0, Dec=11)

  // Map months to quartiles based on UK school year (Sept-Aug)
  if (birthMonth >= 8 && birthMonth <= 10) {
    // Sept, Oct, Nov
    return {
      quartile: 1,
      label: "Q1",
      description:
        "Oldest in year group (Sept-Nov births) - potential relative age advantage",
    };
  } else if (birthMonth >= 11 || birthMonth <= 1) {
    // Dec, Jan, Feb
    return {
      quartile: 2,
      label: "Q2",
      description: "Second oldest in year group (Dec-Feb births)",
    };
  } else if (birthMonth >= 2 && birthMonth <= 4) {
    // Mar, Apr, May
    return {
      quartile: 3,
      label: "Q3",
      description: "Second youngest in year group (Mar-May births)",
    };
  } else {
    // Jun, Jul, Aug
    return {
      quartile: 4,
      label: "Q4",
      description:
        "Youngest in year group (Jun-Aug births) - potential relative age disadvantage",
    };
  }
};

/**
 * Calculate average rating from an array of numbers
 */
export const calculateAverage = (ratings: number[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return +(sum / ratings.length).toFixed(1);
};

/**
 * Convert a numeric rating to a text description
 */
export const ratingToText = (rating: number): string => {
  if (rating >= 9) return "Exceptional";
  if (rating >= 8) return "Excellent";
  if (rating >= 7) return "Very Good";
  if (rating >= 6) return "Good";
  if (rating >= 5) return "Average";
  if (rating >= 4) return "Below Average";
  if (rating >= 3) return "Poor";
  if (rating >= 2) return "Very Poor";
  return "Unacceptable";
};

/**
 * Get color class based on rating value
 */
export const getRatingColorClass = (rating: number): string => {
  if (rating >= 9) return "text-emerald-600";
  if (rating >= 8) return "text-emerald-500";
  if (rating >= 7) return "text-green-500";
  if (rating >= 6) return "text-green-400";
  if (rating >= 5) return "text-yellow-500";
  if (rating >= 4) return "text-amber-500";
  if (rating >= 3) return "text-orange-500";
  if (rating >= 2) return "text-red-500";
  return "text-red-600";
};

export type AnyObject = { [key: string]: any };

export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function convertKeysToCamelCase<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => convertKeysToCamelCase(item)) as T;
  } else if (input !== null && typeof input === "object") {
    const result: AnyObject = {};
    for (const [key, value] of Object.entries(input)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = convertKeysToCamelCase(value);
    }
    return result as T;
  }
  return input;
}
