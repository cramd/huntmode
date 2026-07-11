"use client";

import { useEffect, useState } from "react";
import { Save, Key, User, Target, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile, saveUserProfile } from "@/lib/db";
import type { UserProfile } from "@/lib/types";
import { toast } from "sonner";
import { AnalyticsEvents, captureEvent } from "@/lib/analytics";
import { AdminAccessRequests } from "@/components/AdminAccessRequests";
import { AdminSignupStats } from "@/components/AdminSignupStats";

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      if (p) setProfile(p);
      setLoading(false);
    });
  }, [user]);

  const handleTestKey = async () => {
    if (!profile.aiApiKey) {
      toast.error("Please enter an API Key to test.");
      return;
    }
    setTestingKey(true);
    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: profile.aiProvider || "openai",
          apiKey: profile.aiApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Key validation failed");
      }
      toast.success("API Key is valid and working!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid key";
      toast.error(`Validation failed: ${msg}`);
    } finally {
      setTestingKey(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveUserProfile(user.uid, profile);
      captureEvent(AnalyticsEvents.SETTINGS_SAVED, {
        ai_provider: profile.aiProvider || "openai",
      });
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex flex-col border-b border-white/5 pb-5">
        <h1 className="text-2xl font-black text-white tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Configure your profile, goals, and AI provider.
        </p>
      </div>

      <AdminSignupStats />

      <AdminAccessRequests />

      {/* Profile */}
      <Card className="bg-slate-900/40 border-white/5 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-white tracking-wide uppercase">
            <User className="w-4 h-4 text-indigo-400" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Display Name</Label>
              <Input
                value={profile.name || user?.displayName || ""}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                placeholder="Your name"
                className="bg-slate-950/60 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-white rounded-xl placeholder:text-slate-655"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Email</Label>
              <Input value={user?.email ?? ""} disabled className="bg-slate-950/20 border-white/5 text-slate-500 rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Target Role</Label>
            <Input
              value={profile.targetRole || ""}
              onChange={(e) => setProfile((p) => ({ ...p, targetRole: e.target.value }))}
              placeholder="e.g. Senior Software Engineer, Product Manager"
              className="bg-slate-950/60 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-white rounded-xl placeholder:text-slate-655"
            />
            <p className="text-[10px] text-slate-500 font-medium">
              This helps personalize your dashboard and motivational messages.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card className="bg-slate-900/40 border-white/5 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-white tracking-wide uppercase">
            <Target className="w-4 h-4 text-purple-400" />
            Weekly Application Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Applications per week</Label>
            <Select
              value={String(profile.weeklyGoal || 5)}
              onValueChange={(v) =>
                setProfile((p) => ({ ...p, weeklyGoal: parseInt(v ?? "5") }))
              }
            >
              <SelectTrigger className="w-full bg-slate-950/60 border-white/5 text-white rounded-xl font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-white/10 text-white">
                {[2, 3, 5, 7, 10, 15, 20].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs focus:bg-white/5 focus:text-white">
                    {n} applications / week
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-500 font-medium">
              Shown on your dashboard as a weekly progress ring. Start small — consistency matters more than volume.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Config */}
      <Card className="bg-slate-900/40 border-white/5 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-white tracking-wide uppercase">
            <Key className="w-4 h-4 text-emerald-400" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Provider</Label>
            <Select
              value={profile.aiProvider || "openai"}
              onValueChange={(v) =>
                setProfile((p) => ({ ...p, aiProvider: v as "openai" | "anthropic" | "google" }))
              }
            >
              <SelectTrigger className="w-full bg-slate-950/60 border-white/5 text-white rounded-xl font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-white/10 text-white">
                <SelectItem value="openai" className="text-xs focus:bg-white/5 focus:text-white">OpenAI (GPT-4o)</SelectItem>
                <SelectItem value="anthropic" className="text-xs focus:bg-white/5 focus:text-white">Anthropic (Claude 3.5 Sonnet)</SelectItem>
                <SelectItem value="google" className="text-xs focus:bg-white/5 focus:text-white">Google (Gemini 2.5 Flash)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="password"
                  value={profile.aiApiKey ? "••••••••••••••••••••" : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setProfile((p) => ({ ...p, aiApiKey: "" }));
                    } else if (val !== "••••••••••••••••••••") {
                      setProfile((p) => ({ ...p, aiApiKey: val }));
                    }
                  }}
                  placeholder={
                    profile.aiProvider === "anthropic"
                      ? "Enter sk-ant-... to update"
                      : profile.aiProvider === "google"
                      ? "Enter AIzaSy... to update"
                      : "Enter sk-... to update"
                  }
                  className="bg-slate-950/60 border-white/5 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500 text-white rounded-xl placeholder:text-slate-655 font-mono text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestKey}
                disabled={testingKey || !profile.aiApiKey}
                className="shrink-0 border-white/5 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-semibold px-4"
              >
                {testingKey ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Testing...
                  </>
                ) : (
                  "Test Key"
                )}
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Your API key is stored in your personal Firestore document and only used for your
              requests. It is never shared. Alternatively, you can set{" "}
              <code className="bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 font-mono text-[9px]">
                {profile.aiProvider === "anthropic"
                  ? "ANTHROPIC_API_KEY"
                  : profile.aiProvider === "google"
                  ? "GOOGLE_AI_API_KEY"
                  : "OPENAI_API_KEY"}
              </code>{" "}
              in <code className="bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 font-mono text-[9px] hover:text-white transition-colors">.env.local</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-6 rounded-xl border-none shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-[1px]"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving Settings...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </>
        )}
      </Button>
    </div>
  );
}
