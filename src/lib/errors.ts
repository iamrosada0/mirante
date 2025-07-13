export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    switch (code) {
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again.";
      case "permission-denied":
        return "You do not have permission to perform this action.";
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid credentials. Please check your email and password.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  }
  return "An unexpected error occurred.";
}
