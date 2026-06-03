import AsyncStorage from "@react-native-async-storage/async-storage";

export const DISCLAIMER_KEY = "@rbgyanx_disclaimer_accepted";
export const FIRST_LAUNCH_DONE_KEY = "@rbgyanx_first_launch_done";
export const SELFTEST_LAST_KEY = "@rbgyanx_selftest_last";

export async function isDisclaimerAccepted(): Promise<boolean> {
  return (await AsyncStorage.getItem(DISCLAIMER_KEY)) === "true";
}

export async function isFirstLaunchPending(): Promise<boolean> {
  return (await AsyncStorage.getItem(FIRST_LAUNCH_DONE_KEY)) !== "true";
}

export async function markFirstLaunchDone(): Promise<void> {
  await AsyncStorage.setItem(FIRST_LAUNCH_DONE_KEY, "true");
}

export async function resetFirstLaunchForDev(): Promise<void> {
  await AsyncStorage.removeItem(FIRST_LAUNCH_DONE_KEY);
}
