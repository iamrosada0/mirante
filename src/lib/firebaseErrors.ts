// lib/firebaseErrors.ts
export function getFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;

    const firebaseErrorMessages: Record<string, string> = {
      // Auth errors
      "auth/user-not-found": "User not found. Please check your credentials.",
      "auth/wrong-password": "Incorrect password. Please try again.",
      "auth/network-request-failed":
        "Network error. Please check your connection.",
      "auth/popup-closed-by-user": "Google sign-in was canceled.",
      "auth/popup-blocked":
        "Popup blocked by your browser. Please allow popups and try again.",
      "auth/email-already-in-use":
        "This email is already in use. Try logging in instead.",
      "auth/invalid-email": "The email address is not valid.",
      "auth/weak-password": "The password is too weak. Try a stronger one.",
      "auth/too-many-requests":
        "Too many failed attempts. Please try again later.",

      // Firestore / permissions
      "permission-denied": "You do not have permission to perform this action.",
    };

    if (code && firebaseErrorMessages[code]) {
      return firebaseErrorMessages[code];
    }

    return error.message || "An unexpected error occurred.";
  }

  return "An unexpected error occurred.";
}
