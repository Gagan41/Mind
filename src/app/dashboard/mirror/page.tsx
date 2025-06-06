"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface MirrorEntry {
  id: string;
  content: string;
  reflection: string;
  created_at: string;
}

export default function MirrorPage() {
  const [content, setContent] = useState("");
  const [reflection, setReflection] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mirrorHistory, setMirrorHistory] = useState<MirrorEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchMirrorHistory();
  }, []);

  const fetchMirrorHistory = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("creativity_mirror")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMirrorHistory(data || []);
    } catch (error) {
      console.error("Error fetching mirror history:", error);
      toast({
        title: "Error",
        description: "Failed to load reflection history",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (isSubmitting || !content.trim()) return;

    setIsSubmitting(true);
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if this content already exists
      const { data: existingReflection } = await supabase
        .from("creativity_mirror")
        .select("id")
        .eq("user_id", user.id)
        .eq("content", content.trim())
        .limit(1);

      if (existingReflection && existingReflection.length > 0) {
        toast({
          title: "Duplicate Content",
          description:
            "You've already received a reflection for this content. Please try different content.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/ai/mirror", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate reflection");
      }

      const data = await response.json();
      setReflection(data.reflection);

      // Store in database
      const { error: insertError } = await supabase
        .from("creativity_mirror")
        .insert({
          user_id: user.id,
          content: content.trim(),
          reflection: data.reflection,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          // Unique violation error code
          toast({
            title: "Duplicate Content",
            description:
              "You've already received a reflection for this content. Please try different content.",
            variant: "destructive",
          });
        } else {
          throw insertError;
        }
        return;
      }

      // Refresh history
      await fetchMirrorHistory();

      toast({
        title: "Success",
        description: "Reflection generated successfully",
      });

      // Clear form
      setContent("");
      setReflection("");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to generate reflection",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Eye className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Creativity Mirror
        </h1>
      </div>

      <div className="space-y-6">
        {/* Mirror Form */}
        <Card>
          <CardHeader>
            <CardTitle>Get Creative Reflection</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="Share your creative thoughts or work..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px]"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !content.trim() || isSubmitting}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Reflection...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Get Reflection
                  </>
                )}
              </Button>
            </form>

            {reflection && (
              <div className="mt-6 p-4 rounded-lg bg-muted">
                <h3 className="font-semibold mb-2">Your Reflection:</h3>
                <p className="whitespace-pre-wrap">{reflection}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mirror History */}
        <Card>
          <CardHeader>
            <CardTitle>Reflection History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : mirrorHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No reflections yet
              </p>
            ) : (
              <div className="space-y-4">
                {mirrorHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="mb-2">
                      <h4 className="font-medium">Your Input:</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {entry.content}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">Reflection:</h4>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {entry.reflection}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
