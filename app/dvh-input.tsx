/**
 * DVH Input — desktop browser, offline mobile, or online pilot.
 */

import { isDesktopClient, isOfflineBuild } from "@/lib/offline-mode";

export default function DVHInputScreen() {
  if (isDesktopClient()) {
    const Screen = require("./dvh-input-desktop").default;
    return <Screen />;
  }
  if (isOfflineBuild()) {
    const Screen = require("./dvh-input-offline").default;
    return <Screen />;
  }
  const Screen = require("./dvh-input-online").default;
  return <Screen />;
}
