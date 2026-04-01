"use client";

import { useEffect, useMemo, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { db } from "@/database/firebase";
import useAuth from "@/utils/useAuth";

type ThemePreference = "light" | "dark" | "system";

interface UserPreferencesDocument {
  theme?: ThemePreference;
  locale?: string;
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

export function UserPreferencesSync() {
  const { user, loading: authLoading } = useAuth(false);
  const { theme, setTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();

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
        const userPrefsRef = doc(db, "users", user.uid, "userData", "preferences");
        const userPrefsSnap = await getDoc(userPrefsRef);
        const data = (userPrefsSnap.data() || {}) as UserPreferencesDocument;

        if (isThemePreference(data.theme) && data.theme !== theme) {
          setTheme(data.theme);
        }

        if (isSupportedLocale(data.locale) && data.locale !== locale) {
          setLocaleCookie(data.locale);
          router.refresh();
        }

        const initialPayload: UserPreferencesDocument = {
          theme: isThemePreference(data.theme) ? data.theme : normalizedTheme,
          locale: isSupportedLocale(data.locale) ? data.locale : locale,
        };

        await setDoc(userPrefsRef, initialPayload, { merge: true });
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
    router,
    setTheme,
    theme,
    user?.uid,
  ]);

  useEffect(() => {
    const savePreferences = async () => {
      if (authLoading || !user?.uid || !hydratedRef.current) return;

      const payload: UserPreferencesDocument = {
        theme: normalizedTheme,
        locale,
      };
      const serializedPayload = JSON.stringify(payload);

      if (serializedPayload === lastSavedRef.current) return;

      try {
        const userPrefsRef = doc(db, "users", user.uid, "userData", "preferences");
        await setDoc(userPrefsRef, payload, { merge: true });
        lastSavedRef.current = serializedPayload;
      } catch (error) {
        console.error("Error saving user preferences:", error);
      }
    };

    savePreferences();
  }, [authLoading, locale, normalizedTheme, user?.uid]);

  return null;
}
