import { useTranslations } from 'next-intl';

export default function SportsFilter({
  categories, selectedCategory, setSelectedCategory
}: {
  categories: string[], selectedCategory: string, setSelectedCategory: (v: string) => void
}) {
  const t = useTranslations('Book.sports');
  
  return (
    <div className="flex overflow-x-auto gap-2 pb-5 snap-x hide-scrollbar [&::-webkit-scrollbar]:hidden px-1">
      <button 
        onClick={() => setSelectedCategory('all')}
        className={`flex-shrink-0 snap-center px-5 py-2 rounded-full text-xs font-bold border transition-all ${selectedCategory === 'all' ? 'bg-accent text-black border-accent' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'}`}
      >
         All Sports
      </button>
      
      {categories.map((cat) => (
        <button 
          key={cat} 
          onClick={() => setSelectedCategory(cat)}
          className={`flex-shrink-0 snap-center px-5 py-2 rounded-full text-xs font-bold border transition-all ${selectedCategory === cat ? 'bg-accent text-black border-accent' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'}`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
