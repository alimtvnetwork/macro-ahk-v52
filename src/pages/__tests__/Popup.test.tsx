/**
 * Smoke test — PopupPage
 *
 * Verifies the popup shell renders header, controls, status, and footer
 * with mocked data hooks.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/use-popup-data", () => ({
    usePopupData: () => ({
        projectData: { allProjects: [], activeId: null },
        status: {
            version: "3.30.1",
            loggingMode: "verbose",
            bootStep: "ready",
        },
        health: { ok: true },
        opfsStatus: { healthy: true, dirExists: true, files: [] },
        injections: [],
        scripts: [],
        loading: false,
        debugMode: false,
        refresh: vi.fn(),
        setActiveProject: vi.fn(),
        toggleScript: vi.fn(),
        frozenTrail: [],
        effectiveBootStep: "ready",
        effectiveBootError: null,
        effectiveBootErrorStack: null,
        effectiveBootErrorContext: null,
        effectiveWasmProbe: null,
        effectiveFailureId: null,
        effectiveFailureAt: null,
    }),
}));

vi.mock("@/hooks/use-version-check", () => ({
    useVersionCheck: () => ({ mismatch: false }),
}));

vi.mock("@/hooks/use-popup-actions", () => ({
    usePopupActions: () => ({
        logsLoading: false,
        exportLoading: false,
        dbExportLoading: false,
        dbImportLoading: false,
        previewLoading: false,
        runLoading: false,
        reinjectLoading: false,
        importPreview: null,
        importPreviewOpen: false,
        setImportPreviewOpen: vi.fn(),
        importMode: { current: "merge" },
        handleViewLogs: vi.fn(),
        handleExport: vi.fn(),
        handleDbExport: vi.fn(),
        handleDbImport: vi.fn(),
        handleRun: vi.fn(),
        handleReinject: vi.fn(),
        handleForceRun: vi.fn(),
        lastRunResults: [],
        handleConfirmImport: vi.fn(),
        handleCancelImport: vi.fn(),
    }),
}));

import PopupPage from "@/pages/Popup";

describe("PopupPage", () => {
    it("renders without crashing", () => {
        const { container } = render(<PopupPage />);
        expect(container).toBeTruthy();
    });

    it("renders the Run Scripts button", () => {
        render(<PopupPage />);
        expect(screen.getByText("Run Scripts")).toBeInTheDocument();
    });

    it("renders the Re-inject button", () => {
        render(<PopupPage />);
        expect(screen.getByText("Re-inject")).toBeInTheDocument();
    });

    it("renders the Force run button", () => {
        render(<PopupPage />);
        expect(screen.getByText("Force")).toBeInTheDocument();
    });
});
