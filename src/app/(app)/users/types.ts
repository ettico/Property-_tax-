export interface CreateUserState {
  status: "idle" | "error" | "success";
  error?: string;
}

export const INITIAL_CREATE_USER_STATE: CreateUserState = { status: "idle" };
