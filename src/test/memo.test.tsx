import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Memo, ReadMore } from "@/components/territory/Memo";

// Reduced motion is read through framer-motion's hook; the tests flip it.
const motionPref = vi.hoisted(() => ({ reduce: false }));
vi.mock("framer-motion", async (importOriginal) => {
  const mod = await importOriginal<typeof import("framer-motion")>();
  return { ...mod, useReducedMotion: () => motionPref.reduce };
});

beforeEach(() => {
  motionPref.reduce = false;
});

function renderMemo(props: Partial<Parameters<typeof Memo>[0]> = {}) {
  return render(
    <Memo title="Evidence half-life" count="13 dated sources" preview="Claims fade as their source ages." {...props}>
      <p>Every dated source in the territory.</p>
    </Memo>,
  );
}

describe("Memo", () => {
  it("opens and shuts from its header button, with aria-expanded and aria-controls", async () => {
    renderMemo();
    const button = screen.getByRole("button", { name: /Evidence half-life\s*·\s*13 dated sources/ });
    expect(screen.getByRole("heading", { name: /Evidence half-life/ })).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
    const region = document.getElementById(button.getAttribute("aria-controls")!);
    expect(region).not.toBeNull();
    expect(screen.getByText("Claims fade as their source ages.")).toBeInTheDocument();
    expect(screen.queryByText("Every dated source in the territory.")).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(region).toContainElement(screen.getByText("Every dated source in the territory."));

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(screen.queryByText("Every dated source in the territory.")).not.toBeInTheDocument());
  });

  it("starts open on wide screens when asked to", () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...original(q), matches: q.includes("min-width: 1024px") })) as typeof window.matchMedia;
    try {
      renderMemo({ defaultOpen: "wide" });
      expect(screen.getByRole("button", { name: /Evidence half-life/ })).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("Every dated source in the territory.")).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it("fans out with an animation, and switches at once under reduced motion", () => {
    const { unmount } = renderMemo();
    fireEvent.click(screen.getByRole("button", { name: /Evidence half-life/ }));
    // Animated: the body starts folded (no height, transparent) and eases open.
    const animated = screen.getByText("Every dated source in the territory.").closest("[data-fold]") as HTMLElement;
    expect(animated.style.opacity).toBe("0");
    unmount();

    motionPref.reduce = true;
    renderMemo();
    fireEvent.click(screen.getByRole("button", { name: /Evidence half-life/ }));
    const instant = screen.getByText("Every dated source in the territory.").closest("[data-fold]") as HTMLElement;
    expect(instant.style.opacity).not.toBe("0");
    expect(instant.style.height).not.toBe("0px");
  });
});

describe("ReadMore", () => {
  it("keeps the text in the page, clamped, and opens it with what folds under it", () => {
    render(
      <ReadMore more={<p>How it differs.</p>}>
        <span>A long pitch that runs past two lines.</span>
      </ReadMore>,
    );
    const text = screen.getByText("A long pitch that runs past two lines.").parentElement!;
    expect(text).toHaveClass("line-clamp-2");
    expect(screen.queryByText("How it differs.")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: /Read more/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(text).not.toHaveClass("line-clamp-2");
    expect(screen.getByText("How it differs.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show less/ })).toBeInTheDocument();
  });
});
