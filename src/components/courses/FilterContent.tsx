import React from 'react';
import { BookOpen, GraduationCap, Globe, Tag, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Range, getTrackBackground } from 'react-range';

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  keywords: string[];
  subcategories?: string[];
}

interface FilterContentProps {
  selectedLevels: string[];
  setSelectedLevels: React.Dispatch<React.SetStateAction<string[]>>;
  selectedLanguages: string[];
  setSelectedLanguages: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCategories: string[];
  toggleCategory: (id: string) => void;
  selectedSubcategories: string[];
  toggleSubcategory: (sub: string) => void;
  priceRange: [number, number];
  setPriceRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  durationRange: [number, number];
  setDurationRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  isDevelopmentSelected: boolean;
  handlePriceInput: (index: 0 | 1, value: string) => void;
  handleDurationInput: (index: 0 | 1, value: string) => void;
  priceMax: number;
  durationMax: number;
  categories: Category[];
}

const FilterContent: React.FC<FilterContentProps> = ({
  selectedLevels,
  setSelectedLevels,
  selectedLanguages,
  setSelectedLanguages,
  selectedCategories,
  toggleCategory,
  selectedSubcategories,
  toggleSubcategory,
  priceRange,
  setPriceRange,
  durationRange,
  setDurationRange,
  isDevelopmentSelected,
  handlePriceInput,
  handleDurationInput,
  priceMax,
  durationMax,
  categories,
}) => {
  /* react-range требует min < max; при отсутствии курсов priceMax/durationMax могут быть 0 */
  const priceSliderMax = Math.max(1, priceMax);
  const durationSliderMax = Math.max(1, durationMax);
  const pa = Math.max(0, Math.min(priceRange[0], priceSliderMax));
  const pb = Math.max(0, Math.min(priceRange[1], priceSliderMax));
  const priceSliderValues: [number, number] = pa <= pb ? [pa, pb] : [pb, pa];
  const da = Math.max(0, Math.min(durationRange[0], durationSliderMax));
  const db = Math.max(0, Math.min(durationRange[1], durationSliderMax));
  const durationSliderValues: [number, number] = da <= db ? [da, db] : [db, da];

  return (
  <>
    <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 font-Xolonium lg:hidden">
      Фильтры
    </h3>

    {/* Category Filter */}
    <div className="mb-4 sm:mb-6">
      <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-purple" />
        Направления
      </h4>
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id}>
            <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={selectedCategories.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                />
                <div className="w-4 h-4 bg-purple/50 rounded-md peer-checked:bg-purple peer-checked:border-purple-600 border-2 border-gray-500 transition-all duration-300 ease-in-out"></div>
                <div className="absolute opacity-0 w-2 h-2 bg-white rounded-sm left-1 top-1 scale-0 peer-checked:scale-75 peer-checked:opacity-100 transition-all duration-300 delay-100"></div>
              </div>
              <span>{cat.label}</span>
            </label>
            {/* Nested Subcategory Filter */}
            {cat.id === 'development' && isDevelopmentSelected && (
              <div className="mt-2 mb-2 pl-4 border-l border-gray-200">
                <h5 className="font-medium mb-2 text-xs sm:text-sm text-gray-700">
                  Языки/Технологии
                </h5>
                <div className="space-y-2">
                  {cat.subcategories?.map((sub) => (
                    <label
                      key={sub}
                      className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={selectedSubcategories.includes(sub)}
                          onChange={() => toggleSubcategory(sub)}
                        />
                        <div className="w-4 h-4 bg-blue rounded-md peer-checked:bg-blue-400 peer-checked:border-blue-400 border-2 border-gray-500 transition-all duration-300 ease-in-out"></div>
                        <div className="absolute opacity-0 w-2 h-2 bg-white rounded-sm left-1 top-1 scale-0 peer-checked:scale-75 peer-checked:opacity-100 transition-all duration-300 delay-100"></div>
                      </div>
                      <span className="text-gray-600">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Level Filter */}
    <div className="mb-4 sm:mb-6">
      <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-purple" />
        Уровень сложности
      </h4>
      <div className="space-y-2">
        {['Начинающий', 'Средний', 'Продвинутый'].map((level) => (
          <label key={level} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={selectedLevels.includes(level)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLevels([...selectedLevels, level]);
                  } else {
                    setSelectedLevels(selectedLevels.filter((l) => l !== level));
                  }
                }}
              />
              <div className="w-4 h-4 bg-purple/50 rounded-md peer-checked:bg-purple peer-checked:border-purple-600 border-2 border-gray-500 transition-all duration-300 ease-in-out"></div>
              <div className="absolute opacity-0 w-2 h-2 bg-white rounded-sm left-1 top-1 scale-0 peer-checked:scale-75 peer-checked:opacity-100 transition-all duration-300 delay-100"></div>
            </div>
            <span>{level}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Language Filter */}
    <div className="mb-4 sm:mb-6">
      <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
        <Globe className="w-4 h-4 text-purple" />
        Язык
      </h4>
      <div className="space-y-2">
        {['Русский', 'Английский'].map((lang) => (
          <label key={lang} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={selectedLanguages.includes(lang)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLanguages([...selectedLanguages, lang]);
                  } else {
                    setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
                  }
                }}
              />
              <div className="w-4 h-4 bg-purple/50 rounded-md peer-checked:bg-purple peer-checked:border-purple-600 border-2 border-gray-500 transition-all duration-300 ease-in-out"></div>
              <div className="absolute opacity-0 w-2 h-2 bg-white rounded-sm left-1 top-1 scale-0 peer-checked:scale-75 peer-checked:opacity-100 transition-all duration-300 delay-100"></div>
            </div>
            <span>{lang}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Price Filter */}
    <div className="mb-4 sm:mb-6">
      <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
        <Tag className="w-4 h-4 text-purple" />
        Цена, ₽
      </h4>
      <div className="flex gap-3 mb-1">
        <Input
          type="number"
          placeholder="Мин"
          min={0}
          max={priceMax}
          value={priceRange[0]}
          onChange={(e) => handlePriceInput(0, e.target.value)}
          className="text-xs sm:text-sm"
        />
        <Input
          type="number"
          placeholder="Макс"
          min={0}
          max={priceMax}
          value={priceRange[1]}
          onChange={(e) => handlePriceInput(1, e.target.value)}
          className="text-xs sm:text-sm"
        />
      </div>
      <div
        className={`flex justify-center flex-wrap mx-2 ${priceMax <= 0 ? 'pointer-events-none opacity-60' : ''}`}
        aria-disabled={priceMax <= 0}
      >
        <Range
          step={100}
          min={0}
          max={priceSliderMax}
          values={priceSliderValues}
          onChange={(values) => {
            const [lo, hi] = values as [number, number];
            if (priceMax <= 0) {
              setPriceRange([0, 0]);
              return;
            }
            setPriceRange([
              Math.max(0, Math.min(lo, priceMax)),
              Math.max(0, Math.min(hi, priceMax)),
            ]);
          }}
          renderTrack={({ props, children }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              style={{
                ...props.style,
                height: '36px',
                display: 'flex',
                width: '100%',
              }}
            >
              <div
                ref={props.ref}
                style={{
                  height: '5px',
                  width: '100%',
                  borderRadius: '4px',
                  background: getTrackBackground({
                    values: priceSliderValues,
                    colors: ['#ccc', '#B291FF', '#ccc'],
                    min: 0,
                    max: priceSliderMax,
                  }),
                  alignSelf: 'center',
                }}
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props: thumbProps }) => {
            const { key, style, ...rest } = thumbProps;
            return (
              <div
                key={key}
                {...rest}
                style={{
                  ...style,
                  height: '14px',
                  width: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#FFF',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: '0px 2px 6px #AAA',
                  border: '2px solid #B291FF',
                }}
              />
            );
          }}
        />
      </div>
      <div className="flex justify-between text-xs sm:text-sm text-gray-600 mt-2">
        <span>{priceRange[0]} ₽</span>
        <span>{priceRange[1]} ₽</span>
      </div>
    </div>

    {/* Duration Filter */}
    <div className="mb-4 sm:mb-6">
      <h4 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
        <Clock className="w-4 h-4 text-purple" />
        Длительность, ч.
      </h4>
      <div className="flex gap-3 mb-1">
        <Input
          type="number"
          placeholder="Мин"
          min={0}
          max={durationMax}
          value={durationRange[0]}
          onChange={(e) => handleDurationInput(0, e.target.value)}
          className="text-xs sm:text-sm"
        />
        <Input
          type="number"
          placeholder="Макс"
          min={0}
          max={durationMax}
          value={durationRange[1]}
          onChange={(e) => handleDurationInput(1, e.target.value)}
          className="text-xs sm:text-sm"
        />
      </div>
      <div
        className={`flex justify-center flex-wrap mx-2 ${durationMax <= 0 ? 'pointer-events-none opacity-60' : ''}`}
        aria-disabled={durationMax <= 0}
      >
        <Range
          step={1}
          min={0}
          max={durationSliderMax}
          values={durationSliderValues}
          onChange={(values) => {
            const [lo, hi] = values as [number, number];
            if (durationMax <= 0) {
              setDurationRange([0, 0]);
              return;
            }
            setDurationRange([
              Math.max(0, Math.min(lo, durationMax)),
              Math.max(0, Math.min(hi, durationMax)),
            ]);
          }}
          renderTrack={({ props, children }) => (
            <div
              onMouseDown={props.onMouseDown}
              onTouchStart={props.onTouchStart}
              style={{
                ...props.style,
                height: '36px',
                display: 'flex',
                width: '100%',
              }}
            >
              <div
                ref={props.ref}
                style={{
                  height: '5px',
                  width: '100%',
                  borderRadius: '4px',
                  background: getTrackBackground({
                    values: durationSliderValues,
                    colors: ['#ccc', '#B291FF', '#ccc'],
                    min: 0,
                    max: durationSliderMax,
                  }),
                  alignSelf: 'center',
                }}
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props: thumbProps }) => {
            const { key, style, ...rest } = thumbProps;
            return (
              <div
                key={key}
                {...rest}
                style={{
                  ...style,
                  height: '14px',
                  width: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#FFF',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: '0px 2px 6px #AAA',
                  border: '2px solid #B291FF',
                }}
              />
            );
          }}
        />
      </div>
      <div className="flex justify-between text-xs sm:text-sm text-gray-600 mt-2">
        <span>{durationRange[0]} ч.</span>
        <span>{durationRange[1]} ч.</span>
      </div>
    </div>
  </>
  );
};

export default FilterContent;