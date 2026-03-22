import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ConceptNode } from "@/types/glossary";

interface NodeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    node: Omit<ConceptNode, "id" | "x" | "y"> & { id?: string },
  ) => void;
  editNode?: ConceptNode | null;
  currentCourse: string;
  /** Доступные лекции (stage → название) */
  lectureNames?: Record<number, string>;
}

const NodeDialog = ({
  open,
  onClose,
  onSave,
  editNode,
  currentCourse,
  lectureNames = {},
}: NodeDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [example, setExample] = useState("");
  const [stage, setStage] = useState("1");

  useEffect(() => {
    if (editNode) {
      setTitle(editNode.title);
      setDescription(editNode.description);
      setExample(editNode.example || "");
      setStage(String(editNode.stage));
    } else {
      setTitle("");
      setDescription("");
      setExample("");
      setStage("1");
    }
  }, [editNode, open]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      ...(editNode ? { id: editNode.id } : {}),
      title: title.trim(),
      description: description.trim(),
      example: example.trim() || undefined,
      stage: Number(stage),
      course: currentCourse,
      themes: editNode?.themes || [],
    });
    onClose();
  };

  const lectureEntries = Object.entries(lectureNames);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editNode ? "Редактировать понятие" : "Новое понятие"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Заголовок</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название понятия"
            />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое определение..."
              rows={3}
            />
          </div>
          <div>
            <Label>Пример / Код</Label>
            <Textarea
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="const x = useMemo(...);"
              rows={3}
              className="font-mono text-xs"
            />
          </div>
          {lectureEntries.length > 0 && (
            <div>
              <Label>Лекция</Label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
              >
                {lectureEntries.map(([num, name]) => (
                  <option key={num} value={num}>
                    {num}. {name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
