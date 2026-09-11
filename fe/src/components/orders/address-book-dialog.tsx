import { useEffect, useMemo, useState } from "react";
import { BookUser, Check, MapPin, Phone, Search, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { store } from "@/services/store";
import { customersApi, type CustomerApiItem } from "@/lib/customer-api";

export interface AddressBookContact {
  id: string;
  name: string;
  phone: string;
  address: string;
  orderCount?: number;
  lastUsed?: string;
}

const DEFAULT_SAMPLE_CONTACTS: AddressBookContact[] = [
  {
    id: "cnt-1",
    name: "Trần Thị Mai",
    phone: "0901234567",
    address: "12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    orderCount: 5,
    lastUsed: "Gần đây",
  },
  {
    id: "cnt-2",
    name: "Nguyễn Văn Hùng",
    phone: "0912345678",
    address: "45 Lê Lợi, Phường Thạch Thang, Quận Hải Châu, Đà Nẵng",
    orderCount: 3,
    lastUsed: "3 ngày trước",
  },
  {
    id: "cnt-3",
    name: "Phạm Thu Trang",
    phone: "0987654321",
    address: "88 Trần Phú, Phường Điện Biên, Quận Ba Đình, Hà Nội",
    orderCount: 8,
    lastUsed: "Hôm qua",
  },
  {
    id: "cnt-4",
    name: "Lê Quốc Anh",
    phone: "0933221100",
    address: "27 Hai Bà Trưng, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh",
    orderCount: 2,
    lastUsed: "Tuần trước",
  },
  {
    id: "cnt-5",
    name: "Đỗ Minh Châu",
    phone: "0977889900",
    address: "5 Nguyễn Trãi, Phường Khương Trung, Quận Thanh Xuân, Hà Nội",
    orderCount: 4,
  },
];

interface AddressBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContact: (contact: AddressBookContact) => void;
}

export function AddressBookDialog({ open, onOpenChange, onSelectContact }: AddressBookDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [serverContacts, setServerContacts] = useState<CustomerApiItem[] | null>(null);
  const [loadingServer, setLoadingServer] = useState(false);

  // Extract unique contacts from previous orders in the store + sample contacts
  const contacts = useMemo(() => {
    const { orders } = store.getSnapshot();
    const contactMap = new Map<string, AddressBookContact>();

    // 1. Add samples first
    DEFAULT_SAMPLE_CONTACTS.forEach((c) => {
      contactMap.set(c.phone, c);
    });

    // 2. Add from orders
    orders.forEach((o) => {
      if (!o.customerPhone) return;
      const existing = contactMap.get(o.customerPhone);
      if (existing) {
        existing.orderCount = (existing.orderCount || 1) + 1;
        existing.name = o.customerName || existing.name;
        existing.address = o.customerAddress || existing.address;
      } else {
        contactMap.set(o.customerPhone, {
          id: `ord-cnt-${o.id}`,
          name: o.customerName || "Khách hàng",
          phone: o.customerPhone,
          address: o.customerAddress || "",
          orderCount: 1,
          lastUsed: "Đã từng mua",
        });
      }
    });

    return Array.from(contactMap.values());
  }, [open]);

  // Merge local contacts with server results when searching
  useEffect(() => {
    let mounted = true;
    const term = searchTerm.trim();
    if (!term || term.length < 3) {
      setServerContacts(null);
      setLoadingServer(false);
      return;
    }

    setLoadingServer(true);
    const t = setTimeout(async () => {
      try {
        const res = await customersApi.list(term as string);
        if (!mounted) return;
        setServerContacts(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to fetch customers:", e);
        if (mounted) setServerContacts([]);
      } finally {
        if (mounted) setLoadingServer(false);
      }
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [searchTerm]);

  const filteredContacts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return contacts;

    // If server results exist, merge them with local contacts (dedup by phone)
    const map = new Map<string, AddressBookContact>();

    if (serverContacts && serverContacts.length > 0) {
      serverContacts.forEach((s) => {
        map.set(s.phone, {
          id: `srv-${s.id}`,
          name: s.name,
          phone: s.phone,
          address: s.address || "",
          orderCount: undefined,
        });
      });
    }

    // Overlay local contacts (giving them priority for orderCount/address)
    contacts.forEach((c) => {
      const existing = map.get(c.phone);
      if (existing) {
        existing.name = c.name || existing.name;
        existing.address = c.address || existing.address;
        existing.orderCount = (c.orderCount || 0) + (existing.orderCount || 0);
      } else {
        map.set(c.phone, c);
      }
    });

    const all = Array.from(map.values());
    return all.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.address.toLowerCase().includes(q),
    );
  }, [contacts, serverContacts, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BookUser className="h-5 w-5 text-primary" />
            Sổ địa chỉ người nhận
          </DialogTitle>
          <DialogDescription>
            Chọn nhanh khách hàng thân thiết hoặc địa chỉ đã từng tạo đơn để tự động điền form.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo họ tên, số điện thoại hoặc địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[380px]">
          {filteredContacts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Không tìm thấy địa chỉ nào phù hợp với từ khóa &ldquo;{searchTerm}&rdquo;.
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => {
                  onSelectContact(contact);
                  onOpenChange(false);
                }}
                className="group flex items-start justify-between p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
              >
                <div className="space-y-1 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground group-hover:text-primary flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" /> {contact.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      <Phone className="h-3 w-3" /> {contact.phone}
                    </span>
                    {contact.orderCount && contact.orderCount > 1 && (
                      <span className="text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                        {contact.orderCount} đơn
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-start gap-1 leading-relaxed">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <span>{contact.address}</span>
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Chọn
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
