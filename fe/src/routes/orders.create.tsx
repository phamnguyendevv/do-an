import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookUser,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  ClipboardPaste,
  Info,
  Loader2,
  MapPin,
  PackageCheck,
  Search,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ProductLines, type ProductLine } from "@/components/inventory/product-lines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/utils/format";
import { orderService } from "@/services/order-service";
import { useBooks, useOrders } from "@/hooks/use-store";
import { ghnApi, type GhnDistrict, type GhnProvince, type GhnWard } from "@/lib/ghn-api";
import { normalizeText, parseCustomerAndAddress } from "@/lib/vn-address-parser";
import { parseProductList } from "@/lib/product-parser";
import {
  AddressBookDialog,
  type AddressBookContact,
} from "@/components/orders/address-book-dialog";

export const Route = createFileRoute("/orders/create")({
  head: () => ({
    meta: [
      { title: "Tạo đơn hàng — BookStock" },
      {
        name: "description",
        content: "Tạo đơn hàng mới tích hợp vận chuyển Giao Hàng Nhanh (GHN).",
      },
      { property: "og:title", content: "Tạo đơn hàng — BookStock" },
      { property: "og:description", content: "Form tạo đơn hàng và đẩy vận đơn GHN tự động." },
    ],
  }),
  component: CreateOrderPage,
});

type AddressType = "NEW_2_LEVEL" | "OLD_3_LEVEL";

interface WardOption extends GhnWard {
  districtName: string;
}

function CreateOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const books = useBooks();
  const orders = useOrders();

  // Chế độ địa chỉ: MỚI (2 cấp) vs CŨ (3 cấp)
  const [addressType, setAddressType] = useState<AddressType>("NEW_2_LEVEL");
  const [autoInputText, setAutoInputText] = useState("");
  const [isAutoParsing, setIsAutoParsing] = useState(false);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [openWardCombobox, setOpenWardCombobox] = useState(false);
  const [wardSearchFilter, setWardSearchFilter] = useState("");

  // Gợi ý khách hàng cũ
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);

  // Khách hàng & Địa chỉ GHN
  const [customer, setCustomer] = useState({ name: "", phone: "", detailAddress: "", note: "" });
  const [provinceId, setProvinceId] = useState<number | undefined>(undefined);
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const [wardCode, setWardCode] = useState<string>("");

  // Vận chuyển GHN
  const [carrierType, setCarrierType] = useState<"GHN" | "STORE" | "OTHER">("GHN");
  const [requiredNote, setRequiredNote] = useState<
    "CHOXEMHANGKHONGTHU" | "KHONGCHOXEMHANG" | "CHOTHUHANG"
  >("CHOXEMHANGKHONGTHU");
  const [paymentTypeId, setPaymentTypeId] = useState<number>(2); // 1: Shop trả, 2: Khách trả
  const [autoCreateGhnOrder, setAutoCreateGhnOrder] = useState(true);

  // Phí ship & Chiết khấu
  const [manualShippingFee, setManualShippingFee] = useState(30000);
  const [ghnShippingFee, setGhnShippingFee] = useState<number | null>(null);
  const [ghnLeadTime, setGhnLeadTime] = useState<string | null>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [discount, setDiscount] = useState(0);

  // Sản phẩm
  const [autoProductText, setAutoProductText] = useState("");
  const [isAutoParsingProducts, setIsAutoParsingProducts] = useState(false);
  const [lines, setLines] = useState<ProductLine[]>([{ bookId: "", quantity: 1, price: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Tải danh sách 63 Tỉnh/Thành từ GHN
  const { data: provinces = [], isLoading: loadingProvinces } = useQuery({
    queryKey: ["ghn-provinces"],
    queryFn: async () => {
      try {
        const res = await ghnApi.getProvinces();
        return Array.isArray(res) ? res : [];
      } catch (e) {
        console.error("Lỗi tải tỉnh thành GHN:", e);
        return [];
      }
    },
    staleTime: 300_000,
  });

  // 2. Tải danh sách Quận/Huyện theo Tỉnh
  const { data: districts = [], isLoading: loadingDistricts } = useQuery({
    queryKey: ["ghn-districts", provinceId],
    queryFn: async () => {
      if (!provinceId) return [];
      try {
        const res = await ghnApi.getDistricts(provinceId);
        return Array.isArray(res) ? res : [];
      } catch (e) {
        console.error("Lỗi tải quận huyện GHN:", e);
        return [];
      }
    },
    enabled: Boolean(provinceId),
    staleTime: 300_000,
  });

  // 3. Tải danh sách Phường/Xã theo Quận (chế độ 3 cấp)
  const { data: wards = [], isLoading: loadingWards } = useQuery({
    queryKey: ["ghn-wards", districtId],
    queryFn: async () => {
      if (!districtId) return [];
      try {
        const res = await ghnApi.getWards(districtId);
        return Array.isArray(res) ? res : [];
      } catch (e) {
        console.error("Lỗi tải phường xã GHN:", e);
        return [];
      }
    },
    enabled: Boolean(districtId),
    staleTime: 300_000,
  });

  // 4. Tải và tổng hợp toàn bộ Phường/Xã trong Tỉnh (chế độ 2 cấp)
  const { data: allProvinceWards = [], isLoading: loadingAllProvinceWards } = useQuery({
    queryKey: ["ghn-all-wards-province", provinceId],
    queryFn: async () => {
      if (!provinceId) return [];
      try {
        const dists = await ghnApi.getDistricts(provinceId);
        const wardPromises = dists.map(async (d) => {
          try {
            const ws = await ghnApi.getWards(d.DistrictID);
            return (Array.isArray(ws) ? ws : []).map((w): WardOption => ({
              ...w,
              DistrictID: d.DistrictID,
              districtName: d.DistrictName,
            }));
          } catch {
            return [];
          }
        });
        const results = await Promise.all(wardPromises);
        const flattened = results.flat();
        flattened.sort((a, b) => a.WardName.localeCompare(b.WardName, "vi"));
        return flattened;
      } catch (e) {
        console.error("Lỗi tải tổng hợp phường xã tỉnh GHN:", e);
        return [];
      }
    },
    enabled: Boolean(provinceId),
    staleTime: 300_000,
  });

  // Lọc danh sách phường xã 2 cấp theo ô tìm kiếm (hỗ trợ có dấu và không dấu)
  const filteredProvinceWards = useMemo(() => {
    if (!wardSearchFilter.trim()) return allProvinceWards;
    const q = normalizeText(wardSearchFilter);
    return allProvinceWards.filter(
      (w) => normalizeText(w.WardName).includes(q) || normalizeText(w.districtName).includes(q),
    );
  }, [allProvinceWards, wardSearchFilter]);

  // Danh sách khách hàng unique từ orders cũ (dedup theo SĐT)
  const pastCustomers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; address: string }>();
    for (const o of orders) {
      if (o.customerPhone && !map.has(o.customerPhone)) {
        map.set(o.customerPhone, {
          name: o.customerName || "",
          phone: o.customerPhone,
          address: o.customerAddress || "",
        });
      }
    }
    return Array.from(map.values());
  }, [orders]);

  // Gợi ý theo tên
  const nameSuggestions = useMemo(() => {
    const q = customer.name.trim();
    if (!q || q.length < 1) return [];
    const qNorm = normalizeText(q);
    return pastCustomers
      .filter(
        (c) => normalizeText(c.name).includes(qNorm) || normalizeText(c.phone).includes(qNorm),
      )
      .slice(0, 6);
  }, [customer.name, pastCustomers]);

  // Gợi ý theo số điện thoại
  const phoneSuggestions = useMemo(() => {
    const q = customer.phone.trim();
    if (!q || q.length < 1) return [];
    return pastCustomers
      .filter((c) => c.phone.includes(q) || normalizeText(c.name).includes(normalizeText(q)))
      .slice(0, 6);
  }, [customer.phone, pastCustomers]);

  // Chọn khách hàng từ gợi ý và auto-fill địa chỉ
  const handleSelectPastCustomer = async (c: { name: string; phone: string; address: string }) => {
    setCustomer((prev) => ({ ...prev, name: c.name, phone: c.phone }));
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
    if (c.address) {
      setIsAutoParsing(true);
      try {
        const parsed = await parseCustomerAndAddress(
          c.address,
          provinces,
          ghnApi.getDistricts,
          ghnApi.getWards,
        );
        setCustomer((prev) => ({
          ...prev,
          name: c.name,
          phone: c.phone,
          detailAddress: parsed.detailAddress || c.address,
        }));
        if (parsed.provinceId) setProvinceId(parsed.provinceId);
        if (parsed.districtId) setDistrictId(parsed.districtId);
        if (parsed.wardCode) setWardCode(parsed.wardCode);
        toast.success(`Đã điền thông tin khách hàng: ${c.name}`);
      } catch {
        setCustomer((prev) => ({
          ...prev,
          name: c.name,
          phone: c.phone,
          detailAddress: c.address,
        }));
      } finally {
        setIsAutoParsing(false);
      }
    }
  };

  // Thông tin tên Tỉnh, Huyện, Xã đang chọn
  const currentProvinceName = useMemo(
    () => provinces.find((p) => p.ProvinceID === provinceId)?.ProvinceName,
    [provinces, provinceId],
  );
  const currentDistrictName = useMemo(() => {
    const fromDist = districts.find((d) => d.DistrictID === districtId)?.DistrictName;
    if (fromDist) return fromDist;
    const fromAllWards = allProvinceWards.find((w) => w.DistrictID === districtId)?.districtName;
    return fromAllWards;
  }, [districts, districtId, allProvinceWards]);

  const currentWardName = useMemo(() => {
    const fromWards = wards.find((w) => w.WardCode === wardCode)?.WardName;
    if (fromWards) return fromWards;
    const fromAllWards = allProvinceWards.find((w) => w.WardCode === wardCode)?.WardName;
    return fromAllWards;
  }, [wards, allProvinceWards, wardCode]);

  // Tính tổng số lượng & trọng lượng ước tính (300g/cuốn)
  const totalItems = useMemo(() => lines.reduce((s, l) => s + (l.quantity || 0), 0), [lines]);
  const estimatedWeight = Math.max(300, totalItems * 300);
  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (l.quantity || 0) * (l.price || 0), 0),
    [lines],
  );

  // Tự động tính cước GHN khi đã chọn District + Ward + Sách
  useEffect(() => {
    if (carrierType !== "GHN" || !districtId || !wardCode || totalItems === 0) {
      if (carrierType !== "GHN") setGhnShippingFee(null);
      return;
    }

    let isMounted = true;
    const calculate = async () => {
      setIsCalculatingFee(true);
      try {
        const [feeRes, leadTimeRes] = await Promise.allSettled([
          ghnApi.calculateFee({
            toDistrictId: districtId,
            toWardCode: wardCode,
            weight: estimatedWeight,
            insuranceValue: subtotal,
          }),
          ghnApi.calculateLeadTime({
            toDistrictId: districtId,
            toWardCode: wardCode,
          }),
        ]);

        if (isMounted) {
          if (feeRes.status === "fulfilled" && feeRes.value?.total) {
            setGhnShippingFee(feeRes.value.total);
          } else {
            setGhnShippingFee(32000); // fallback
          }

          if (leadTimeRes.status === "fulfilled" && leadTimeRes.value?.leadtime) {
            const date = new Date(leadTimeRes.value.leadtime * 1000);
            setGhnLeadTime(date.toLocaleDateString("vi-VN"));
          }
        }
      } catch (e) {
        console.error("Lỗi tính phí ship GHN:", e);
        if (isMounted) setGhnShippingFee(32000);
      } finally {
        if (isMounted) setIsCalculatingFee(false);
      }
    };

    const timer = setTimeout(calculate, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [carrierType, districtId, wardCode, estimatedWeight, subtotal, totalItems]);

  const shippingFee = useMemo(() => {
    if (carrierType === "STORE") return 0;
    if (carrierType === "GHN") return ghnShippingFee ?? 32000;
    return manualShippingFee;
  }, [carrierType, ghnShippingFee, manualShippingFee]);

  const total = Math.max(0, subtotal - discount + shippingFee);

  // Ghép chuỗi địa chỉ đầy đủ
  const fullAddress = useMemo(() => {
    if (addressType === "NEW_2_LEVEL") {
      const parts = [customer.detailAddress, currentDistrictName, currentProvinceName].filter(
        Boolean,
      );
      return parts.join(", ");
    }
    const parts = [
      customer.detailAddress,
      currentWardName,
      currentDistrictName,
      currentProvinceName,
    ].filter(Boolean);
    return parts.join(", ");
  }, [
    addressType,
    customer.detailAddress,
    currentWardName,
    currentDistrictName,
    currentProvinceName,
  ]);

  // Xử lý Phân tích và Dán tự động từ Textarea / Clipboard
  const handleAutoParseAndPaste = async () => {
    setIsAutoParsing(true);
    try {
      let textToParse = autoInputText.trim();

      // Nếu ô textarea đang trống, thử đọc từ clipboard
      if (!textToParse && typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        try {
          const clipboardContent = await navigator.clipboard.readText();
          if (clipboardContent?.trim()) {
            textToParse = clipboardContent.trim();
            setAutoInputText(textToParse);
          }
        } catch {
          // Trình duyệt chặn quyền truy cập clipboard, tiếp tục với dữ liệu ô nhập
        }
      }

      if (!textToParse) {
        toast.info("Vui lòng nhập hoặc dán nội dung thông tin khách hàng vào ô.");
        setIsAutoParsing(false);
        return;
      }

      const parsed = await parseCustomerAndAddress(
        textToParse,
        provinces,
        ghnApi.getDistricts,
        ghnApi.getWards,
      );

      // Cập nhật thông tin khách hàng
      setCustomer((prev) => ({
        ...prev,
        name: parsed.customerName || prev.name,
        phone: parsed.customerPhone || prev.phone,
        detailAddress: parsed.detailAddress || prev.detailAddress,
      }));

      // Cập nhật Tỉnh/Thành, Quận/Huyện, Phường/Xã
      if (parsed.provinceId) {
        setProvinceId(parsed.provinceId);
      }
      if (parsed.districtId) {
        setDistrictId(parsed.districtId);
      }
      if (parsed.wardCode) {
        setWardCode(parsed.wardCode);
      }

      if (addressType === "NEW_2_LEVEL") {
        // Chế độ 2 cấp: Chỉ yêu cầu Tỉnh/TP và Khu vực (Quận/Huyện)
        if (!parsed.provinceId) {
          toast.warning("Cảnh báo: Chưa nhận diện được Tỉnh / Thành phố!", {
            description: "Vui lòng chọn Tỉnh / Thành phố thủ công.",
          });
        } else if (!parsed.districtId) {
          toast.warning("Cảnh báo: Chưa nhận diện được Khu vực!", {
            description: `Không tìm thấy Khu vực phù hợp trong ${parsed.provinceName || ""}. Vui lòng chọn Khu vực thủ công.`,
          });
        } else {
          const summaryParts = [
            parsed.customerName && `Tên: ${parsed.customerName}`,
            parsed.customerPhone && `SĐT: ${parsed.customerPhone}`,
            parsed.provinceName && `Tỉnh/TP: ${parsed.provinceName}`,
            parsed.districtName && `Khu vực: ${parsed.districtName}`,
          ].filter(Boolean);

          toast.success("Đã tự động nhận diện thông tin khách hàng!", {
            description: summaryParts.join(" • "),
          });
        }
      } else {
        // Chế độ 3 cấp: Yêu cầu đủ Tỉnh/TP, Quận/Huyện và Phường/Xã
        if (!parsed.provinceId) {
          toast.warning("Cảnh báo: Chưa nhận diện được Tỉnh / Thành phố!", {
            description: "Vui lòng chọn Tỉnh / Thành phố thủ công.",
          });
        } else if (!parsed.districtId) {
          toast.warning("Cảnh báo: Chưa nhận diện được Quận / Huyện!", {
            description: `Không tìm thấy Quận/Huyện phù hợp trong ${parsed.provinceName || ""}. Vui lòng chọn Quận/Huyện thủ công.`,
          });
        } else if (!parsed.wardCode) {
          toast.warning(
            parsed.unmatchedWardCandidate
              ? `Cảnh báo: Không tìm thấy "${parsed.unmatchedWardCandidate}"!`
              : "Cảnh báo: Chưa nhận diện được Phường / Xã!",
            {
              description:
                parsed.warningMessage ||
                `Không tìm thấy Phường/Xã trong ${parsed.districtName ? `${parsed.districtName}, ` : ""}${parsed.provinceName || ""}. Vui lòng kiểm tra và chọn Phường / Xã thủ công.`,
              duration: 8000,
            },
          );
        } else {
          const summaryParts = [
            parsed.customerName && `Tên: ${parsed.customerName}`,
            parsed.customerPhone && `SĐT: ${parsed.customerPhone}`,
            parsed.provinceName && `Tỉnh/TP: ${parsed.provinceName}`,
            parsed.districtName && `Quận/Huyện: ${parsed.districtName}`,
            parsed.wardName && `Phường/Xã: ${parsed.wardName}`,
          ].filter(Boolean);

          toast.success("Đã tự động nhận diện và điền thông tin khách hàng!", {
            description: summaryParts.join(" • "),
          });
        }
      }
    } catch (e: any) {
      console.error("Lỗi phân tích địa chỉ tự động:", e);
      toast.error("Không thể phân tích dữ liệu địa chỉ tự động.");
    } finally {
      setIsAutoParsing(false);
    }
  };

  // Xử lý Phân tích và Dán tự động Danh sách Sản phẩm
  const handleAutoParseProducts = async () => {
    setIsAutoParsingProducts(true);
    try {
      let textToParse = autoProductText.trim();

      // Nếu ô nhập trống, thử đọc từ Clipboard
      if (!textToParse && typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        try {
          const clipboardContent = await navigator.clipboard.readText();
          if (clipboardContent?.trim()) {
            textToParse = clipboardContent.trim();
            setAutoProductText(textToParse);
          }
        } catch {
          // Quyền clipboard bị chặn
        }
      }

      if (!textToParse) {
        toast.info(
          "Vui lòng nhập hoặc dán danh sách sản phẩm (ví dụ: 2 bản xanh lá + zhenti + tinh giảng).",
        );
        return;
      }

      const parsed = parseProductList(textToParse, books);

      if (parsed.lines.length === 0) {
        toast.warning("Không tìm thấy sản phẩm nào phù hợp trong kho!", {
          description:
            parsed.unmatchedTokens.length > 0
              ? `Không tìm thấy: ${parsed.unmatchedTokens.join(", ")}`
              : "Vui lòng kiểm tra lại tên sách trong kho.",
        });
        return;
      }

      // Cập nhật trực tiếp danh sách sản phẩm theo kết quả nhận diện từ ô nhập
      setLines(parsed.lines);

      // Thông báo kết quả
      const matchedNames = parsed.matchedItems
        .filter((m) => m.isMatched && m.book)
        .map((m) => `${m.book!.title} (x${m.quantity})`);

      if (parsed.unmatchedTokens.length > 0) {
        toast.warning(
          `Đã thêm ${parsed.matchedItems.filter((m) => m.isMatched).length} sản phẩm, chưa tìm thấy ${parsed.unmatchedTokens.length} mục!`,
          {
            description: `Đã thêm: ${matchedNames.join(", ")}. Không tìm thấy: ${parsed.unmatchedTokens.join(", ")}`,
            duration: 7000,
          },
        );
      } else {
        toast.success(`Đã tự động thêm ${parsed.lines.length} loại sản phẩm vào đơn hàng!`, {
          description: matchedNames.join(" • "),
        });
      }
    } catch (e: any) {
      console.error("Lỗi phân tích sản phẩm tự động:", e);
      toast.error("Không thể phân tích dữ liệu sản phẩm.");
    } finally {
      setIsAutoParsingProducts(false);
    }
  };

  // Xử lý chọn từ Sổ địa chỉ
  const handleSelectAddressBookContact = async (contact: AddressBookContact) => {
    setIsAutoParsing(true);
    try {
      setCustomer((prev) => ({
        ...prev,
        name: contact.name,
        phone: contact.phone,
      }));
      setAutoInputText(`${contact.name}, ${contact.phone}, ${contact.address}`);

      const parsed = await parseCustomerAndAddress(
        contact.address,
        provinces,
        ghnApi.getDistricts,
        ghnApi.getWards,
      );

      setCustomer((prev) => ({
        ...prev,
        detailAddress: parsed.detailAddress || contact.address,
      }));

      if (parsed.provinceId) setProvinceId(parsed.provinceId);
      if (parsed.districtId) setDistrictId(parsed.districtId);
      if (parsed.wardCode) setWardCode(parsed.wardCode);

      toast.success(`Đã áp dụng thông tin của ${contact.name}`);
    } catch (e) {
      console.error("Lỗi tải địa chỉ từ sổ địa chỉ:", e);
    } finally {
      setIsAutoParsing(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!customer.name.trim() || !customer.phone.trim()) {
      setError("Vui lòng nhập họ tên và số điện thoại khách hàng.");
      return;
    }

    if (carrierType === "GHN" && (!districtId || !wardCode)) {
      setError("Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã để giao hàng GHN.");
      return;
    }

    setSubmitting(true);
    let ghnTrackingCode: string | undefined = undefined;

    // Đẩy đơn sang GHN Sandbox nếu chọn GHN
    if (carrierType === "GHN" && autoCreateGhnOrder && districtId && wardCode) {
      try {
        const orderItems = lines
          .filter((l) => l.bookId && l.quantity > 0)
          .map((l) => {
            const b = books.find((x) => String(x.id) === String(l.bookId));
            return {
              name: b?.title || "Sách",
              code: String(l.bookId),
              quantity: l.quantity,
              price: l.price,
              weight: 300,
            };
          });

        const tempClientCode = `ORD-${Date.now().toString().slice(-6)}`;
        const ghnRes = await ghnApi.createOrder({
          clientOrderCode: tempClientCode,
          toName: customer.name,
          toPhone: customer.phone,
          toAddress: customer.detailAddress || fullAddress,
          toDistrictId: districtId,
          toWardCode: wardCode,
          codAmount: paymentTypeId === 2 ? total : 0, // Thu hộ COD nếu khách trả
          note: customer.note,
          requiredNote,
          paymentTypeId,
          weight: estimatedWeight,
          items: orderItems,
        });

        if (ghnRes?.order_code) {
          ghnTrackingCode = ghnRes.order_code;
          toast.success(`Đã tạo vận đơn GHN: ${ghnRes.order_code}`, {
            description: `Cước GHN: ${formatCurrency(ghnRes.total_fee || shippingFee)}`,
          });
        }
      } catch (ghnErr: any) {
        console.error("Lỗi đẩy đơn GHN:", ghnErr);
        toast.warning("Không thể kết nối GHN Sandbox, đơn hàng vẫn được lưu vào hệ thống nội bộ.", {
          description: ghnErr.message,
        });
      }
    }

    const res = await orderService.createOrder({
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: fullAddress || customer.detailAddress,
      provinceId,
      districtId,
      wardCode,
      shippingMethod:
        carrierType === "GHN"
          ? "Giao Hàng Nhanh (GHN)"
          : carrierType === "STORE"
            ? "Tại cửa hàng"
            : "Vận chuyển khác",
      shippingFee,
      discount,
      trackingCode: ghnTrackingCode,
      note: customer.note,
      expectedDelivery: ghnLeadTime || undefined,
      lines,
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Không thể tạo đơn hàng.");
      return;
    }

    // Invalidate react-query cache for orders and audit logs
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["order-audit-logs"] });

    toast.success(
      `Tạo đơn hàng ${res.data?.orderCode || res.data?.id} thành công — tồn kho đã được trừ`,
    );
    navigate({ to: "/orders" });
  };

  return (
    <AppShell
      requiredAbility={{ action: "create", subject: "BookstoreOrder" }}
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Đơn hàng", href: "/orders" },
        { label: "Tạo đơn hàng" },
      ]}
    >
      <PageContainer>
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/orders">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại đơn hàng
          </Link>
        </Button>

        <PageHeader
          title="Tạo đơn hàng mới"
          description="Tạo đơn bán sách và kết nối tự động với vận chuyển Giao Hàng Nhanh (GHN)."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* 1. Địa chỉ người nhận & Phân loại Mới (2 cấp) / Cũ (3 cấp) */}
            <Card className="shadow-none">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span>1. Địa chỉ người nhận</span>
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddressBookOpen(true)}
                  className="h-8 text-primary hover:text-primary hover:bg-primary/10 gap-1.5 text-xs font-medium"
                >
                  <BookUser className="h-4 w-4" /> Sổ địa chỉ
                </Button>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* KHUNG CHỌN LOẠI ĐỊA CHỈ (Màu vàng theo thiết kế mẫu) */}
                <div className="rounded-lg border border-amber-300/80 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/25">
                  <Label className="mb-2.5 block text-xs font-semibold text-amber-900 dark:text-amber-300">
                    Chọn loại địa chỉ
                  </Label>
                  <RadioGroup
                    value={addressType}
                    onValueChange={(v) => setAddressType(v as AddressType)}
                    className="flex flex-wrap items-center gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="NEW_2_LEVEL" id="addr-new-2" />
                      <Label
                        htmlFor="addr-new-2"
                        className="cursor-pointer text-sm font-medium text-amber-950 dark:text-amber-200"
                      >
                        Địa chỉ MỚI (2 cấp)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="OLD_3_LEVEL" id="addr-old-3" />
                      <Label
                        htmlFor="addr-old-3"
                        className="cursor-pointer text-sm font-medium text-amber-950 dark:text-amber-200"
                      >
                        Địa chỉ CŨ (3 cấp)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* KHUNG NHẬP TỰ ĐỘNG (Textarea & Button Dán và nhập tự động) */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Nhập tự động</Label>
                  <Textarea
                    rows={3}
                    value={autoInputText}
                    onChange={(e) => setAutoInputText(e.target.value)}
                    placeholder="Nhập toàn bộ thông tin và hệ thống sẽ tự động điền tên, số điện thoại và địa chỉ."
                    className="resize-none text-sm focus-visible:ring-primary"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <p className="text-[12px] text-muted-foreground leading-tight">
                      Ví dụ: Nguyen Van A, 0908888888, 12 Le Duan, Phuong Ben Nghe, Quan 1, TP. Ho
                      Chi Minh
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoParseAndPaste}
                      disabled={isAutoParsing}
                      className="shrink-0 border-rose-400 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40 h-8 text-xs font-medium gap-1.5"
                    >
                      {isAutoParsing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang phân tích...
                        </>
                      ) : (
                        <>
                          <ClipboardPaste className="h-3.5 w-3.5" /> Dán và nhập tự động
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* THÔNG TIN HỌ TÊN & SỐ ĐIỆN THOẠI */}
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  {/* Tên khách hàng với gợi ý */}
                  <div className="space-y-1.5 relative">
                    <Label htmlFor="cname" className="text-xs font-medium">
                      Họ và tên khách hàng <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cname"
                      value={customer.name}
                      onChange={(e) => {
                        setCustomer({ ...customer, name: e.target.value });
                        setShowNameSuggestions(true);
                        setShowPhoneSuggestions(false);
                      }}
                      onFocus={() => {
                        if (customer.name.trim()) setShowNameSuggestions(true);
                      }}
                      onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                      placeholder="Nguyễn Văn A"
                      autoComplete="off"
                    />
                    {/* Dropdown gợi ý tên */}
                    {showNameSuggestions && nameSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
                        <div className="px-2.5 py-1.5 border-b border-border/60">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Khách hàng cũ
                          </p>
                        </div>
                        <ul className="py-1 max-h-52 overflow-y-auto">
                          {nameSuggestions.map((c) => (
                            <li key={c.phone}>
                              <button
                                type="button"
                                onMouseDown={() => handleSelectPastCustomer(c)}
                                className="w-full flex flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                              >
                                <span className="font-medium leading-none">{c.name}</span>
                                <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                  <span>{c.phone}</span>
                                  {c.address && (
                                    <>
                                      <span className="text-border">·</span>
                                      <span className="truncate max-w-[160px]">{c.address}</span>
                                    </>
                                  )}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Số điện thoại với gợi ý */}
                  <div className="space-y-1.5 relative">
                    <Label htmlFor="cphone" className="text-xs font-medium">
                      Số điện thoại nhận hàng <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cphone"
                      value={customer.phone}
                      onChange={(e) => {
                        setCustomer({ ...customer, phone: e.target.value });
                        setShowPhoneSuggestions(true);
                        setShowNameSuggestions(false);
                      }}
                      onFocus={() => {
                        if (customer.phone.trim()) setShowPhoneSuggestions(true);
                      }}
                      onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 200)}
                      placeholder="0987654321"
                      autoComplete="off"
                    />
                    {/* Dropdown gợi ý SĐT */}
                    {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
                        <div className="px-2.5 py-1.5 border-b border-border/60">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Khách hàng cũ
                          </p>
                        </div>
                        <ul className="py-1 max-h-52 overflow-y-auto">
                          {phoneSuggestions.map((c) => (
                            <li key={c.phone}>
                              <button
                                type="button"
                                onMouseDown={() => handleSelectPastCustomer(c)}
                                className="w-full flex flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                              >
                                <span className="font-medium leading-none">{c.phone}</span>
                                <span className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                  <span>{c.name}</span>
                                  {c.address && (
                                    <>
                                      <span className="text-border">·</span>
                                      <span className="truncate max-w-[160px]">{c.address}</span>
                                    </>
                                  )}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* KHU VỰC CHỌN ĐỊA CHỈ HÀNH CHÍNH (THEO 2 CẤP HOẶC 3 CẤP) */}
                <div className="border-t pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {addressType === "NEW_2_LEVEL"
                        ? "Địa chỉ hành chính Mới (2 Cấp: Tỉnh/TP → Khu vực)"
                        : "Địa chỉ hành chính Cũ (3 Cấp: Tỉnh/TP → Quận/Huyện → Phường/Xã)"}
                    </Label>
                  </div>

                  {addressType === "NEW_2_LEVEL" ? (
                    /* GIAO DIỆN ĐỊA CHỈ MỚI (2 CẤP: TỈNH/TP → KHU VỰC) */
                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* 1. Tỉnh / Thành phố */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          1. Tỉnh / Thành phố <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={provinceId ? String(provinceId) : ""}
                          onValueChange={(v) => {
                            const id = Number(v);
                            setProvinceId(id);
                            setDistrictId(undefined);
                            setWardCode("");
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue
                              placeholder={
                                loadingProvinces ? "Đang tải tỉnh/thành..." : "Chọn Tỉnh / TP"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {provinces.map((p) => (
                              <SelectItem key={p.ProvinceID} value={String(p.ProvinceID)}>
                                {p.ProvinceName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 2. Khu vực (Quận / Huyện) */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          2. Khu vực <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={districtId ? String(districtId) : ""}
                          disabled={!provinceId || loadingDistricts}
                          onValueChange={async (v) => {
                            const id = Number(v);
                            setDistrictId(id);
                            // Tự động gán mã phường mặc định của quận/huyện để tính cước GHN
                            try {
                              const ws = await ghnApi.getWards(id);
                              if (ws && ws.length > 0) {
                                setWardCode(ws[0].WardCode);
                              }
                            } catch {
                              // fallback
                            }
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue
                              placeholder={
                                !provinceId
                                  ? "Chọn Tỉnh / TP trước"
                                  : loadingDistricts
                                    ? "Đang tải khu vực..."
                                    : "Chọn Khu vực"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {districts.map((d) => (
                              <SelectItem key={d.DistrictID} value={String(d.DistrictID)}>
                                {d.DistrictName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    /* GIAO DIỆN ĐỊA CHỈ CŨ (3 CẤP) */
                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* 1. Tỉnh / Thành phố */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Tỉnh / Thành phố <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={provinceId ? String(provinceId) : ""}
                          onValueChange={(v) => {
                            const id = Number(v);
                            setProvinceId(id);
                            setDistrictId(undefined);
                            setWardCode("");
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue
                              placeholder={
                                loadingProvinces ? "Đang tải tỉnh/thành..." : "Chọn Tỉnh / TP"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {provinces.map((p) => (
                              <SelectItem key={p.ProvinceID} value={String(p.ProvinceID)}>
                                {p.ProvinceName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 2. Quận / Huyện */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Quận / Huyện <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={districtId ? String(districtId) : ""}
                          disabled={!provinceId || loadingDistricts}
                          onValueChange={(v) => {
                            const id = Number(v);
                            setDistrictId(id);
                            setWardCode("");
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue
                              placeholder={
                                loadingDistricts ? "Đang tải quận/huyện..." : "Chọn Quận / Huyện"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {districts.map((d) => (
                              <SelectItem key={d.DistrictID} value={String(d.DistrictID)}>
                                {d.DistrictName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 3. Phường / Xã */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Phường / Xã <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={wardCode}
                          disabled={!districtId || loadingWards}
                          onValueChange={setWardCode}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue
                              placeholder={
                                loadingWards ? "Đang tải phường/xã..." : "Chọn Phường / Xã"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {wards.map((w) => (
                              <SelectItem key={w.WardCode} value={w.WardCode}>
                                {w.WardName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* SỐ NHÀ, ĐƯỜNG */}
                  <div className="pt-1 space-y-1.5">
                    <Label htmlFor="caddr" className="text-xs font-medium">
                      Số nhà, tên tòa nhà, tên đường
                    </Label>
                    <Input
                      id="caddr"
                      value={customer.detailAddress}
                      onChange={(e) => setCustomer({ ...customer, detailAddress: e.target.value })}
                      placeholder="Ví dụ: Số 45 ngõ 12 đường Cầu Giấy"
                    />
                  </div>

                  {/* ĐỊA CHỈ TỔNG HỢP PREVIEW */}
                  {fullAddress && (
                    <div className="rounded-md border bg-muted/40 p-2.5 text-xs text-foreground flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>
                          <strong>Địa chỉ nhận hàng đầy đủ:</strong> {fullAddress}
                        </span>
                      </div>
                      {districtId && wardCode && (
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium px-2 py-0.5 rounded-full shrink-0 ml-2">
                          ✓ Chuẩn GHN
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. Danh sách sản phẩm */}
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>2. Sản phẩm xuất bán</span>
                  {lines.some((l) => l.bookId) && (
                    <span className="text-xs font-normal text-muted-foreground">
                      Tổng số lượng:{" "}
                      <strong className="text-foreground">
                        {lines.reduce((s, l) => s + (l.bookId ? Number(l.quantity) || 0 : 0), 0)}
                      </strong>{" "}
                      cuốn
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* KHUNG NHẬP NHANH DANH SÁCH SẢN PHẨM */}
                <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3.5 dark:bg-primary/10">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="quick-product-input"
                      className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary" /> Nhập nhanh danh sách sản
                      phẩm
                    </Label>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Cú pháp: <code>[Số lượng] [Tên sách]</code>
                    </span>
                  </div>
                  <Textarea
                    id="quick-product-input"
                    rows={2}
                    value={autoProductText}
                    onChange={(e) => setAutoProductText(e.target.value)}
                    placeholder="Ví dụ: 2 bản xanh lá + zhenti + tinh giảng + 25 tian (hoặc dán nhiều dòng)..."
                    className="resize-none text-sm focus-visible:ring-primary bg-background"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <p className="text-[12px] text-muted-foreground leading-tight">
                      Phân tách bằng dấu cộng (<code>+</code>), dấu phẩy (<code>,</code>) hoặc xuống
                      dòng.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoParseProducts}
                      disabled={isAutoParsingProducts}
                      className="shrink-0 border-primary/40 text-primary hover:bg-primary/10 h-8 text-xs font-medium gap-1.5"
                    >
                      {isAutoParsingProducts ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang nhận diện...
                        </>
                      ) : (
                        <>
                          <ClipboardPaste className="h-3.5 w-3.5" /> Dán & Thêm sản phẩm
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Danh sách các dòng sản phẩm chi tiết */}
                <ProductLines lines={lines} onChange={setLines} checkStock priceLabel="Giá bán" />
              </CardContent>
            </Card>

            {/* 3. Vận chuyển & GHN Options */}
            <Card className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>3. Cấu hình vận chuyển</span>
                  {carrierType === "GHN" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <Truck className="h-3.5 w-3.5" /> GHN Sandbox Connected
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setCarrierType("GHN")}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      carrierType === "GHN"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-primary" /> Giao Hàng Nhanh
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tự động tính cước & tạo mã vận đơn GHN
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCarrierType("STORE")}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      carrierType === "STORE"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-semibold text-sm">Nhận tại cửa hàng</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Khách lấy trực tiếp tại quầy (0 ₫)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCarrierType("OTHER")}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      carrierType === "OTHER"
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-semibold text-sm">Đơn vị khác</div>
                    <p className="text-xs text-muted-foreground mt-1">Tự nhập phí vận chuyển</p>
                  </button>
                </div>

                {carrierType === "GHN" ? (
                  <div className="rounded-lg border bg-muted/30 p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Trọng lượng ước tính:</span>
                        <strong className="font-semibold">
                          {formatNumber(estimatedWeight)} gram
                        </strong>
                        <span className="text-xs text-muted-foreground">({totalItems} cuốn)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Cước phí GHN:</span>
                        {isCalculatingFee ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Đang tính cước...
                          </span>
                        ) : (
                          <strong className="font-semibold text-primary text-base">
                            {formatCurrency(shippingFee)}
                          </strong>
                        )}
                      </div>
                    </div>

                    {ghnLeadTime && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        ⏱️ Dự kiến giao hàng: <strong>{ghnLeadTime}</strong>
                      </p>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Lưu ý xem hàng của GHN</Label>
                        <Select value={requiredNote} onValueChange={(v: any) => setRequiredNote(v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CHOXEMHANGKHONGTHU">
                              Cho xem hàng, không cho thử (Khuyên dùng cho sách)
                            </SelectItem>
                            <SelectItem value="KHONGCHOXEMHANG">Không cho xem hàng</SelectItem>
                            <SelectItem value="CHOTHUHANG">Cho thử hàng</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Người trả cước vận chuyển</Label>
                        <Select
                          value={String(paymentTypeId)}
                          onValueChange={(v) => setPaymentTypeId(Number(v))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">Người nhận (Khách) trả cước</SelectItem>
                            <SelectItem value="1">Người gửi (Shop) trả cước</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={autoCreateGhnOrder}
                        onChange={(e) => setAutoCreateGhnOrder(e.target.checked)}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="font-medium">
                        Tự động đẩy đơn sang GHN lấy Mã vận đơn (Tracking Code) ngay khi tạo
                      </span>
                    </label>
                  </div>
                ) : carrierType === "OTHER" ? (
                  <div className="space-y-1.5 sm:w-1/2">
                    <Label htmlFor="manual-ship">Phí vận chuyển tùy chỉnh (₫)</Label>
                    <Input
                      id="manual-ship"
                      type="number"
                      min={0}
                      value={manualShippingFee}
                      onChange={(e) => setManualShippingFee(Number(e.target.value))}
                    />
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="discount">Chiết khấu giảm giá (₫)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min={0}
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="note">Ghi chú cho shipper & đóng gói</Label>
                    <Input
                      id="note"
                      value={customer.note}
                      onChange={(e) => setCustomer({ ...customer, note: e.target.value })}
                      placeholder="Ví dụ: Giao trước 17h, bọc xốp cẩn thận..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cột Tổng kết đơn hàng */}
          <Card className="h-fit shadow-none lg:sticky lg:top-20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tổng kết đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tổng số cuốn sách</span>
                <span className="font-medium tabular-nums">{formatNumber(totalItems)} cuốn</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính tiền sách</span>
                <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Chiết khấu</span>
                <span className="tabular-nums text-emerald-600">-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Phí ship {carrierType === "GHN" ? "(GHN)" : ""}
                </span>
                <span className="font-medium tabular-nums">{formatCurrency(shippingFee)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base">
                <span className="font-semibold">Tổng thanh toán</span>
                <span className="font-bold text-primary tabular-nums">{formatCurrency(total)}</span>
              </div>

              {carrierType === "GHN" && autoCreateGhnOrder && (
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                  <PackageCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Đơn sẽ được tự động đồng bộ sang GHN và xuất mã vận đơn để in tem dán gói hàng.
                  </span>
                </div>
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tạo đơn & kết nối GHN...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Xác nhận tạo đơn hàng
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>

      {/* MODAL SỔ ĐỊA CHỈ */}
      <AddressBookDialog
        open={addressBookOpen}
        onOpenChange={setAddressBookOpen}
        onSelectContact={handleSelectAddressBookContact}
      />
    </AppShell>
  );
}
