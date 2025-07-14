/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterForm } from "@/components/RegisterForm";
import { signInWithPopup } from "firebase/auth";

// Mocks Firebase Auth
jest.mock("firebase/auth", () => {
  return {
    getAuth: jest.fn(() => ({})), // 👈 Adicionado
    signInWithPopup: jest.fn(),
    GoogleAuthProvider: jest.fn(),
    initializeApp: jest.fn(() => ({})), // 👈 Adicionado
  };
});

// Mocks Firestore
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getFirestore: jest.fn(() => ({})), // 👈 Adicionado
  setDoc: jest.fn(() => Promise.resolve()),
}));

// Mock rota
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock função de erro amigável
jest.mock("@/lib/firebaseErrors", () => ({
  getFriendlyErrorMessage: (e: unknown) =>
    e instanceof Error ? e.message : "Unknown error",
}));

describe("RegisterForm", () => {
  it("renders register form elements", () => {
    render(<RegisterForm />);
    expect(screen.getByText("Create an account")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up with google/i })
    ).toBeInTheDocument();
  });

  it("registers successfully with Google", async () => {
    (signInWithPopup as jest.Mock).mockResolvedValueOnce({
      user: {
        uid: "123",
        email: "test@example.com",
        displayName: "Test User",
        photoURL: null,
        metadata: {
          creationTime: "2023-01-01T00:00:00Z",
          lastSignInTime: "2023-01-01T00:00:00Z",
        },
        providerData: [{ providerId: "google.com" }],
      },
    });

    render(<RegisterForm />);
    const googleButton = screen.getByRole("button", {
      name: /sign up with google/i,
    });

    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
    });
  });

  it("shows error if registration with Google fails", async () => {
    (signInWithPopup as jest.Mock).mockRejectedValueOnce(
      new Error("Google popup failed")
    );

    render(<RegisterForm />);
    const googleButton = screen.getByRole("button", {
      name: /sign up with google/i,
    });

    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/google popup failed/i)).toBeInTheDocument();
    });
  });
});
