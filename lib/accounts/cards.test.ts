import { describe, expect, it } from "vitest";
import { accountIdsFor, groupPairedAccounts, otherCurrency } from "./cards";

const a = (id: string, paired_account_id: string | null = null) => ({ id, paired_account_id });

describe("groupPairedAccounts", () => {
  it("junta la tarjeta con su cuenta en la otra moneda y conserva el orden", () => {
    const groups = groupPairedAccounts([a("corriente"), a("visa"), a("efectivo"), a("visa-usd", "visa")]);
    expect(groups.map((g) => [g.main.id, g.other?.id ?? null])).toEqual([
      ["corriente", null],
      ["visa", "visa-usd"],
      ["efectivo", null],
    ]);
  });

  it("muestra sola la cuenta emparejada si la principal no está en la lista", () => {
    expect(groupPairedAccounts([a("visa-usd", "visa")]).map((g) => g.main.id)).toEqual(["visa-usd"]);
  });
});

describe("accountIdsFor", () => {
  it("incluye la cuenta en la otra moneda de una tarjeta bimoneda", () => {
    expect(accountIdsFor([a("visa"), a("visa-usd", "visa")], "visa")).toEqual(["visa", "visa-usd"]);
    expect(accountIdsFor([a("visa"), a("visa-usd", "visa")], "visa-usd")).toEqual(["visa-usd"]);
    expect(accountIdsFor([a("corriente")], "corriente")).toEqual(["corriente"]);
  });
});

it("otherCurrency", () => {
  expect(otherCurrency("HNL")).toBe("USD");
  expect(otherCurrency("USD")).toBe("HNL");
});
