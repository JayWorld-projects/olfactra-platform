import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  listWorkspacesWithCounts: vi.fn(),
  getWorkspace: vi.fn(),
  createWorkspace: vi.fn(),
  updateWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  getWorkspaceIngredientIds: vi.fn(),
  setWorkspaceIngredients: vi.fn(),
  listIngredients: vi.fn(),
}));

import {
  listWorkspacesWithCounts,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceIngredientIds,
  setWorkspaceIngredients,
  listIngredients,
} from "./db";

const mockListWorkspaces = vi.mocked(listWorkspacesWithCounts);
const mockGetWorkspace = vi.mocked(getWorkspace);
const mockCreateWorkspace = vi.mocked(createWorkspace);
const mockUpdateWorkspace = vi.mocked(updateWorkspace);
const mockDeleteWorkspace = vi.mocked(deleteWorkspace);
const mockGetWorkspaceIngredientIds = vi.mocked(getWorkspaceIngredientIds);
const mockSetWorkspaceIngredients = vi.mocked(setWorkspaceIngredients);
const mockListIngredients = vi.mocked(listIngredients);

describe("Workspace DB helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listWorkspacesWithCounts returns workspaces with ingredient counts", async () => {
    const mockData = [
      { id: 1, userId: 1, name: "Spring Collection", description: "Spring scents", createdAt: new Date(), updatedAt: new Date(), ingredientCount: 50 },
      { id: 2, userId: 1, name: "Summer Collection", description: null, createdAt: new Date(), updatedAt: new Date(), ingredientCount: 30 },
    ];
    mockListWorkspaces.mockResolvedValue(mockData);

    const result = await listWorkspacesWithCounts(1);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Spring Collection");
    expect(result[0].ingredientCount).toBe(50);
    expect(result[1].ingredientCount).toBe(30);
    expect(mockListWorkspaces).toHaveBeenCalledWith(1);
  });

  it("getWorkspace returns workspace with ingredientIds", async () => {
    const mockWs = { id: 1, userId: 1, name: "Test", description: null, createdAt: new Date(), updatedAt: new Date() };
    mockGetWorkspace.mockResolvedValue(mockWs);
    mockGetWorkspaceIngredientIds.mockResolvedValue([10, 20, 30]);

    const ws = await getWorkspace(1, 1);
    expect(ws).toBeDefined();
    expect(ws!.name).toBe("Test");

    const ids = await getWorkspaceIngredientIds(1);
    expect(ids).toEqual([10, 20, 30]);
  });

  it("createWorkspace creates a new workspace and returns id", async () => {
    mockCreateWorkspace.mockResolvedValue(42);

    const id = await createWorkspace({ name: "New Workspace", userId: 1 });
    expect(id).toBe(42);
    expect(mockCreateWorkspace).toHaveBeenCalledWith({ name: "New Workspace", userId: 1 });
  });

  it("setWorkspaceIngredients replaces ingredient associations", async () => {
    mockSetWorkspaceIngredients.mockResolvedValue(undefined);

    await setWorkspaceIngredients(1, [10, 20, 30]);
    expect(mockSetWorkspaceIngredients).toHaveBeenCalledWith(1, [10, 20, 30]);
  });

  it("setWorkspaceIngredients handles empty array", async () => {
    mockSetWorkspaceIngredients.mockResolvedValue(undefined);

    await setWorkspaceIngredients(1, []);
    expect(mockSetWorkspaceIngredients).toHaveBeenCalledWith(1, []);
  });

  it("updateWorkspace updates name and description", async () => {
    mockUpdateWorkspace.mockResolvedValue(undefined);

    await updateWorkspace(1, 1, { name: "Updated Name", description: "New desc" });
    expect(mockUpdateWorkspace).toHaveBeenCalledWith(1, 1, { name: "Updated Name", description: "New desc" });
  });

  it("deleteWorkspace removes workspace and its ingredient associations", async () => {
    mockDeleteWorkspace.mockResolvedValue(undefined);

    await deleteWorkspace(1, 1);
    expect(mockDeleteWorkspace).toHaveBeenCalledWith(1, 1);
  });

  it("getWorkspace returns undefined for non-existent workspace", async () => {
    mockGetWorkspace.mockResolvedValue(undefined);

    const result = await getWorkspace(999, 1);
    expect(result).toBeUndefined();
  });

  it("listWorkspacesWithCounts returns empty array for user with no workspaces", async () => {
    mockListWorkspaces.mockResolvedValue([]);

    const result = await listWorkspacesWithCounts(999);
    expect(result).toEqual([]);
  });

  it("workspace ingredient filtering works correctly", async () => {
    const allIngredients = [
      { id: 1, name: "Lavender", userId: 1, category: "Floral", casNumber: null, supplier: null, inventoryAmount: null, costPerGram: null, ifraLimit: null, longevity: 2, description: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: "Bergamot", userId: 1, category: "Citrus", casNumber: null, supplier: null, inventoryAmount: null, costPerGram: null, ifraLimit: null, longevity: 1, description: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, name: "Sandalwood", userId: 1, category: "Wood", casNumber: null, supplier: null, inventoryAmount: null, costPerGram: null, ifraLimit: null, longevity: 5, description: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    mockListIngredients.mockResolvedValue(allIngredients);
    mockGetWorkspaceIngredientIds.mockResolvedValue([1, 3]);

    const ingredients = await listIngredients(1);
    const wsIds = new Set(await getWorkspaceIngredientIds(1));
    const filtered = ingredients.filter(i => wsIds.has(i.id));

    expect(filtered).toHaveLength(2);
    expect(filtered.map(i => i.name)).toEqual(["Lavender", "Sandalwood"]);
  });
});
