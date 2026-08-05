import React from 'react';

export default function PrivacyNotice() {
  return (
    <div className="prose prose-sm md:prose-base max-w-none text-slate-700 font-sans">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase mb-1">PRIVACY POLICY</h1>
      <p className="text-xs sm:text-sm text-slate-500 font-semibold mb-8">
        Last updated: July 17, 2026
      </p>

      <div className="space-y-8">
        <section>
          <p className="mb-4">Welcome to TripDM ("TripDM", "we", "our", or "us").</p>
          <p className="mb-4">
            TripDM is an online marketplace that connects travelers with independent travel agents and travel service providers through a direct messaging platform.
          </p>
          <p className="mb-4">
            Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, store, and protect your personal information when you access or use our website, mobile application, or related services (collectively, the "Platform").
          </p>
          <p className="font-medium text-gray-900">
            By accessing or using TripDM, you acknowledge that you have read and understood this Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Scope of this Policy</h2>
          <p className="mb-2 font-medium text-gray-900">This Privacy Policy applies to:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Website visitors</li>
            <li>Registered users</li>
            <li>Travelers</li>
            <li>Travel agents</li>
            <li>Tour operators</li>
            <li>Business partners using TripDM services</li>
          </ul>
          <p>
            This Privacy Policy applies only to information collected through TripDM and does not apply to third-party websites or services that may be linked from our Platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
          <p className="mb-6">To provide our services, we collect different types of information.</p>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">2.1 Personal Information</h3>
          <p className="mb-2 font-medium text-gray-900">Depending on how you use TripDM, we may collect:</p>
          <ul className="list-disc pl-5 mb-6 space-y-1 grid grid-cols-1 sm:grid-cols-2">
            <li>Full Name</li>
            <li>Email Address</li>
            <li>Mobile Number</li>
            <li>Profile Photograph</li>
            <li>Gender (optional)</li>
            <li>Date of Birth (optional)</li>
            <li>City</li>
            <li>State</li>
            <li>Country</li>
            <li>Postal Code</li>
            <li>Preferred Language</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-900 mb-2">2.2 Travel Information</h3>
          <p className="mb-2 font-medium text-gray-900">When searching or communicating with travel agents, you may voluntarily provide:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1 grid grid-cols-1 sm:grid-cols-2">
            <li>Destination</li>
            <li>Departure City</li>
            <li>Travel Dates</li>
            <li>Number of Travelers</li>
            <li>Budget</li>
            <li>Travel Preferences</li>
            <li>Hotel Preferences</li>
            <li>Transportation Requirements</li>
            <li>Special Requests</li>
          </ul>
          <p className="mb-6">This information is shared only as necessary to facilitate your inquiry with the selected travel agent.</p>

          <h3 className="text-lg font-bold text-gray-900 mb-2">2.3 Vendor Information</h3>
          <p className="mb-2 font-medium text-gray-900">Travel agents registering on TripDM may be required to provide:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1 grid grid-cols-1 sm:grid-cols-2">
            <li>Company Name</li>
            <li>Business Registration Number</li>
            <li>GST Number (if applicable)</li>
            <li>PAN Number (if required)</li>
            <li>Office Address</li>
            <li>Business Email</li>
            <li>Business Phone Number</li>
            <li>Website</li>
            <li>Company Logo</li>
            <li>Bank Details (where applicable)</li>
            <li>Government-issued identification (for verification, if required)</li>
          </ul>
          <p className="mb-6">TripDM may request additional documentation to verify a vendor's identity or business.</p>

          <h3 className="text-lg font-bold text-gray-900 mb-2">2.4 Account Information</h3>
          <p className="mb-2 font-medium text-gray-900">When creating an account, we may collect:</p>
          <ul className="list-disc pl-5 mb-6 space-y-1">
            <li>Username</li>
            <li>Password (stored securely using industry-standard hashing techniques)</li>
            <li>Login History</li>
            <li>Device Information</li>
            <li>Account Preferences</li>
          </ul>

          <h3 className="text-lg font-bold text-gray-900 mb-2">2.5 Communication Information</h3>
          <p className="mb-2 font-medium text-gray-900">If you use TripDM's messaging features, we may process:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Messages exchanged through the Platform</li>
            <li>Time and date of communications</li>
            <li>Attachments shared through the Platform</li>
            <li>Customer support inquiries</li>
          </ul>
          <p className="mb-6">We may access message content only where necessary for platform operations, fraud prevention, legal compliance, or when investigating reported misuse.</p>

          <h3 className="text-lg font-bold text-gray-900 mb-2">2.6 Payment Information</h3>
          <p className="mb-4">
            TripDM does not collect, process, receive, or facilitate payments between Travelers and Vendors through the Platform.
          </p>
          <p className="mb-4">
            All payments for travel packages, bookings, accommodations, transportation, or any other travel-related services are made directly between the Traveler and the Vendor using payment methods mutually agreed upon by them.
          </p>
          <p className="mb-2 font-medium text-gray-900">As TripDM is not involved in the payment process:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>We do not collect or store debit card, credit card, UPI, bank account, wallet, or other payment credentials of Travelers.</li>
            <li>We do not process, authorize, or settle payments on behalf of Vendors.</li>
            <li>We do not issue invoices or receipts for transactions between Travelers and Vendors.</li>
            <li>We do not hold customer funds in escrow or act as an intermediary for payments.</li>
          </ul>
          <p className="mb-4">
            TripDM may collect limited information related to vendor subscriptions or lead credit purchases (if applicable), such as payment confirmation, invoice details, transaction references, or billing information, solely for managing the Vendor's TripDM account and complying with applicable legal or tax obligations.
          </p>
          <p className="mb-6 font-medium text-gray-900">
            Travelers are advised to verify the Vendor's identity, payment details, and terms before making any payment. Any payment dispute, refund request, chargeback, or financial claim arising from a transaction between a Traveler and a Vendor is solely between those parties and is governed by their agreement. TripDM is not responsible for such transactions or disputes.
          </p>

          <h3 className="text-lg font-bold text-gray-900 mb-2">2.7 Automatically Collected Information</h3>
          <p className="mb-2 font-medium text-gray-900">When you use TripDM, we may automatically collect:</p>
          <ul className="list-disc pl-5 space-y-1 grid grid-cols-1 sm:grid-cols-2">
            <li>IP Address</li>
            <li>Browser Type</li>
            <li>Device Type</li>
            <li>Device Identifier</li>
            <li>Operating System</li>
            <li>Screen Resolution</li>
            <li>Language Settings</li>
            <li>Referring Website</li>
            <li>Pages Visited</li>
            <li>Search History</li>
            <li>Clickstream Data</li>
            <li>Time Spent on Pages</li>
            <li>Session Duration</li>
            <li>Crash Reports</li>
            <li>Error Logs</li>
            <li>Approximate Geographic Location (derived from IP or device settings, where permitted)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
          <p className="mb-2 font-medium text-gray-900">We use personal information to:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1 grid grid-cols-1 sm:grid-cols-2">
            <li>Create and manage your account.</li>
            <li>Connect travelers with travel agents.</li>
            <li>Enable messaging between users and vendors.</li>
            <li>Provide customer support.</li>
            <li>Improve our Platform and services.</li>
            <li>Personalize search results and recommendations.</li>
            <li>Detect fraud and suspicious activity.</li>
            <li>Protect users and the Platform.</li>
            <li>Process transactions (where applicable).</li>
            <li>Send service-related communications.</li>
            <li>Comply with legal obligations.</li>
            <li>Analyze platform performance and usage trends.</li>
          </ul>
          <p>
            We will only use your information for purposes compatible with those described in this Privacy Policy or as otherwise permitted by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cookies and Tracking Technologies</h2>
          <p className="mb-6">TripDM uses cookies and similar technologies to improve functionality and user experience.</p>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">Types of Cookies</h3>
          
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-900 mb-1">Essential Cookies</p>
              <p className="mb-1 text-sm">These cookies are required for user authentication, secure login, session management, fraud prevention, and website security.</p>
              <p className="text-sm italic">These cookies cannot be disabled through the Platform because they are necessary for basic functionality.</p>
            </div>
            
            <div>
              <p className="font-semibold text-gray-900 mb-1">Functional Cookies</p>
              <p className="text-sm">These help remember preferred language, recently viewed destinations, login preferences, search filters, and display settings.</p>
            </div>
            
            <div>
              <p className="font-semibold text-gray-900 mb-1">Analytics Cookies</p>
              <p className="mb-1 text-sm">Used to understand visitor behavior, popular destinations, website performance, feature usage, and platform improvements.</p>
              <p className="text-sm italic">Analytics data is generally aggregated and does not directly identify individual users.</p>
            </div>
            
            <div>
              <p className="font-semibold text-gray-900 mb-1">Marketing Cookies</p>
              <p className="text-sm">Where applicable and subject to your choices, marketing cookies may be used to display relevant advertisements, measure advertising effectiveness, limit repetitive advertisements, and support remarketing campaigns.</p>
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2 mt-6">Managing Cookies</h3>
          <p>You can manage or disable cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of TripDM.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. How We Share Information</h2>
          <p className="mb-4 font-medium text-gray-900">TripDM does not sell personal information.</p>
          
          <p className="font-semibold text-gray-900 mb-1">Travel Agents</p>
          <p className="mb-4 text-sm">To facilitate inquiries and communication initiated by you.</p>
          
          <p className="font-semibold text-gray-900 mb-1">Service Providers</p>
          <p className="mb-1 text-sm">Such as cloud hosting providers, analytics providers, customer support tools, email service providers, payment processors, SMS or OTP providers.</p>
          <p className="mb-4 text-sm italic">These providers process information only on our behalf and under contractual obligations.</p>
          
          <p className="font-semibold text-gray-900 mb-1">Legal Authorities</p>
          <p className="mb-4 text-sm">We may disclose information where required by law, court order, to comply with legal obligations, protect TripDM, our users, or the public, or to investigate fraud or misuse.</p>
          
          <p className="font-semibold text-gray-900 mb-1">Business Transfers</p>
          <p className="text-sm">If TripDM undergoes a merger, acquisition, restructuring, or sale of assets, personal information may be transferred as part of that transaction, subject to applicable law.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
          <p className="mb-2 font-medium text-gray-900">We retain information only for as long as necessary to:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Operate the Platform.</li>
            <li>Fulfill contractual obligations.</li>
            <li>Resolve disputes.</li>
            <li>Prevent fraud.</li>
            <li>Comply with legal, accounting, and regulatory requirements.</li>
          </ul>
          <p className="mb-4">Retention periods may vary depending on the nature of the information and applicable laws.</p>
          <p>When information is no longer required, we will delete or anonymize it where reasonably practicable.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Security</h2>
          <p className="mb-2 font-medium text-gray-900">TripDM uses reasonable technical and organizational measures to protect personal information, including:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1 grid grid-cols-1 sm:grid-cols-2">
            <li>HTTPS encryption</li>
            <li>Password hashing</li>
            <li>Firewalls</li>
            <li>Access controls</li>
            <li>Secure servers</li>
            <li>Monitoring and logging</li>
            <li>Periodic security updates</li>
            <li>Backup procedures</li>
          </ul>
          <p>
            Despite these measures, no method of transmission over the internet or electronic storage is completely secure. Users should also take appropriate precautions, such as safeguarding account credentials.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. User Rights</h2>
          <p className="mb-2 font-medium text-gray-900">Subject to applicable law, users may have the right to:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1">
            <li>Access personal information we hold.</li>
            <li>Correct inaccurate or incomplete information.</li>
            <li>Request deletion of personal information.</li>
            <li>Withdraw consent where processing is based on consent.</li>
            <li>Object to certain processing activities.</li>
            <li>Request restriction of processing in certain circumstances.</li>
            <li>Request a copy of personal information in a portable format, where applicable.</li>
          </ul>
          <p>Requests may be subject to identity verification and legal limitations.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Account Deletion</h2>
          <p className="mb-4">Users may request deletion of their TripDM account by contacting us or using any available account management tools.</p>
          <p className="font-semibold text-gray-900 mb-2">Please note:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Some information may be retained where required by law or for legitimate business purposes, such as fraud prevention or dispute resolution.</li>
            <li>Messages or transaction records may be retained where necessary to maintain the integrity of platform records.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
          <p className="mb-3">
            TripDM is intended for individuals who are at least 18 years of age or the age of majority in their jurisdiction. We do not knowingly collect personal information from children.
          </p>
          <p className="mb-3">
            If we become aware that personal information has been collected from a child without appropriate authorization where required, we will take reasonable steps to delete that information.
          </p>
          <p>
            Parents or guardians who believe their child has provided information to TripDM should contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11. International Data Transfers</h2>
          <p className="mb-3">TripDM may use service providers located in different countries. As a result, personal information may be processed or stored outside your country of residence.</p>
          <p className="mb-3">Where required by applicable law, we will take appropriate safeguards to protect personal information transferred internationally.</p>
          <p>By using TripDM, you acknowledge that your information may be processed in jurisdictions with data protection laws that differ from those in your country.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Third-Party Links</h2>
          <p className="mb-3">TripDM may contain links to third-party websites, payment providers, or social media platforms.</p>
          <p className="mb-3">We are not responsible for the privacy practices, security, or content of third-party websites.</p>
          <p>Users should review the privacy policies of those third parties before providing personal information.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to this Privacy Policy</h2>
          <p className="mb-3">TripDM may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or business operations.</p>
          <p className="mb-3">The updated version will be published on our Platform with the revised "Last Updated" date.</p>
          <p>Continued use of the Platform after changes become effective constitutes acceptance of the updated Privacy Policy.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Us</h2>
          <p className="mb-3">If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact:</p>
          <ul className="list-disc pl-5 mb-4 space-y-1 font-semibold text-gray-900">
            <li>Email: privacy@tripdm.com</li>
            <li>Support: support@tripdm.com</li>
            <li>Website: www.tripdm.com</li>
            <li>Business Address: L-2808, Rustomjee Azzaino, Thane, 400601</li>
          </ul>
          <p className="text-sm text-gray-500 italic mt-4">
            If your jurisdiction requires the appointment of a Grievance Officer or Data Protection Contact, their details will be made available on the Platform.
          </p>
        </section>

        <section className="mt-10 pt-6 border-t border-slate-100">
          <p className="text-sm sm:text-[14.5px] text-slate-600 font-medium leading-relaxed">
            By using TripDM, you acknowledge that you have read, understood, and agreed to this Privacy Policy.
          </p>
        </section>
      </div>
    </div>
  );
}
