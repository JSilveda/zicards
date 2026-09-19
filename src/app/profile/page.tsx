"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientOnly } from "@/components/client-only";
import { User, Save, Globe } from "lucide-react";
import { LANGUAGES } from "@/lib/utils";

function ProfileContent() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("es");
  const [learningLanguage, setLearningLanguage] = useState("en");
  const [langSaved, setLangSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: userData }: { data: { user: { id: string; email?: string } | null } }) => {
        if (userData.user) {
          setUserId(userData.user.id);
          setEmail(userData.user.email || "");
        }
        setLoading(false);
      });
    });

    const savedNative = localStorage.getItem("nativeLanguage");
    const savedLearning = localStorage.getItem("learningLanguage");
    if (savedNative) setNativeLanguage(savedNative);
    if (savedLearning) setLearningLanguage(savedLearning);
  }, []);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setMessage("");

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Email update confirmation sent. Check your inbox.");
    }
    setUpdating(false);
  };

  const handleSaveLanguages = () => {
    localStorage.setItem("nativeLanguage", nativeLanguage);
    localStorage.setItem("learningLanguage", learningLanguage);
    setLangSaved(true);
    setTimeout(() => setLangSaved(false), 2000);
  };

  const handleSignOut = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return null;

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">My native language</label>
            <Select
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Language I want to learn</label>
            <Select
              value={learningLanguage}
              onChange={(e) => setLearningLanguage(e.target.value)}
              options={LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
            />
          </div>
          <Button onClick={handleSaveLanguages} className="gap-2">
            <Save className="h-4 w-4" />
            {langSaved ? "Saved!" : "Save Languages"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">User ID</label>
            <Input value={userId} disabled />
          </div>
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
            <Button type="submit" disabled={updating} className="gap-2">
              <Save className="h-4 w-4" />
              {updating ? "Updating..." : "Update Email"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export default function ProfilePage() {
  return (
    <ClientOnly>
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Profile</h1>
        <ProfileContent />
      </main>
    </ClientOnly>
  );
}
