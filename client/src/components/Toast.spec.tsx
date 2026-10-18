import { render, screen, act } from "@testing-library/react";
import Toast from "./Toast";
import { vi } from "vitest";

describe("Toast", () => {
  it("disappears automatically after 10 seconds", () => {
    vi.useFakeTimers(); // use a fake timer
    const handleClose = vi.fn<() => void>();

    render(<Toast message="Test toast" onClose={handleClose} />);
    expect(screen.getByText("Test toast")).toBeInTheDocument();

    // 快进 10 秒
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("disappears when clicking the close button", () => {
    const handleClose = vi.fn<() => void>();
    render(<Toast message="Test toast" onClose={handleClose} />);
    
    act(() => {
        screen.getByRole("button").click();
    });
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});