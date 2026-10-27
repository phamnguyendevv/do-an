import { useMemo, useState } from "react";
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
import { useCustomers, useOrders } from "@/hooks/use-store";

export interface AddressBookContact {
  id: string;
  name: string;
  phone: string;
  address: string;
  orderCount?: number;
  lastUsed?: string;
}

interface AddressBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContact: (contact: AddressBookContact) => void;
}

export function AddressBookDialog({ open, onOpenChange, onSelectContact }: AddressBookDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const customers = useCustomers();
  const orders = useOrders();

  const contacts = useMemo(() => {
    const contactMap = new Map<string, AddressBookContact>();

    customers.forEach((customer) => {
      contactMap.set(`customer:${customer.id}`, {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address ?? "",
      });
    });
    orders.forEach((o) => {
      if (!o.customerPhone) return;
      const key = o.customerId ? `customer:${o.customerId}` : `phone:${o.customerPhone}`;
      const existing = contactMap.get(key);
      if (existing) {
        existing.orderCount = (existing.orderCount ?? 0) + 1;
      } else {
        contactMap.set(key, {
          id: `ord-cnt-${o.id}`,
          name: o.customerName || "Khách hàng",
          phone: o.customerPhone,
          address: o.customerAddress || "",
          orderCount: 1,
          lastUsed: new Date(o.createdAt).toLocaleDateString("vi-VN"),
        });
      }
    });

    return Array.from(contactMap.values());
  }, [customers, orders]);

  const filteredContacts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q),
    );
  }, [contacts, searchTerm]);

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
