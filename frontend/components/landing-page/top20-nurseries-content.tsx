"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, ArrowRight, Search, LocateIcon, Heart, Trophy } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { nurseryService, Nursery } from "@/lib/api/nursery";
import { shortlistService } from "@/lib/api/shortlist";
import { authService } from "@/lib/api/auth";
import { toast } from "sonner";

export default function Top20NurseriesContent() {
  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [shortlistLoadingIds, setShortlistLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTop20();
  }, []);

  const fetchTop20 = async () => {
    setLoading(true);
    try {
      const response = await nurseryService.getAll({ limit: 200 });
      if (response.success && Array.isArray(response.data)) {
        const childNurseries = response.data.filter(
          (n) => n.groupId !== null && n.groupId !== undefined
        );
        const sorted = [...childNurseries].sort(
          (a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0)
        );
        const top20 = sorted.slice(0, 20);
        setNurseries(top20);
        checkShortlistStatuses(top20.map((n) => n.id));
      }
    } catch (error) {
      console.error("Failed to fetch nurseries:", error);
      toast.error("Failed to load nurseries");
    } finally {
      setLoading(false);
    }
  };

  const checkShortlistStatuses = async (ids: string[]) => {
    if (!authService.isAuthenticated() || ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map((id) => shortlistService.checkShortlisted(id))
    );
    const shortlisted = new Set<string>();
    results.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value?.data?.isShortlisted) {
        shortlisted.add(ids[i]);
      }
    });
    setShortlistedIds(shortlisted);
  };

  const toggleShortlist = async (e: React.MouseEvent, nurseryId: string) => {
    e.preventDefault();
    if (!authService.isAuthenticated()) {
      toast.error("Please sign in to shortlist nurseries");
      return;
    }
    setShortlistLoadingIds((prev) => new Set(prev).add(nurseryId));
    try {
      if (shortlistedIds.has(nurseryId)) {
        await shortlistService.removeFromShortlist(nurseryId);
        setShortlistedIds((prev) => {
          const s = new Set(prev);
          s.delete(nurseryId);
          return s;
        });
        toast.success("Removed from shortlist");
      } else {
        await shortlistService.addToShortlist(nurseryId);
        setShortlistedIds((prev) => new Set(prev).add(nurseryId));
        toast.success("Added to shortlist");
      }
    } catch {
      toast.error("Failed to update shortlist");
    } finally {
      setShortlistLoadingIds((prev) => {
        const s = new Set(prev);
        s.delete(nurseryId);
        return s;
      });
    }
  };

  const filteredNurseries = nurseries.filter((n) =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Orange Banner */}
      <section className="bg-primary text-white  px-6 md:px-16 lg:px-24">
        <div className="max-w-7xl flex justify-between mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm font-medium uppercase tracking-widest text-white/70 mb-2">
              Best Rated
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Top 20 Nurseries</h1>
            <p className="text-white/80 max-w-xl text-base">
              Discover the highest-rated nurseries across the UK, ranked by parent reviews.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Image
              src="/images/top-20.png"
              alt="Top 20 Nurseries"
              width={340}
              height={280}
              className="object-contain drop-shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
          {/* <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">
              {filteredNurseries.length}
            </span>{" "}
            nurseries listed
          </p> */}
          {/* <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search nurseries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div> */}
        </div>
      </div>

      {/* Nursery Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Loading nurseries...</p>
          </div>
        ) : filteredNurseries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10 pb-20">
            {filteredNurseries.map((nursery, index) => (
              <div
                key={nursery.id}
                className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 h-80 md:h-96"
              >
                {/* Rank badge */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                  <Trophy size={12} />
                  #{index + 1}
                </div>

                <Link href={`/products/${nursery.slug}`}>
                  <img
                    src={nursery.cardImage || nursery.images?.[0] || "/images/nursery-1.png"}
                    alt={nursery.name}
                    className="w-full h-full object-cover rounded-xl cursor-pointer"
                  />
                </Link>

                {/* Heart / Shortlist button */}
                <button
                  onClick={(e) => toggleShortlist(e, nursery.id)}
                  disabled={shortlistLoadingIds.has(nursery.id)}
                  className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow hover:scale-110 transition-transform disabled:opacity-50 z-10"
                  aria-label={
                    shortlistedIds.has(nursery.id)
                      ? "Remove from shortlist"
                      : "Add to shortlist"
                  }
                >
                  <Heart
                    size={18}
                    className={
                      shortlistedIds.has(nursery.id)
                        ? "fill-red-500 text-red-500"
                        : "text-gray-400"
                    }
                  />
                </button>

                <div className="absolute top-52 md:top-55 left-0 right-0 px-3 md:px-4 py-4 md:py-6 mx-3 md:mx-4 shadow-lg bg-white rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-heading text-lg md:text-[20px] font-medium text-[#044A55] line-clamp-1">
                      {nursery.name}
                    </h3>
                    {(nursery.city || nursery.town) && (
                      <span className="text-xs md:text-sm font-ubuntu line-clamp-2 flex items-center gap-1 text-foreground whitespace-nowrap">
                        <LocateIcon className="text-secondary" size={16} />
                        {[nursery.town, nursery.city].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mb-2 mt-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={
                          i < Math.round(nursery.averageRating || 0)
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-300"
                        }
                        size={14}
                      />
                    ))}
                    <span className="text-xs md:text-sm ml-2 text-foreground">
                      {nursery.reviewCount || 0} reviews
                    </span>
                  </div>
                  <p className="font-ubuntu text-xs md:text-[13px] text-muted-foreground line-clamp-2">
                    {nursery.description || "Quality childcare and early learning"}
                  </p>
                  <Link href={`/products/${nursery.slug}`}>
                    <div className="mt-2 md:mt-3 flex items-center pt-1 cursor-pointer">
                      <Button className="text-secondary bg-transparent cursor-pointer hover:bg-transparent font-heading text-base md:text-[18px] uppercase px-2">
                        VIEW NURSERY
                      </Button>
                      <ArrowRight className="text-secondary size-5" />
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No nurseries found.</p>
          </div>
        )}
      </section>
    </main>
  );
}
