import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ - Funding the Commons Residency 2024",
  description: "Frequently asked questions about the Funding the Commons Residency 2024 program",
};

export default function FundingCommonsResidencyFAQPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <nav className="text-sm breadcrumbs mb-4">
          <Link href="/events/funding-commons-residency-2024" className="text-blue-600 hover:text-blue-800">
            ← Back to Funding the Commons Residency 2024
          </Link>
        </nav>
        
        <h1 className="text-4xl font-bold mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Funding the Commons Residency 2024
        </p>
      </div>

      <div className="space-y-8">
        {/* Application Process */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 border-b-2 border-blue-500 pb-2">
            Application Process
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Why am I being asked for additional information?</h3>
              <p className="text-gray-700">
                The application process has been evolving, and some fields may have been missing from the original application form. We apologize for any inconvenience and thank you for your patience in processing your application. This helps us ensure we have all the necessary information to properly evaluate your application.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">What happens after I submit my application?</h3>
              <p className="text-gray-700">
                After submission, our team will review your application. If any required information is missing, we&rsquo;ll reach out via email with specific details about what needs to be completed. Once all information is provided, your application will proceed to the full evaluation process.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">How long does the review process take?</h3>
              <p className="text-gray-700">
                The review process typically takes 2-3 weeks from the time we receive your complete application. We&rsquo;ll keep you updated throughout the process and notify you of our decision as soon as possible.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Can I edit my application after submission?</h3>
              <p className="text-gray-700">
                Yes, if we request additional information, you&rsquo;ll receive an email with a link to update your application. You can also contact us if you need to make changes to your submitted application.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">When will I know the outcome of my application?</h3>
              <p className="text-gray-700">
                We operate on a rolling admissions basis, which means we review and make decisions on applications continuously rather than waiting for all submissions to close. This allows us to notify successful applicants sooner and provide more personalized attention to each application. We&rsquo;re releasing decisions in waves, with more applicants being notified each passing week. We expect to have all applicants notified of their status by <strong>September 14th, 2025</strong>. If you haven&rsquo;t heard from us by then, please don&rsquo;t hesitate to reach out for an update.
              </p>
            </div>
          </div>
        </section>

        {/* Program Details */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 border-b-2 border-blue-500 pb-2">
            Program Details
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">What is the Funding the Commons Residency?</h3>
              <p className="text-gray-700">
                The Funding the Commons Residency is an intensive program designed to bring together innovative thinkers, builders, and researchers working on public goods funding mechanisms. Residents will collaborate on cutting-edge projects while being supported by mentors and industry leaders.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">How long is the residency program?</h3>
              <p className="text-gray-700">
                The residency program duration varies depending on the specific track and project requirements. Typical residencies range from 3-6 months, with some flexibility based on project needs and resident availability.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Is the residency remote or in-person?</h3>
              <p className="text-gray-700">
                The 2024 residency offers both remote and in-person components. Some activities and workshops may be conducted in-person, while day-to-day work can often be done remotely. Specific requirements will be discussed during the application process.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">What kind of support do residents receive?</h3>
              <p className="text-gray-700">
                Residents receive mentorship from industry experts, access to funding opportunities, technical resources, community support, and potential stipends depending on the specific program track and funding availability.
              </p>
            </div>
          </div>
        </section>

        {/* Eligibility & Requirements */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 border-b-2 border-blue-500 pb-2">
            Eligibility & Requirements
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Who is eligible to apply?</h3>
              <p className="text-gray-700">
                We welcome applications from researchers, developers, entrepreneurs, and innovators working on or interested in public goods funding mechanisms. Both individuals and teams may apply, regardless of their current stage of development.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Do I need prior experience in public goods funding?</h3>
              <p className="text-gray-700">
                While experience in public goods funding is valuable, it&rsquo;s not strictly required. We&rsquo;re looking for passionate individuals with relevant skills and a strong interest in contributing to the public goods ecosystem.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Can international applicants participate?</h3>
              <p className="text-gray-700">
                Yes, we welcome international applicants. However, please note that visa requirements, tax implications, and logistics for in-person components may vary depending on your location and the specific program requirements.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Do I need a visa to participate?</h3>
              <p className="text-gray-700">
                Visa requirements depend on your nationality, current location, and the specific components of the program you&rsquo;ll be participating in. If you require a visa support letter for your application to immigration authorities, please reach out to us at{" "}
                <a href="mailto:james@fundingthecommons.io" className="text-blue-600 hover:text-blue-800 underline">
                  james@fundingthecommons.io
                </a>
                {" "}with your program details, and we&rsquo;ll be happy to provide the necessary documentation to support your visa application.
              </p>
            </div>
          </div>
        </section>

        {/* Contact & Support */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 border-b-2 border-blue-500 pb-2">
            Contact & Support
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">How can I get help with my application?</h3>
              <p className="text-gray-700">
                If you need assistance with your application or have questions not covered in this FAQ, please reach out to our team. We&rsquo;re here to help ensure you can complete your application successfully.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">I didn&rsquo;t receive the email requesting additional information. What should I do?</h3>
              <p className="text-gray-700">
                First, please check your spam/junk folder. If you still can&rsquo;t find the email, contact our support team with your application details, and we&rsquo;ll resend the information or provide alternative ways to complete your application.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Who can I contact for more information?</h3>
              <p className="text-gray-700">
                For additional questions about the program, application process, or technical issues, please contact the Funding the Commons team. We aim to respond to all inquiries within 1-2 business days.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Back to Event Link */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <Link 
          href="/events/funding-commons-residency-2024"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Funding the Commons Residency 2024
        </Link>
      </div>
    </div>
  );
}