/** DOM reader for the latest Task Splitter assistant reply. */

const ASSISTANT_SELECTOR = [
    "[data-message-author-role='assistant']",
    "[data-testid*='assistant' i]",
    "article",
    ".prose",
    "[class*='markdown' i]",
].join(",");

function cleanText(value: string | null): string {
    return (value ?? "").replace(/\s+/g, " ").trim();
}

function isSplitterCandidate(element: Element): boolean {
    const text = cleanText(element.textContent);

    return text.includes("subtasks") && text.includes("{") && text.includes("}");
}

function getCandidateElements(doc: Document): Element[] {
    return Array.from(doc.querySelectorAll(ASSISTANT_SELECTOR)).filter(isSplitterCandidate);
}

export function readLatestSplitterReply(doc: Document = document): string {
    const candidates = getCandidateElements(doc);
    const latest = candidates[candidates.length - 1];
    if (latest?.textContent) {
        return latest.textContent;
    }

    return doc.body?.textContent ?? "";
}