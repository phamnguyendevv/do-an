import { useState, useEffect } from "react";
import { customerService } from "@/services/directory-service";
import type { Customer } from "@/types";

export const normalizePhone = (value: string): string => {
  return value.replace(/\D/g, "").replace(/^84/, "0");
};

export interface UseCustomerLookupResult {
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  suggestions: Customer[];
  isLoading: boolean;
  error: string | null;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  handleSelectCustomer: (customer: Customer) => void;
}

export function useCustomerLookup(): UseCustomerLookupResult {
  const [customerName, setCustomerName] = useState("Khách lẻ");
  const [customerPhone, setCustomerPhone] = useState("");
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const result = customerService.list();
        if (!result.ok || !result.data) {
          throw new Error(result.error ?? "Không thể tìm khách hàng.");
        }
        const items = result.data
          .filter(
            (customer) =>
              normalizePhone(customer.phone).includes(normalized) ||
              customer.name.toLocaleLowerCase().includes(phone.toLocaleLowerCase()),
          )
          .slice(0, 8);
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
      } catch (error) {
        setSuggestions([]);
        setShowSuggestions(false);
        setError(error instanceof Error ? error.message : "Không thể tìm khách hàng.");
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [customerPhone]);

  const handleSelectCustomer = (customer: Customer) => {
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
    error,
    showSuggestions,
    setShowSuggestions,
    handleSelectCustomer,
  };
}
