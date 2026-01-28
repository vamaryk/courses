import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface FooterActionsProps {
  onSave: () => void;
  onSaveDraft?: () => void;
  saving: boolean;
  isPublic: boolean;
  onIsPublicChange: (isPublic: boolean) => void;
}

const FooterActions = ({ onSave, onSaveDraft, saving, isPublic, onIsPublicChange }: FooterActionsProps) => {
  return (
    <div className="flex items-center justify-between mt-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <div className="flex items-center gap-3">
        <Switch
          id="is-public"
          checked={isPublic}
          onCheckedChange={onIsPublicChange}
          disabled={saving}
        />
        <Label htmlFor="is-public" className="cursor-pointer">
          Сделать курс публичным
        </Label>
      </div>
      <div className="flex items-center gap-4">
        {onSaveDraft && (
          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={saving}
            className="border-2 border-muted-foreground text-muted-foreground hover:bg-muted/10 px-8 py-3 rounded-xl font-medium h-auto"
          >
            {saving ? "Сохранение..." : "Сохранить как черновик"}
          </Button>
        )}
        <Button
          onClick={onSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-medium h-auto"
        >
          {saving ? "Сохранение..." : isPublic ? "Опубликовать" : "Сохранить"}
        </Button>
      </div>
    </div>
  );
};

export default FooterActions;
