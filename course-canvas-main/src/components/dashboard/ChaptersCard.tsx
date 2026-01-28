import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

const ChaptersCard = () => {
  const [chapters, setChapters] = useState([{ id: 1, title: "" }]);

  const addChapter = () => {
    setChapters([...chapters, { id: chapters.length + 1, title: "" }]);
  };

  return (
    <div className="card-blue animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <h3 className="text-foreground font-semibold mb-4">Главы</h3>

      {/* Chapter List */}
      <div className="space-y-3 mb-4">
        {chapters.map((chapter, index) => (
          <div key={chapter.id} className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm w-5">{index + 1}.</span>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Введите название главы..."
                className="input-field pr-10"
                value={chapter.title}
                onChange={(e) => {
                  const updated = [...chapters];
                  updated[index].title = e.target.value;
                  setChapters(updated);
                }}
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Chapter Button */}
      <button
        onClick={addChapter}
        className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-primary text-primary font-medium hover:bg-primary/10 transition-colors"
      >
        Добавить главу
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ChaptersCard;
