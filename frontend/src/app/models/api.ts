/** Laravel API Resource envelope used by every successful JSON response. */
export interface DataResponse<T> {
  data: T;
}

/** Error body produced by the backend's `ApiExceptionRenderer`. */
export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Credentials {
  email: string;
  password: string;
}
