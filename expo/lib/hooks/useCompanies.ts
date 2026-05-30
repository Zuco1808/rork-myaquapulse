import { useEffect, useState } from 'react';
import { getCompanies } from '@/lib/api/companies';
import { mockCompanies } from '@/mocks/companies';

export interface CompanyOption {
  id: string;
  name: string;
}

/**
 * Loads companies from Supabase with mock fallback if the API call fails.
 * Used for company-picker dropdowns in user/location edit/add screens.
 */
export function useCompanies(): { companies: CompanyOption[]; isLoading: boolean } {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getCompanies()
      .then((data) => {
        if (!mounted) return;
        setCompanies(data.map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {
        if (!mounted) return;
        setCompanies(mockCompanies.map((c) => ({ id: c.id, name: c.name })));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { companies, isLoading };
}
