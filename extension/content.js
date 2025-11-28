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

    // Helper to sleep
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Scroll to bottom to load all contacts
    let previousHeight = 0;
    let currentHeight = document.body.scrollHeight;
    let attempts = 0;
    const maxAttempts = 5; // Stop if height doesn't change after 5 tries

    while (attempts < maxAttempts) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(2000); // Wait for lazy load

        currentHeight = document.body.scrollHeight;
        if (currentHeight === previousHeight) {
            attempts++;
        } else {
            previousHeight = currentHeight;
            attempts = 0; // Reset attempts if we found more content
        }
        console.log(`Scrolling... Height: ${currentHeight}, Attempts: ${attempts}`);
    }

    console.log("Finished scrolling. Parsing cards...");

    const contacts = [];
    const cards = document.querySelectorAll('.mn-connection-card');

    console.log(`Found ${cards.length} cards.`);

    cards.forEach(card => {
        try {
            const nameElement = card.querySelector('.mn-connection-card__name');
            const headlineElement = card.querySelector('.mn-connection-card__occupation');
            const linkElement = card.querySelector('.mn-connection-card__link');
            const timeElement = card.querySelector('time');
            const imgElement = card.querySelector('.mn-connection-card__picture');

            if (nameElement && linkElement) {
                const name = nameElement.innerText.trim();
                const headline = headlineElement ? headlineElement.innerText.trim() : '';
                const profileUrl = linkElement.href;
                const connectedAt = timeElement ? timeElement.innerText.trim() : '';

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
