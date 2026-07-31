import { Facebook, Twitter, Youtube, Instagram, Mail, LocateIcon, Phone, LocationEdit, Linkedin } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      className="bg-cover bg-top bg-white bg-no-repeat w-full pt-16 sm:pt-20 md:pt-24 lg:pt-28"
      style={{
        backgroundImage: 'url(/images/footer.png)',
        width: '100%',
        minHeight: '60vh',
      }}
    >
      {/* Top padding clears the horizontal rule baked into footer.png — the
          columns used to start right on it, which made the first link in each
          one hard to read. */}
      <div className="max-w-7xl pt-10 sm:pt-16 md:pt-24 lg:pt-52 xl:pt-60 mx-auto px-4 md:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-white">

        <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1 pb-4">
          <img src="/images/footer-logo.png" alt="Logo" className="object-cover h-auto max-w-[120px] md:max-w-[150px]" />
          <p className="font-sans text-sm md:text-base text-white">Find, compare, and connect with nurseries near you.Because every great beginning starts with the right care.</p>
          <div className="flex gap-3 md:gap-4 mt-2 md:mt-4">
            <div className="rounded-full bg-black p-1.5 md:p-2">
              <Facebook className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="rounded-full bg-black p-1.5 md:p-2">
              <Linkedin className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="rounded-full bg-black p-1.5 md:p-2">
              <Youtube className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="rounded-full bg-black p-1.5 md:p-2">
              <Instagram className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </div>
        {/* Quick Links */}
        <div>
          <h3 className="text-lg md:text-xl lg:text-[22px] font-medium font-heading font-semibold mb-3 md:mb-4 text-white">Quick Links</h3>
          <ul className="space-y-1 md:space-y-2 leading-6 md:leading-8 text-sm md:text-base">
            <li><Link href="/" className="text-white hover:text-gray-300">Home</Link></li>
            <li><Link href="/about" className="text-white hover:text-gray-300">About</Link></li>
            <li><Link href="/nursery-group" className="text-white hover:text-gray-300">Group</Link></li>
            <li><Link href="/article" className="text-white hover:text-gray-300">Articles</Link></li>
            <li><Link href="/contact-us" className="text-white hover:text-gray-300">Contact Us</Link></li>
          </ul>
        </div>

        <div>
           <h3 className="text-lg md:text-xl lg:text-[22px] font-medium font-heading font-semibold mb-3 md:mb-4 text-white">Support</h3>
           <ul className="space-y-1 md:space-y-2 leading-6 md:leading-8 text-sm md:text-base">
             <li><Link href="/childcare" className="text-white hover:text-gray-300 hover:underline">Help With Childcare Costs</Link></li>
             <li><Link href="/claim" className="text-white hover:text-gray-300 hover:underline">Claim 6-Month Free Listing </Link></li>
             <li><Link href="/pricing" className="text-white hover:text-gray-300 hover:underline">Pricing/Subscription Page</Link></li>
             <li><Link href="/review" className="text-white hover:text-gray-300 hover:underline">Review</Link></li>
             <li><a href="mailto:support@my-nursery.co.uk" className="text-white hover:text-gray-300 hover:underline">support@my-nursery.co.uk</a></li>
           </ul>
         </div>
        {/* Get in Touch */}

        
        <div>
          <h3 className="text-lg md:text-xl lg:text-[22px] font-medium font-heading font-semibold mb-3 md:mb-4 text-white">Get In Touch</h3>
          <ul className="space-y-1 md:space-y-2 leading-6 md:leading-8 text-sm md:text-base">
            <li className='flex items-center gap-2 text-white'>
              <Mail className="w-4 h-4 md:w-5 md:h-5 mt-0.5" />
              <a href="mailto:hello@my-nursery.co.uk" className="break-all hover:text-gray-300 hover:underline">hello@my-nursery.co.uk</a></li>
            <li className='flex items-start gap-2 text-white'>
              <LocationEdit className="w-4 h-4 md:w-5 md:h-5 mt-1 shrink-0" />
              <span className='text-sm md:text-base'>Address – Shawbriggs, Barrow Road, Goxhill, North Lincolnshire, DN19 7LN</span></li>
            <li className='flex items-center gap-2 text-white'>
              <Phone className="w-4 h-4 md:w-5 md:h-5 mt-0.5" />
              <a href="tel:+441482688508" className="hover:text-gray-300 hover:underline">01482 688508</a></li>
          </ul>
        </div>

      </div>
      <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 border-t mt-6 md:mt-8 pt-3 md:pt-4 pb-4 md:pb-6 text-white max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <p className="text-xs md:text-sm lg:text-base text-center md:text-left">© 2025 My Nursery. All rights reserved.</p>
        <div className="flex flex-wrap justify-center md:justify-end gap-2 md:gap-3 lg:gap-4 text-xs md:text-sm lg:text-base">
          <Link href="/terms-condition" className="text-white hover:text-gray-300 hover:underline">Terms and Condition</Link>
          <span className="hidden md:inline">|</span>
          <Link href="/privacy-policy" className="text-white hover:text-gray-300 hover:underline">Privacy Policy</Link>
          <span className="hidden md:inline">|</span>
          <Link href="/cookie-policy" className="text-white hover:text-gray-300 hover:underline">Cookie Policy</Link>
        </div>
      </div>
    </footer>
  );
}