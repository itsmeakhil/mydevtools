"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import useAuth from "@/utils/useAuth";
import { COLOR_THEME_OPTIONS, type ColorTheme, useColorTheme } from "@/hooks/use-color-theme";
import { getUserPreferences, patchUserPreferences, type ThemePreference } from "@/lib/user-preferences-api";

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
        const data = await getUserPreferences();

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

        const initialPayload = {
          theme: isThemePreference(data.theme) ? data.theme : normalizedTheme,
          locale: isSupportedLocale(data.locale) ? data.locale : locale,
          accentColor: isColorTheme(data.accentColor) ? data.accentColor : colorTheme,
        };

        await patchUserPreferences(initialPayload);
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

      const payload = {
        theme: normalizedTheme,
        locale,
        accentColor: colorTheme,
      };
      const serializedPayload = JSON.stringify(payload);

      if (serializedPayload === lastSavedRef.current) return;

      try {
        await patchUserPreferences(payload);
        lastSavedRef.current = serializedPayload;
      } catch (error) {
        console.error("Error saving user preferences:", error);
      }
    };

    savePreferences();
  }, [authLoading, locale, normalizedTheme, colorTheme, user?.uid]);

  return null;
}
