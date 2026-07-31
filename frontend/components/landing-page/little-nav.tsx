'use client'

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Facebook, Instagram, Youtube, Linkedin, Search, MapPin, Building2, Briefcase, Loader2 } from "lucide-react";
import { nurseryService } from "@/lib/api/nursery";

interface SiteResults {
  cities: string[];
  towns: string[];
  groups: Array<{ id: string; name: string; slug: string; city: string }>;
  nurseries: Array<{ id: string; name: string; slug: string; city: string; town?: string }>;
}

const EMPTY: SiteResults = { cities: [], towns: [], groups: [], nurseries: [] };

export default function MiniNav() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SiteResults>(EMPTY);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click / Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Debounced — the nav sits on every page, so don't fire per keystroke.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await nurseryService.autocomplete(q);
        if (response.success && response.data) {
          setResults({
            cities: response.data.cities || [],
            towns: response.data.towns || [],
            groups: response.data.groups || [],
            nurseries: response.data.nurseries || [],
          });
        }
      } catch {
        setResults(EMPTY);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  // Enter with nothing picked falls back to the nursery listing, which is the
  // broadest results page we have.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    go(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  const places = [...results.towns, ...results.cities].slice(0, 4);
  const hasResults =
    results.nurseries.length > 0 || results.groups.length > 0 || places.length > 0;
  const showPanel = open && query.trim().length >= 2;

  return (
    <div className="w-full h-12 border-b bg-[#04B0D6] dark:bg-gray-900 flex items-center justify-between px-24 xl:px-24 lg:px-12 max-lg:px-10 text-sm">

      {/* LEFT ICONS */}
      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
        <div className="bg-white/20 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
          <Facebook size={18} className="cursor-pointer hover:opacity-80 transition" />
        </div>
        <div className="bg-white/20 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
          <Linkedin size={18} className="cursor-pointer hover:opacity-80 transition" />
        </div>
        <div className="bg-white/20 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
          <Instagram size={18} className="cursor-pointer hover:opacity-80 transition" />
        </div>
        <div className="bg-white/20 text-white rounded-full p-2 w-8 h-8 flex items-center justify-center">
          <Youtube size={18} className="cursor-pointer hover:opacity-80 transition" />
        </div>
      </div>

      {/* RIGHT — Site search */}
      <div ref={containerRef} className="relative hidden sm:block">
        <form
          onSubmit={handleSubmit}
          className="flex items-center bg-white/20 hover:bg-white/30 transition rounded-full pl-3 pr-1 py-1 gap-1"
        >
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search site..."
            className="bg-transparent text-white placeholder-white/80 text-sm outline-none w-32 focus:w-56 transition-all duration-300"
          />
          <button type="submit" aria-label="Search" className="bg-white/20 hover:bg-white/40 transition rounded-full p-1.5">
            <Search size={14} className="text-white" />
          </button>
        </form>

        {showPanel && (
          <div className="absolute right-0 top-full mt-2 w-80 max-h-[26rem] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 py-2 text-gray-700 dark:text-gray-200">
            {isSearching && !hasResults && (
              <div className="flex items-center gap-2 px-4 py-3 text-gray-500 text-sm">
                <Loader2 size={14} className="animate-spin" /> Searching...
              </div>
            )}

            {results.nurseries.length > 0 && (
              <div>
                <p className="px-4 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Nurseries</p>
                {results.nurseries.slice(0, 4).map(n => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => go(`/products/${n.slug}`)}
                    className="w-full flex items-start gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition"
                  >
                    <Building2 size={14} className="mt-0.5 shrink-0 text-gray-400" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{n.name}</span>
                      <span className="block text-xs text-gray-500 truncate">{[n.town, n.city].filter(Boolean).join(', ')}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {results.groups.length > 0 && (
              <div>
                <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Groups</p>
                {results.groups.slice(0, 3).map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => go(`/nursery-group/${g.slug}`)}
                    className="w-full flex items-start gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition"
                  >
                    <Building2 size={14} className="mt-0.5 shrink-0 text-gray-400" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{g.name}</span>
                      <span className="block text-xs text-gray-500 truncate">{g.city}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {places.length > 0 && (
              <div>
                <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Places</p>
                {places.map(place => (
                  <button
                    key={place}
                    type="button"
                    onClick={() => go(`/products?city=${encodeURIComponent(place)}`)}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition"
                  >
                    <MapPin size={14} className="shrink-0 text-gray-400" />
                    <span className="text-sm truncate">Nurseries in {place}</span>
                  </button>
                ))}
              </div>
            )}

            {!isSearching && !hasResults && (
              <p className="px-4 py-3 text-sm text-gray-500">No nurseries, groups or places match "{query.trim()}".</p>
            )}

            {/* Always reachable — jobs aren't in the autocomplete index. */}
            <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-1">
              <button
                type="button"
                onClick={() => go(`/products?search=${encodeURIComponent(query.trim())}`)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition"
              >
                <Search size={14} className="shrink-0 text-gray-400" />
                <span className="text-sm truncate">See all nurseries for "{query.trim()}"</span>
              </button>
              <button
                type="button"
                onClick={() => go(`/jobs?search=${encodeURIComponent(query.trim())}`)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition"
              >
                <Briefcase size={14} className="shrink-0 text-gray-400" />
                <span className="text-sm truncate">Search jobs for "{query.trim()}"</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
