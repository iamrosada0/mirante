/**
 * @jest-environment jsdom
 */

import { LoginForm } from "@/components/LoginForm";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { signInWithPopup } from "firebase/auth";

// Mock Firebase Auth
jest.mock("firebase/auth", () => {
  return {
    getAuth: jest.fn(() => ({})), // 👈 Adicionado
    signInWithPopup: jest.fn(),
    GoogleAuthProvider: jest.fn(),
    initializeApp: jest.fn(() => ({})), // 👈 Adicionado
  };
});

// Mock Firebase Firestore
jest.mock("firebase/firestore", () => {
  return {
    getFirestore: jest.fn(() => ({})), // 👈 Adicionado
    doc: jest.fn(),
    getDoc: jest.fn(() => Promise.resolve({ exists: () => true })),
  };
});

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe("LoginForm", () => {
  it("renders login form elements", () => {
    render(<LoginForm />);
    expect(screen.getByText("Welcome to Mirantes")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it("handles Google login successfully", async () => {
    (signInWithPopup as jest.Mock).mockResolvedValueOnce({
      user: { uid: "123" },
    });

    render(<LoginForm />);
    const googleButton = screen.getByRole("button", {
      name: /continue with google/i,
    });
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
    });
  });

  it("shows error if Google login fails", async () => {
    (signInWithPopup as jest.Mock).mockRejectedValueOnce(
      new Error("Popup blocked")
    );

    render(<LoginForm />);
    const googleButton = screen.getByRole("button", {
      name: /continue with google/i,
    });
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByText(/popup blocked/i)).toBeInTheDocument();
    });
  });
});
