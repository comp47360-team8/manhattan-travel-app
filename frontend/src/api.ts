// Shared API helpers used by the whole frontend.
import { repairApiText } from "./text";
//
// The backend uses HttpOnly cookies for web authentication.
// This means every request must include:
// credentials: "include"
//
// Keeping all fetch logic here prevents every component from
// handling backend responses differently.

type BackendErrorData = {
  detail?: string | Array<{ msg?: string }>;
  message?: string;
};

/*
  Converts backend errors into messages that make sense to a normal user.

  FastAPI can return errors in several different formats:
  { detail: "Access token missing." }
  { detail: [{ msg: "Field required" }] }
  { message: "Something went wrong." }
*/
export function getErrorMessage(
  data: BackendErrorData | null,
  status?: number
): string {
  // A protected page returned 401 or 403.
  // Do not expose technical token language to the user.
  if (status === 401 || status === 403) {
    return "Please log in to continue.";
  }

  // FastAPI validation errors commonly use an array.
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    return data.detail[0]?.msg || "Please check the information you entered.";
  }

  if (typeof data?.detail === "string") {
    const detail = data.detail.trim();
    const lowerDetail = detail.toLowerCase();

    // Translate authentication implementation details into useful wording.
    if (
      lowerDetail.includes("access token") ||
      lowerDetail.includes("refresh token") ||
      lowerDetail.includes("not authenticated") ||
      lowerDetail.includes("not authorised") ||
      lowerDetail.includes("not authorized") ||
      lowerDetail.includes("authentication required")
    ) {
      return "Please log in to continue.";
    }

    return detail;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (status === 404) {
    return "The requested item could not be found.";
  }

  if (status === 409) {
    return "That action could not be completed because of a conflict.";
  }

  if (status === 422) {
    return "Please check the information you entered.";
  }

  if (status !== undefined && status >= 500) {
    return "The server could not complete that request. Please try again.";
  }

  return "Something went wrong. Please try again.";
}

/*
  Attempts to read a response body safely.

  Some backend failures return plain text instead of JSON.
  Previously, JSON.parse caused errors such as:

  Unexpected token 'I', "Internal Server Error" is not valid JSON

  This helper prevents that technical parsing error from appearing in the UI.
*/
async function readResponseBody(
  response: Response
): Promise<BackendErrorData | null> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as BackendErrorData;
  } catch {
    // The server returned plain text rather than JSON.
    return {
      detail: text,
    };
  }
}

/*
  Shared fetch function.

  Example:
  const pois = await apiFetch<POI[]>("/api/pois");

  Example with POST:
  await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
*/
export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  // Tell the backend that the frontend expects JSON responses.
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  // Only add JSON Content-Type when a request actually has a body.
  // This avoids adding unnecessary Content-Type headers to GET requests.
  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
 } catch (error) {
  console.error(`Could not connect to ${url}:`, error);

  throw new Error(
    "Could not connect to the server. Check that the backend is running.",
    {
      cause: error,
    }
  );
}

  const data = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, response.status));
  }

  return repairApiText(data as T);
}
