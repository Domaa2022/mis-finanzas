/** Traduce los errores de Supabase Auth a mensajes en español para la interfaz. */
export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "El correo o la contraseña no coinciden.";
    case "email_not_confirmed":
      return "Confirma tu correo con el enlace que te enviamos antes de iniciar sesión.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";
    case "weak_password":
      return "La contraseña es muy débil. Usa al menos 8 caracteres y combina letras y números.";
    case "same_password":
      return "La nueva contraseña debe ser distinta de la anterior.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Hiciste demasiados intentos. Espera unos minutos y vuelve a probar.";
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
      return "El enlace venció o ya se usó. Pide uno nuevo.";
    case "provider_disabled":
    case "oauth_provider_not_supported":
      return "Ese método de inicio de sesión no está disponible por ahora.";
    case "session_not_found":
    case "session_expired":
      return "Tu sesión terminó. Vuelve a iniciar sesión.";
    default:
      return "Algo salió mal. Revisa tu conexión y vuelve a intentarlo.";
  }
}
