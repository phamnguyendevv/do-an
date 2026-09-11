import { useState, useEffect } from "react";
import { customerApi, type CustomerApiItem } from "@/lib/customer-api";

export const normalizePhone = (value: string): string => {
  return value.replace(/\D/g, "").replace(/^84/, "0");
};

export interface UseCustomerLookupResult {
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  suggestions: CustomerApiItem[];
  isLoading: boolean;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  handleSelectCustomer: (customer: CustomerApiItem) => void;
}

export function useCustomerLookup(): UseCustomerLookupResult {
  const [customerName, setCustomerName] = useState("Khách lẻ");
  const [customerPhone, setCustomerPhone] = useState("");
  const [suggestions, setSuggestions] = useState<CustomerApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const phone = customerPhone.trim();
    if (!phone) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const normalized = normalizePhone(phone);
    if (normalized.length < 8) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await customerApi.list({ search: normalized, size: 8 });
        const items = Array.isArray(res?.data) ? res.data : [];
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
      } catch (error) {
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [customerPhone]);

  const handleSelectCustomer = (customer: CustomerApiItem) => {
    setCustomerName(customer.name || "Khách lẻ");
    setCustomerPhone(normalizePhone(customer.phone) || "");
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return {
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    suggestions,
    isLoading,
    showSuggestions,
    setShowSuggestions,
    handleSelectCustomer,
  };
}
