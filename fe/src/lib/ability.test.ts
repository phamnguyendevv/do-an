import { describe, it, expect } from "vitest";
import { defineAbilityFor } from "./ability";
import type { User } from "@/types";

describe("CASL Ability System", () => {
  const adminUser: User = {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
    active: true,
  };

  const staffUser: User = {
    id: "2",
    name: "Staff User",
    email: "staff@example.com",
    role: "STAFF",
    active: true,
  };

  const inactiveUser: User = {
    id: "3",
    name: "Inactive User",
    email: "inactive@example.com",
    role: "STAFF",
    active: false,
  };

  it("Admin should have full manage permissions on all resources", () => {
    const ability = defineAbilityFor(adminUser);
    expect(ability.can("manage", "all")).toBe(true);
    expect(ability.can("create", "Book")).toBe(true);
    expect(ability.can("update", "Book")).toBe(true);
    expect(ability.can("delete", "Book")).toBe(true);
    expect(ability.can("delete", "Category")).toBe(true);
    expect(ability.can("delete", "Supplier")).toBe(true);
    expect(ability.can("search", "User")).toBe(true);
    expect(ability.can("read", "Revenue")).toBe(true);
  });

  it("Staff should have operational permissions but CANNOT delete resources or manage users/analytics", () => {
    const ability = defineAbilityFor(staffUser);

    // Operational permissions: Allowed
    expect(ability.can("read", "Book")).toBe(true);
    expect(ability.can("create", "Book")).toBe(true);
    expect(ability.can("update", "Book")).toBe(true);
    expect(ability.can("read", "Category")).toBe(true);
    expect(ability.can("create", "Category")).toBe(true);
    expect(ability.can("update", "Category")).toBe(true);
    expect(ability.can("read", "Supplier")).toBe(true);
    expect(ability.can("create", "Supplier")).toBe(true);
    expect(ability.can("update", "Supplier")).toBe(true);
    expect(ability.can("read", "BookstoreOrder")).toBe(true);
    expect(ability.can("create", "BookstoreOrder")).toBe(true);
    expect(ability.can("update", "BookstoreOrder")).toBe(true);
    expect(ability.can("delete", "BookstoreOrder")).toBe(true);
    expect(ability.can("read", "StockMovement")).toBe(true);
    expect(ability.can("create", "StockMovement")).toBe(true);
    expect(ability.can("create", "ImportReceipt")).toBe(true);
    expect(ability.can("create", "ExportReceipt")).toBe(true);
    expect(ability.can("read", "Notification")).toBe(true);
    expect(ability.can("read", "User")).toBe(true);

    // Prohibitions: Denied
    expect(ability.can("delete", "Book")).toBe(false);
    expect(ability.can("delete", "Category")).toBe(false);
    expect(ability.can("delete", "Supplier")).toBe(false);
    expect(ability.can("delete", "User")).toBe(false);
    expect(ability.can("search", "User")).toBe(false);
    expect(ability.can("create", "User")).toBe(false);
    expect(ability.can("read", "Revenue")).toBe(false);
  });

  it("Inactive or unauthenticated user should have NO permissions", () => {
    const unauthAbility = defineAbilityFor(null);
    expect(unauthAbility.can("read", "Book")).toBe(false);
    expect(unauthAbility.can("create", "BookstoreOrder")).toBe(false);

    const inactiveAbility = defineAbilityFor(inactiveUser);
    expect(inactiveAbility.can("read", "Book")).toBe(false);
    expect(inactiveAbility.can("read", "User")).toBe(false);
  });
});
