export interface SetupInput {
  name: string;
  email: string;
  password: string;
}

export interface SetupService {
  isOpen(): Promise<boolean | undefined>;
  install(input: SetupInput): Promise<"ok" | "closed" | "unavailable">;
}
