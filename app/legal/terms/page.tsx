import React from 'react'

export default function TermsPage() {
    return (
        <div className="container mx-auto py-10 px-4 max-w-3xl">
            <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

            <div className="space-y-6 text-foreground">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
                    <p>By accessing and using Six Degrees AI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Description of Service</h2>
                    <p>Six Degrees AI provides a professional network search and analysis platform. We allow users to upload, manage, and search their professional contacts using AI-powered tools.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. User Responsibilities</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                        <li>You agree to only upload data that you have the right to use and share.</li>
                        <li>You will not use the Service for any illegal or unauthorized purpose.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Data Ownership & Privacy</h2>
                    <p>You retain all rights to the data you upload. By using the Service, you grant us a license to process this data solely for the purpose of providing the Service to you. See our Privacy Policy for details.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Termination</h2>
                    <p>We reserve the right to terminate or suspend your account at any time for violations of these terms.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">6. Disclaimer of Warranties</h2>
                    <p>The Service is provided "as is" without warranties of any kind, whether express or implied.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">7. Contact Us</h2>
                    <p>If you have any questions about these Terms, please contact us at support@sixdegrees.ai.</p>
                </section>
            </div>
        </div>
    )
}
