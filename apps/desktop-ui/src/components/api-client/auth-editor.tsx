"use client"

import * as React from "react"
import { RequestAuth } from "./types"
import {
    fetchClientCredentialsToken,
    fetchPasswordToken,
    refreshAccessToken,
    startAuthorizationCodeFlow,
    type OAuth2Config,
    type OAuth2GrantType,
} from "@/lib/oauth2"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"

interface AuthEditorProps {
    auth: RequestAuth
    setAuth: (auth: RequestAuth) => void
    /** Offer "Inherit from parent" (requests only — collections have no parent). */
    allowInherit?: boolean
}

/** Auth editor shared by the request Auth tab and collection/folder settings. */
export function AuthEditor({ auth, setAuth, allowInherit }: AuthEditorProps) {
    const t = useTranslations("ApiClient.requestTabs")
    const tGrant = useTranslations("ApiClient.oauth2Grants")
    const tDigest = useTranslations("ApiClient.digestAuth")
    const tInherit = useTranslations("ApiClient.collectionDefaults.inherit")

    /** Build a clean RequestAuth when the user switches type, so stale
     *  bearer-token / basic-password fields don't ride along into the next request. */
    const handleAuthTypeChange = (next: RequestAuth["type"]) => {
        switch (next) {
            case "none":
            case "inherit":
                setAuth({ type: next })
                return
            case "bearer":
                setAuth({ type: "bearer", token: auth.type === "bearer" ? auth.token ?? "" : "" })
                return
            case "basic":
                setAuth({
                    type: "basic",
                    username: auth.type === "basic" ? auth.username ?? "" : "",
                    password: auth.type === "basic" ? auth.password ?? "" : "",
                })
                return
            case "api-key":
                setAuth({
                    type: "api-key",
                    apiKeyKey: auth.type === "api-key" ? auth.apiKeyKey ?? "" : "",
                    apiKeyValue: auth.type === "api-key" ? auth.apiKeyValue ?? "" : "",
                    apiKeyLocation: auth.type === "api-key" ? auth.apiKeyLocation ?? "header" : "header",
                })
                return
            case "oauth2":
                setAuth({
                    type: "oauth2",
                    oauth2: auth.type === "oauth2" && auth.oauth2
                        ? auth.oauth2
                        : { grantType: "client_credentials", tokenUrl: "", clientId: "" },
                })
                return
            case "aws-sigv4":
                setAuth({
                    type: "aws-sigv4",
                    awsSigV4: auth.type === "aws-sigv4" && auth.awsSigV4
                        ? auth.awsSigV4
                        : { accessKeyId: "", secretAccessKey: "", region: "us-east-1", service: "" },
                })
                return
            case "hawk":
                setAuth({
                    type: "hawk",
                    hawk: auth.type === "hawk" && auth.hawk
                        ? auth.hawk
                        : { id: "", key: "", algorithm: "sha256" },
                })
                return
            case "digest":
                setAuth({
                    type: "digest",
                    digest: auth.type === "digest" && auth.digest
                        ? auth.digest
                        : { username: "", password: "", realm: "", nonce: "", qop: "auth", algorithm: "MD5" },
                })
                return
            case "ntlm":
                setAuth({
                    type: "ntlm",
                    ntlm: auth.type === "ntlm" && auth.ntlm
                        ? auth.ntlm
                        : { username: "", password: "", domain: "", workstation: "" },
                })
                return
            case "jwt-bearer":
                setAuth({
                    type: "jwt-bearer",
                    jwtBearer: auth.type === "jwt-bearer" && auth.jwtBearer
                        ? auth.jwtBearer
                        : { algorithm: "HS256", secret: "", ttlSeconds: 3600 },
                })
                return
            case "spnego":
                setAuth({
                    type: "spnego",
                    spnego: auth.type === "spnego" && auth.spnego ? auth.spnego : { token: "" },
                })
                return
        }
    }

    const updateJwtCfg = (patch: Partial<NonNullable<RequestAuth["jwtBearer"]>>) => {
        if (auth.type !== "jwt-bearer") return
        setAuth({ ...auth, jwtBearer: { ...(auth.jwtBearer ?? { algorithm: "HS256" }), ...patch } })
    }

    const updateSpnegoCfg = (patch: Partial<NonNullable<RequestAuth["spnego"]>>) => {
        if (auth.type !== "spnego") return
        setAuth({ ...auth, spnego: { ...(auth.spnego ?? { token: "" }), ...patch } })
    }

    const updateNtlmCfg = (patch: Partial<NonNullable<RequestAuth["ntlm"]>>) => {
        if (auth.type !== "ntlm") return
        setAuth({ ...auth, ntlm: { ...(auth.ntlm ?? { username: "", password: "" }), ...patch } })
    }

    const updateAwsCfg = (patch: Partial<NonNullable<RequestAuth["awsSigV4"]>>) => {
        if (auth.type !== "aws-sigv4") return
        setAuth({ ...auth, awsSigV4: { ...(auth.awsSigV4 ?? { accessKeyId: "", secretAccessKey: "", region: "", service: "" }), ...patch } })
    }
    const updateHawkCfg = (patch: Partial<NonNullable<RequestAuth["hawk"]>>) => {
        if (auth.type !== "hawk") return
        setAuth({ ...auth, hawk: { ...(auth.hawk ?? { id: "", key: "" }), ...patch } })
    }
    const updateDigestCfg = (patch: Partial<NonNullable<RequestAuth["digest"]>>) => {
        if (auth.type !== "digest") return
        setAuth({ ...auth, digest: { ...(auth.digest ?? { username: "", password: "", realm: "", nonce: "" }), ...patch } })
    }

    const updateOAuthConfig = (patch: Partial<OAuth2Config>) => {
        if (auth.type !== "oauth2") return
        setAuth({ ...auth, oauth2: { ...(auth.oauth2 ?? { grantType: "client_credentials", tokenUrl: "", clientId: "" }), ...patch } })
    }

    const [tokenLoading, setTokenLoading] = React.useState(false)
    const handleFetchToken = async () => {
        if (auth.type !== "oauth2" || !auth.oauth2) return
        setTokenLoading(true)
        try {
            const grant = auth.oauth2.grantType
            const fresh = grant === "authorization_code" ? await startAuthorizationCodeFlow(auth.oauth2)
                : grant === "password" ? await fetchPasswordToken(auth.oauth2)
                : grant === "refresh_token" ? await refreshAccessToken(auth.oauth2)
                : await fetchClientCredentialsToken(auth.oauth2)
            setAuth({ ...auth, oauth2: fresh })
            toast.success("Access token retrieved")
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setTokenLoading(false)
        }
    }
    const handleRefreshToken = async () => {
        if (auth.type !== "oauth2" || !auth.oauth2?.refreshToken) return
        setTokenLoading(true)
        try {
            const fresh = await refreshAccessToken(auth.oauth2)
            setAuth({ ...auth, oauth2: fresh })
            toast.success("Access token refreshed")
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setTokenLoading(false)
        }
    }


    return (
        <>
            <div className="flex items-center gap-3">
                <Label className="text-[13px] font-normal text-muted-foreground shrink-0">{t("authType")}</Label>
                <Select
                    value={auth.type}
                    onValueChange={(v) => handleAuthTypeChange(v as RequestAuth["type"])}
                >
                    <SelectTrigger className="w-[200px] h-8 text-[13px]">
                        <SelectValue placeholder={t("selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                        {allowInherit && <SelectItem value="inherit">{tInherit("option")}</SelectItem>}
                    <SelectItem value="none">{t("noAuth")}</SelectItem>
                        <SelectItem value="bearer">{t("bearerToken")}</SelectItem>
                        <SelectItem value="basic">{t("basicAuth")}</SelectItem>
                        <SelectItem value="api-key">{t("apiKey")}</SelectItem>
                        <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                        <SelectItem value="aws-sigv4">AWS Signature v4</SelectItem>
                        <SelectItem value="hawk">Hawk</SelectItem>
                        <SelectItem value="digest">{tDigest("option")}</SelectItem>
                        <SelectItem value="ntlm">NTLM v2</SelectItem>
                        <SelectItem value="jwt-bearer">JWT Bearer</SelectItem>
                        <SelectItem value="spnego">SPNEGO / Kerberos</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                {auth.type === "bearer" && (
                    <div className="space-y-2 max-w-md animate-in fade-in duration-200">
                        <Label>{t("labelToken")}</Label>
                        <Input
                            type="password"
                            value={auth.token || ""}
                            onChange={(e) => setAuth({ ...auth, token: e.target.value })}
                            placeholder={t("placeholderBearerToken")}
                            className="h-9"
                        />
                    </div>
                )}

                {auth.type === "basic" && (
                    <div className="space-y-4 max-w-md animate-in fade-in duration-200">
                        <div className="space-y-2">
                            <Label>{t("labelUsername")}</Label>
                            <Input
                                value={auth.username || ""}
                                onChange={(e) => setAuth({ ...auth, username: e.target.value })}
                                placeholder={t("placeholderUsername")}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("labelPassword")}</Label>
                            <Input
                                type="password"
                                value={auth.password || ""}
                                onChange={(e) => setAuth({ ...auth, password: e.target.value })}
                                placeholder={t("placeholderPassword")}
                                className="h-9"
                            />
                        </div>
                    </div>
                )}
                {auth.type === "api-key" && (
                    <div className="space-y-4 max-w-md animate-in fade-in duration-200">
                        <div className="space-y-2">
                            <Label>{t("labelKey")}</Label>
                            <Input
                                value={auth.apiKeyKey || ""}
                                onChange={(e) => setAuth({ ...auth, apiKeyKey: e.target.value })}
                                placeholder={t("placeholderApiKeyName")}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("labelValue")}</Label>
                            <Input
                                type="password"
                                value={auth.apiKeyValue || ""}
                                onChange={(e) => setAuth({ ...auth, apiKeyValue: e.target.value })}
                                placeholder={t("placeholderValue")}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("addTo")}</Label>
                            <Select
                                value={auth.apiKeyLocation || "header"}
                                onValueChange={(v) => setAuth({ ...auth, apiKeyLocation: v as RequestAuth["apiKeyLocation"] })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t("addTo")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="header">{t("header")}</SelectItem>
                                    <SelectItem value="query">{t("queryParams")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                {auth.type === "oauth2" && (
                    <div className="space-y-4 max-w-xl animate-in fade-in duration-200">
                        <div className="space-y-2">
                            <Label>Grant type</Label>
                            <Select
                                value={auth.oauth2?.grantType ?? "client_credentials"}
                                onValueChange={(v) => updateOAuthConfig({ grantType: v as OAuth2GrantType })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="client_credentials">Client Credentials</SelectItem>
                                    <SelectItem value="authorization_code">Authorization Code (PKCE)</SelectItem>
                                    <SelectItem value="password">{tGrant("grantPassword")}</SelectItem>
                                    <SelectItem value="refresh_token">{tGrant("grantRefreshToken")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {auth.oauth2?.grantType === "authorization_code" && (
                            <>
                                <div className="space-y-2">
                                    <Label>Authorization URL</Label>
                                    <Input
                                        value={auth.oauth2?.authUrl ?? ""}
                                        onChange={(e) => updateOAuthConfig({ authUrl: e.target.value })}
                                        placeholder="https://auth.example.com/oauth/authorize"
                                        className="font-mono text-[13px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center justify-between gap-2">
                                        <span>Redirect URI (register with provider)</span>
                                        <button
                                            type="button"
                                            className="text-xs underline text-muted-foreground hover:text-foreground"
                                            onClick={() => {
                                                if (typeof window === "undefined") return
                                                updateOAuthConfig({ redirectUri: `${window.location.origin}/oauth/callback` })
                                            }}
                                        >
                                            Use default
                                        </button>
                                    </Label>
                                    <Input
                                        value={auth.oauth2?.redirectUri ?? ""}
                                        onChange={(e) => updateOAuthConfig({ redirectUri: e.target.value })}
                                        placeholder="https://yourapp.example.com/oauth/callback"
                                        className="font-mono text-[13px]"
                                    />
                                </div>
                            </>
                        )}
                        {auth.oauth2?.grantType === "password" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="oauth2-username">{tGrant("username")}</Label>
                                    <Input
                                        id="oauth2-username"
                                        autoComplete="off"
                                        value={auth.oauth2?.username ?? ""}
                                        onChange={(e) => updateOAuthConfig({ username: e.target.value })}
                                        className="font-mono text-[13px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="oauth2-password">{tGrant("password")}</Label>
                                    <Input
                                        id="oauth2-password"
                                        type="password"
                                        autoComplete="off"
                                        value={auth.oauth2?.password ?? ""}
                                        onChange={(e) => updateOAuthConfig({ password: e.target.value })}
                                        className="font-mono text-[13px]"
                                    />
                                </div>
                            </div>
                        )}
                        {auth.oauth2?.grantType === "refresh_token" && (
                            <div className="space-y-2">
                                <Label htmlFor="oauth2-refresh-token">{tGrant("refreshToken")}</Label>
                                <Input
                                    id="oauth2-refresh-token"
                                    type="password"
                                    autoComplete="off"
                                    aria-describedby="oauth2-refresh-token-hint"
                                    value={auth.oauth2?.refreshToken ?? ""}
                                    onChange={(e) => updateOAuthConfig({ refreshToken: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                                <p id="oauth2-refresh-token-hint" className="text-xs text-muted-foreground">{tGrant("refreshTokenHint")}</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Access Token URL</Label>
                            <Input
                                value={auth.oauth2?.tokenUrl ?? ""}
                                onChange={(e) => updateOAuthConfig({ tokenUrl: e.target.value })}
                                placeholder="https://auth.example.com/oauth/token"
                                className="font-mono text-[13px]"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Client ID</Label>
                                <Input
                                    value={auth.oauth2?.clientId ?? ""}
                                    onChange={(e) => updateOAuthConfig({ clientId: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Client Secret</Label>
                                <Input
                                    type="password"
                                    value={auth.oauth2?.clientSecret ?? ""}
                                    onChange={(e) => updateOAuthConfig({ clientSecret: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Scope</Label>
                                <Input
                                    value={auth.oauth2?.scope ?? ""}
                                    onChange={(e) => updateOAuthConfig({ scope: e.target.value })}
                                    placeholder="read:items write:items"
                                    className="font-mono text-[13px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Audience (optional)</Label>
                                <Input
                                    value={auth.oauth2?.audience ?? ""}
                                    onChange={(e) => updateOAuthConfig({ audience: e.target.value })}
                                    placeholder="https://api.example.com"
                                    className="font-mono text-[13px]"
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            <Button
                                onClick={handleFetchToken}
                                disabled={
                                    tokenLoading ||
                                    !auth.oauth2?.tokenUrl ||
                                    (auth.oauth2?.grantType !== "refresh_token" && !auth.oauth2?.clientId) ||
                                    (auth.oauth2?.grantType === "password" && !auth.oauth2.username) ||
                                    (auth.oauth2?.grantType === "refresh_token" && !auth.oauth2.refreshToken) ||
                                    (auth.oauth2?.grantType === "authorization_code" &&
                                        (!auth.oauth2.authUrl || !auth.oauth2.redirectUri))
                                }
                            >
                                {tokenLoading ? "Working…" : "Get New Access Token"}
                            </Button>
                            {auth.oauth2?.refreshToken && (
                                <Button variant="outline" onClick={handleRefreshToken} disabled={tokenLoading}>
                                    Refresh
                                </Button>
                            )}
                            {auth.oauth2?.accessToken && (
                                <Button
                                    variant="ghost"
                                    onClick={() => updateOAuthConfig({ accessToken: undefined, refreshToken: undefined, expiresAt: undefined })}
                                    disabled={tokenLoading}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        {auth.oauth2?.accessToken && (
                            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-muted-foreground">Access token</span>
                                    <span className="font-mono break-all">
                                        {auth.oauth2.accessToken.slice(0, 12)}…{auth.oauth2.accessToken.slice(-6)}
                                    </span>
                                </div>
                                {auth.oauth2.expiresAt && (
                                    <div className="text-muted-foreground">
                                        Expires {new Date(auth.oauth2.expiresAt).toLocaleString()}
                                        {auth.oauth2.expiresAt < Date.now() && (
                                            <span className="ml-2 text-destructive font-medium">(expired — will auto-refresh on send)</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {auth.type === "aws-sigv4" && (
                    <div className="space-y-3 max-w-xl animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Access Key ID</Label>
                                <Input
                                    value={auth.awsSigV4?.accessKeyId ?? ""}
                                    onChange={(e) => updateAwsCfg({ accessKeyId: e.target.value })}
                                    className="font-mono text-[13px]"
                                    placeholder="AKIA…"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Secret Access Key</Label>
                                <Input
                                    type="password"
                                    value={auth.awsSigV4?.secretAccessKey ?? ""}
                                    onChange={(e) => updateAwsCfg({ secretAccessKey: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Region</Label>
                                <Input
                                    value={auth.awsSigV4?.region ?? ""}
                                    onChange={(e) => updateAwsCfg({ region: e.target.value })}
                                    className="font-mono text-[13px]"
                                    placeholder="us-east-1"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Service</Label>
                                <Input
                                    value={auth.awsSigV4?.service ?? ""}
                                    onChange={(e) => updateAwsCfg({ service: e.target.value })}
                                    className="font-mono text-[13px]"
                                    placeholder="s3, lambda, execute-api…"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Session token (optional)</Label>
                            <Input
                                type="password"
                                value={auth.awsSigV4?.sessionToken ?? ""}
                                onChange={(e) => updateAwsCfg({ sessionToken: e.target.value })}
                                className="font-mono text-[13px]"
                                placeholder="STS / IAM Role temporary credentials"
                            />
                        </div>
                    </div>
                )}
                {auth.type === "hawk" && (
                    <div className="space-y-3 max-w-xl animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Hawk ID</Label>
                                <Input
                                    value={auth.hawk?.id ?? ""}
                                    onChange={(e) => updateHawkCfg({ id: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Key</Label>
                                <Input
                                    type="password"
                                    value={auth.hawk?.key ?? ""}
                                    onChange={(e) => updateHawkCfg({ key: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Algorithm</Label>
                                <Select
                                    value={auth.hawk?.algorithm ?? "sha256"}
                                    onValueChange={(v) => updateHawkCfg({ algorithm: v as "sha256" | "sha1" })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sha256">sha256</SelectItem>
                                        <SelectItem value="sha1">sha1</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Ext</Label>
                                <Input
                                    value={auth.hawk?.ext ?? ""}
                                    onChange={(e) => updateHawkCfg({ ext: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={!!auth.hawk?.includePayloadHash}
                                onChange={(e) => updateHawkCfg({ includePayloadHash: e.target.checked })}
                            />
                            Include payload hash
                        </label>
                    </div>
                )}
                {auth.type === "digest" && (
                    <div className="space-y-3 max-w-xl animate-in fade-in duration-200">
                        <p className="text-[11px] text-muted-foreground">{tDigest("hint")}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Username</Label>
                                <Input
                                    value={auth.digest?.username ?? ""}
                                    onChange={(e) => updateDigestCfg({ username: e.target.value })}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    value={auth.digest?.password ?? ""}
                                    onChange={(e) => updateDigestCfg({ password: e.target.value })}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Realm</Label>
                                <Input
                                    value={auth.digest?.realm ?? ""}
                                    onChange={(e) => updateDigestCfg({ realm: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Nonce</Label>
                                <Input
                                    value={auth.digest?.nonce ?? ""}
                                    onChange={(e) => updateDigestCfg({ nonce: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label>QoP</Label>
                                <Select
                                    value={auth.digest?.qop ?? "auth"}
                                    onValueChange={(v) => updateDigestCfg({ qop: v as "auth" | "auth-int" })}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auth">auth</SelectItem>
                                        <SelectItem value="auth-int">auth-int</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Algorithm</Label>
                                <Select
                                    value={auth.digest?.algorithm ?? "MD5"}
                                    onValueChange={(v) => updateDigestCfg({ algorithm: v as "MD5" | "SHA-256" })}
                                >
                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MD5">MD5</SelectItem>
                                        <SelectItem value="SHA-256">SHA-256</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Opaque (optional)</Label>
                                <Input
                                    value={auth.digest?.opaque ?? ""}
                                    onChange={(e) => updateDigestCfg({ opaque: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                            </div>
                        </div>
                    </div>
                )}
                {auth.type === "ntlm" && (
                    <div className="space-y-3 max-w-xl animate-in fade-in duration-200">
                        <p className="text-[11px] text-muted-foreground">
                            Three-step NTLMv2 handshake runs server-side on a pinned
                            keepalive socket. Targets: IIS, SharePoint, Exchange-style endpoints.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Username</Label>
                                <Input
                                    value={auth.ntlm?.username ?? ""}
                                    onChange={(e) => updateNtlmCfg({ username: e.target.value })}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    value={auth.ntlm?.password ?? ""}
                                    onChange={(e) => updateNtlmCfg({ password: e.target.value })}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label>Domain (optional)</Label>
                                <Input
                                    value={auth.ntlm?.domain ?? ""}
                                    onChange={(e) => updateNtlmCfg({ domain: e.target.value })}
                                    className="font-mono text-[13px]"
                                    placeholder="CORP"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Workstation (optional)</Label>
                                <Input
                                    value={auth.ntlm?.workstation ?? ""}
                                    onChange={(e) => updateNtlmCfg({ workstation: e.target.value })}
                                    className="font-mono text-[13px]"
                                    placeholder="WORKSTATION"
                                />
                            </div>
                        </div>
                    </div>
                )}
                {auth.type === "jwt-bearer" && (
                    <div className="space-y-3 max-w-xl animate-in fade-in duration-200">
                        <p className="text-[11px] text-muted-foreground">
                            JWT is signed client-side at send time and attached as{" "}
                            <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">Authorization: Bearer</code>.
                        </p>
                        <div className="space-y-1">
                            <Label>Algorithm</Label>
                            <Select
                                value={auth.jwtBearer?.algorithm ?? "HS256"}
                                onValueChange={(v) => updateJwtCfg({ algorithm: v as "HS256" | "HS384" | "HS512" | "RS256" | "ES256" })}
                            >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="HS256">HS256</SelectItem>
                                    <SelectItem value="HS384">HS384</SelectItem>
                                    <SelectItem value="HS512">HS512</SelectItem>
                                    <SelectItem value="RS256">RS256</SelectItem>
                                    <SelectItem value="ES256">ES256</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {(auth.jwtBearer?.algorithm ?? "HS256").startsWith("HS") ? (
                            <div className="space-y-1">
                                <Label>HMAC secret</Label>
                                <Input
                                    type="password"
                                    value={auth.jwtBearer?.secret ?? ""}
                                    onChange={(e) => updateJwtCfg({ secret: e.target.value })}
                                    className="font-mono text-[13px]"
                                />
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <Label>Private key (PKCS#8 PEM)</Label>
                                <textarea
                                    value={auth.jwtBearer?.privateKeyPem ?? ""}
                                    onChange={(e) => updateJwtCfg({ privateKeyPem: e.target.value })}
                                    // threatcrush-disable-next-line secret-private-key
                                    placeholder="-----BEGIN PRIVATE KEY-----"
                                    className="w-full min-h-[100px] rounded-md border border-input bg-card px-3 py-2 font-mono text-xs outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/25"
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label>Issuer (iss)</Label>
                                <Input value={auth.jwtBearer?.issuer ?? ""} onChange={(e) => updateJwtCfg({ issuer: e.target.value })} className="h-9" />
                            </div>
                            <div className="space-y-1">
                                <Label>Subject (sub)</Label>
                                <Input value={auth.jwtBearer?.subject ?? ""} onChange={(e) => updateJwtCfg({ subject: e.target.value })} className="h-9" />
                            </div>
                            <div className="space-y-1">
                                <Label>Audience (aud)</Label>
                                <Input value={auth.jwtBearer?.audience ?? ""} onChange={(e) => updateJwtCfg({ audience: e.target.value })} className="h-9" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>TTL (seconds)</Label>
                            <Input
                                type="number"
                                value={auth.jwtBearer?.ttlSeconds ?? 3600}
                                onChange={(e) => updateJwtCfg({ ttlSeconds: Math.max(1, Number(e.target.value) || 3600) })}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Extra claims (JSON)</Label>
                            <textarea
                                value={auth.jwtBearer?.extraClaimsJson ?? ""}
                                onChange={(e) => updateJwtCfg({ extraClaimsJson: e.target.value })}
                                placeholder={`{ "scope": "read:items" }`}
                                className="w-full min-h-[60px] rounded-md border border-input bg-card px-3 py-2 font-mono text-xs outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/25"
                            />
                        </div>
                    </div>
                )}
                {auth.type === "spnego" && (
                    <div className="space-y-3 max-w-xl animate-in fade-in duration-200">
                        <p className="text-[11px] text-muted-foreground">
                            Pre-acquired SPNEGO token (base64). Get one via{" "}
                            <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">kinit</code> + a CLI helper.
                            Routed through <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">/api/proxy-spnego</code>.
                        </p>
                        <div className="space-y-1">
                            <Label>Negotiate token (base64)</Label>
                            <textarea
                                value={auth.spnego?.token ?? ""}
                                onChange={(e) => updateSpnegoCfg({ token: e.target.value })}
                                placeholder="YIIH7gYGKwYBBQUC…"
                                className="w-full min-h-[100px] rounded-md border border-input bg-card px-3 py-2 font-mono text-[11px] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/25"
                            />
                        </div>
                    </div>
                )}
                {auth.type === "inherit" && (
                <div className="text-center py-10 text-muted-foreground">
                    <p className="text-[13px]">{tInherit("hint")}</p>
                </div>
            )}
            {auth.type === "none" && (
                    <div className="text-center py-10 text-muted-foreground">
                        <p className="text-[13px]">{t("noAuthHint")}</p>
                    </div>
                )}
            </div>
        </>
    )
}
