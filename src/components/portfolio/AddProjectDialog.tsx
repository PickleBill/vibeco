import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ProjectEntry } from "./ProjectCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<ProjectEntry, "id" | "created_at" | "priority" | "last_touched" | "report_id">) => void;
  initial?: ProjectEntry | null;
}

const AddProjectDialog = ({ open, onOpenChange, onSave, initial }: Props) => {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || "experiment");
  const [status, setStatus] = useState(initial?.status || "active");
  const [parentBrand, setParentBrand] = useState(initial?.parent_brand || "");
  const [lovableId, setLovableId] = useState(initial?.lovable_project_id || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      category,
      status,
      parent_brand: parentBrand.trim() || null,
      lovable_project_id: lovableId.trim() || null,
      notes: notes.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {initial ? "Edit Project" : "Register Project"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-mono text-xs">Project Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Courtana Pulse"
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label className="font-mono text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pickle-as-a-Service data platform..."
              className="mt-1 font-mono text-xs min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-mono text-xs">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="internal_dev">Internal Dev</SelectItem>
                  <SelectItem value="future_dev">Future Dev</SelectItem>
                  <SelectItem value="fun">Fun</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="experiment">Experiment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-mono text-xs">Brand</Label>
              <Input
                value={parentBrand}
                onChange={(e) => setParentBrand(e.target.value)}
                placeholder="Courtana"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="font-mono text-xs">Lovable Project ID</Label>
              <Input
                value={lovableId}
                onChange={(e) => setLovableId(e.target.value)}
                placeholder="e56b8988-..."
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <Label className="font-mono text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Priority build for Q3..."
              className="mt-1 font-mono text-xs min-h-[60px]"
            />
          </div>
          <Button type="submit" className="w-full font-mono text-sm">
            {initial ? "Update Project" : "Add Project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectDialog;
