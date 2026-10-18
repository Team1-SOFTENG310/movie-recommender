import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SearchBar from "./SearchBar";

describe("SearchBar", () => {
  it("calls onQueryChange after typing", async () => {
    const onQueryChange = vi.fn<(query: string) => void>();

    render(<SearchBar onQueryChange={onQueryChange} debounceMs={0} />);

    const input = screen.getByRole("textbox", {
      name: /search movies/i,
    });

    fireEvent.change(input, { target: { value: "inception" } });

    await waitFor(() => {
      expect(onQueryChange).toHaveBeenCalledWith("inception");
    });
  });
});