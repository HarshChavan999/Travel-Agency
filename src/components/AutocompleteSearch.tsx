import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, MapPin, History } from 'lucide-react';
import { event } from '@/lib/gtag';

interface AutocompleteSearchProps {
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onSelect?: (val: string) => void;
  suggestions: string[];
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
  containerClassName?: string;
  icon?: React.ReactNode;
  typewriterPrefix?: string;
  typewriter?: string[];
}

// Levenshtein distance for typo tolerance
const levenshtein = (a: string, b: string) => {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[a.length][b.length];
};

export default function AutocompleteSearch({
  placeholder = "Search...",
  value,
  onChange,
  onSelect,
  suggestions,
  className = "",
  inputClassName = "",
  iconClassName = "",
  containerClassName = "relative w-full",
  icon = <Search className={`absolute left-3 top-3 h-4 w-4 text-gray-400 ${iconClassName}`} />,
  typewriterPrefix = "",
  typewriter = []
}: AutocompleteSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [displayText, setDisplayText] = useState("");
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!typewriter || typewriter.length === 0) {
      return;
    }

    const currentWord = typewriter[typewriterIndex];
    let typingSpeed = isDeleting ? 50 : 100;

    if (!isDeleting && displayText === currentWord) {
      const timeout = setTimeout(() => setIsDeleting(true), 2000);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setTypewriterIndex((prev) => (prev + 1) % typewriter.length);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayText(currentWord.substring(0, displayText.length + (isDeleting ? -1 : 1)));
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, typewriter, typewriterIndex]);

  const hasTypewriter = typewriter && typewriter.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!value || value.trim().length < 1) return [];
    
    const q = value.toLowerCase().trim();
    
    const scoredItems = suggestions.map(item => {
      const itemLower = item.toLowerCase();
      let score = 0;
      
      if (itemLower === q) score = 100;
      else if (itemLower.startsWith(q)) score = 80;
      else if (itemLower.includes(` ${q}`)) score = 70; // starts with word
      else if (itemLower.includes(q)) score = 60;
      else {
        // Typo tolerance
        const dist = levenshtein(q, itemLower);
        if (dist <= 2 && q.length > 3) score = 40; // Allow 2 typos for longer words
        else if (dist <= 1 && q.length > 2) score = 40; // Allow 1 typo for shorter words
        else {
          // check words
          const words = itemLower.split(' ');
          const wordMatch = words.some(w => {
            const d = levenshtein(q, w);
            return (d <= 2 && q.length > 3) || (d <= 1 && q.length > 2);
          });
          if (wordMatch) score = 30;
        }
      }
      
      return { item, score };
    });
    
    return scoredItems
      .filter(i => i.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(i => i.item)
      .slice(0, 8); // Show max 8 suggestions
  }, [value, suggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
        handleSelect(filteredSuggestions[activeIndex]);
      } else {
        if (onSelect) onSelect(value);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (item: string) => {
    event({
      action: 'destination_search_select',
      category: 'search_filter',
      label: item,
    });
    onChange(item);
    if (onSelect) onSelect(item);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={wrapperRef} className={containerClassName}>
      <div className={className}>
        <Input
          type="text"
          placeholder={hasTypewriter ? "" : placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (value.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={inputClassName}
        />
        {icon}
        {hasTypewriter && !value && (
          <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none text-sm text-gray-400">
            <span>{typewriterPrefix}</span>
            <span className="font-bold text-gray-700 ml-1">{displayText}</span>
          </div>
        )}
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-80 overflow-y-auto py-2">
            {filteredSuggestions.map((item, index) => {
              // Highlight matching part
              const q = value.toLowerCase().trim();
              const itemLower = item.toLowerCase();
              const matchIndex = itemLower.indexOf(q);
              
              return (
                <div
                  key={index}
                  className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors
                    ${activeIndex === index ? 'bg-orange-50' : 'hover:bg-gray-50'}
                  `}
                  onClick={() => handleSelect(item)}
                >
                  <MapPin className={`h-4 w-4 ${activeIndex === index ? 'text-orange-500' : 'text-gray-400'}`} />
                  <div className="flex-1 text-sm text-gray-700 font-medium">
                    {matchIndex >= 0 ? (
                      <>
                        {item.substring(0, matchIndex)}
                        <span className="text-black font-bold">
                          {item.substring(matchIndex, matchIndex + q.length)}
                        </span>
                        {item.substring(matchIndex + q.length)}
                      </>
                    ) : (
                      <span>{item}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
