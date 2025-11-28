document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveKeyBtn = document.getElementById('saveKeyBtn');
    const syncBtn = document.getElementById('syncBtn');
    const resetKeyBtn = document.getElementById('resetKeyBtn');
    const setupSection = document.getElementById('setup-section');
    const syncSection = document.getElementById('sync-section');
    const statusText = document.getElementById('statusText');

    // Load saved key
    chrome.storage.local.get(['sixthDegreeApiKey'], (result) => {
        if (result.sixthDegreeApiKey) {
            showSyncUI();
        }
    });

    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            chrome.storage.local.set({ sixthDegreeApiKey: key }, () => {
                showSyncUI();
                statusText.textContent = "Key saved! Ready to sync.";
            });
        }
    });

    resetKeyBtn.addEventListener('click', () => {
        chrome.storage.local.remove('sixthDegreeApiKey', () => {
            showSetupUI();
        });
    });

    syncBtn.addEventListener('click', async () => {
        statusText.textContent = "Syncing... Please wait.";
        syncBtn.disabled = true;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab.url.includes('linkedin.com/mynetwork/invite-connect/connections')) {
                statusText.textContent = "Please go to the LinkedIn Connections page first.";
                syncBtn.disabled = false;
                return;
            }

            // Send message to content script
            chrome.tabs.sendMessage(tab.id, { action: "scrapeConnections" }, async (response) => {
                if (chrome.runtime.lastError) {
                    statusText.textContent = "Error: Please refresh the LinkedIn page and try again.";
                    syncBtn.disabled = false;
                    return;
                }

                if (response && response.success) {
                    statusText.textContent = `Found ${response.count} contacts. Uploading...`;

                    // Upload to Sixth Degree API
                    await uploadContacts(response.data);
                } else {
                    statusText.textContent = "Failed to scrape contacts. " + (response?.error || '');
                    syncBtn.disabled = false;
                }
            });
        } catch (err) {
            console.error(err);
            statusText.textContent = "An error occurred.";
            syncBtn.disabled = false;
        }
    });

    function showSyncUI() {
        setupSection.classList.add('hidden');
        syncSection.classList.remove('hidden');
    }

    function showSetupUI() {
        setupSection.classList.remove('hidden');
        syncSection.classList.add('hidden');
        apiKeyInput.value = '';
    }

    async function uploadContacts(contacts) {
        chrome.storage.local.get(['sixthDegreeApiKey'], async (result) => {
            const apiKey = result.sixthDegreeApiKey;

            // Determine API URL (Localhost for dev, Production for release)
            // For now, let's default to production but allow override? 
            // Or just try production.
            const API_URL = "https://sixthdegree.app/api/contacts/sync";
            // const API_URL = "http://localhost:3000/api/contacts/sync"; // DEV MODE

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey
                    },
                    body: JSON.stringify({ contacts })
                });

                const data = await res.json();

                if (res.ok) {
                    statusText.textContent = `Success! Synced ${data.count} contacts.`;
                } else {
                    statusText.textContent = `Upload failed: ${data.error || res.statusText}`;
                }
            } catch (err) {
                statusText.textContent = "Network error. Check your internet.";
            } finally {
                syncBtn.disabled = false;
            }
        });
    }
});
