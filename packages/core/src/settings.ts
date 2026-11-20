import type { PersonalSettings } from "@kipivo/account/settings";
import type { DirectorySettings } from "@kipivo/admin/directory";
import type { EmailSettings, EmailSettingsInput } from "@kipivo/email/settings";

type ManagedSettingsResult<T> = { status: "ok"; value: T } | { status: "forbidden" };

export interface SettingsAccess {
  personal(actorId: string): Promise<PersonalSettings>;
  savePersonal(actorId: string, settings: PersonalSettings): Promise<PersonalSettings>;
  directory(actorId: string): Promise<ManagedSettingsResult<DirectorySettings>>;
  saveDirectory(
    actorId: string,
    settings: DirectorySettings,
  ): Promise<ManagedSettingsResult<DirectorySettings>>;
}

export interface EmailSettingsAccess {
  get(actorId: string): Promise<ManagedSettingsResult<EmailSettings>>;
  save(
    actorId: string,
    input: EmailSettingsInput,
  ): Promise<ManagedSettingsResult<EmailSettings | null>>;
}
