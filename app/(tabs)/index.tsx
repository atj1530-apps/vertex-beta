import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../supabase";

WebBrowser.maybeCompleteAuthSession();




const REDIRECT_URL = "com.anonymous.vertex-health-test://expo-development-client/";

function extractTokensFromUrl(inputUrl: string): {
  access_token?: string;
  refresh_token?: string;
} {
  try {
    const decodedOnce = decodeURIComponent(inputUrl);

    const allUrlsToCheck = [inputUrl, decodedOnce];

    const outerUrl = new URL(inputUrl);
    const wrappedUrl = outerUrl.searchParams.get("url");

    if (wrappedUrl) {
      allUrlsToCheck.push(wrappedUrl);
      allUrlsToCheck.push(decodeURIComponent(wrappedUrl));
    }

    for (const url of allUrlsToCheck) {
      const hashIndex = url.indexOf("#");
      const queryIndex = url.indexOf("?");

      const fragment =
        hashIndex >= 0
          ? url.substring(hashIndex + 1)
          : queryIndex >= 0
          ? url.substring(queryIndex + 1)
          : "";

      const params = new URLSearchParams(fragment);

      const access_token = params.get("access_token") || undefined;
      const refresh_token = params.get("refresh_token") || undefined;

      if (access_token && refresh_token) {
        return { access_token, refresh_token };
      }
    }
  } catch {
    const accessMatch = inputUrl.match(/access_token=([^&#]+)/);
    const refreshMatch = inputUrl.match(/refresh_token=([^&#]+)/);

    return {
      access_token: accessMatch ? decodeURIComponent(accessMatch[1]) : undefined,
      refresh_token: refreshMatch ? decodeURIComponent(refreshMatch[1]) : undefined,
    };
  }

  return {};
}

export default function IndexScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  const signedInEmail = useMemo(() => {
    return session?.user?.email ?? "Signed in";
  }, [session]);

  async function handleIncomingUrl(url: string) {
    const { access_token, refresh_token } = extractTokensFromUrl(url);

    if (!access_token || !refresh_token) {
      console.log("Missing Supabase tokens from URL:", url);
      return;
    }

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.log("setSession error:", error.message);
      Alert.alert("Sign-in error", error.message);
      return;
    }

    setSession(data.session);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      handleIncomingUrl(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleIncomingUrl(url);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  async function signInWithGoogle() {
    try {
      setSigningIn(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: REDIRECT_URL,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        Alert.alert("Google sign-in error", error.message);
        return;
      }

      if (!data?.url) {
        Alert.alert("Google sign-in error", "No login URL returned.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        REDIRECT_URL
      );

      if (result.type === "success" && result.url) {
        await handleIncomingUrl(result.url);
      }
    } catch (err: any) {
      Alert.alert("Google sign-in error", err?.message ?? "Unknown error");
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>Checking sign-in...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {session ? (
          <>
            <Text style={styles.title}>Signed in</Text>
            <Text style={styles.subtitle}>{signedInEmail}</Text>

            <TouchableOpacity style={styles.secondaryButton} onPress={signOut}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Vertex Health</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            <TouchableOpacity
              style={styles.button}
              onPress={signInWithGoogle}
              disabled={signingIn}
            >
              {signingIn ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign in with Google</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7fb",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 28,
    textAlign: "center",
  },
  statusText: {
    marginTop: 12,
    color: "#6b7280",
  },
  button: {
    width: "100%",
    backgroundColor: "#111827",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
});