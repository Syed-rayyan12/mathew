"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Upload, X, Plus, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'

const NurseryProfile = ({ nurserySlug }: { nurserySlug?: string }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [isViewMode, setIsViewMode] = useState(false);
    const [cardImagePreview, setCardImagePreview] = useState<string>('');
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [videoPreview, setVideoPreview] = useState<string>('');
    const [facilities, setFacilities] = useState<string[]>(['']);
    const [nurseryId, setNurseryId] = useState<string>('');
    const [formData, setFormData] = useState({
        nurseryName: '',
        ageGroup: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postcode: '',
        aboutUs: '',
        philosophy: '',
        videoUrl: '',
        openingTime: '',
        closingTime: '',
        fees0to2Full: '',
        fees0to2Part: '',
        fees2to3Full: '',
        fees2to3Part: '',
        fees3to5Full: '',
        fees3to5Part: '',
    });

    // Load nursery data from API on mount
    useEffect(() => {
        const loadNurseryData = async () => {
            const email = localStorage.getItem('email');

            // Set view mode if nurserySlug is provided
            setIsViewMode(!!nurserySlug);

            try {
                let response;

                if (nurserySlug) {
                    // Load nursery by slug for viewing
                    const { nurseryService } = await import('@/lib/api/nursery');
                    response = await nurseryService.getBySlug(nurserySlug);
                } else {
                    // Load my nursery for editing
                    const { nurseryDashboardService } = await import('@/lib/api/nursery');
                    response = await nurseryDashboardService.getMyNursery();
                }

                if (response.success && response.data) {
                    // Get first nursery if array (for dashboard) or single nursery (for slug)
                    const nursery = Array.isArray(response.data) && response.data.length > 0
                        ? response.data[0]
                        : (Array.isArray(response.data) ? null : response.data);

                    if (!nursery) {
                        setLoadingData(false);
                        return;
                    }

                    // Store nursery ID for updates (only in edit mode)
                    if (!nurserySlug && nursery.id) {
                        (window as any).__currentNurseryId = nursery.id;
                    }

                    setFormData({
                        nurseryName: nursery.name || '',
                        ageGroup: nursery.ageRange || '',
                        email: nursery.email || email || '',
                        phone: nursery.phone || '',
                        address: nursery.address || '',
                        city: nursery.city || '',
                        postcode: nursery.postcode || '',
                        aboutUs: nursery.aboutUs || nursery.description || '',
                        philosophy: nursery.philosophy || '',
                        videoUrl: nursery.videoUrl || '',
                        openingTime: nursery.openingHours?.openingTime || '',
                        closingTime: nursery.openingHours?.closingTime || '',
                        fees0to2Full: nursery.fees?.['0-2 years']?.fullTime || '',
                        fees0to2Part: nursery.fees?.['0-2 years']?.partTime || '',
                        fees2to3Full: nursery.fees?.['2-3 years']?.fullTime || '',
                        fees2to3Part: nursery.fees?.['2-3 years']?.partTime || '',
                        fees3to5Full: nursery.fees?.['3-5 years']?.fullTime || '',
                        fees3to5Part: nursery.fees?.['3-5 years']?.partTime || '',
                    });

                    if (nursery.facilities && Array.isArray(nursery.facilities)) {
                        setFacilities(nursery.facilities.length > 0 ? nursery.facilities : ['']);
                    }

                    if (nursery.cardImage) {
                        setCardImagePreview(nursery.cardImage);
                    }

                    if (nursery.images && Array.isArray(nursery.images)) {
                        setImagePreviews(nursery.images);
                    }

                    if (nursery.videoUrl) {
                        setVideoPreview(nursery.videoUrl);
                    }
                }
            } catch (error) {
                console.error('Failed to load nursery data:', error);
                toast.error('Failed to load nursery information');
            } finally {
                setLoadingData(false);
            }
        };

        loadNurseryData();
    }, [nurserySlug]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleMultipleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const fileArray = Array.from(files);
            const newPreviews: string[] = [];

            fileArray.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    newPreviews.push(reader.result as string);
                    if (newPreviews.length === fileArray.length) {
                        setImagePreviews([...imagePreviews, ...newPreviews]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        const newPreviews = imagePreviews.filter((_, i) => i !== index);
        setImagePreviews(newPreviews);
    };

    const addFacility = () => {
        setFacilities([...facilities, '']);
    };

    const removeFacility = (index: number) => {
        const newFacilities = facilities.filter((_, i) => i !== index);
        setFacilities(newFacilities);
    };

    const updateFacility = (index: number, value: string) => {
        const newFacilities = [...facilities];
        newFacilities[index] = value;
        setFacilities(newFacilities);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { nurseryDashboardService } = await import('@/lib/api/nursery');
            
            // Prepare fees data
            const feesData = {
                '0-2 years': {
                    fullTime: formData.fees0to2Full,
                    partTime: formData.fees0to2Part,
                },
                '2-3 years': {
                    fullTime: formData.fees2to3Full,
                    partTime: formData.fees2to3Part,
                },
                '3-5 years': {
                    fullTime: formData.fees3to5Full,
                    partTime: formData.fees3to5Part,
                },
            };

            // Prepare update data - SAME AS SETTINGS PAGE
            const updateData = {
                nurseryId: (window as any).__currentNurseryId,
                name: formData.nurseryName,
                description: formData.aboutUs,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                city: formData.city,
                postcode: formData.postcode,
                ageRange: formData.ageGroup,
                facilities: facilities.filter(f => f.trim() !== ''),
                fees: feesData,
                openingTime: formData.openingTime,
                closingTime: formData.closingTime,
                aboutUs: formData.aboutUs,
                philosophy: formData.philosophy,
                cardImage: cardImagePreview,
                images: imagePreviews.filter(img => img !== ''),
                videoUrl: formData.videoUrl,
            };

            const response = await nurseryDashboardService.updateNursery(updateData);

            if (response.success) {
                toast.success("Nursery profile updated successfully!");
                // Reload data to show updated values
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(response.error || 'Update failed');
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error(error instanceof Error ? error.message : "Failed to update profile. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (loadingData) {
        return (
            <div className="max-w-6xl">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading nursery data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className='text-secondary font-medium text-[48px] font-heading'>
                        <span className='text-foreground'>NURSERY </span>{isViewMode ? 'PROFILE' : 'SETTINGS'}
                    </h2>
                    <p className="text-muted-foreground">
                        {isViewMode ? 'View nursery information and details' : 'Complete your nursery profile to get approved'}
                    </p>
                </div>
                {isViewMode && (
                    <Button
                        onClick={() => setIsViewMode(false)}
                        className="bg-secondary hover:bg-secondary/90 text-white"
                    >
                        Edit Profile
                    </Button>
                )}
            </div>

            {isViewMode ? (
                <Card className='bg-white rounded-xl p-8 space-y-8'>
                    {/* View Mode Content */}
                    {/* Basic Information */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <Label className="block mb-2">Nursery Name</Label>
                                <p className="text-foreground font-medium">{formData.nurseryName || 'Not provided'}</p>
                            </div>
                            <div>
                                <Label className="block mb-2">Age Group</Label>
                                <p className="text-foreground font-medium">{formData.ageGroup || 'Not provided'}</p>
                            </div>
                            <div>
                                <Label className="block mb-2">Email Address</Label>
                                <p className="text-foreground font-medium">{formData.email || 'Not provided'}</p>
                            </div>
                            <div>
                                <Label className="block mb-2">Phone Number</Label>
                                <p className="text-foreground font-medium">{formData.phone || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Card Image Display */}
                    {cardImagePreview && (
                        <div>
                            <h3 className="text-2xl font-medium mb-4 text-foreground">Card Image</h3>
                            <div className="max-w-md mx-auto">
                                <img
                                    src={cardImagePreview}
                                    alt="Nursery Card"
                                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                                />
                            </div>
                        </div>
                    )}

                    {/* Gallery Images Display */}
                    {imagePreviews.length > 0 && (
                        <div>
                            <h3 className="text-2xl font-medium mb-4 text-foreground">Gallery Images</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="border-2 border-gray-200 rounded-lg h-32 overflow-hidden">
                                        <img
                                            src={preview}
                                            alt={`Gallery ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Video Display */}
                    {videoPreview && (
                        <div>
                            <h3 className="text-2xl font-medium mb-4 text-foreground">Video</h3>
                            <div className="max-w-2xl mx-auto">
                                <video
                                    src={videoPreview}
                                    controls
                                    className="w-full rounded-lg"
                                />
                            </div>
                        </div>
                    )}

                    {/* About Section */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">About</h3>
                        <div className="space-y-4">
                            <div>
                                <Label className="block mb-2">About Us</Label>
                                <p className="text-foreground whitespace-pre-wrap">{formData.aboutUs || 'Not provided'}</p>
                            </div>
                            <div>
                                <Label className="block mb-2">Our Philosophy</Label>
                                <p className="text-foreground whitespace-pre-wrap">{formData.philosophy || 'Not provided'}</p>
                            </div>
                            <div>
                                <Label className="block mb-2">Facilities & Features</Label>
                                <div className="space-y-1">
                                    {facilities.filter(f => f.trim() !== '').map((facility, index) => (
                                        <p key={index} className="text-foreground">• {facility}</p>
                                    ))}
                                    {facilities.filter(f => f.trim() !== '').length === 0 && (
                                        <p className="text-muted-foreground">No facilities listed</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fees & Funding */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">Fees & Funding</h3>
                        <div className="space-y-6">
                            {/* 0-2 years */}
                            <div>
                                <h4 className="font-medium mb-3 text-lg">0-2 years:</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="block mb-2">Full-time</Label>
                                        <p className="text-foreground font-medium">{formData.fees0to2Full || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <Label className="block mb-2">Part-time</Label>
                                        <p className="text-foreground font-medium">{formData.fees0to2Part || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* 2-3 years */}
                            <div>
                                <h4 className="font-medium mb-3 text-lg">2-3 years:</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="block mb-2">Full-time</Label>
                                        <p className="text-foreground font-medium">{formData.fees2to3Full || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <Label className="block mb-2">Part-time</Label>
                                        <p className="text-foreground font-medium">{formData.fees2to3Part || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* 3-5 years */}
                            <div>
                                <h4 className="font-medium mb-3 text-lg">3-5 years:</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="block mb-2">Full-time</Label>
                                        <p className="text-foreground font-medium">{formData.fees3to5Full || 'Not specified'}</p>
                                    </div>
                                    <div>
                                        <Label className="block mb-2">Part-time</Label>
                                        <p className="text-foreground font-medium">{formData.fees3to5Part || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location & Timing */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">Location & Opening Hours</h3>
                        <div className="space-y-4">
                            <div>
                                <Label className="block mb-2">Address</Label>
                                <p className="text-foreground font-medium">{formData.address || 'Not provided'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="block mb-2">City</Label>
                                    <p className="text-foreground font-medium">{formData.city || 'Not provided'}</p>
                                </div>
                                <div>
                                    <Label className="block mb-2">Postcode</Label>
                                    <p className="text-foreground font-medium">{formData.postcode || 'Not provided'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="block mb-2">Opening Time</Label>
                                    <p className="text-foreground font-medium">{formData.openingTime || 'Not specified'}</p>
                                </div>
                                <div>
                                    <Label className="block mb-2">Closing Time</Label>
                                    <p className="text-foreground font-medium">{formData.closingTime || 'Not specified'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            ) : (
                <form onSubmit={handleSubmit}>
                    <Card className='bg-white rounded-xl p-8 space-y-8'>
                    
                    {/* Basic Information */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="nurseryName" className="block mb-2">Nursery Name *</Label>
                                <Input
                                    id="nurseryName"
                                    name="nurseryName"
                                    value={formData.nurseryName}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="ageGroup" className="block mb-2">Age Group *</Label>
                                <select
                                    id="ageGroup"
                                    name="ageGroup"
                                    value={formData.ageGroup}
                                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                                    disabled={isLoading}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">Select Age Group</option>
                                    <option value="0-2 years">0-2 years</option>
                                    <option value="2-3 years">2-3 years</option>
                                    <option value="3-5 years">3-5 years</option>
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="email" className="block mb-2">Email Address *</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone" className="block mb-2">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card Image Upload */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">Card Image</h3>
                        <p className="text-sm text-muted-foreground mb-4">Upload a single image that will appear on nursery cards in listings</p>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary transition-colors">
                            {cardImagePreview ? (
                                <div className="space-y-4">
                                    <div className="relative group max-w-md mx-auto">
                                        <div className="border-2 border-gray-200 rounded-lg h-48 overflow-hidden">
                                            <img
                                                src={cardImagePreview}
                                                alt="Card Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCardImagePreview('')}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-foreground rounded-lg hover:bg-primary hover:text-white transition-colors">
                                        <Upload size={18} />
                                        <span>Change Card Image</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setCardImagePreview(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center h-48">
                                    <Upload className="text-gray-400 mb-2" size={48} />
                                    <span className="text-lg text-gray-600 mb-1">Upload Card Image</span>
                                    <span className="text-sm text-gray-500">Click to select a single image for cards</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setCardImagePreview(reader.result as string);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Gallery Images Upload */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">Gallery Images</h3>
                        <p className="text-sm text-muted-foreground mb-4">Upload multiple images for the slider on your nursery page</p>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary transition-colors">
                            {imagePreviews.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {imagePreviews.map((preview, index) => (
                                            <div key={index} className="relative group">
                                                <div className="border-2 border-gray-200 rounded-lg h-32 overflow-hidden">
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-foreground rounded-lg hover:bg-primary hover:text-white transition-colors">
                                        <Plus size={18} />
                                        <span>Add More Images</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={handleMultipleImageUpload}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center h-48">
                                    <Upload className="text-gray-400 mb-2" size={48} />
                                    <span className="text-lg text-gray-600 mb-1">Upload Gallery Images</span>
                                    <span className="text-sm text-gray-500">Click to select multiple images</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleMultipleImageUpload}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Video Upload */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">Video</h3>
                        <p className="text-sm text-muted-foreground mb-4">Upload a video to showcase your nursery</p>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-primary transition-colors">
                            {videoPreview ? (
                                <div className="space-y-4">
                                    <div className="relative group max-w-2xl mx-auto">
                                        <video
                                            src={videoPreview}
                                            controls
                                            className="w-full rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setVideoPreview('')
                                                setFormData({ ...formData, videoUrl: '' })
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-primary text-foreground rounded-lg hover:bg-primary hover:text-white transition-colors">
                                        <Upload size={18} />
                                        <span>Change Video</span>
                                        <input
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    const objectUrl = URL.createObjectURL(file)
                                                    setVideoPreview(objectUrl)
                                                    setFormData({ ...formData, videoUrl: objectUrl })
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center justify-center h-48">
                                    <Upload className="text-gray-400 mb-2" size={48} />
                                    <span className="text-lg text-gray-600 mb-1">Upload Video</span>
                                    <span className="text-sm text-gray-500">Click to select a video file</span>
                                    <input
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                const objectUrl = URL.createObjectURL(file)
                                                setVideoPreview(objectUrl)
                                                setFormData({ ...formData, videoUrl: objectUrl })
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* About Section */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">About</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="aboutUs" className="block mb-2">About Us *</Label>
                                <Textarea
                                    id="aboutUs"
                                    name="aboutUs"
                                    value={formData.aboutUs}
                                    onChange={handleInputChange}
                                    placeholder="Tell parents about your nursery..."
                                    rows={4}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="philosophy" className="block mb-2">Our Philosophy *</Label>
                                <Textarea
                                    id="philosophy"
                                    name="philosophy"
                                    value={formData.philosophy}
                                    onChange={handleInputChange}
                                    placeholder="Describe your educational philosophy..."
                                    rows={4}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="facilitiesFeatures" className="block mb-2">Facilities & Features *</Label>
                                <div className="space-y-2">
                                    {facilities.map((facility, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <span className="text-lg">•</span>
                                            <Input
                                                value={facility}
                                                onChange={(e) => updateFacility(index, e.target.value)}
                                                placeholder="e.g., Outdoor Play Area, CCTV Security"
                                                disabled={isLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeFacility(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        onClick={addFacility}
                                        variant="outline"
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        <Plus size={18} className="mr-2" />
                                        Add Facility
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fees & Funding */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">Fees & Funding</h3>
                        <div className="space-y-6">
                            {/* 0-2 years */}
                            <div>
                                <h4 className="font-medium mb-3 text-lg">0-2 years:</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="fees0to2Full" className="block mb-2">Full-time</Label>
                                        <Input
                                            id="fees0to2Full"
                                            name="fees0to2Full"
                                            value={formData.fees0to2Full}
                                            onChange={handleInputChange}
                                            placeholder="£950/month"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="fees0to2Part" className="block mb-2">Part-time</Label>
                                        <Input
                                            id="fees0to2Part"
                                            name="fees0to2Part"
                                            value={formData.fees0to2Part}
                                            onChange={handleInputChange}
                                            placeholder="£550/month"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2-3 years */}
                            <div>
                                <h4 className="font-medium mb-3 text-lg">2-3 years:</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="fees2to3Full" className="block mb-2">Full-time</Label>
                                        <Input
                                            id="fees2to3Full"
                                            name="fees2to3Full"
                                            value={formData.fees2to3Full}
                                            onChange={handleInputChange}
                                            placeholder="£875/month"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="fees2to3Part" className="block mb-2">Part-time</Label>
                                        <Input
                                            id="fees2to3Part"
                                            name="fees2to3Part"
                                            value={formData.fees2to3Part}
                                            onChange={handleInputChange}
                                            placeholder="£500/month"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3-5 years */}
                            <div>
                                <h4 className="font-medium mb-3 text-lg">3-5 years:</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="fees3to5Full" className="block mb-2">Full-time</Label>
                                        <Input
                                            id="fees3to5Full"
                                            name="fees3to5Full"
                                            value={formData.fees3to5Full}
                                            onChange={handleInputChange}
                                            placeholder="£825/month"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="fees3to5Part" className="block mb-2">Part-time</Label>
                                        <Input
                                            id="fees3to5Part"
                                            name="fees3to5Part"
                                            value={formData.fees3to5Part}
                                            onChange={handleInputChange}
                                            placeholder="£475/month"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location & Timing */}
                    <div>
                        <h3 className="text-2xl font-medium mb-4 text-foreground">Location & Opening Hours</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="address" className="block mb-2">Address *</Label>
                                <Input
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="123 High Street"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="city" className="block mb-2">City *</Label>
                                    <Input
                                        id="city"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder="London"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="postcode" className="block mb-2">Postcode *</Label>
                                    <Input
                                        id="postcode"
                                        name="postcode"
                                        value={formData.postcode}
                                        onChange={handleInputChange}
                                        placeholder="SW1A 1AA"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="openingTime" className="block mb-2">Opening Time *</Label>
                                    <Input
                                        id="openingTime"
                                        name="openingTime"
                                        type="time"
                                        value={formData.openingTime}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="closingTime" className="block mb-2">Closing Time *</Label>
                                    <Input
                                        id="closingTime"
                                        name="closingTime"
                                        type="time"
                                        value={formData.closingTime}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4 pt-6 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isLoading}
                        >
                            Save as Draft
                        </Button>
                        <Button
                            type="submit"
                            className="bg-secondary hover:bg-secondary/90"
                            disabled={isLoading}
                        >
                            {isLoading ? "Saving..." : "Save & Submit for Approval"}
                        </Button>
                    </div>

                </Card>
            </form>
            )}
        </div>
    );
};

export default NurseryProfile;
