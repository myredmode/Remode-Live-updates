import { useState, useEffect, useCallback } from 'react';

export interface GeoLocationData {
  countryCode: string;
  countryName: string;
  currency: 'INR' | 'USD';
  currencySymbol: '₹' | '$';
  isDomesticIndia: boolean;
  ip?: string;
  city?: string;
}

const STORAGE_KEY_COUNTRY = 'redmode_geo_country';
const STORAGE_KEY_COUNTRY_CODE = 'redmode_geo_country_code';
const STORAGE_KEY_CURRENCY = 'redmode_geo_currency';

// Common country code to standard country name mapping
const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
  MY: 'Malaysia',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  NZ: 'New Zealand',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  KW: 'Kuwait',
  OM: 'Oman',
  BH: 'Bahrain',
  JP: 'Japan',
  KR: 'South Korea',
  IT: 'Italy',
  ES: 'Spain',
  IE: 'Ireland',
  CH: 'Switzerland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  ZA: 'South Africa',
};

export const useIpGeolocation = () => {
  // Initialize from cache or safe default (India / INR)
  const [geoData, setGeoData] = useState<GeoLocationData>(() => {
    try {
      const savedCountry = localStorage.getItem(STORAGE_KEY_COUNTRY);
      const savedCode = localStorage.getItem(STORAGE_KEY_COUNTRY_CODE);
      const savedCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY) as 'INR' | 'USD' | null;

      if (savedCountry && savedCode && savedCurrency) {
        return {
          countryCode: savedCode,
          countryName: savedCountry,
          currency: savedCurrency,
          currencySymbol: savedCurrency === 'USD' ? '$' : '₹',
          isDomesticIndia: savedCode.toUpperCase() === 'IN',
        };
      }
    } catch {
      // Ignore localStorage errors
    }

    return {
      countryCode: 'IN',
      countryName: 'India',
      currency: 'INR',
      currencySymbol: '₹',
      isDomesticIndia: true,
    };
  });

  const [isLoadingGeo, setIsLoadingGeo] = useState<boolean>(false);
  const [hasDetected, setHasDetected] = useState<boolean>(false);

  // Auto-detect user country and currency on initial load
  useEffect(() => {
    // If already detected in this session or cached in localStorage, skip network request
    try {
      const cachedCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY);
      const cachedCode = localStorage.getItem(STORAGE_KEY_COUNTRY_CODE);
      if (cachedCurrency && cachedCode) {
        setHasDetected(true);
        return;
      }
    } catch {
      // Ignore
    }

    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout safety

    const detectLocation = async () => {
      setIsLoadingGeo(true);

      // Strategy 1: Try ipapi.co (detailed, free tier)
      try {
        const response = await fetch('https://ipapi.co/json/', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.country_code) {
            applyLocation(data.country_code, data.country_name || COUNTRY_NAMES[data.country_code] || 'International', data.ip, data.city);
            return;
          }
        }
      } catch {
        // Fallback to strategy 2
      }

      // Strategy 2: Fast lightweight fallback - api.country.is
      try {
        const response2 = await fetch('https://api.country.is/', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (response2.ok) {
          const data2 = await response2.json();
          if (data2 && data2.country) {
            const code = data2.country.toUpperCase();
            applyLocation(code, COUNTRY_NAMES[code] || 'International', data2.ip);
            return;
          }
        }
      } catch {
        // Fallback to strategy 3
      }

      // Strategy 3: ipwho.is
      try {
        const response3 = await fetch('https://ipwho.is/', {
          signal: controller.signal,
        });

        if (response3.ok) {
          const data3 = await response3.json();
          if (data3 && data3.country_code) {
            const code = data3.country_code.toUpperCase();
            applyLocation(code, data3.country || COUNTRY_NAMES[code] || 'International', data3.ip, data3.city);
            return;
          }
        }
      } catch {
        // All fail -> Keep safe default (India / INR)
      } finally {
        if (isMounted) {
          setIsLoadingGeo(false);
          setHasDetected(true);
        }
      }
    };

    const applyLocation = (code: string, name: string, ip?: string, city?: string) => {
      if (!isMounted) return;
      const normalizedCode = (code || 'IN').toUpperCase();
      const isIndia = normalizedCode === 'IN';
      const currency: 'INR' | 'USD' = isIndia ? 'INR' : 'USD';
      const currencySymbol: '₹' | '$' = isIndia ? '₹' : '$';

      const newGeo: GeoLocationData = {
        countryCode: normalizedCode,
        countryName: isIndia ? 'India' : (name || COUNTRY_NAMES[normalizedCode] || 'International'),
        currency,
        currencySymbol,
        isDomesticIndia: isIndia,
        ip,
        city,
      };

      setGeoData(newGeo);
      try {
        localStorage.setItem(STORAGE_KEY_COUNTRY, newGeo.countryName);
        localStorage.setItem(STORAGE_KEY_COUNTRY_CODE, newGeo.countryCode);
        localStorage.setItem(STORAGE_KEY_CURRENCY, newGeo.currency);
      } catch {
        // Ignore
      }
      setIsLoadingGeo(false);
      setHasDetected(true);
    };

    detectLocation();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Manual currency toggle / override
  const setManualCurrency = useCallback((currency: 'INR' | 'USD') => {
    setGeoData((prev) => {
      const isIndia = currency === 'INR';
      const updated: GeoLocationData = {
        ...prev,
        currency,
        currencySymbol: currency === 'USD' ? '$' : '₹',
        isDomesticIndia: isIndia,
        countryCode: isIndia ? 'IN' : (prev.countryCode === 'IN' ? 'US' : prev.countryCode),
        countryName: isIndia ? 'India' : (prev.countryName === 'India' ? 'United States' : prev.countryName),
      };

      try {
        localStorage.setItem(STORAGE_KEY_CURRENCY, updated.currency);
        localStorage.setItem(STORAGE_KEY_COUNTRY_CODE, updated.countryCode);
        localStorage.setItem(STORAGE_KEY_COUNTRY, updated.countryName);
      } catch {
        // Ignore
      }

      return updated;
    });
  }, []);

  // Manual country selection
  const setManualCountry = useCallback((countryName: string, countryCode?: string) => {
    const code = (countryCode || (countryName.toLowerCase() === 'india' ? 'IN' : 'US')).toUpperCase();
    const isIndia = code === 'IN' || countryName.toLowerCase() === 'india';
    const currency: 'INR' | 'USD' = isIndia ? 'INR' : 'USD';

    setGeoData({
      countryCode: code,
      countryName,
      currency,
      currencySymbol: currency === 'USD' ? '$' : '₹',
      isDomesticIndia: isIndia,
    });

    try {
      localStorage.setItem(STORAGE_KEY_COUNTRY, countryName);
      localStorage.setItem(STORAGE_KEY_COUNTRY_CODE, code);
      localStorage.setItem(STORAGE_KEY_CURRENCY, currency);
    } catch {
      // Ignore
    }
  }, []);

  return {
    geoData,
    isLoadingGeo,
    hasDetected,
    setManualCurrency,
    setManualCountry,
  };
};
