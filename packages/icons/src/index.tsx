import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps, ComponentType } from "react";
import arrowUpRightGlyph from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import bookOpenGlyph from "@hugeicons/core-free-icons/BookOpen01Icon";
import bookBookmarkGlyph from "@hugeicons/core-free-icons/BookBookmark01Icon";
import checkGlyph from "@hugeicons/core-free-icons/Tick02Icon";
import chevronDownGlyph from "@hugeicons/core-free-icons/ArrowDown01Icon";
import chevronRightGlyph from "@hugeicons/core-free-icons/ArrowRight01Icon";
import chevronUpGlyph from "@hugeicons/core-free-icons/ArrowUp01Icon";
import closeGlyph from "@hugeicons/core-free-icons/Cancel01Icon";
import dashboardGlyph from "@hugeicons/core-free-icons/DashboardSquare01Icon";
import editGlyph from "@hugeicons/core-free-icons/Edit02Icon";
import eyeGlyph from "@hugeicons/core-free-icons/ViewIcon";
import eyeOffGlyph from "@hugeicons/core-free-icons/ViewOffSlashIcon";
import folderGlyph from "@hugeicons/core-free-icons/Folder01Icon";
import githubGlyph from "@hugeicons/core-free-icons/GithubIcon";
import homeGlyph from "@hugeicons/core-free-icons/Home01Icon";
import menuGlyph from "@hugeicons/core-free-icons/Menu01Icon";
import loginGlyph from "@hugeicons/core-free-icons/Login01Icon";
import monitorGlyph from "@hugeicons/core-free-icons/MonitorIcon";
import moonGlyph from "@hugeicons/core-free-icons/Moon02Icon";
import moreHorizontalGlyph from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import playGlyph from "@hugeicons/core-free-icons/PlayIcon";
import plusGlyph from "@hugeicons/core-free-icons/Add01Icon";
import panelLeftCloseGlyph from "@hugeicons/core-free-icons/PanelLeftCloseIcon";
import panelLeftOpenGlyph from "@hugeicons/core-free-icons/PanelLeftOpenIcon";
import rocketGlyph from "@hugeicons/core-free-icons/Rocket01Icon";
import settingsGlyph from "@hugeicons/core-free-icons/Settings01Icon";
import shieldUserGlyph from "@hugeicons/core-free-icons/ShieldUserIcon";
import stopGlyph from "@hugeicons/core-free-icons/StopIcon";
import sunGlyph from "@hugeicons/core-free-icons/Sun01Icon";
import terminalGlyph from "@hugeicons/core-free-icons/ComputerTerminal01Icon";
import unfoldMoreGlyph from "@hugeicons/core-free-icons/UnfoldMoreIcon";

type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, "icon" | "altIcon" | "showAlt">;
export type IconComponent = ComponentType<IconProps>;

export const ArrowUpRightIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={arrowUpRightGlyph} />
);
export const BookOpenIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={bookOpenGlyph} />;
export const CheckIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={checkGlyph} />;
export const ChevronDownIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={chevronDownGlyph} />
);
export const ChevronRightIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={chevronRightGlyph} />
);
export const ChevronUpIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={chevronUpGlyph} />
);
export const CloseIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={closeGlyph} />;
export const DashboardIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={dashboardGlyph} />
);
export const EditIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={editGlyph} />;
export const EyeIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={eyeGlyph} />;
export const EyeOffIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={eyeOffGlyph} />;
export const FolderIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={folderGlyph} />;
export const GitHubIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={githubGlyph} />;
export const HomeIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={homeGlyph} />;
export const BookBookmarkIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={bookBookmarkGlyph} />
);
export const LoginIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={loginGlyph} />;
export const PanelLeftCloseIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={panelLeftCloseGlyph} />
);
export const PanelLeftOpenIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={panelLeftOpenGlyph} />
);
export const MenuIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={menuGlyph} />;
export const MonitorIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={monitorGlyph} />;
export const MoonIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={moonGlyph} />;
export const MoreHorizontalIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={moreHorizontalGlyph} />
);
export const PlayIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={playGlyph} />;
export const PlusIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={plusGlyph} />;
export const RocketIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={rocketGlyph} />;
export const SettingsIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={settingsGlyph} />;
export const ShieldUserIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={shieldUserGlyph} />
);
export const StopIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={stopGlyph} />;
export const SunIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={sunGlyph} />;
export const TerminalIcon = (props: IconProps) => <HugeiconsIcon {...props} icon={terminalGlyph} />;
export const UnfoldMoreIcon = (props: IconProps) => (
  <HugeiconsIcon {...props} icon={unfoldMoreGlyph} />
);
