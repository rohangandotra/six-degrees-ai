import React from 'react'

export default function PrivacyPage() {
    return (
        <div className="container mx-auto py-10 px-4 max-w-3xl">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

            <div className="space-y-6 text-foreground">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
                    <p>We collect information you provide directly to us, including:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li><strong>Account Information:</strong> Name, email address, password.</li>
                        <li><strong>Profile Information:</strong> Professional role, company, industry, location.</li>
                        <li><strong>Contact Data:</strong> Information about your professional contacts that you upload (e.g., via CSV).</li>
                        <li><strong>Usage Data:</strong> How you interact with our Service (via cookies and analytics).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
                    <p>We use your information to:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>Provide, maintain, and improve the Service.</li>
                        <li>Process your search queries and generate AI insights.</li>
                        <li>Send you technical notices and support messages.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. Data Sharing</h2>
                    <p>We do not sell your personal data. We may share data with third-party service providers (e.g., database hosting, AI providers) solely to operate the Service.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Your Rights (GDPR/CCPA)</h2>
                    <p>Depending on your location, you may have the right to:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>Access the personal data we hold about you.</li>
                        <li>Request deletion of your personal data.</li>
                        <li>Object to processing of your data.</li>
                        <li>Export your data in a portable format.</li>
                    </ul>
                    <p className="mt-2">You can exercise these rights via your Account Settings.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Cookies</h2>
                    <p>We use cookies to authenticate users and analyze service usage. You can control cookie preferences via your browser settings.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">6. Contact Us</h2>
                    <p>If you have questions about this Privacy Policy, please contact us at privacy@sixdegrees.ai.</p>
                </section>
            </div>
        </div>
    )
}
