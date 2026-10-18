import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, it, expect, vi } from "vitest";
import FilterPanel from "./FilterPanel";
import type { DiscoverFilters } from "../api/discoverMovies";

type OnFiltersChange = (filters: DiscoverFilters) => void;

describe("FilterPanel", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("emits updated filters when a genre is selected", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn<OnFiltersChange>();

    render(<FilterPanel onFiltersChange={onFiltersChange} />);

    await user.selectOptions(screen.getByLabelText(/genre/i), "28");

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ genre: 28 }),
      );
    });

    expect(screen.getByRole("button", { name: /action/i })).toBeInTheDocument();
  });

  it("shows actor suggestions and selects one", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn<OnFiltersChange>();

    render(<FilterPanel onFiltersChange={onFiltersChange} />);

    await user.type(screen.getByLabelText(/actor/i), "Test");

    const suggestion = await screen.findByText("Test Actor");
    await user.click(suggestion);

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ castId: 999 }),
      );
    });
  });

  it("disables the actor input and clears castId when searchActive is true", () => {
    sessionStorage.setItem("movieSearchActorName", "Test Actor");
    const onFiltersChange = vi.fn<OnFiltersChange>();
    render(
      <FilterPanel
        onFiltersChange={onFiltersChange}
        initialFilters={{ castId: 999 }}
        searchActive
      />,
    );

    expect(screen.getByLabelText(/actor/i)).toBeDisabled();
    expect(screen.getByText(/unavailable while searching/i)).toBeInTheDocument();
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ castId: undefined }),
    );
  });

  it("restores a previously selected actor from initialFilters", () => {
    sessionStorage.setItem("movieSearchActorName", "Test Actor");
    const onFiltersChange = vi.fn<OnFiltersChange>();

    render(<FilterPanel onFiltersChange={onFiltersChange} initialFilters={{ castId: 999 }} />);

    expect(screen.getByLabelText(/actor/i)).toHaveValue("Test Actor");
    expect(screen.getByRole("button", { name: /test actor ✕/i })).toBeInTheDocument();
    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ castId: 999 }),
    );
  });

  it("emits the chosen sort order", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn<OnFiltersChange>();

    render(<FilterPanel onFiltersChange={onFiltersChange} />);

    await user.selectOptions(screen.getByLabelText(/sort by/i), "release_date");

    expect(onFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: "release_date" }),
    );
  });

  it("clears all filters when Clear all is clicked", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn<OnFiltersChange>();

    render(<FilterPanel onFiltersChange={onFiltersChange} />);

    await user.selectOptions(screen.getByLabelText(/genre/i), "28");
    await user.click(await screen.findByRole("button", { name: /clear all/i }));

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ genre: undefined, castId: undefined }),
      );
    });

    expect(screen.queryByRole("button", { name: /action/i })).not.toBeInTheDocument();
  });

  it("initializes controls from initialFilters", () => {
    render(
      <FilterPanel onFiltersChange={vi.fn<OnFiltersChange>()} initialFilters={{ genre: 27, ratingMin: 5, sort: "rating"}}/>,
    );

    expect(screen.getByLabelText(/genre/i)).toHaveValue("27");
    expect(screen.getByLabelText(/minimum rating/i)).toHaveValue("5");
    expect(screen.getByLabelText(/sort by/i)).toHaveValue("rating");
  });

  
});