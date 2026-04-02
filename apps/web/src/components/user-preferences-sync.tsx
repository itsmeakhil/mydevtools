"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import useAuth from "@/utils/useAuth";
import { auth } from "@/database/firebase";
import { COLOR_THEME_OPTIONS, type ColorTheme, useColorTheme } from "@/hooks/use-color-theme";

type ThemePreference = "light" | "dark" | "system";

interface UserPreferencesDocument {
  theme?: ThemePreference;
  locale?: string;
  accentColor?: ColorTheme;
}

const SUPPORTED_LOCALES = [
  "en",
  "fr",
  "es",
  "ar",
  "ca",
  "zh",
  "cs",
  "el",
  "de",
  "da",
  "af",
  "id",
  "fa",
  "ru",
  "it",
  "ja",
  "ko",
  "ms",
  "nb",
  "nl",
  "sv",
  "pl",
  "tr",
  "pt",
  "pt-BR",
  "vi",
  "uk",
] as const;

function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function isSupportedLocale(value: string | undefined): value is (typeof SUPPORTED_LOCALES)[number] {
  return !!value && SUPPORTED_LOCALES.includes(value as (typeof SUPPORTED_LOCALES)[number]);
}

function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

const BACKEND_BASE_URL: string =
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  "http://localhost:8000";

type ProxyResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  isBase64: boolean;
  time: number;
  size: number;
  error?: string;
};

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated.");

  const idToken = await currentUser.getIdToken();
  const url = new URL(path, BACKEND_BASE_URL).toString();

  const headersObj: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
  };

  const proxyBody = body !== undefined ? JSON.stringify(body) : undefined;
  if (proxyBody !== undefined && method !== "GET" && method !== "HEAD") {
    headersObj["Content-Type"] = "application/json";
  }

  const proxyRes = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      method,
      headers: headersObj,
      body: proxyBody,
    }),
  });

  const proxyData = (await proxyRes.json()) as ProxyResponse;
  if (proxyData.status < 200 || proxyData.status >= 300) {
    throw new Error(proxyData.body || proxyData.statusText || proxyData.error || "Request failed");
  }

  if (!proxyData.body) return undefined as T;
  try {
    return JSON.parse(proxyData.body) as T;
  } catch {
    return proxyData.body as unknown as T;
  }
}

function isColorTheme(value: string | undefined): value is ColorTheme {
  return !!value && (COLOR_THEME_OPTIONS as readonly string[]).includes(value);
}

export function UserPreferencesSync() {
  const { user, loading: authLoading } = useAuth(false);
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const { colorTheme, setColorTheme } = useColorTheme();

  const hydratedRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>("");

  const normalizedTheme = useMemo<ThemePreference>(
    () => (isThemePreference(theme) ? theme : "system"),
    [theme]
  );

  useEffect(() => {
    const loadPreferences = async () => {
      if (authLoading || !user?.uid) {
        loadedUserIdRef.current = null;
        hydratedRef.current = !authLoading;
        return;
      }
      if (loadedUserIdRef.current === user.uid) return;

      try {
        const data = await apiRequest<UserPreferencesDocument>("GET", "/api/v1/user-preferences");

        if (isThemePreference(data.theme) && data.theme !== theme) {
          setTheme(data.theme);
        }

        if (isSupportedLocale(data.locale) && data.locale !== locale) {
          setLocaleCookie(data.locale);
          router.refresh();
        }

        if (isColorTheme(data.accentColor) && data.accentColor !== colorTheme) {
          setColorTheme(data.accentColor);
        }

        const initialPayload: UserPreferencesDocument = {
          theme: isThemePreference(data.theme) ? data.theme : normalizedTheme,
          locale: isSupportedLocale(data.locale) ? data.locale : locale,
          accentColor: isColorTheme(data.accentColor) ? data.accentColor : colorTheme,
        };

        await apiRequest<UserPreferencesDocument>("PATCH", "/api/v1/user-preferences", initialPayload);
        lastSavedRef.current = JSON.stringify(initialPayload);
      } catch (error) {
        console.error("Error syncing user preferences:", error);
      } finally {
        loadedUserIdRef.current = user.uid;
        hydratedRef.current = true;
      }
    };

    loadPreferences();
  }, [
    authLoading,
    locale,
    normalizedTheme,
    colorTheme,
    router,
    setTheme,
    setColorTheme,
    theme,
    user?.uid,
  ]);

  useEffect(() => {
    const savePreferences = async () => {
      if (authLoading || !user?.uid || !hydratedRef.current) return;

      const payload: UserPreferencesDocument = {
        theme: normalizedTheme,
        locale,
        accentColor: colorTheme,
      };
      const serializedPayload = JSON.stringify(payload);

      if (serializedPayload === lastSavedRef.current) return;

      try {
        await apiRequest<UserPreferencesDocument>("PATCH", "/api/v1/user-preferences", payload);
        lastSavedRef.current = serializedPayload;
      } catch (error) {
        console.error("Error saving user preferences:", error);
      }
    };

    savePreferences();
  }, [authLoading, locale, normalizedTheme, colorTheme, user?.uid]);

  return null;
}
