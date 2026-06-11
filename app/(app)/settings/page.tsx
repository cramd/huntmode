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
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your profile, goals, and AI provider.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4.5 h-4.5 text-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={profile.name || user?.displayName || ""}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted/50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Target Role</Label>
            <Input
              value={profile.targetRole || ""}
              onChange={(e) => setProfile((p) => ({ ...p, targetRole: e.target.value }))}
              placeholder="e.g. Senior Software Engineer, Product Manager"
            />
            <p className="text-xs text-muted-foreground">
              This helps personalize your dashboard and motivational messages.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4.5 h-4.5 text-primary" />
            Weekly Application Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Applications per week</Label>
            <Select
              value={String(profile.weeklyGoal || 5)}
              onValueChange={(v) =>
                setProfile((p) => ({ ...p, weeklyGoal: parseInt(v ?? "5") }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 5, 7, 10, 15, 20].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} applications / week
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Shown on your dashboard as a weekly progress ring. Start small — consistency matters more than volume.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-4.5 h-4.5 text-primary" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>AI Provider</Label>
              <Select
              value={profile.aiProvider || "openai"}
              onValueChange={(v) =>
                setProfile((p) => ({ ...p, aiProvider: v as "openai" | "anthropic" | "google" }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude 3.5 Sonnet)</SelectItem>
                <SelectItem value="google">Google (Gemini 2.0 Flash)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="password"
                  value={profile.aiApiKey ? "••••••••••••••••••••" : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    // If they clear it, remove it. If they type, set the new key.
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
                  className="pr-10 font-mono text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestKey}
                disabled={testingKey || !profile.aiApiKey}
                className="shrink-0"
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
            <p className="text-xs text-muted-foreground">
              Your API key is stored in your personal Firestore document and only used for your
              requests. It is never shared. Alternatively, you can set{" "}
              <code className="bg-muted px-1 rounded text-xs">
                {profile.aiProvider === "anthropic"
                  ? "ANTHROPIC_API_KEY"
                  : profile.aiProvider === "google"
                  ? "GOOGLE_AI_API_KEY"
                  : "OPENAI_API_KEY"}
              </code>{" "}
              in <code className="bg-muted px-1 rounded text-xs">.env.local</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button size="lg" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
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
