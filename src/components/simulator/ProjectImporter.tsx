import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Import, Loader2 } from "lucide-react";
import type { ProjectEntry } from "@/components/portfolio/ProjectCard";

interface Props {
  onImport: (ideaText: string) => void;
}

const ProjectImporter = ({ onImport }: Props) => {
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("project_registry")
        .select("*")
        .order("last_touched", { ascending: false });
      if (data) setProjects(data as ProjectEntry[]);
    };
    load();
  }, []);

  const handleImport = () => {
    const project = projects.find((p) => p.id === selected);
    if (!project) return;
    setLoading(true);

    // Build a structured idea brief from the project manifest
    const parts: string[] = [];
    parts.push(`**Project:** ${project.name}`);
    if (project.parent_brand) parts.push(`**Brand:** ${project.parent_brand}`);
    if (project.category) parts.push(`**Category:** ${project.category.replace("_", " ")}`);
    if (project.status) parts.push(`**Status:** ${project.status}`);
    if (project.description) parts.push(`\n${project.description}`);
    if (project.notes) parts.push(`\n**Notes:** ${project.notes}`);
    if (project.lovable_project_id) parts.push(`\n[Lovable Project ID: ${project.lovable_project_id}]`);

    const ideaText = parts.join("\n");
    setTimeout(() => {
      setLoading(false);
      onImport(ideaText);
    }, 300);
  };

  if (projects.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">
          No registered projects.{" "}
          <a href="/portfolio" className="text-primary hover:underline">
            Register one first →
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="flex-1 bg-secondary/50 border-border/30 text-xs">
          <SelectValue placeholder="Select a registered project..." />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs">
              <span className="flex items-center gap-2">
                {p.name}
                {p.parent_brand && (
                  <span className="text-muted-foreground/50">· {p.parent_brand}</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleImport}
        disabled={!selected || loading}
        size="sm"
        className="text-xs gap-1.5 shrink-0"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Import size={12} />}
        Import & Simulate
      </Button>
    </div>
  );
};

export default ProjectImporter;
