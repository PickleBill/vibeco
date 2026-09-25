import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Index from "./Index";
import Examples from "./Examples";
import Navbar from "@/components/Navbar";
import { studioProjects, studioStarters } from "@/data/studio";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  signOut: vi.fn(),
  isAdmin: false,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: mocks } }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: mocks.isAdmin }) }));

function Location() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname}{search}</output>;
}
const wrap = (component: React.ReactNode) => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{component}<Location /></MemoryRouter>);

beforeEach(() => {
  mocks.isAdmin = false;
  mocks.signOut.mockReset();
  localStorage.clear();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
});
afterEach(cleanup);

describe("public studio", () => {
  it("loads a starting question without starting or navigating to a run", () => {
    wrap(<Index />);
    fireEvent.click(screen.getByRole("button", { name: "Try a starting question" }));
    expect(screen.getByRole("textbox", { name: "Your question or idea" })).toHaveValue(studioStarters[0].question);
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("passes the selected purpose and exact question to the review step", () => {
    wrap(<Index />);
    fireEvent.click(screen.getByRole("radio", { name: "Company or topic" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Your question or idea" }), { target: { value: "What does A&B need?" } });
    fireEvent.click(screen.getByRole("button", { name: "Let's work it through" }));
    const result = new URL(screen.getByTestId("location").textContent!, "https://example.test");
    expect(result.pathname).toBe("/simulate");
    expect(result.searchParams.get("purpose")).toBe("research");
    expect(result.searchParams.get("question")).toBe("What does A&B need?");
  });

  it("lets visitors inspect synthetic perspectives with no AI run", () => {
    wrap(<Index />);
    fireEvent.click(screen.getByRole("button", { name: "Skeptic" }));
    expect(screen.getByText(/A positive reaction is not repeat use/)).toBeInTheDocument();
    expect(screen.getByText("Synthetic perspectives, not customer interviews.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skeptic" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps all original project destinations and four instant worked reports", () => {
    wrap(<Examples />);
    for (const project of studioProjects) {
      expect(screen.getByRole("link", { name: new RegExp(`Explore ${project.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},`) })).toHaveAttribute("href", project.url);
    }
    expect(studioProjects).toHaveLength(14);
    const examples = screen.getAllByRole("link", { name: "Open example" });
    expect(examples.map(link => link.getAttribute("href"))).toEqual(studioStarters.map(starter => `/simulate?example=${starter.purpose}`));
  });

  it("shows anonymous visitors sign-in rather than an account menu", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "guest", is_anonymous: true } } } });
    wrap(<Navbar />);
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /My workspace/ })).not.toBeInTheDocument();
  });

  it("keeps owner tools out of a regular account's mobile navigation", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "member", is_anonymous: false } } } });
    wrap(<Navbar />);
    await screen.findByRole("button", { name: /My workspace/ });
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("link", { name: "Saved work" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Internal hub" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Portfolio manager" })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: "Open navigation" })).toHaveFocus();
  });

  it("clears private browser drafts after successful sign-out", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "member", is_anonymous: false } } } });
    mocks.signOut.mockResolvedValue({ error: null });
    localStorage.setItem("vibeco_general_draft", "private question");
    wrap(<Navbar />);
    await screen.findByRole("button", { name: /My workspace/ });
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(localStorage.getItem("vibeco_general_draft")).toBeNull());
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("preserves private drafts when sign-out fails", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "member", is_anonymous: false } } } });
    mocks.signOut.mockResolvedValue({ error: new Error("offline") });
    localStorage.setItem("vibeco_general_draft", "private question");
    wrap(<Navbar />);
    await screen.findByRole("button", { name: /My workspace/ });
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign out" })).not.toBeDisabled());
    expect(localStorage.getItem("vibeco_general_draft")).toBe("private question");
    expect(screen.getByRole("button", { name: /My workspace/ })).toBeInTheDocument();
  });

});
