'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { authService } from '@/lib/api/auth'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { MapPin } from 'lucide-react'

const AccountsSetting = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postcode: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const userData = authService.getCurrentUser();
        if (userData) {
            setUser(userData);
            setFormData({
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: userData.email || '',
                phone: userData.phone || '',
                address: userData.address || '',
                city: '',
                postcode: ''
            });
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        // Format UK phone number as user types
        if (name === 'phone') {
            const cleaned = value.replace(/\D/g, '');
            let formatted = '';
            
            if (cleaned.startsWith('44')) {
                formatted = '+44';
                if (cleaned.length > 2) formatted += ' ' + cleaned.substring(2, 6);
                if (cleaned.length > 6) formatted += ' ' + cleaned.substring(6, 12);
            } else if (cleaned.startsWith('0')) {
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
    };

    const validateUKPhone = (phone: string) => {
        if (!phone) return true; // Phone is optional
        const cleaned = phone.replace(/\s/g, '');
        const ukPhoneRegex = /^(\+44[1-9]\d{9,10}|0[1-9]\d{9,10})$/;
        return ukPhoneRegex.test(cleaned);
    };

    // Parse address from nominatim API response object
    const parseAddress = (addressData: any) => {
        let address = '';
        let city = '';
        let postcode = '';

        // Extract address (combination of house_number and road)
        if (addressData.house_number && addressData.road) {
            address = `${addressData.house_number} ${addressData.road}`;
        } else if (addressData.road) {
            address = addressData.road;
        } else if (addressData.display_name) {
            // Fallback to first part of display_name if no road data
            const parts = addressData.display_name.split(',');
            address = parts[0] || '';
        }

        // Extract city (try multiple field names used by nominatim)
        city = addressData.city || addressData.town || addressData.suburb || '';

        // Extract postcode
        postcode = addressData.postcode || '';

        setFormData(prev => ({
            ...prev,
            address: address || prev.address,
            city: city || prev.city,
            postcode: postcode || prev.postcode
        }));
    };

    const getLocation = async () => {
        setLocationLoading(true);
        
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            setLocationLoading(false);
            return;
        }

        toast.info('Requesting location access...');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                        {
                            headers: {
                                'User-Agent': 'MathewNursery/1.0'
                            }
                        }
                    );
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch address');
                    }
                    
                    const data = await response.json();
                    
                    if (data.address || data.display_name) {
                        // Use the address object if available (has structured city, postcode)
                        if (data.address && (data.address.city || data.address.postcode)) {
                            parseAddress(data.address);
                        } else {
                            // Fallback: still try to parse if address object doesn't have necessary fields
                            parseAddress(data.address || { display_name: data.display_name });
                        }
                        toast.success('Location retrieved successfully!');
                    } else {
                        toast.warning('Could not retrieve address. Please enter manually.');
                    }
                } catch (err) {
                    console.error('Geocoding error:', err);
                    toast.error('Failed to retrieve address. Please enter manually.');
                } finally {
                    setLocationLoading(false);
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                let errorMessage = 'Unable to access location. ';
                
                switch(err.code) {
                    case err.PERMISSION_DENIED:
                        errorMessage += 'Please allow location access in your browser settings.';
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information is unavailable.';
                        break;
                    case err.TIMEOUT:
                        errorMessage += 'Location request timed out.';
                        break;
                    default:
                        errorMessage += 'Please enter address manually.';
                }
                
                toast.error(errorMessage);
                setLocationLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData({
            ...passwordData,
            [e.target.name]: e.target.value
        });
    };

    const handleSaveProfile = async () => {
        try {
            // Validate UK phone if provided
            if (formData.phone && !validateUKPhone(formData.phone)) {
                toast.error('Please enter a valid UK phone number (e.g., +44 7123 456789 or 07123 456789)');
                return;
            }

            setLoading(true);
            const response = await authService.updateProfile({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                address: formData.address
            });

            if (response.success && response.data) {
                // Update local storage and state
                const updatedUser = { ...user, ...formData };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                setIsEditingProfile(false);
                toast.success('Profile updated successfully!');
            }
        } catch (error: any) {
            console.error('Profile update error:', error);
            toast.error(error?.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword) {
            toast.error('Please fill in all password fields');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters');
            return;
        }

        try {
            setLoading(true);
            const response = await authService.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            if (response.success) {
                toast.success('Password changed successfully!');
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            }
        } catch (error: any) {
            console.error('Password change error:', error);
            toast.error(error?.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setDeleteLoading(true);
            const response = await apiClient.delete('/auth/delete-account', true);

            if (response.success) {
                toast.success('Account deleted successfully');
                authService.logout();
            }
        } catch (error: any) {
            console.error('Delete account error:', error);
            toast.error(error?.response?.data?.message || 'Failed to delete account');
        } finally {
            setDeleteLoading(false);
            setShowDeleteModal(false);
        }
    };

    return (
        <>
            <div>

                <h2 className='text-secondary font-medium text-[48px] font-heading'><span className='text-foreground'>ACCOUNTS </span>SETTING</h2>
                <p className="text-muted-foreground">
                    Manage your personal information and preferences
                </p>

                <div className='flex flex-col gap-2 mt-4'>
                    <div className='bg-white rounded-md p-4'>
                        <div className='flex justify-between items-center mb-4'>
                            <h2 className='font-sans text-[22px] font-semibold'>Profile Information</h2>
                            {!isEditingProfile ? (
                                <Button onClick={() => setIsEditingProfile(true)} variant="outline" className='px-4 py-2'>
                                    Edit
                                </Button>
                            ) : (
                                <Button onClick={() => {
                                    setIsEditingProfile(false);
                                    // Reset form data to original user data
                                    setFormData({
                                        firstName: user?.firstName || '',
                                        lastName: user?.lastName || '',
                                        email: user?.email || '',
                                        phone: user?.phone || '',
                                        address: user?.address || '',
                                        city: '',
                                        postcode: ''
                                    });
                                }} variant="outline" className='px-4 py-2'>
                                    Cancel
                                </Button>
                            )}
                        </div>
                        <div className="space-y-4">
                            {/* First Name */}
                            <div className="flex flex-col">
                                <label
                                    htmlFor="firstName"
                                    className="mb-1 text-[16px] font-medium font-sans text-foreground"
                                >
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="Enter your first name"
                                    disabled={!isEditingProfile}
                                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Last Name */}
                            <div className="flex flex-col">
                                <label
                                    htmlFor="lastName"
                                    className="mb-1 text-[16px] font-medium font-sans text-foreground"
                                >
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Enter your last name"
                                    disabled={!isEditingProfile}
                                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Email */}
                            <div className="flex flex-col">
                                <label
                                    htmlFor="email"
                                    className="mb-1 text-[16px] font-medium font-sans text-foreground"
                                >
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    disabled={!isEditingProfile}
                                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Phone */}
                            <div className="flex flex-col">
                                <label
                                    htmlFor="phone"
                                    className="mb-1 text-[16px] font-medium font-sans text-foreground"
                                >
                                    Phone (UK Only)
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+44 7123 456789 or 07123 456789"
                                    disabled={!isEditingProfile}
                                    maxLength={17}
                                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Address */}
                            <div className="flex flex-col">
                                <label
                                    htmlFor="address"
                                    className="mb-1 text-[16px] font-medium font-sans text-foreground"
                                >
                                    Address
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Enter your address or use location"
                                        disabled={!isEditingProfile}
                                        className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 pr-10 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                                    />
                                    {isEditingProfile && (
                                        <button
                                            type="button"
                                            onClick={getLocation}
                                            disabled={locationLoading}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                                            title="Get current location"
                                        >
                                            <MapPin className={`h-5 w-5 text-secondary ${locationLoading ? 'animate-pulse' : ''}`} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* City */}
                            <div className="flex flex-col">
                                <label
                                    htmlFor="city"
                                    className="mb-1 text-[16px] font-medium font-sans text-foreground"
                                >
                                    City
                                </label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="Enter your city"
                                    disabled={!isEditingProfile}
                                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Postcode */}
                            <div className="flex flex-col">
                                <label
                                    htmlFor="postcode"
                                    className="mb-1 text-[16px] font-medium font-sans text-foreground"
                                >
                                    Postcode
                                </label>
                                <input
                                    type="text"
                                    id="postcode"
                                    name="postcode"
                                    value={formData.postcode}
                                    onChange={handleChange}
                                    placeholder="Enter your postcode"
                                    disabled={!isEditingProfile}
                                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                            {isEditingProfile && (
                                <div>
                                    <Button onClick={handleSaveProfile} disabled={loading} className='bg-secondary px-4 py-2'>
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            )}
                        </div>

                    </div>
                    <div className='bg-white rounded-md p-4'>
                        <h2 className='font-sans text-[22px] font-semibold'>Password & Security</h2>
                        <div className="space-y-4 mt-4">
                            {/* Current Password */}
                            <div className="flex flex-col">
                                <label
                                    htmlFor="currentPassword"
                                    className="mb-1 text-[16px] font-medium font-sans text-foreground"
                                >
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    name="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Enter your current password"
                                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                                />
                            </div>

                            {/* New Password */}
                            <div className="flex flex-col">
                                <label
                                    htmlFor="newPassword"
                                    className="mb-1 text-[16px] font-medium font-sans text-foreground"
                                >
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Enter your new password (min 6 characters)"
                                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                                />
                            </div>

                            {/* Confirm New Password */}
                            <div className="flex flex-col">
                                <label
                                    htmlFor="confirmPassword"
                                    className="mb-1 text-[16px] font-medium font-sans text-foreground"
                                >
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={handlePasswordChange}
                                    placeholder="Confirm your new password"
                                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                                />
                            </div>
                            <div>
                                <Button onClick={handleChangePassword} disabled={loading} className='bg-secondary px-4 py-2'>
                                    {loading ? 'Changing...' : 'Change Password'}
                                </Button>
                            </div>
                        </div>

                    </div>

                    <div className='bg-white rounded-md p-4'>
                        <h2 className='font-sans text-[22px] font-semibold'>Preferences</h2>
                        <div className='py-4 flex flex-col gap-4'>
                            <div className='flex justify-between'>
                                <div>
                                    <h2 className='font-sans text-[18px] font-normal'>Email Notifications</h2>
                                    <p className='font-sans text-[12px] text-gray-400'>Receive updates about your activity</p>
                                </div>
                                <input type="checkbox" className='pr-6' />
                            </div>

                            <Separator />
                            <div className='flex justify-between'>
                                <div>
                                    <h2 className='font-sans text-[18px] font-normal'>Newsletter</h2>
                                    <p className='font-sans text-[12px] text-gray-400'>Subscribe to our weekly newsletter</p>
                                </div>
                                <input type="checkbox" className='pr-6' />
                            </div>
                        </div>
                    </div>
                    <div className='bg-white flex flex-col gap-4 rounded-md p-4'>
                        <h2 className='font-sans text-[18px] text-red-500 font-normal'>Delete Account</h2>
                        <p className='font-sans text-[14px] text-gray-400'>Once you delete your account, there is no going back. Please be certain.</p>
                         <div>
                         <Button onClick={() => setShowDeleteModal(true)} className='bg-red-500 hover:bg-red-600 text-white font-sans rounded-md'>Delete Account</Button>
                         </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Delete Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete your account? This action cannot be undone. All your reviews, saved nurseries, and personal data will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteLoading}>
                            {deleteLoading ? 'Deleting...' : 'Delete Account'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default AccountsSetting
