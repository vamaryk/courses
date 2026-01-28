import { Button } from "@/components/ui/button";

const FooterActions = () => {
  return (
    <div className="flex items-center gap-4 mt-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-medium h-auto">
        Сохранить
      </Button>
      <Button
        variant="outline"
        className="border-2 border-primary text-primary hover:bg-primary/10 px-8 py-3 rounded-xl font-medium h-auto"
      >
        Добавить в черновики
      </Button>
    </div>
  );
};

export default FooterActions;
