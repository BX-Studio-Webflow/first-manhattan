/**
 * Careers list: fetch Lever postings in the browser and render the accordion items.
 * https://api.lever.co/v0/postings/firstmanhattan?mode=json&group=department
 */

const LEVER_POSTINGS_URL =
  'https://api.lever.co/v0/postings/firstmanhattan?mode=json&group=department';

const COPY_MAX = 180;

const SELECTORS = {
  list: '[dev-target="career-list"]',
  role: '[dev-target="career-item-role"]',
  department: '[dev-target="career-item-department"]',
  copy: '[dev-target="career-item-copy"]',
} as const;

interface LeverCategories {
  commitment?: string;
  department?: string;
  location?: string;
  team?: string;
}

interface LeverPosting {
  id: string;
  text: string;
  categories?: LeverCategories;
  descriptionPlain?: string;
  descriptionBodyPlain?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
}

interface LeverDepartmentGroup {
  title: string;
  postings: LeverPosting[];
}

function flattenPostings(raw: unknown): LeverPosting[] {
  if (!Array.isArray(raw)) return [];

  const postings: LeverPosting[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const group = entry as Partial<LeverDepartmentGroup> & Partial<LeverPosting>;
    if (Array.isArray(group.postings)) {
      postings.push(...group.postings);
      continue;
    }
    if (typeof group.text === 'string' && typeof group.id === 'string') {
      postings.push(group as LeverPosting);
    }
  }
  return postings;
}

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= COPY_MAX) return flat;
  const cut = flat.slice(0, COPY_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  const base = (lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${base}…`;
}

function postingCopy(posting: LeverPosting): string {
  return excerpt(posting.descriptionPlain || posting.descriptionBodyPlain || '');
}

function populateItem(item: HTMLElement, posting: LeverPosting): void {
  const role = item.querySelector(SELECTORS.role);
  if (role) role.textContent = posting.text;

  const department = item.querySelector(SELECTORS.department);
  if (department) department.textContent = posting.categories?.team ?? '';

  const copy = item.querySelector(SELECTORS.copy);
  if (copy) copy.textContent = postingCopy(posting);

  const url = posting.hostedUrl || posting.applyUrl;
  if (url) item.dataset.jobUrl = url;
}

export class JobBoardController {
  private postings: LeverPosting[] = [];
  private list: HTMLElement | null = null;
  private itemTemplate: HTMLElement | null = null;

  async init(): Promise<void> {
    this.list = document.querySelector(SELECTORS.list);
    if (!this.list) {
      console.error('[JobBoard] Missing [dev-target="career-list"]');
      return;
    }

    const role = this.list.querySelector(SELECTORS.role);
    const templateItem = role?.closest(SELECTORS.list);
    if (!templateItem || !(templateItem instanceof HTMLElement) || templateItem === this.list) {
      console.error('[JobBoard] Missing career item template');
      return;
    }

    this.itemTemplate = templateItem.cloneNode(true) as HTMLElement;
    await this.loadPostings();
    this.render();
  }

  async refresh(): Promise<void> {
    if (!this.list || !this.itemTemplate) return;
    await this.loadPostings();
    this.render();
  }

  private async loadPostings(): Promise<void> {
    try {
      const response = await fetch(LEVER_POSTINGS_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const raw: unknown = await response.json();
      this.postings = flattenPostings(raw).sort(
        (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
      );
    } catch (error) {
      console.error('[JobBoard] Failed to fetch Lever postings:', error);
      this.postings = [];
    }
  }

  private render(): void {
    if (!this.list || !this.itemTemplate) return;

    this.list.replaceChildren();
    for (const posting of this.postings) {
      const item = this.itemTemplate.cloneNode(true) as HTMLElement;
      populateItem(item, posting);
      this.list.appendChild(item);
    }
  }
}

declare global {
  interface Window {
    refreshJobBoard: (() => Promise<void>) | null;
  }
}

window.refreshJobBoard = null;
