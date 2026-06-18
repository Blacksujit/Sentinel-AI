export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse(response: Response) {
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "detail" in data
        ? String((data as Record<string, unknown>).detail)
        : data && typeof data === "object" && "message" in data
          ? String((data as Record<string, unknown>).message)
          : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data;
}

export async function apiGet<T = unknown>(path: string, token?: string): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return handleResponse(response) as Promise<T>;
}

export async function apiPost<T = unknown>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return handleResponse(response) as Promise<T>;
}

export async function apiPatch<T = unknown>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return handleResponse(response) as Promise<T>;
}

export async function apiDelete<T = unknown>(path: string, token?: string): Promise<T> {
  const response = await fetch(path, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return handleResponse(response) as Promise<T>;
}
