// src/__tests__/components/LoginForm.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { auth } from "@/lib/firebase";
import { getFriendlyErrorMessage } from "@/lib/firebaseErrors";

// Mock dependencies
jest.mock("firebase/auth", () => ({
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@/lib/firebaseErrors", () => ({
  getFriendlyErrorMessage: jest.fn((err) => `Error: ${err.message}`),
}));

describe("LoginForm", () => {
  const mockPush = jest.fn();
  const mockUser = { uid: "123", email: "test@example.com" };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  test("renders login form correctly", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /login \(coming soon\)/i })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/auth/register"
    );
    expect(screen.getByText(/welcome to mirantes/i)).toBeInTheDocument();
  });

  test("initiates Google login and redirects on success", async () => {
    (signInWithPopup as jest.Mock).mockResolvedValue({ user: mockUser });
    (doc as jest.Mock).mockReturnValue({});
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
    });

    render(<LoginForm />);
    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    expect(signInWithPopup).toHaveBeenCalledWith(auth, expect.anything());
    expect(getDoc).toHaveBeenCalledWith({});
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  test("displays error when user is not found", async () => {
    (signInWithPopup as jest.Mock).mockResolvedValue({ user: mockUser });
    (doc as jest.Mock).mockReturnValue({});
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
    });
    (signOut as jest.Mock).mockResolvedValue(undefined);

    render(<LoginForm />);
    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
      expect(
        screen.getByText(/user not found. please register first./i)
      ).toBeInTheDocument();
    });
  });

  test("displays error on failed Google login", async () => {
    const error = new Error("Authentication failed");
    (signInWithPopup as jest.Mock).mockRejectedValue(error);
    (getFriendlyErrorMessage as jest.Mock).mockReturnValue(
      "Error: Authentication failed"
    );

    render(<LoginForm />);
    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/error: authentication failed/i)
      ).toBeInTheDocument();
    });
  });

  test("shows loading state during Google login", async () => {
    (signInWithPopup as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    ); // Simulate pending promise

    render(<LoginForm />);
    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    expect(screen.getByText(/signing in with google/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /signing in with google/i })
    ).toBeDisabled();
    expect(screen.getByTestId("loader")).toBeInTheDocument(); // Ensure Loader2 is rendered
  });

  test("navigates to sign-up page when clicking sign-up link", async () => {
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("link", { name: /sign up/i }));

    expect(mockPush).toHaveBeenCalledWith("/auth/register");
  });
});
