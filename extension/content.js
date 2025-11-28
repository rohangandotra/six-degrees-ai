// content.js
console.log("Sixth Degree Sync: Content script loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrapeConnections") {
        scrapeConnections().then(data => {
            sendResponse({ success: true, count: data.length, data: data });
        }).catch(err => {
            console.error("Scraping error:", err);
            sendResponse({ success: false, error: err.message });
        });
        return true; // Keep the message channel open for async response
    }
});

async function scrapeConnections() {
    console.log("Starting scrape...");

    // Auto-scroll to load more contacts (Basic implementation)
    // In a real robust version, we'd scroll until the end or a limit
    // For now, let's just scrape what's visible + a little scrolling

    const contacts = [];
    const cards = document.querySelectorAll('.mn-connection-card');

    console.log(`Found ${cards.length} cards initially.`);

    cards.forEach(card => {
        try {
            const nameElement = card.querySelector('.mn-connection-card__name');
            const headlineElement = card.querySelector('.mn-connection-card__occupation');
            const linkElement = card.querySelector('.mn-connection-card__link');
            const timeElement = card.querySelector('time');
            const imgElement = card.querySelector('.mn-connection-card__picture'); // Often an img or div with bg image

            if (nameElement && linkElement) {
                const name = nameElement.innerText.trim();
                const headline = headlineElement ? headlineElement.innerText.trim() : '';
                const profileUrl = linkElement.href;
                const connectedAt = timeElement ? timeElement.innerText.trim() : '';

                // Basic image extraction (LinkedIn uses lazy loading, so this might be a placeholder)
                let avatarUrl = '';
                if (imgElement) {
                    const img = imgElement.querySelector('img');
                    if (img) avatarUrl = img.src;
                }

                contacts.push({
                    name,
                    headline,
                    profileUrl,
                    connectedAt,
                    avatarUrl,
                    source: 'linkedin_extension'
                });
            }
        } catch (e) {
            console.warn("Error parsing card:", e);
        }
    });

    console.log(`Scraped ${contacts.length} contacts.`);
    return contacts;
}
