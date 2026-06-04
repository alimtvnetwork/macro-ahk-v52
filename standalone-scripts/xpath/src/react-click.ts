/**
 * XPath Utilities — React-compatible click dispatcher
 */

import { getLogger } from "./logger";

export function reactClick(targetElement: Element, callerXpath?: string): void {
  const { log, logSub } = getLogger();
  const tag = "<" + targetElement.tagName.toLowerCase() +
    ((targetElement as HTMLElement).id ? "#" + (targetElement as HTMLElement).id : "") + ">";

  log("reactClick", "Clicking " + tag + " | XPath: " + (callerXpath || "(no xpath)"));

  const rect = targetElement.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const mouseOpts: MouseEventInit = {
    view: window,
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 1,
    clientX: cx,
    clientY: cy,
  };

  const pointerOpts: PointerEventInit = {
    ...mouseOpts,
    pointerId: 1,
    pointerType: "mouse" as const,
    isPrimary: true,
  };

  targetElement.dispatchEvent(new PointerEvent("pointerdown", pointerOpts));
  targetElement.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
  targetElement.dispatchEvent(new PointerEvent("pointerup", pointerOpts));
  targetElement.dispatchEvent(new MouseEvent("mouseup", mouseOpts));
  targetElement.dispatchEvent(new MouseEvent("click", mouseOpts));

  logSub("reactClick", "All 5 events dispatched");
}
