"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { Eye, EyeOff, Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { UK_CITIES } from "@/lib/data/uk-cities";
import { UK_TOWNS } from "@/lib/data/uk-towns";

export default function NurserySignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [townOpen, setTownOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    nurseryName: "",
    city: "",
    town: "",
  });
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    nurseryName: "",
    city: "",
    town: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Format UK phone number as user types
    if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '');
      let formatted = '';
      
      if (cleaned.startsWith('44')) {
        // Format: +44 XXXX XXXXXX
        formatted = '+44';
        if (cleaned.length > 2) formatted += ' ' + cleaned.substring(2, 6);
        if (cleaned.length > 6) formatted += ' ' + cleaned.substring(6, 12);
      } else if (cleaned.startsWith('0')) {
        // Format: 0XXXX XXXXXX
        formatted = cleaned.substring(0, 5);
        if (cleaned.length > 5) formatted += ' ' + cleaned.substring(5, 11);
      } else if (value.startsWith('+44')) {
        formatted = value;
      } else {
        formatted = cleaned.substring(0, 11);
      }
      
      setFormData({ ...formData, [name]: formatted });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const validateUKPhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    // UK formats: +44XXXXXXXXXX (10-11 digits after +44) or 0XXXXXXXXXX (10-11 digits starting with 0)
    const ukPhoneRegex = /^(\+44[1-9]\d{9,10}|0[1-9]\d{9,10})$/;
    return ukPhoneRegex.test(cleaned);
  };

  const validateForm = () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      nurseryName: "",
      city: "",
      town: "",
    };
    let isValid = true;

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
      isValid = false;
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters";
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName)) {
      newErrors.firstName = "First name can only contain letters";
      isValid = false;
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
      isValid = false;
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters";
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName)) {
      newErrors.lastName = "Last name can only contain letters";
      isValid = false;
    }

    // Nursery name validation
    if (!formData.nurseryName.trim()) {
      newErrors.nurseryName = "Nursery name is required";
      isValid = false;
    } else if (formData.nurseryName.trim().length < 3) {
      newErrors.nurseryName = "Nursery name must be at least 3 characters";
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    // UK Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
      isValid = false;
    } else if (!validateUKPhone(formData.phone)) {
      newErrors.phone = "Please enter a valid UK phone number (e.g., +44 7123 456789 or 07123 456789)";
      isValid = false;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    // City validation
    if (!formData.city.trim()) {
      newErrors.city = "City is required";
      isValid = false;
    }

    // Town validation (optional)
    // You can make it required by uncommenting below
    // if (!formData.town.trim()) {
    //   newErrors.town = "Town is required";
    //   isValid = false;
    // }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Form submitted", formData);
    
    if (!validateForm()) {
      console.log("Validation failed");
      return;
    }
    
    console.log("Validation passed");
    setIsLoading(true);

    try {
      console.log("Sending request to backend");
      const response = await fetch("https://mathew-production.up.railway.app/api/auth/nursery-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Save selected city and town to localStorage
        localStorage.setItem("selectedCity", formData.city);
        if (formData.town) {
          localStorage.setItem("selectedTown", formData.town);
        }
        
        // Check if account needs approval
        if (data.pendingApproval) {
          toast.success("Nursery account created successfully! Your account is pending admin approval. You will be notified once approved.");
        } else {
          toast.success("Nursery registered successfully! Redirecting to login...");
        }
        
        // Prevent back navigation
        window.history.pushState(null, "", window.location.href);
        window.onpopstate = function () {
          window.history.pushState(null, "", window.location.href);
        };

        setTimeout(() => {
          router.replace("/nursery-login");
        }, 3000);
      } else {
        toast.error(data.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again later.");
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 px-4 py-12">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center">

           <img src="/images/logo.png" className="w-60 object-cover" alt="Nursery Logo" />
          </div>
          <CardDescription className="text-base mb-5">
            Join our platform and grow your nursery business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={errors.firstName ? "border-red-500" : ""}
                />
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.firstName ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                  <span className="text-red-500 text-sm block mt-1">{errors.firstName || ' '}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={errors.lastName ? "border-red-500" : ""}
                />
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.lastName ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                  <span className="text-red-500 text-sm block mt-1">{errors.lastName || ' '}</span>
                </div>
              </div>
            </div>

            {/* Nursery Name */}
            <div className="space-y-2">
              <Label htmlFor="nurseryName">Group Name *</Label>
              <Input
                id="nurseryName"
                name="nurseryName"
                type="text"
                placeholder="Sunshine Kids Nursery"
                value={formData.nurseryName}
                onChange={handleChange}
                disabled={isLoading}
                className={errors.nurseryName ? "border-red-500" : ""}
              />
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.nurseryName ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                <span className="text-red-500 text-sm block mt-1">{errors.nurseryName || ' '}</span>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="contact@nursery.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className={errors.email ? "border-red-500" : ""}
              />
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.email ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                <span className="text-red-500 text-sm block mt-1">{errors.email || ' '}</span>
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (UK Only) *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+44 7123 456789 or 07123 456789"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
                maxLength={17}
                className={errors.phone ? "border-red-500" : ""}
              />
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.phone ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                <span className="text-red-500 text-sm block mt-1">{errors.phone || ' '}</span>
              </div>
              <p className="text-xs text-gray-500">UK phone numbers only</p>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={cityOpen}
                    className={cn(
                      "w-full justify-between",
                      !formData.city && "text-muted-foreground",
                      errors.city && "border-red-400"
                    )}
                    disabled={isLoading}
                  >
                    {formData.city || "Select city..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[400px]">
                  <Command>
                    <CommandInput placeholder="Search city..." />
                    <CommandList>
                      <CommandEmpty>No city found.</CommandEmpty>
                      <CommandGroup>
                        {UK_CITIES.map((city) => (
                          <CommandItem
                            key={`city-${city}`}
                            value={city}
                            onSelect={() => {
                              setFormData({ ...formData, city: city });
                              setCityOpen(false);
                              if (errors.city) {
                                setErrors({ ...errors, city: "" });
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.city === city ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {city}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.city ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                <span className="text-red-500 text-sm block mt-1">{errors.city || ' '}</span>
              </div>
            </div>

            {/* Town */}
            <div className="space-y-2">
              <Label htmlFor="town">Town (Optional)</Label>
              <Popover open={townOpen} onOpenChange={setTownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={townOpen}
                    className={cn(
                      "w-full justify-between",
                      !formData.town && "text-muted-foreground",
                      errors.town && "border-red-400"
                    )}
                    disabled={isLoading}
                  >
                    {formData.town || "Select town..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[400px]">
                  <Command>
                    <CommandInput placeholder="Search town..." />
                    <CommandList>
                      <CommandEmpty>No town found.</CommandEmpty>
                      <CommandGroup>
                        {UK_TOWNS.map((town) => (
                          <CommandItem
                            key={`town-${town}`}
                            value={town}
                            onSelect={() => {
                              setFormData({ ...formData, town: town });
                              setTownOpen(false);
                              if (errors.town) {
                                setErrors({ ...errors, town: "" });
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.town === town ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {town}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.town ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                <span className="text-red-500 text-sm block mt-1">{errors.town || ' '}</span>
              </div>
              <p className="text-xs text-gray-500">Select a specific town within your city</p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={errors.password ? "pr-10 border-red-500" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.password ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                <span className="text-red-500 text-sm block mt-1">{errors.password || ' '}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-secondary hover:bg-secondary/90 cursor-pointer text-white py-6 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Register Nursery"}
            </Button>

            {/* Login Link */}
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/nursery-login"
                className="text-primary font-semibold hover:underline"
              >
                Login here
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
