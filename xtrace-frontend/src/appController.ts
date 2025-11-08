// appController.ts
import { useDataStore } from './stores/dataStore';
import { useFilterStore } from './stores/filterStore';
import { useNavigationStore } from './services/navigationService';
import { computeViewData } from './transforms/viewTransforms';
import { useHealthStore } from './stores/healthStore';

// Recompute network (nodes + edges) from current raw data and active filters.
// Delegates to the canonical pipeline to avoid logic drift.
export function recomputeForActiveRange(rangeOverride?: { start: string; end: string }) {
  const { setTimeRangeActive } = useFilterStore.getState();
  if (rangeOverride) {
    // Update only the active brush window; fetched range remains unchanged
    setTimeRangeActive(rangeOverride);
  }
  // Single source of truth for all aggregations + valuation
  computeViewData();
}

// Cache-first fetch. Use opts.force to bypass cache, opts.isNavigation to avoid re-animating on back/jump.
export async function initiateFetch(opts?: { isNavigation?: boolean; force?: boolean }) {
  try {
    const {
      setFetchError,
      startFetch,
      setFetchSuccess,
      setFullTimeRange,
      setAnimationMode,
      cache,
      setFromCache,
    } = useDataStore.getState();
    const fs = useFilterStore.getState();

    const request = {
      request: {
        centralAccount: fs.centralAccount,
        network: fs.network,
        timeRangeFetched: {
          start: fs.timeRangeFetched.start,
          end: fs.timeRangeFetched.end,
        },
      },
    };

    // Push current central into breadcrumb history
    const push = useNavigationStore.getState().push;
    push(request.request.centralAccount);

    const requestKey = JSON.stringify(request.request);

    // 1) Cache hit → instant restore, no animation
    if (!opts?.force && cache.has(requestKey)) {
      const cached = cache.get(requestKey)!;
      setFromCache(cached);

      // full time range for the timeline
      const times = (cached.transactions ?? []).map((tx: any) => new Date(tx.timestamp).getTime());
      if (times.length) {
        setFullTimeRange({
          start: new Date(Math.min(...times)).toISOString(),
          end: new Date(Math.max(...times)).toISOString(),
        });
      } else {
        setFullTimeRange({
          start: fs.timeRangeFetched.start,
          end: fs.timeRangeFetched.end,
        });
      }

      // Avoid re-animating on cache restore
      setAnimationMode?.('none');

      // ✅ Canonical recompute (uses fixed aggregators)
      recomputeForActiveRange();
      return;
    }

    // 2) Fresh load → show the short "enter" animation once
    setAnimationMode?.('enter');
    startFetch(request as any);

    const res = await fetch('http://localhost:8080/api/v1/blueprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        centralAccount: request.request.centralAccount,
        network: request.request.network,
        timeRangeFetched: request.request.timeRangeFetched,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    setFetchSuccess(data, requestKey);

    const times = (data.transactions ?? []).map((tx: any) => new Date(tx.timestamp).getTime());
    if (times.length) {
      setFullTimeRange({
        start: new Date(Math.min(...times)).toISOString(),
        end: new Date(Math.max(...times)).toISOString(),
      });
    } else {
      setFullTimeRange({
        start: fs.timeRangeFetched.start,
        end: fs.timeRangeFetched.end,
      });
    }

    // ✅ Canonical recompute after fresh data load
    recomputeForActiveRange();
  } catch (err: any) {
    console.error('AppController: Fetch FAILED.', err);
    useDataStore.getState().setFetchError(err?.message ?? String(err));
  }
}

export async function checkBackendHealth(): Promise<void> {
  const { setStatus } = useHealthStore.getState(); // ✅ get store action
  try {
    const res = await fetch('http://localhost:8080/health', { method: 'GET' });
    const body = await res.text().catch(() => '');

    if (!res.ok) {
      console.warn('[Health] Backend unhealthy:', res.status, body);
      setStatus('offline'); // ✅ tell UI it's offline
      return;
    }

    console.log('[Health] Backend OK:', body || 'OK');
    setStatus('online'); // ✅ tell UI it's online
  } catch (err) {
    console.warn('[Health] Backend health check failed:', err);
    setStatus('offline'); // ✅ mark offline on failure
  }
}