import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredConfig, StoredProject, StoredScript } from "@/hooks/use-projects-scripts";

const mockState = vi.hoisted(() => {
  const project: StoredProject = {
    id: "proj-1",
    schemaVersion: 1,
    name: "Lovable Dashboard",
    version: "1.2.0",
    description: "Automation scripts",
    targetUrls: [{ pattern: "lovable.dev/*", matchType: "glob" }],
    scripts: [{ path: "macro-looping.js", order: 1, runAt: "document_idle" }],
    configs: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-18T00:00:00Z",
  };
  const script: StoredScript = {
    id: "script-1",
    name: "macro-looping.js",
    code: "",
    order: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-18T00:00:00Z",
  };
  const config: StoredConfig = {
    id: "config-1",
    name: "Default config",
    json: "{}",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-03-18T00:00:00Z",
  };

  return {
    isComplete: true,
    onboardingLoading: false,
    projects: [project],
    scripts: [script],
    configs: [config],
    projectsLoading: false,
    scriptsLoading: false,
    configsLoading: false,
    completeOnboarding: vi.fn(),
    saveProject: vi.fn().mockResolvedValue(undefined),
    removeProject: vi.fn().mockResolvedValue(undefined),
    saveScript: vi.fn().mockResolvedValue(undefined),
    removeScript: vi.fn().mockResolvedValue(undefined),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    removeConfig: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue({ settings: { optionsMountBudgetMs: 5000 } }),
  };
});

vi.mock("@/hooks/use-onboarding", () => ({
  useOnboarding: () => ({
    isComplete: mockState.isComplete,
    loading: mockState.onboardingLoading,
    completeOnboarding: mockState.completeOnboarding,
  }),
}));

vi.mock("@/hooks/use-projects-scripts", () => ({
  useProjects: () => ({
    projects: mockState.projects,
    loading: mockState.projectsLoading,
    refresh: vi.fn(),
    save: mockState.saveProject,
    remove: mockState.removeProject,
  }),
  useScripts: () => ({
    scripts: mockState.scripts,
    loading: mockState.scriptsLoading,
    refresh: vi.fn(),
    save: mockState.saveScript,
    remove: mockState.removeScript,
  }),
  useConfigs: () => ({
    configs: mockState.configs,
    loading: mockState.configsLoading,
    refresh: vi.fn(),
    save: mockState.saveConfig,
    remove: mockState.removeConfig,
  }),
}));

vi.mock("@/lib/message-client", () => ({
  sendMessage: mockState.sendMessage,
}));

vi.mock("@/hooks/use-error-count", () => ({
  useErrorCount: () => ({ count: 0 }),
}));

vi.mock("@/components/onboarding/OnboardingFlow", () => ({
  OnboardingFlow: ({ onComplete }: { onComplete: () => void }) => (
    <button type="button" onClick={onComplete}>Finish onboarding</button>
  ),
}));

vi.mock("@/components/recorder/FloatingControllerHost", () => ({
  FloatingControllerHost: () => <div data-testid="floating-controller" />,
}));

vi.mock("@/components/recorder/RecorderControlBar", () => ({
  RecorderControlBar: () => <div data-testid="recorder-control-bar" />,
}));

vi.mock("@/components/options/WorkspaceSelector", () => ({
  WorkspaceSelector: () => <div data-testid="workspace-selector" />,
}));

vi.mock("@/components/options/RecoveryIndicator", () => ({
  RecoveryIndicator: () => <div data-testid="recovery-indicator" />,
}));

vi.mock("@/components/overlay/DraggableOverlay", () => ({
  DraggableOverlay: ({ children }: { children: React.ReactNode }) => (
    <section data-testid="draggable-overlay">{children}</section>
  ),
}));

vi.mock("@/components/options/SettingsView", () => ({
  default: () => <section>Settings panel</section>,
}));

vi.mock("@/components/options/GlobalScriptsView", () => ({
  default: () => <section>Scripts panel</section>,
}));

vi.mock("@/components/options/PromptManagerPanel", () => ({
  default: () => <section>Prompt manager</section>,
}));

vi.mock("@/components/options/PromptChainPanel", () => ({
  default: () => <section>Prompt chain</section>,
}));

vi.mock("@/components/options/GlobalDiagnosticsView", () => ({
  default: () => <section>Diagnostics panel</section>,
}));

vi.mock("@/components/options/GlobalAboutView", () => ({
  default: () => <section>About panel</section>,
}));

vi.mock("@/components/options/StorageBrowserView", () => ({
  default: () => <section>Storage panel</section>,
}));

vi.mock("@/components/options/ApiExplorerView", () => ({
  default: () => <section>API panel</section>,
}));

vi.mock("@/components/options/UpdaterManagementView", () => ({
  default: () => <section>Updater panel</section>,
}));

vi.mock("@/components/automation/AutomationView", () => ({
  default: () => <section>Automation panel</section>,
}));

vi.mock("@/components/options/ActivityLogTimeline", () => ({
  default: () => <section>Activity panel</section>,
}));

vi.mock("@/components/options/LibraryView", () => ({
  default: () => <section>Library panel</section>,
}));

vi.mock("@/components/options/StepGroupLibraryPanel", () => ({
  default: () => <section>Step group tree</section>,
}));

vi.mock("@/components/options/StepGroupListPanel", () => ({
  default: () => <section>Step group list</section>,
}));

vi.mock("@/components/options/ErrorSwallowAuditView", () => ({
  default: () => <section>Error audit panel</section>,
}));

vi.mock("@/components/options/ProjectDetailView", () => ({
  default: () => <section>Project detail panel</section>,
}));

vi.mock("@/components/options/ScriptBundleDetailView", () => ({
  default: () => <section>Script detail panel</section>,
}));

import OptionsPage from "@/pages/Options";

describe("OptionsPage", () => {
  beforeEach(() => {
    mockState.isComplete = true;
    mockState.onboardingLoading = false;
    mockState.projectsLoading = false;
    mockState.scriptsLoading = false;
    mockState.configsLoading = false;
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
  });

  it("exposes a loading branch marker while onboarding state resolves", () => {
    mockState.onboardingLoading = true;

    render(<OptionsPage />);

    const marker = screen.getByTestId("options-state-marker");
    expect(marker).toHaveAttribute("data-branch", "loading");
    expect(marker).toHaveAttribute("data-onboarding-loading", "true");
  });

  it("renders onboarding and wires completion when setup is incomplete", () => {
    mockState.isComplete = false;

    render(<OptionsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Finish onboarding" }));

    expect(mockState.completeOnboarding).toHaveBeenCalledOnce();
    expect(screen.getByTestId("options-state-marker")).toHaveAttribute("data-branch", "onboarding-flow");
  });

  it("renders the ready projects view and opens the create form", () => {
    render(<OptionsPage />);

    expect(screen.getByRole("heading", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByText("Lovable Dashboard")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /new project/i }));

    expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Project name")).toBeInTheDocument();
  });

  it("honors the initial settings hash", async () => {
    window.history.replaceState(null, "", "/#settings");

    render(<OptionsPage />);

    expect(await screen.findByText("Settings panel")).toBeInTheDocument();
    expect(screen.getByTestId("options-state-marker")).toHaveAttribute("data-branch", "ready");
  });
});
