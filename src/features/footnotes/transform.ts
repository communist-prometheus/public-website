import { wireJump } from './jump';
import { jumpLabel, popoverLabel } from './labels';
import { positionPopover } from './position';

const POPOVER_ID = (n: number): string => `user-content-fn-popover-${n}`;

const cloneBodyWithoutBackref = (li: Element): DocumentFragment => {
  const frag = document.createDocumentFragment();
  for (const node of li.childNodes) frag.appendChild(node.cloneNode(true));
  for (const a of frag.querySelectorAll('a[data-footnote-backref]')) a.remove();
  return frag;
};

const buildButton = (anchor: HTMLAnchorElement, popoverId: string): HTMLButtonElement => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = anchor.id;
  btn.className = 'footnote-ref-button';
  btn.setAttribute('data-footnote-ref', '');
  btn.setAttribute('popovertarget', popoverId);
  btn.setAttribute('aria-describedby', popoverId);
  btn.textContent = anchor.textContent ?? '';
  return btn;
};

const buildJumpLink = (lang: string, footnoteId: string): HTMLAnchorElement => {
  const link = document.createElement('a');
  link.className = 'footnote-jump';
  link.href = `#${footnoteId}`;
  link.textContent = `↪ ${jumpLabel(lang)}`;
  return link;
};

interface BuildPopDeps {
  readonly id: string;
  readonly lang: string;
  readonly n: number;
  readonly body: DocumentFragment;
  readonly footnoteId: string;
  readonly markerId: string;
}

const buildPopover = (deps: BuildPopDeps): HTMLDivElement => {
  const pop = document.createElement('div');
  pop.id = deps.id;
  pop.className = 'footnote-popover';
  pop.setAttribute('popover', 'auto');
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', popoverLabel(deps.lang, deps.n));
  const content = document.createElement('div');
  content.className = 'footnote-popover-body';
  content.appendChild(deps.body);
  pop.appendChild(content);
  const link = buildJumpLink(deps.lang, deps.footnoteId);
  wireJump(link, {
    markerId: deps.markerId,
    footnoteId: deps.footnoteId,
    popover: pop,
  });
  pop.appendChild(link);
  return pop;
};

const onPopoverToggle = (button: HTMLElement, pop: HTMLElement, e: Event): void => {
  /*
   * `ToggleEvent` is augmented on Element by the Popover API; we
   * read newState defensively to avoid a TS-only narrow.
   */
  const state = (e as ToggleEvent).newState;
  if (state !== 'open') return;
  const pos = positionPopover(button, pop);
  pop.style.position = 'fixed';
  pop.style.top = `${pos.top}px`;
  pop.style.left = `${pos.left}px`;
};

interface TransformDeps {
  readonly anchor: HTMLAnchorElement;
  readonly footnoteLi: Element;
  readonly lang: string;
}

/**
 * Replace one `<a data-footnote-ref>` with a button + popover pair.
 * The button keeps the original anchor's id so the backref link in
 * the footnote section still scrolls back to the marker.
 *
 * @param deps - The marker anchor, its target `<li>`, and page lang.
 */
export const transformFootnoteRef = (deps: TransformDeps): void => {
  const n = Number(deps.footnoteLi.id.replace(/\D+/g, '')) || 0;
  const popoverId = POPOVER_ID(n);
  const button = buildButton(deps.anchor, popoverId);
  const popover = buildPopover({
    id: popoverId,
    lang: deps.lang,
    n,
    body: cloneBodyWithoutBackref(deps.footnoteLi),
    footnoteId: deps.footnoteLi.id,
    markerId: button.id,
  });
  popover.addEventListener('toggle', (e) => onPopoverToggle(button, popover, e));
  const parent = deps.anchor.parentElement ?? document.body;
  parent.replaceChild(button, deps.anchor);
  parent.appendChild(popover);
};
