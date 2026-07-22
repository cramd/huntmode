"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ContactProfileFields {
  name: string;
  email: string;
  location: string;
  phone: string;
  linkedIn: string;
}

interface ContactProfileStepProps {
  contact: ContactProfileFields;
  onChange: (patch: Partial<ContactProfileFields>) => void;
}

export function ContactProfileStep({ contact, onChange }: ContactProfileStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-black text-white">Your export contact profile</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          This block appears at the top of exported CVs and cover letters. HuntMode keeps one
          profile per account — update it anytime in Settings when you want a different name,
          location, or contact details for a new hunt.
        </p>
      </div>

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs leading-relaxed text-indigo-100/90">
        Why we ask: exported documents need a professional header. Saving it here once avoids
        retyping your details for every application, and you can switch profiles later without
        changing your sign-in email.
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Full name
            </Label>
            <Input
              value={contact.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Alex Morgan"
              className="rounded-xl border-white/5 bg-slate-950/60 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Email
            </Label>
            <Input
              value={contact.email}
              disabled
              className="rounded-xl border-white/5 bg-slate-950/20 text-slate-500"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Location
            </Label>
            <Input
              value={contact.location}
              onChange={(e) => onChange({ location: e.target.value })}
              placeholder="e.g. Vancouver, BC"
              className="rounded-xl border-white/5 bg-slate-950/60 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Phone
            </Label>
            <Input
              value={contact.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="e.g. +1 604 555 0100"
              className="rounded-xl border-white/5 bg-slate-950/60 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            LinkedIn
          </Label>
          <Input
            value={contact.linkedIn}
            onChange={(e) => onChange({ linkedIn: e.target.value })}
            placeholder="e.g. linkedin.com/in/yourname"
            className="rounded-xl border-white/5 bg-slate-950/60 text-white"
          />
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">
        You can skip optional fields for now and fill them in later from Settings before exporting.
      </p>
    </div>
  );
}
