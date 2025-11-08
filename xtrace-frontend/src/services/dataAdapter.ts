import type {
  RequestPayload,
  DataResponse,
  BackendRequestV1,
} from './dataContracts';
import { useConfigStore } from '../stores/configStore';

/**
 * Defines the contract for any data adapter.
 * It now includes an abort() method for cancellation.
 */
export interface DataAdapter {
  fetchData(request: RequestPayload): Promise<DataResponse>;
  abort(): void;
}

/**
 * Thrown when a request is intentionally aborted by the UI
 */
export class AbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AbortError';
  }
}

/**
 * HttpAdapter: Posts to the real backend API
 */
class HttpAdapter implements DataAdapter {
  /**
   * Holds the AbortController for the *current* in-flight request,
   * allowing us to cancel it[cite: 1, 4].
   */
  private currentController: AbortController | null = null;

  /**
   * Aborts any in-flight request[cite: 1].
   */
  public abort() {
    if (this.currentController) {
      console.log('HttpAdapter: Aborting previous request...');
      this.currentController.abort();
      this.currentController = null;
    }
  }

  /**
   * Transforms the UI's Logical Request into the shape
   * the backend v1 API expects[cite: 1].
   */
  private transformRequest(request: RequestPayload): BackendRequestV1 {
    // The backend payload is the unwrapped 'request' object
    const logicalRequest = request.request;

    return {
      centralAccount: logicalRequest.centralAccount,
      // The backend only supports mainnet/testnet [cite: 1]
      network: logicalRequest.network as 'mainnet' | 'testnet',
      timeRangeFetched: logicalRequest.timeRangeFetched,
      // We will add 'filters' here in a future step
    };
  }

  /**
   * Fetches data from the backend API, with timeout and retry logic.
   */
  public async fetchData(request: RequestPayload): Promise<DataResponse> {
    // 1. Abort any previous request [cite: 1, 4]
    this.abort();

    // 2. Get config
    const { backendBaseUrl, requestTimeout } = useConfigStore.getState();
    const apiUrl = `${backendBaseUrl}/api/v1/blueprint`;
    
    // 3. Create a new controller for *this* request [cite: 2]
    this.currentController = new AbortController();
    const signal = this.currentController.signal;

    // 4. Transform the request payload [cite: 1]
    const backendPayload = this.transformRequest(request);

    // 5. Setup fetch options
    const options: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
      signal: signal, // Pass the signal for cancellation
    };

    console.log('HttpAdapter: POSTing to', apiUrl, backendPayload);

    // 6. Execute fetch with retry and timeout [cite: 2]
    try {
      const response = await this.fetchWithTimeoutAndRetry(apiUrl, options, requestTimeout);

      if (!response.ok) {
        // Handle 4xx/5xx errors
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      // Backend response matches DataResponse shape 
      const data = (await response.json()) as DataResponse;
      console.log('HttpAdapter: Fetch successful', data);
      return data;

    } catch (err: any) {
      if (err.name === 'AbortError') {
        // This is an intentional cancellation, not a real error
        console.warn('HttpAdapter: Request was aborted.');
        // Throw a custom error to distinguish it
        throw new AbortError('Request cancelled');
      }
      // Re-throw other errors (network, timeout, HTTP)
      console.error('HttpAdapter: Fetch failed', err);
      throw err;
    } finally {
      // Once done, clear the controller
      this.currentController = null;
    }
  }

  /**
   * A wrapper for fetch that adds a timeout and a single retry[cite: 2].
   */
  private async fetchWithTimeoutAndRetry(
    url: string,
    options: RequestInit,
    timeout: number,
    retries: number = 1 // Plan specifies one retry [cite: 2]
  ): Promise<Response> {
    // Add timeout to the signal [cite: 2]
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Listen to the *main* abort signal (from this.abort())
    options.signal?.addEventListener('abort', () => {
      controller.abort();
      clearTimeout(timeoutId);
    });

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal, // Use the combined signal
      });
      clearTimeout(timeoutId);
      return response;
    
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      // If it's an abort, don't retry
      if (err.name === 'AbortError') {
        throw err;
      }
      
      // If we have retries left, use one [cite: 2]
      if (retries > 0) {
        console.warn(`HttpAdapter: Network error, retrying... (${retries} left)`);
        return this.fetchWithTimeoutAndRetry(url, options, timeout, retries - 1);
      }
      
      // No retries left, throw the error
      throw err;
    }
  }
}

// --- Singleton Instance ---

// We now export the HttpAdapter as the default adapter
export const dataAdapter: DataAdapter = new HttpAdapter();