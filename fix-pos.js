const fs = require('fs');
const path = require('path');

const filePath = 'fe/src/routes/pos.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add import
content = content.replace(
  'import { useBooks, useCategories } from "@/hooks/use-store";',
  'import { useBooks, useCategories } from "@/hooks/use-store";\nimport { useCustomerLookup } from "@/hooks/use-customer-lookup";'
);

// 2. Replace old normalizePhone + state + useEffect with hook
const oldCode = `  const [customerName, setCustomerName] = useState("Khách lẻ");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);

  const normalizePhone = (value: string) => value.replace(/\\D/g, "").replace(/^84/, "0");

  useEffect(() => {
    const phone = customerPhone.trim();
    if (!phone) {
      setCustomerName((prev) => (prev.trim() ? prev : "Khách lẻ"));
      return;
    }

    const normalized = normalizePhone(phone);
    if (normalized.length < 8) return;

    const timer = setTimeout(async () => {
      try {
        const res = await customerApi.list({ search: normalized, size: 5 });
        const items = Array.isArray(res?.data) ? res.data : [];
        const match =
          items.find((c) => normalizePhone(c.phone ?? "") === normalized) ?? items[0] ?? null;

        if (!match) return;

        setCustomerName((prev) => {
          const current = prev.trim();
          if (current && current !== "Khách lẻ") return prev;
          return match.name || current || "Khách lẻ";
        });
      } catch {
        // ignore lookup failures silently to avoid breaking sales flow
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [customerPhone]);`;

const newCode = `  const {
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    suggestions: customerSuggestions,
    isLoading: isLoadingCustomer,
    showSuggestions: showPhoneSuggestions,
    setShowSuggestions: setShowPhoneSuggestions,
    handleSelectCustomer,
  } = useCustomerLookup();`;

content = content.replace(oldCode, newCode);

// 3. Update UI section for customer info
const oldUI = `          {/* Customer Info Minimal Inputs */}
          <div className="p-2.5 border-b bg-muted/10 grid grid-cols-2 gap-2 text-xs">
            <div>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Tên khách hàng"
                className="h-8 text-xs bg-background"
              />
            </div>
            <div>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="SĐT (tùy chọn)"
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>`;

const newUI = `          {/* Customer Info Minimal Inputs */}
          <div className="p-2.5 border-b bg-muted/10 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Tên khách hàng"
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="relative">
                <Input
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setShowPhoneSuggestions(true);
                  }}
                  onFocus={() => customerPhone.trim().length >= 8 && setShowPhoneSuggestions(true)}
                  placeholder="SĐT (tìm khách)"
                  className="h-8 text-xs bg-background"
                />
                {isLoadingCustomer && (
                  <Loader2 className="absolute right-2 top-1.5 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>
            {/* Customer Suggestions Dropdown */}
            {showPhoneSuggestions && customerSuggestions.length > 0 && (
              <div className="border rounded-md bg-background shadow-lg max-h-32 overflow-y-auto z-50">
                {customerSuggestions.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-muted text-xs border-b last:border-b-0 active:bg-primary/20 transition-colors"
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-muted-foreground text-[11px]">{customer.phone}</div>
                  </button>
                ))}
              </div>
            )}
          </div>`;

content = content.replace(oldUI, newUI);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✓ Successfully updated pos.tsx with useCustomerLookup hook');
