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
  /** After a successful GET, React state (theme/locale/accent) may lag; skip PATCH briefly. */
  const suppressPatchUntilRef = useRef<number>(0);

  const normalizedTheme = useMemo<ThemePreference>(
    () => (isThemePreference(theme) ? theme : "system"),
    [theme]
  );

  useEffect(() => {
    const loadPreferences = async () => {
      if (authLoading || !user?.uid) {
        loadedUserIdRef.current = null;
        // While logged out, never treat preferences as hydrated — otherwise the save
        // effect PATCHes local defaults (e.g. accent blue) and overwrites the server
        // before the next login's GET + merge runs.
        if (!user?.uid) {
          hydratedRef.current = false;
          lastSavedRef.current = "";
        }
        return;
      }
      // Prevent concurrent GETs when theme/locale/color deps used to retrigger this effect
      // before the first request finished.
      if (loadedUserIdRef.current === user.uid) return;
      loadedUserIdRef.current = user.uid;

      try {
        const data = await getUserPreferences();

        // Apply server snapshot to lastSavedRef BEFORE setTheme/setLocale/setColorTheme so the
        // save effect never sees hydrated=true with a stale lastSavedRef mismatch.
        const nextTheme = isThemePreference(data.theme) ? data.theme : normalizedTheme;
        const nextLocale = isSupportedLocale(data.locale) ? data.locale : locale;
        const nextAccent = isColorTheme(data.accentColor) ? data.accentColor : colorTheme;
        lastSavedRef.current = JSON.stringify({
          theme: nextTheme,
          locale: nextLocale,
          accentColor: nextAccent,
        });

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

        suppressPatchUntilRef.current = Date.now() + 1200;
      } catch (error) {
        console.error("Error syncing user preferences:", error);
        // Match save baseline to current UI so a failed GET does not trigger an immediate PATCH.
        lastSavedRef.current = JSON.stringify({
          theme: normalizedTheme,
          locale,
          accentColor: colorTheme,
        });
      } finally {
        hydratedRef.current = true;
      }
    };

    void loadPreferences();
    // Intentionally only auth + user id: including theme/locale/color caused overlapping GETs
    // and races with hydratedRef/lastSavedRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.uid]);

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

      if (Date.now() < suppressPatchUntilRef.current) {
        lastSavedRef.current = serializedPayload;
        return;
      }

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
