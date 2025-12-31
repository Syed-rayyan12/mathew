"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function NurseryLoginPage() {
  const router = useRouter();
  const [showLoader, setShowLoader] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  // Check if already logged in
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const email = localStorage.getItem('email');
    
    if (accessToken && email) {
      router.replace('/settings');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
    };
    let isValid = true;

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
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

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Delay showing loader by 300ms to avoid flashing for quick responses
    const loaderTimeout = setTimeout(() => {
      setShowLoader(true);
    }, 300);

    try {
      const response = await fetch("http://localhost:5000/api/auth/nursery-signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store email, accessToken, and user details
        localStorage.setItem("accessToken", data.data.accessToken);
        localStorage.setItem("email", data.data.email);
        localStorage.setItem("firstName", data.data.firstName || "");
        localStorage.setItem("lastName", data.data.lastName || "");
        localStorage.setItem("phone", data.data.phone || "");
        localStorage.setItem("nurseryName", data.data.nurseryName || "");

        toast.success("Login successful! Redirecting to settings...");

        // Keep loader visible during redirect
        setTimeout(() => {
          router.push('/settings')
          clearTimeout(loaderTimeout);
          setShowLoader(false);
        }, 2000);
      } else {
        toast.error(data.message || "Login failed. Please check your credentials.");
        clearTimeout(loaderTimeout);
        setShowLoader(false);
      }
    } catch (error) {
      toast.error("An error occurred. Please try again later.");
      console.error("Login error:", error);
      clearTimeout(loaderTimeout);
      setShowLoader(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-100 px-4 py-12">
      <Card className="w-full max-w-md shadow-2xl">
        {showLoader && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-secondary border-t-transparent rounded-full animate-spin transform rotate-45"></div>
              <div className="absolute inset-2 border-4 border-primary border-b-transparent rounded-full animate-spin transform -rotate-45" style={{ animationDirection: 'reverse' }}></div>
            </div>
          </div>
        )}
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center">

           <img src="/images/logo.png" className="w-60 object-cover" alt="Nursery Logo" />
          </div>
          <CardDescription className="text-base">
            Access your nursery dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="contact@nursery.com"
                value={formData.email}
                onChange={handleChange}
                disabled={showLoader}
                className={errors.email ? "border-red-500" : ""}
              />
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${errors.email ? 'max-h-10 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                <span className="text-red-500 text-sm block mt-1">{errors.email || ' '}</span>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={showLoader}
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

            {/* Forgot Password */}
           

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-secondary hover:bg-secondary/90 cursor-pointer text-white py-6 text-base font-semibold"
              disabled={showLoader}
            >
              {showLoader ? "Logging in..." : "Login to Dashboard"}
            </Button>

            {/* Signup Link */}
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                href="/nursery-signup"
                className="text-primary font-semibold hover:underline"
              >
                Register your nursery
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
