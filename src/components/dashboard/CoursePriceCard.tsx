interface CoursePriceCardProps {
  price: number;
  onPriceChange: (price: number) => void;
}

const CoursePriceCard = ({ price, onPriceChange }: CoursePriceCardProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s/g, "");
    if (raw === "") {
      onPriceChange(0);
      return;
    }
    const num = parseInt(raw, 10);
    if (!Number.isNaN(num) && num >= 0 && num <= 999_999) {
      onPriceChange(num);
    }
  };

  const displayValue = price === 0 ? "" : price.toLocaleString("ru-RU");

  return (
    <div className="border rounded-xl p-4 bg-white animate-fade-in" style={{ animationDelay: "0.15s" }}>
      <h3 className="text-foreground font-semibold mb-4">Стоимость курса</h3>
      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="numeric"
          placeholder="0 — 999 999"
          className="input-field w-36 text-center"
          value={displayValue}
          onChange={handleChange}
          maxLength={7}
        />
        <span className="text-foreground font-medium">₽</span>
      </div>
      <p className="text-muted-foreground text-xs mt-2">Оставьте 0 для бесплатного курса</p>
    </div>
  );
};

export default CoursePriceCard;
