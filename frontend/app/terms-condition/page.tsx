import Footer from "@/components/landing-page/footer";
import Header from "@/components/landing-page/header";
import MiniNav from "@/components/landing-page/little-nav";
import TermsAndConditions from "@/components/landing-page/terms-condition";

export default function page() {
  return (
    <>
     <MiniNav/>
     <Header/>
     <TermsAndConditions/>
     <div className="bg-white py-20">
    <div className="px-24 max-sm:px-8 mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Terms & Conditions</h1>

      <section className="space-y-3">
        <h2 className="text-[40px] font-medium">Introduction</h2>
        <p>
          Welcome to [Your Nursery Name]. By accessing or using our website, you agree to comply
          with these Terms & Conditions. Please read them carefully.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-[40px] font-medium">1. Acceptance of Terms</h2>
        <p>
          By using our website, you agree to these terms. If you do not agree, please do not use
          our website.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-[40px] font-medium">2. Use of Website</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>You may browse, read content, and submit enquiries or reviews.</li>
          <li>You must not use the website for illegal activities or spam.</li>
          <li>All content is for personal use only.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[40px] font-medium">3. Accounts & Reviews</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Creating an account or submitting a review constitutes agreement to our Terms.</li>
          <li>You are responsible for maintaining your account security.</li>
          <li>Reviews must be honest and respectful; offensive content will be removed.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[40px] font-medium">4. Intellectual Property</h2>
        <p>
          All content, images, and media on the website are owned by [Your Nursery Name] or
          licensed to us. Do not copy, reproduce, or distribute content without permission.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-[40px] font-medium">5. Liability</h2>
        <p>
          We strive to provide accurate information, but we are not liable for any errors,
          omissions, or decisions made based on website content.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-[40px] font-medium">6. Governing Law</h2>
        <p>These terms are governed by the laws of [Your Country/Region].</p>
      </section>

      <section className="space-y-3 pb-10">
        <h2 className="text-[40px] font-medium">7. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the website constitutes
          acceptance of changes.
        </p>
      </section>
    </div>
    </div>
    <Footer/>
    </>
  );
}