// src/services/searchHistoryService.ts

const HISTORY_KEY = 'high_risk_internal_search_history_v1';
const MAX_HISTORY = 5;

export function getStoredSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, MAX_HISTORY);
    }
    return [];
  } catch (err) {
    console.error('Error reading search history from localStorage:', err);
    return [];
  }
}

export function saveSearchHistory(history: string[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch (err) {
    console.error('Error saving search history to localStorage:', err);
  }
}

export function recordSearchQuery(query: string): string[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return getStoredSearchHistory();
  }

  const current = getStoredSearchHistory();
  // Filter out existing query case-insensitively
  const filtered = current.filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  );

  // Put new item at the top and cap at MAX_HISTORY (5)
  const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY);
  saveSearchHistory(updated);
  return updated;
}

export function clearStoredSearchHistory(): string[] {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('Error clearing search history:', err);
  }
  return [];
}

export function removeSingleSearchHistory(nameToRemove: string): string[] {
  const current = getStoredSearchHistory();
  const updated = current.filter(
    (item) => item.toLowerCase() !== nameToRemove.toLowerCase()
  );
  saveSearchHistory(updated);
  return updated;
}
