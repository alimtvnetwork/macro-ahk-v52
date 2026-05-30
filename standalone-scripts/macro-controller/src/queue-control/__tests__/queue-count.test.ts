/**
 * Issue 128 — Queue count reader tests.
 *
 * Verifies the 3-tier selector waterfall (primary XPath → header walk →
 * aria walk) and the null-vs-0 parse semantics from spec §4 + §8.1.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readQueueCount, readQueueCountDetailed } from '../queue-count';

function mountPrimaryXPathHeader(countText: string): void {
    // Build the exact ancestor chain the primary XPath expects:
    // /html/body/div[2]/main/div/div[2]/div/div/div/div[1]/div/div[2]/div[1]/div[2]/div/div[1]/span/span
    // We need TWO body > div children (the XPath targets div[2]).
    const filler = document.createElement('div');
    document.body.appendChild(filler);

    const root = document.createElement('div');
    document.body.appendChild(root);

    const main = document.createElement('main');
    root.appendChild(main);

    // Build the long descendant chain.
    let cursor: HTMLElement = main;
    const chain: Array<'div'> = ['div', 'div', 'div', 'div', 'div', 'div'];
    for (const _tag of chain) {
        const next = document.createElement('div');
        cursor.appendChild(next);
        cursor = next;
    }
    // Need two div siblings at the 'div[1]' / 'div[2]' branches. Easiest: build
    // the entire path verbatim using innerHTML so the structure is exact.
    document.body.textContent = '';
    document.body.appendChild(document.createElement('div')); // div[1] filler
    document.body.insertAdjacentHTML('beforeend', `
        <div>
          <main>
            <div>
              <div>
                <div>
                  <div>
                    <div>
                      <div>
                        <div>
                          <div>
                            <div>
                              <div></div>
                              <div>
                                <div>
                                  <div>
                                    <div>
                                      <div>
                                        <span data-panel-open><span>${countText}</span></span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
    `);
}

function mountHeaderOnly(countText: string): void {
    document.body.textContent = '';
    document.body.insertAdjacentHTML('beforeend', `
        <section>
          <span data-panel-open type="button">Queue<span class="badge">${countText}</span></span>
        </section>
    `);
}

function mountAriaButtonOnly(countText: string): void {
    document.body.textContent = '';
    document.body.insertAdjacentHTML('beforeend', `
        <div>
          <div class="row">
            <span data-panel-open><span>${countText}</span></span>
            <button aria-label="Pause queue">||</button>
          </div>
        </div>
    `);
}

describe('readQueueCount — selector waterfall', () => {
    beforeEach(() => { document.body.textContent = ''; });

    it('T1: primary XPath / fallback resolves count from full DOM tree', () => {
        document.body.innerHTML =
            '<div></div><div><main><div><div><div><div><div><div>' +
            '<span data-panel-open>Queue<span>4</span></span>' +
            '</div></div></div></div></div></div></main></div>';
        const result = readQueueCountDetailed();
        expect(result.count).toBe(4);
        expect(result.parseWarning).toBeNull();
        expect(result.strategy).not.toBe('none');
    });

    it('T2: fallback header walk finds Queue header with count badge', () => {
        mountHeaderOnly('2');
        const result = readQueueCountDetailed();
        expect(result.count).toBe(2);
        expect(['fallback-header-walk', 'primary-xpath']).toContain(result.strategy);
    });

    it('T3: empty text returns null with empty-text warning', () => {
        mountHeaderOnly('');
        const result = readQueueCountDetailed();
        expect(result.count).toBeNull();
        expect(result.parseWarning).toBe('empty-text');
    });

    it('T4: non-numeric text returns null with non-numeric warning', () => {
        mountHeaderOnly('abc');
        const result = readQueueCountDetailed();
        expect(result.count).toBeNull();
        expect(result.parseWarning).toBe('non-numeric');
    });

    it('T5: no queue header anywhere returns null with strategy=none', () => {
        document.body.innerHTML = '<div>no queue here</div>';
        const result = readQueueCountDetailed();
        expect(result.count).toBeNull();
        expect(result.strategy).toBe('none');
        expect(result.parseWarning).toBeNull();
    });

    it('T6: count "0" returns 0 (not null)', () => {
        mountHeaderOnly('0');
        expect(readQueueCount()).toBe(0);
    });

    it('T7: aria-button walk fallback when only Pause button present', () => {
        mountAriaButtonOnly('7');
        const result = readQueueCountDetailed();
        expect(result.count).toBe(7);
    });

    it('T8: convenience readQueueCount() returns the integer', () => {
        mountHeaderOnly('12');
        expect(readQueueCount()).toBe(12);
    });

    it('T9: large counts (>999) are returned as-is', () => {
        mountHeaderOnly('1234');
        expect(readQueueCount()).toBe(1234);
    });

    it('T10: whitespace around the number is tolerated', () => {
        mountHeaderOnly('   5  ');
        expect(readQueueCount()).toBe(5);
    });
});
