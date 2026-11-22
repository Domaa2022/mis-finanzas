import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Field, Input } from "./Field";
import { MoneyInput } from "./MoneyInput";
import { ProgressBar } from "./ProgressBar";
import { SegmentedControl } from "./SegmentedControl";
import { Switch } from "./Switch";
import { AccountTile } from "./AccountTile";

describe("Field", () => {
  it("conecta etiqueta, control y ayuda", () => {
    render(
      <Field label="Nombre" hint="Como aparece en tu banco">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Nombre");
    expect(input).toHaveAccessibleDescription("Como aparece en tu banco");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("muestra el error en lugar de la ayuda y marca el control como inválido", () => {
    render(
      <Field label="Contraseña" hint="Mínimo 8 caracteres" error="Contraseña incorrecta">
        <Input type="password" />
      </Field>,
    );
    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Contraseña incorrecta");
    expect(screen.queryByText("Mínimo 8 caracteres")).toBeNull();
    expect(input.className).toContain("border-warn");
  });
});

function ControlledMoney({ initial = null, onCents }: { initial?: number | null; onCents?: (c: number | null) => void }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <Field label="Monto">
        <MoneyInput
          currency="HNL"
          value={value}
          onValueChange={(c) => {
            setValue(c);
            onCents?.(c);
          }}
        />
      </Field>
      <button type="button" onClick={() => setValue(50000)}>
        Todo el saldo
      </button>
    </>
  );
}

describe("MoneyInput", () => {
  it("entrega centavos mientras se escribe y formatea al salir", async () => {
    const user = userEvent.setup();
    const onCents = vi.fn();
    render(<ControlledMoney onCents={onCents} />);
    const input = screen.getByLabelText("Monto");

    await user.type(input, "1234.5");
    expect(onCents).toHaveBeenLastCalledWith(123450);
    expect(input).toHaveValue("1234.5");

    await user.tab();
    expect(input).toHaveValue("1,234.50");
  });

  it("ignora letras y entrega null si el texto no es un monto", async () => {
    const user = userEvent.setup();
    const onCents = vi.fn();
    render(<ControlledMoney onCents={onCents} />);
    const input = screen.getByLabelText("Monto");

    await user.type(input, "12abc");
    expect(input).toHaveValue("12");
    expect(onCents).toHaveBeenLastCalledWith(1200);

    await user.type(input, ".999");
    expect(onCents).toHaveBeenLastCalledWith(null);
  });

  it("se actualiza cuando el valor cambia desde afuera", async () => {
    const user = userEvent.setup();
    render(<ControlledMoney initial={100} />);
    const input = screen.getByLabelText("Monto");
    expect(input).toHaveValue("1.00");

    await user.click(screen.getByRole("button", { name: "Todo el saldo" }));
    expect(input).toHaveValue("500.00");
  });

  it("usa teclado decimal y fuente mono", () => {
    render(<ControlledMoney />);
    const input = screen.getByLabelText("Monto");
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(input.className).toContain("font-mono");
  });
});

describe("SegmentedControl", () => {
  it("es un grupo de radios con leyenda y cambia de opción", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        legend="Moneda"
        value="HNL"
        onChange={onChange}
        options={[
          { value: "HNL", label: "Lempiras", prefix: "L" },
          { value: "USD", label: "Dólares", prefix: "$" },
        ]}
      />,
    );
    expect(screen.getByRole("group", { name: "Moneda" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Lempiras/ })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: /Dólares/ }));
    expect(onChange).toHaveBeenCalledWith("USD");
  });
});

describe("Switch", () => {
  it("expone role switch y alterna con el teclado", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch label="Ahorro programado activo" checked={false} onCheckedChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "Ahorro programado activo" });
    expect(sw).toHaveAttribute("aria-checked", "false");

    sw.focus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("ProgressBar", () => {
  it("expone valores accesibles y limita el ancho al 100 %", () => {
    render(<ProgressBar value={120} label="Presupuesto de Comida" />);
    const bar = screen.getByRole("progressbar", { name: "Presupuesto de Comida" });
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("aria-valuetext", "120 %");
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("100%");
  });
});

describe("AccountTile", () => {
  it("es un botón con aria-pressed y muestra el saldo formateado", () => {
    render(
      <AccountTile type="cash" name="Efectivo" subtitle="Billetera" balanceCents={85000} currency="HNL" selected />,
    );
    const tile = screen.getByRole("button", { pressed: true });
    expect(tile).toHaveTextContent("Efectivo");
    expect(tile.textContent?.replace(/ /g, " ")).toContain("L 850.00");
  });
});
