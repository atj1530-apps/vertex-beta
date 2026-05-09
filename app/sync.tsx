import { useEffect } from "react";
import { router } from "expo-router";
import * as Linking from "expo-linking";

export default function SyncScreen() {
  useEffect(() => {
    async function forwardUrl() {
      const url = await Linking.getInitialURL();

      if (url) {
        // Forward the incoming deep link to the Home tab.
        router.replace({
          pathname: "/(tabs)",
          params: { incoming_url: url },
        });
      } else {
        router.replace("/(tabs)");
      }
    }

    forwardUrl();
  }, []);

  return null;
}