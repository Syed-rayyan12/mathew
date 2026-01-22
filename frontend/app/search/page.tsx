"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { nurseryService } from "@/lib/api/nursery";
import Link from "next/link";
import { MapPin, Users, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Group {
  id: string;
  name: string;
  slug: string;
  city: string;
  cardImage?: string;
  logo?: string;
  description?: string;
  nurseryCount: number;
}

interface Nursery {
  id: string;
  name: string;
  slug: string;
  city: string;
  cardImage?: string;
  description?: string;
  ageRange?: string;
  facilities: string[];
  group?: {
    name: string;
    slug: string;
  };
}

function SearchResults() {
  const searchParams = useSearchParams();
  const city = searchParams.get("city");
  const [groups, setGroups] = useState<Group[]>([]);
  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!city) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const response = await nurseryService.searchByCity(city);
        if (response.success && response.data) {
          setGroups(response.data.groups || []);
          setNurseries(response.data.nurseries || []);
        }
      } catch (error) {
        console.error("Error fetching search results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [city]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-gray-600">Searching nurseries in {city}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Nurseries in <span className="text-secondary">{city}</span>
          </h1>
          <p className="text-gray-600">
            Found {groups.length} nursery groups and {nurseries.length} nurseries
          </p>
        </div>

        {/* Groups Section */}
        {groups.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-6 h-6 text-secondary" />
              <h2 className="text-2xl font-bold text-gray-900">Nursery Groups</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {groups.map((group) => (
                <Link key={group.id} href={`/nursery-group/${group.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      {group.cardImage || group.logo ? (
                        <div className="w-full h-48 mb-4 rounded-lg overflow-hidden">
                          <img
                            src={group.cardImage || group.logo}
                            alt={group.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null}
                      <CardTitle className="text-xl">{group.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{group.city}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{group.nurseryCount} nurseries</span>
                        </div>
                        {group.description && (
                          <p className="text-gray-600 text-sm line-clamp-2 mt-3">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Nurseries Section */}
        {nurseries.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-6 h-6 text-secondary" />
              <h2 className="text-2xl font-bold text-gray-900">Individual Nurseries</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {nurseries.map((nursery) => (
                <Link key={nursery.id} href={`/childcare/${nursery.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      {nursery.cardImage && (
                        <div className="w-full h-48 mb-4 rounded-lg overflow-hidden">
                          <img
                            src={nursery.cardImage}
                            alt={nursery.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardTitle className="text-xl">{nursery.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{nursery.city}</span>
                        </div>
                        {nursery.group && (
                          <div className="text-sm text-gray-500">
                            Part of <span className="font-semibold">{nursery.group.name}</span>
                          </div>
                        )}
                        {nursery.ageRange && (
                          <div className="text-sm text-gray-600">
                            Age Range: {nursery.ageRange}
                          </div>
                        )}
                        {nursery.description && (
                          <p className="text-gray-600 text-sm line-clamp-2 mt-3">
                            {nursery.description}
                          </p>
                        )}
                        {nursery.facilities.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {nursery.facilities.slice(0, 3).map((facility, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full"
                              >
                                {facility}
                              </span>
                            ))}
                            {nursery.facilities.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                +{nursery.facilities.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {groups.length === 0 && nurseries.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No nurseries found in {city}
              </h3>
              <p className="text-gray-600">
                Try searching for a different city or browse all nurseries.
              </p>
              <Link
                href="/childcare"
                className="inline-block mt-4 px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Browse All Nurseries
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
