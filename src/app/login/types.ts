export interface LoginState {
  status: "idle" | "error";
  error?: string;
}

export const INITIAL_LOGIN_STATE: LoginState = { status: "idle" };
