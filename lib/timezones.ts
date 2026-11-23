/** Zonas horarias ofrecidas en Perfil. Definen "hoy", el fin de mes y la hora de los aportes. */
export const TIMEZONES = [
  { value: "America/Tegucigalpa", label: "Honduras (Tegucigalpa)" },
  { value: "America/Guatemala", label: "Guatemala" },
  { value: "America/El_Salvador", label: "El Salvador" },
  { value: "America/Managua", label: "Nicaragua" },
  { value: "America/Costa_Rica", label: "Costa Rica" },
  { value: "America/Panama", label: "Panamá" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/Bogota", label: "Colombia" },
  { value: "America/New_York", label: "Estados Unidos (Este)" },
  { value: "America/Chicago", label: "Estados Unidos (Centro)" },
  { value: "America/Los_Angeles", label: "Estados Unidos (Pacífico)" },
  { value: "Europe/Madrid", label: "España" },
] as const;
