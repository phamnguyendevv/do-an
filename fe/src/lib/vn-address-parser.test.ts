import { describe, expect, it } from "vitest";
import {
  extractPhoneNumber,
  isPotentialPersonName,
  normalizeText,
  parseCustomerAndAddress,
  removeVietnameseAccents,
  resolve2LevelTo3Level,
} from "./vn-address-parser";
import type { GhnDistrict, GhnProvince, GhnWard } from "./ghn-api";

describe("Vietnamese Address & Customer Parser", () => {
  const mockProvinces: GhnProvince[] = [
    { ProvinceID: 201, ProvinceName: "Hà Nội", Code: "HN" },
    { ProvinceID: 202, ProvinceName: "Hồ Chí Minh", Code: "HCM" },
    { ProvinceID: 203, ProvinceName: "Đà Nẵng", Code: "DN" },
    { ProvinceID: 204, ProvinceName: "Đồng Nai", Code: "DNAI" },
    { ProvinceID: 205, ProvinceName: "Tuyên Quang", Code: "TQ" },
    { ProvinceID: 206, ProvinceName: "Hà Nam", Code: "HNA" },
  ];

  const mockDistricts: Record<number, GhnDistrict[]> = {
    202: [
      { DistrictID: 1442, ProvinceID: 202, DistrictName: "Quận 1", Code: "Q1" },
      { DistrictID: 1443, ProvinceID: 202, DistrictName: "Quận 3", Code: "Q3" },
      { DistrictID: 1444, ProvinceID: 202, DistrictName: "Thành phố Thủ Đức", Code: "TD" },
      { DistrictID: 1445, ProvinceID: 202, DistrictName: "Quận Tân Bình", Code: "TB" },
    ],
    201: [
      { DistrictID: 1450, ProvinceID: 201, DistrictName: "Quận Ba Đình", Code: "BD" },
      { DistrictID: 1451, ProvinceID: 201, DistrictName: "Quận Cầu Giấy", Code: "CG" },
      { DistrictID: 1452, ProvinceID: 201, DistrictName: "Quận Đống Đa", Code: "DD" },
    ],
    203: [
      { DistrictID: 1530, ProvinceID: 203, DistrictName: "Quận Liên Chiểu", Code: "LC" },
      { DistrictID: 1531, ProvinceID: 203, DistrictName: "Quận Hải Châu", Code: "HC" },
    ],
    204: [
      { DistrictID: 1460, ProvinceID: 204, DistrictName: "Thành phố Biên Hòa", Code: "BH" },
      { DistrictID: 1461, ProvinceID: 204, DistrictName: "Huyện Long Thành", Code: "LT" },
    ],
    205: [
      // Huyện Hàm Yên - district and ward share the same name!
      { DistrictID: 1470, ProvinceID: 205, DistrictName: "Huyện Hàm Yên", Code: "HY" },
      { DistrictID: 1471, ProvinceID: 205, DistrictName: "Thành phố Tuyên Quang", Code: "TPTQ" },
    ],
    206: [{ DistrictID: 1480, ProvinceID: 206, DistrictName: "Huyện Kim Bảng", Code: "KB" }],
  };

  const mockWards: Record<number, GhnWard[]> = {
    1442: [
      { WardCode: "20109", DistrictID: 1442, WardName: "Phường Bến Nghé" },
      { WardCode: "20110", DistrictID: 1442, WardName: "Phường Bến Thành" },
    ],
    1443: [{ WardCode: "20301", DistrictID: 1443, WardName: "Phường Võ Thị Sáu" }],
    1445: [
      { WardCode: "20401", DistrictID: 1445, WardName: "Phường 01" },
      { WardCode: "20402", DistrictID: 1445, WardName: "Phường 02" },
      { WardCode: "20415", DistrictID: 1445, WardName: "Phường 15" },
    ],
    1451: [
      { WardCode: "21001", DistrictID: 1451, WardName: "Phường Dịch Vọng" },
      { WardCode: "21002", DistrictID: 1451, WardName: "Phường Dịch Vọng Hậu" },
    ],
    1452: [
      { WardCode: "21010", DistrictID: 1452, WardName: "Phường Láng Thượng" },
      { WardCode: "21011", DistrictID: 1452, WardName: "Phường Láng Hạ" },
    ],
    1460: [
      { WardCode: "22001", DistrictID: 1460, WardName: "Phường Quang Vinh" },
      { WardCode: "22002", DistrictID: 1460, WardName: "Phường Trung Dũng" },
    ],
    1470: [
      // In actual GHN data, the town/ward in Huyện Hàm Yên is "Thị trấn Tân Yên"
      { WardCode: "23001", DistrictID: 1470, WardName: "Thị trấn Tân Yên" },
      { WardCode: "23002", DistrictID: 1470, WardName: "Xã Tân Thành" },
    ],
    1480: [
      { WardCode: "25001", DistrictID: 1480, WardName: "Thị trấn Quế" },
      { WardCode: "25002", DistrictID: 1480, WardName: "Xã Tượng Lĩnh" },
    ],
    1530: [
      { WardCode: "24001", DistrictID: 1530, WardName: "Phường Hòa Hiệp Bắc" },
      { WardCode: "24002", DistrictID: 1530, WardName: "Phường Hòa Hiệp Nam" },
      { WardCode: "24003", DistrictID: 1530, WardName: "Phường Hòa Khánh Bắc" },
      { WardCode: "24004", DistrictID: 1530, WardName: "Phường Hòa Khánh Nam" },
      { WardCode: "24005", DistrictID: 1530, WardName: "Phường Hòa Minh" },
    ],
  };

  const loadDistricts = async (pId: number) => mockDistricts[pId] || [];
  const loadWards = async (dId: number) => mockWards[dId] || [];

  it("handles address without customer name: sdt:0353897034 \\n lưu giáo -kim bang-hà nam", async () => {
    const input = `"sdt:0353897034\nlưu giáo -kim bang-hà nam"`;
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerName).toBe("");
    expect(res.customerPhone).toBe("0353897034");
    expect(res.provinceId).toBe(206); // Hà Nam
    expect(res.districtId).toBe(1480); // Huyện Kim Bảng
    expect(res.districtName).toBe("Huyện Kim Bảng");
    expect(res.detailAddress).toBe("lưu giáo");
  });

  it("handles address with customer name on last line: sdt:0353897034 \\n lưu giáo -kim bang-hà nam \\n văn giang", async () => {
    const input = `"sdt:0353897034\nlưu giáo -kim bang-hà nam"\nvăn giang`;
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerName).toBe("văn giang");
    expect(res.customerPhone).toBe("0353897034");
    expect(res.provinceId).toBe(206); // Hà Nam
    expect(res.districtId).toBe(1480); // Huyện Kim Bảng
    expect(res.districtName).toBe("Huyện Kim Bảng");
    expect(res.detailAddress).toBe("lưu giáo");
  });

  it("detects unmatched ward and generates warning when ward does not exist: P16 in Tân Bình", async () => {
    const input = `Khánh Ngọc\n0862 753 209\n159/43/14 Bạch Đằng P16  Tân Bình TPHCM ( địa chỉ mới là Phường Tân Sơn Hoà )`;
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerName).toBe("Khánh Ngọc");
    expect(res.customerPhone).toBe("0862753209");
    expect(res.provinceId).toBe(202); // TPHCM
    expect(res.districtId).toBe(1445); // Quận Tân Bình
    expect(res.districtName).toBe("Quận Tân Bình");
    // P16 does not exist in Tan Binh (only P1 - P15)
    expect(res.wardCode).toBeUndefined();
    expect(res.unmatchedWardCandidate).toBe("P16");
    expect(res.warningMessage).toContain("P16");
  });

  it("parses user case with quotes and street-ward mapping: 165 chùa láng- hà nội", async () => {
    const input = `"Đỗ Hồng Ngọc\n0989267085\n165 chùa láng- hà nội"`;
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerName).toBe("Đỗ Hồng Ngọc");
    expect(res.customerPhone).toBe("0989267085");
    expect(res.provinceId).toBe(201); // Hà Nội
    expect(res.districtId).toBe(1452); // Quận Đống Đa
    expect(res.districtName).toBe("Quận Đống Đa");
    expect(res.wardCode).toBe("21010");
    expect(res.wardName).toBe("Phường Láng Thượng");
    expect(res.detailAddress).toBe("165 chùa láng");
  });

  it("preserves street name when it overlaps with ward name: số 5 ngõ 100 dịch vọng hậu Cầu giấy Hà Nội 0837329279", async () => {
    const input = "số 5 ngõ 100 dịch vọng hậu Cầu giấy Hà Nội 0837329279";
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerPhone).toBe("0837329279");
    expect(res.provinceId).toBe(201); // Hà Nội
    expect(res.districtId).toBe(1451); // Quận Cầu Giấy
    expect(res.wardCode).toBe("21002");
    expect(res.wardName).toBe("Phường Dịch Vọng Hậu");
    expect(res.detailAddress).toBe("số 5 ngõ 100 dịch vọng hậu");
  });

  it("parses user case with customer name before Sđt: Đc k282 Nguyễn Văn Cừ Phường Liên Chiểu Đà Nẵng Nguyên   Sđt 0905257843", async () => {
    const input = "Đc k282 Nguyễn Văn Cừ Phường Liên Chiểu Đà Nẵng Nguyên   Sđt 0905257843";
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerName).toBe("Nguyên");
    expect(res.customerPhone).toBe("0905257843");
    expect(res.provinceId).toBe(203);
    expect(res.districtId).toBe(1530);
    expect(res.districtName).toBe("Quận Liên Chiểu");
    expect(res.wardName).toBe("Phường Hòa Hiệp Bắc");
    expect(res.detailAddress).toBe("k282 Nguyễn Văn Cừ");
  });

  it("parses user case: Đc k282 Nguyễn Văn Cừ Phường Liên Chiểu Đà Nẵng Sđt 0905257843", async () => {
    const input = "Đc k282 Nguyễn Văn Cừ Phường Liên Chiểu Đà Nẵng Sđt 0905257843";
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerName).toBe("");
    expect(res.customerPhone).toBe("0905257843");
    expect(res.provinceId).toBe(203);
    expect(res.districtId).toBe(1530);
    expect(res.districtName).toBe("Quận Liên Chiểu");
    expect(res.wardName).toBe("Phường Hòa Hiệp Bắc");
    expect(res.detailAddress).toBe("k282 Nguyễn Văn Cừ");
  });

  it("resolves district capital / landmark: số nhà 737, km39, xã hàm yên -> Thị trấn Tân Yên, Huyện Hàm Yên", async () => {
    const input = "số nhà 737, km39, xã hàm yên, tỉnh Tuyên Quang : 0981526033";
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerPhone).toBe("0981526033");
    expect(res.provinceId).toBe(205);
    expect(res.districtId).toBe(1470);
    expect(res.districtName).toBe("Huyện Hàm Yên");
    expect(res.wardCode).toBe("23001");
    expect(res.wardName).toBe("Thị trấn Tân Yên");
    // No false customer name extracted
    expect(res.customerName).toBe("");
    // Detail address must not contain admin orphan prefixes "xã" "tỉnh"
    expect(res.detailAddress).not.toMatch(/\bxã\b/i);
    expect(res.detailAddress).not.toMatch(/\btỉnh\b/i);
    expect(res.detailAddress).toBe("số nhà 737, km39");
  });

  it("parses user case: đc: 158/48/71 khu phố 3 phường Quang Vinh, Biên Hoà, Đồng Nai sđt: 0941465476 Thảo Nguyên", async () => {
    const input =
      "đc: 158/48/71 khu phố 3 phường Quang Vinh, Biên Hoà, Đồng Nai sđt: 0941465476 Thảo Nguyên";
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerName).toBe("Thảo Nguyên");
    expect(res.customerPhone).toBe("0941465476");
    expect(res.provinceId).toBe(204);
    expect(res.districtId).toBe(1460);
    expect(res.wardCode).toBe("22001");
    expect(res.wardName).toBe("Phường Quang Vinh");
    expect(res.detailAddress).toBe("158/48/71 khu phố 3");
  });

  it("parses exact user case: 159/43/14 Bạch Đằng P2 Tân Bình TPHCM without commas", async () => {
    const input = "159/43/14 Bạch Đằng P2 Tân Bình TPHCM";
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.provinceId).toBe(202);
    expect(res.districtId).toBe(1445);
    expect(res.wardCode).toBe("20402");
    expect(res.wardName).toBe("Phường 02");
    expect(res.detailAddress).toBe("159/43/14 Bạch Đằng");
  });

  it("does not falsely match house number slashes (like 14/15/16) as ward numbers", async () => {
    const input = "Số 14/15/16 Bạch Đằng P1 Tân Bình TPHCM";
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.wardName).toBe("Phường 01");
    expect(res.detailAddress).toBe("Số 14/15/16 Bạch Đằng");
  });

  it("extracts phone number correctly in various formats", () => {
    expect(extractPhoneNumber("0908888888").phone).toBe("0908888888");
    expect(extractPhoneNumber("+84908888888").phone).toBe("0908888888");
    expect(extractPhoneNumber("84908888888").phone).toBe("0908888888");
    expect(extractPhoneNumber("0908.888.888").phone).toBe("0908888888");
    expect(extractPhoneNumber("0908 888 888").phone).toBe("0908888888");
  });

  it("normalizes Vietnamese text and removes accents", () => {
    expect(removeVietnameseAccents("Phường Bến Nghé")).toBe("Phuong Ben Nghe");
    expect(normalizeText("TP. Hồ Chí Minh")).toBe("tp ho chi minh");
  });

  it("isPotentialPersonName rejects admin keywords (with and without diacritics)", () => {
    expect(isPotentialPersonName("tỉnh Tuyên Quang")).toBe(false);
    expect(isPotentialPersonName("tinh Tuyen Quang")).toBe(false);
    expect(isPotentialPersonName("xã hàm yên")).toBe(false);
    expect(isPotentialPersonName("xa ham yen")).toBe(false);
    expect(isPotentialPersonName("Thảo Nguyên")).toBe(true);
    expect(isPotentialPersonName("Nguyen Van A")).toBe(true);
  });

  it("parses full 3-level address text with commas", async () => {
    const input = "Nguyen Van A, 0908888888, 12 Le Duan, Phuong Ben Nghe, Quan 1, TP. Ho Chi Minh";
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerName).toBe("Nguyen Van A");
    expect(res.customerPhone).toBe("0908888888");
    expect(res.provinceId).toBe(202);
    expect(res.districtId).toBe(1442);
    expect(res.wardCode).toBe("20109");
    expect(res.detailAddress).toContain("12 Le Duan");
  });

  it("parses 2-level address and AUTOMATICALLY resolves to 3-level GHN district", async () => {
    const input = "Trần Thị Mai, 0901234567, 100 Nguyễn Huệ, Phường Bến Nghé, TP. Hồ Chí Minh";
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerName).toBe("Trần Thị Mai");
    expect(res.districtId).toBe(1442);
    expect(res.wardCode).toBe("20109");
    expect(res.is2LevelConverted).toBe(true);
  });

  it("parses multi-line text format from chat / messaging", async () => {
    const input = `Lê Văn Cường
0987654321
Số 45 ngõ 12 đường Cầu Giấy, Phường Dịch Vọng, Cầu Giấy, Hà Nội`;

    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.customerName).toBe("Lê Văn Cường");
    expect(res.customerPhone).toBe("0987654321");
    expect(res.provinceId).toBe(201);
    expect(res.wardCode).toBe("21001");
  });

  it("parses abbreviated 2-level text: P2 TPHCM", async () => {
    const input = "159/43/14 Bạch Đằng P2 TPHCM";
    const res = await parseCustomerAndAddress(input, mockProvinces, loadDistricts, loadWards);

    expect(res.provinceId).toBe(202);
    expect(res.wardCode).toBe("20402");
    expect(res.is2LevelConverted).toBe(true);
  });

  it("resolves 2-level to 3-level mapper correctly", () => {
    const allWards = [
      { WardCode: "20109", DistrictID: 1442, WardName: "Phường Bến Nghé", districtName: "Quận 1" },
      {
        WardCode: "20301",
        DistrictID: 1443,
        WardName: "Phường Võ Thị Sáu",
        districtName: "Quận 3",
      },
    ];

    const mapped = resolve2LevelTo3Level(202, "20109", allWards);
    expect(mapped?.districtId).toBe(1442);
    expect(mapped?.districtName).toBe("Quận 1");
  });
});
