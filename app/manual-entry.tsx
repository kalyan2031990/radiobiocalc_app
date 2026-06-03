/**
 * Manual DVH entry removed — redirect to file import.
 */

import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ManualEntryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dvh-input");
  }, [router]);

  return null;
}
