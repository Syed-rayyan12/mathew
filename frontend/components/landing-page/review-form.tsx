"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Star, Info } from "lucide-react";
import { nurseryService, reviewService } from "@/lib/api/nursery";
import type { Review } from "@/lib/api/nursery";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

// Generate "Month Year" options going back 3 years
function generatePeriodOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const value = d.toISOString().slice(0, 7); // "2024-07"
    options.push({ value, label });
  }
  return options;
}

interface NurserySearchResult {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  postcode: string;
}

export default function NurseryReviewForm() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNursery, setSelectedNursery] = useState<NurserySearchResult | null>(null);
  const [searchResults, setSearchResults] = useState<NurserySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectingNursery, setSelectingNursery] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sidebarReviews, setSidebarReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Check for pre-filled nursery from URL params
  useEffect(() => {
    const nurseryId = searchParams.get('nurseryId');
    const nurseryName = searchParams.get('nurseryName');
    const nurserySlug = searchParams.get('nurserySlug');
    const nurseryAddress = searchParams.get('nurseryAddress');
    const nurseryCity = searchParams.get('nurseryCity');
    const nurseryPostcode = searchParams.get('nurseryPostcode');

    if (nurseryId && nurseryName) {
      setSelectedNursery({
        id: nurseryId,
        name: nurseryName,
        slug: nurserySlug || '',
        address: nurseryAddress || '',
        city: nurseryCity || '',
        postcode: nurseryPostcode || '',
      });
    }
  }, [searchParams]);

  // Search nurseries as user types
  useEffect(() => {
    const searchNurseries = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await nurseryService.search(searchQuery);
        if (response.success && response.data) {
          const data = response.data as any;
          // Backend returns { nurseries: [], groups: [], ... }
          const nurseries = Array.isArray(data) ? data : (Array.isArray(data.nurseries) ? data.nurseries : []);
          setSearchResults(nurseries);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchNurseries, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const periodOptions = generatePeriodOptions();

  const [form, setForm] = useState({
    overall: 0,
    connection: "",
    date: "",
    review: "",
    facilities: 0,
    learning: 0,
    resources: 0,
    care: 0,
    activities: 0,
    staff: 0,
    food: 0,
    management: 0,
    cleanliness: 0,
    safeguarding: 0,
    value: 0,
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    initialsOnly: false,
  });

  const showDropdown = searchQuery.length >= 2 && searchResults.length > 0;

  const handleSelectNursery = (nursery: NurserySearchResult) => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectingNursery(true);
    // Fetch reviews for sidebar
    reviewService.getNurseryReviews(nursery.id).then(res => {
      if (res.success && res.data) {
        const data = res.data as any;
        setSidebarReviews(Array.isArray(data.reviews) ? data.reviews : []);
      }
    }).catch(() => {
      setSidebarReviews([]);
    }).finally(() => {
      setSelectingNursery(false);
      setSelectedNursery(nursery);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    if (errors[name]) {
      setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!selectedNursery) {
      toast.error('Please select a nursery first');
      return;
    }

    // Validate all required fields
    const newErrors: Record<string, string> = {};
    if (!form.connection) newErrors.connection = 'Please select your connection to the nursery';
    if (!form.date) newErrors.date = 'Please select when your review relates to';
    if (!form.review.trim()) newErrors.review = 'Please write your review';
    else if (form.review.trim().length < 200) newErrors.review = 'Review must be at least 200 characters';
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.email.trim()) newErrors.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Please enter a valid email address';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fill in all required fields');
      return;
    }
    setErrors({});

    // Calculate average rating from all ratings
    const ratings = [
      form.overall,
      form.facilities,
      form.learning,
      form.resources,
      form.care,
      form.activities,
      form.staff,
      form.food,
      form.management,
      form.cleanliness,
      form.safeguarding,
      form.value,
    ];

    // Calculate average: sum of all ratings / number of ratings given
    const totalRating = ratings.reduce((sum, rating) => sum + rating, 0);
    const averageRating = Math.round((totalRating / ratings.length) * 10) / 10; // Round to 1 decimal

    console.log('📊 Rating Calculation:');
    console.log('Total ratings given:', ratings.length);
    console.log('Sum of ratings:', totalRating);
    console.log('Average rating:', averageRating);

    setIsSubmitting(true);
    try {
      const { reviewService } = await import('@/lib/api/nursery');
      
      // Get logged-in user data
      const loggedInUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const userData = loggedInUser ? JSON.parse(loggedInUser) : null;
      
      // Use logged-in user's data if available, otherwise use form data
      const submissionData = {
        nurseryId: selectedNursery.id,
        overallRating: averageRating,
        content: form.review,
        connection: form.connection,
        visitDate: form.date || undefined,
        facilities: form.facilities || undefined,
        learning: form.learning || undefined,
        resources: form.resources || undefined,
        care: form.care || undefined,
        activities: form.activities || undefined,
        staff: form.staff || undefined,
        food: form.food || undefined,
        management: form.management || undefined,
        cleanliness: form.cleanliness || undefined,
        safeguarding: form.safeguarding || undefined,
        value: form.value || undefined,
        firstName: userData?.firstName || form.firstName,
        lastName: userData?.lastName || form.lastName,
        email: userData?.email || form.email,
        telephone: undefined,
        initialsOnly: form.initialsOnly,
      };
      
      console.log('📝 Submitting review:', {
        email: submissionData.email,
        userId: userData?.id || 'Not logged in'
      });
      
      const response = await reviewService.submit(submissionData);

      if (response.success) {
        toast.success(`Review submitted! Your average rating of ${averageRating} stars is pending approval.`);
        // Add the new review optimistically to the sidebar
        const newReview: Review = {
          id: Date.now().toString(),
          overallRating: averageRating,
          content: form.review,
          connection: form.connection,
          firstName: form.firstName,
          lastName: form.lastName,
          initialsOnly: form.initialsOnly,
          isVerified: false,
          isApproved: false,
          isRejected: false,
          createdAt: new Date().toISOString(),
        };
        setSidebarReviews(prev => [newReview, ...prev]);
        // Reset form but keep nursery selected so sidebar stays visible
        setForm({
          overall: 0,
          connection: "",
          date: "",
          review: "",
          facilities: 0,
          learning: 0,
          resources: 0,
          care: 0,
          activities: 0,
          staff: 0,
          food: 0,
          management: 0,
          cleanliness: 0,
          safeguarding: 0,
          value: 0,
          firstName: "",
          lastName: "",
          email: "",
          telephone: "",
          initialsOnly: false,
        });
        // Do NOT clear selectedNursery - keep sidebar showing the nursery's reviews
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ label, name, error, required = true }: { label: string; name: keyof typeof form; error?: string; required?: boolean }) => {
    const value = form[name];
    const rating = typeof value === 'number' ? value : 0;

    const getRatingStatus = (rating: number): string => {
      switch (rating) {
        case 1:
          return "Very Poor";
        case 2:
          return "Poor";
        case 3:
          return "Satisfactory";
        case 4:
          return "Good";
        case 5:
          return "Excellent";
        default:
          return "";
      }
    };

    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3">
          <label className="font-medium min-w-fit">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={26}
                className={`cursor-pointer transition ${rating >= star ? "fill-primary text-primary" : "text-gray-400"}`}
                onClick={() => {
                  setForm({ ...form, [name]: star });
                  if (errors[String(name)]) {
                    setErrors(prev => { const next = { ...prev }; delete next[String(name)]; return next; });
                  }
                }}
              />
            ))}
            {rating > 0 && (
              <span className="text-sm font-medium text-secondary">
                {getRatingStatus(rating)}
              </span>
            )}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* SELECTING LOADER */}
      {selectingNursery ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-secondary border-t-transparent animate-spin" />
          <p className="text-gray-500 text-base font-medium">Loading nursery...</p>
        </div>

      ) : !selectedNursery ? (
        /* SEARCH — centered when no nursery selected */
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-medium mb-2 text-center"
          >
            Submit a Review
          </motion.h1>
          <p className="text-gray-500 mb-8 text-center">Search for a nursery to get started</p>

          <div className="relative w-full max-w-xl">
            <Input
              type="text"
              placeholder="Search by nursery name, city, town or postcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 text-base pl-4 pr-10 rounded-xl shadow-md"
              autoFocus
            />

            {isSearching && searchQuery.length >= 2 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                <p className="text-gray-500 text-sm">Searching...</p>
              </div>
            )}

            {showDropdown && !isSearching && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
                {searchResults.map((nursery) => (
                  <div
                    key={nursery.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition border-b last:border-b-0"
                    onClick={() => handleSelectNursery(nursery)}
                  >
                    <p className="font-medium text-gray-800">{nursery.name}</p>
                    <p className="text-gray-500 text-sm">{[nursery.address, nursery.city, nursery.postcode].filter(Boolean).join(', ')}</p>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
                <p className="text-gray-500 text-sm">No nurseries found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* AFTER nursery selected — two-column layout */
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* LEFT: Form */}
          <div className="flex-1 min-w-0">
            {/* Selected nursery banner + change button */}
            <div className="flex items-center justify-between bg-secondary/5 border border-secondary rounded-xl px-5 py-3 mb-6">
              <div>
                <p className="font-semibold text-gray-800">{selectedNursery.name}</p>
                <p className="text-gray-500 text-sm">{[selectedNursery.address, selectedNursery.city, selectedNursery.postcode].filter(Boolean).join(', ')}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedNursery(null); setSidebarReviews([]); }}>
                Change
              </Button>
            </div>

            <Card className="rounded-2xl shadow-md">
              <CardContent className="p-6 space-y-6">
                <form className="space-y-6" onSubmit={handleSubmit}>

            <StarRating label="Overall Experience" name="overall" required={false} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-medium">Connection to Nursery <span className="text-red-500">*</span></label>
                <select
                  name="connection"
                  value={form.connection}
                  onChange={handleChange}
                  className={`border p-2 rounded-xl w-full ${errors.connection ? 'border-red-500' : ''}`}
                >
                  <option value="">Please Select...</option>
                  <option value="Father of Child">Father of Child</option>
                  <option value="Mother of Child">Mother of Child</option>
                  <option value="Stepfather of Child">Stepfather of Child</option>
                  <option value="Stepmother of Child">Stepmother of Child</option>
                  <option value="Grandmother of Child">Grandmother of Child</option>
                  <option value="Grandfather of Child">Grandfather of Child</option>
                  <option value="Great-grandmother of Child">Great-grandmother of Child</option>
                  <option value="Great-grandfather of Child">Great-grandfather of Child</option>
                  <option value="Aunt of Child">Aunt of Child</option>
                  <option value="Uncle of Child">Uncle of Child</option>
                  <option value="Great Aunt of Child">Great Aunt of Child</option>
                  <option value="Great Uncle of Child">Great Uncle of Child</option>
                  <option value="Brother of Child">Brother of Child</option>
                  <option value="Sister of Child">Sister of Child</option>
                  <option value="Cousin of Child">Cousin of Child</option>
                  <option value="Guardian of Child">Guardian of Child</option>
                  <option value="Foster Parent of Child">Foster Parent of Child</option>
                  <option value="Nanny/Carer of Child">Nanny/Carer of Child</option>
                  <option value="Godmother of Child">Godmother of Child</option>
                  <option value="Godfather of Child">Godfather of Child</option>
                  <option value="Parent">Parent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Carer">Carer</option>
                </select>
                {errors.connection && <p className="text-red-500 text-sm mt-1">{errors.connection}</p>}
              </div>
              <div>
                <label className="font-medium">Review Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className={`border p-2 rounded-xl w-full ${errors.date ? 'border-red-500' : ''}`}
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium">Write your review <span className="text-red-500">*</span></label>
              <textarea
                name="review"
                value={form.review}
                onChange={handleChange}
                className={`border p-3 rounded-xl whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-h-[150px] ${errors.review ? 'border-red-500' : ''}`}
                placeholder="Please tell us about your experience (200–1000 characters)"
              ></textarea>
              {errors.review && <p className="text-red-500 text-sm">{errors.review}</p>}
            </div>

            <div className="border rounded-md p-6">
              <h2 className="font-medium text-2xl mb-6">How would you rate your Overall Experience with this Nursery?</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StarRating label="Facilities / Outside Space" name="facilities" required={false} />
                  <StarRating label="Learning" name="learning" required={false} />
                  <StarRating label="Resources / Equipment / ICT" name="resources" required={false} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StarRating label="Care" name="care" required={false} />
                  <StarRating label="Activities" name="activities" required={false} />
                  <StarRating label="Staff" name="staff" required={false} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StarRating label="Food / Nutrition" name="food" required={false} />
                  <StarRating label="Management" name="management" required={false} />
                  <StarRating label="Cleanliness" name="cleanliness" required={false} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StarRating label="Safeguarding" name="safeguarding" required={false} />
                  <StarRating label="Value for Money" name="value" required={false} />
                </div>
              </div>
            </div>

            <div className="space-y-3 border p-4 rounded-md">
              <h2 className="text-xl font-medium">Your Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-sm">First Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="First Name"
                    className={`border p-2 rounded-xl w-full ${errors.firstName ? 'border-red-500' : ''}`}
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="font-medium text-sm">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Last Name"
                    className={`border p-2 rounded-xl w-full ${errors.lastName ? 'border-red-500' : ''}`}
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="font-medium text-sm">Email Address <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className={`border p-2 rounded-xl w-full ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="initialsOnly"
                  checked={form.initialsOnly}
                  onChange={handleChange}
                />
                <label>Display only initials</label>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl p-3 text-lg">
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </form>
        </CardContent>
      </Card>
          </div>

          {/* RIGHT: Reviews Sidebar */}
          <div className="w-full lg:w-[360px] shrink-0">
            <div className="sticky top-24 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#044A55]">
                  {selectedNursery.name} Reviews
                </h3>
                {sidebarReviews.length > 0 && (
                  <span className="text-xs bg-secondary/10 text-secondary font-semibold px-2 py-0.5 rounded-full">
                    {sidebarReviews.length}
                  </span>
                )}
              </div>

              <div className="overflow-y-auto max-h-[600px] divide-y divide-gray-100">
                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-6 h-6 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
                  </div>
                ) : sidebarReviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <p className="text-gray-400 text-sm">No reviews yet. Be the first!</p>
                  </div>
                ) : (
                  sidebarReviews.map(review => {
                    const displayName = review.initialsOnly
                      ? `${review.firstName.charAt(0)} ${review.lastName.charAt(0)}`
                      : `${review.firstName} ${review.lastName}`;
                    const date = new Date(review.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                    return (
                      <div key={review.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={i < Math.round(review.overallRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-gray-400">{date}</p>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-5 mb-2">{review.content}</p>
                        <p className="text-xs text-gray-500 font-medium">
                          Review from {displayName}{review.connection ? ` (${review.connection})` : ''}
                        </p>
                        {!review.isApproved && (
                          <span className="inline-block mt-1 text-[11px] bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-0.5 rounded-full">
                            Pending approval
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}