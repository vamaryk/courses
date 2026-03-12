import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ConceptNode } from "@/types/glossary";
import { courses, themes, lectureTitles } from "@/data/glossaryData";

interface NodeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (node: Omit<ConceptNode, "id" | "x" | "y"> & { id?: string }) => void;
  editNode?: ConceptNode | null;
  currentCourse: string;
}

const NodeDialog = ({ open, onClose, onSave, editNode, currentCourse }: NodeDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState("1");
  const [course, setCourse] = useState(currentCourse);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

  useEffect(() => {
    if (editNode) {
      setTitle(editNode.title);
      setDescription(editNode.description);
      setStage(String(editNode.stage));
      setCourse(editNode.course);
      setSelectedThemes(editNode.themes);
    } else {
      setTitle("");
      setDescription("");
      setStage("1");
      setCourse(currentCourse);
      setSelectedThemes([]);
    }
  }, [editNode, currentCourse, open]);

  const toggleTheme = (id: string) => {
    setSelectedThemes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      ...(editNode ? { id: editNode.id } : {}),
      title: title.trim(),
      description: description.trim(),
      stage: Number(stage),
      course,
      themes: selectedThemes,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editNode ? "Редактировать понятие" : "Новое понятие"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Заголовок</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название понятия" />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Текст или код..."
              rows={3}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Лекция</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите лекцию" />
                </SelectTrigger>
                <SelectContent className="bg-white text-foreground border border-border shadow-lg">
                  {Object.entries(lectureTitles[course] || {}).map(([num, name]) => (
                    <SelectItem key={num} value={num}>
                      {num}. {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Курс</Label>
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-foreground border border-border shadow-lg">
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Темы</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTheme(t.id)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    selectedThemes.includes(t.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NodeDialog;

