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
    <div className="mt-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-6">
        
        <div className="flex items-center justify-between sm:justify-start gap-3 p-3 sm:p-0 bg-muted/30 sm:bg-transparent rounded-lg sm:rounded-none order-2 sm:order-1">
          <Switch
            id="is-public"
            checked={isPublic}
            onCheckedChange={onIsPublicChange}
            disabled={saving}
            className="data-[state=checked]:bg-purple data-[state=unchecked]:bg-blue"
          />
          <Label 
            htmlFor="is-public" 
            className="cursor-pointer text-sm sm:text-base font-medium flex-1 sm:flex-none"
          >
            {isPublic ? "Курс публичный" : "Курс приватный"}
          </Label>
        </div>

        {/* Кнопки действий */}
        <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
          {onSaveDraft && (
            <Button
              variant="outline"
              onClick={onSaveDraft}
              disabled={saving}
              className="w-full sm:w-auto border-2 border-muted-foreground text-muted-foreground hover:bg-muted/10 px-6 sm:px-8 py-3 sm:py-3 rounded-xl font-medium h-12 min-h-[48px] touch-manipulation cursor-pointer"
              size="lg"
            >
              {saving ? "Сохранение..." : "Сохранить как черновик"}
            </Button>
          )}
          <Button
            onClick={onSave}
            disabled={saving}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3 sm:py-3 rounded-xl font-medium h-12 min-h-[48px] touch-manipulation cursor-pointer"
            size="lg"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Сохранение...
              </span>
            ) : (
              isPublic ? "Опубликовать" : "Сохранить"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FooterActions;