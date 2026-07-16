const storageKey = 'savedUrls';
const tabsEl = document.getElementById('tabs');
const urlContainer = document.getElementById('url-container');
let activeDomain = null;

// Load saved URLs from storage
function loadUrls() {
    chrome.storage.local.get([storageKey], (data) => {
        const urls = data[storageKey] || [];
        const domainGroups = groupByDomain(urls);
        renderTabs(Object.keys(domainGroups));
        renderUrls(domainGroups);
    });
}

function groupByDomain(urls) {
    const grouped = {};
    urls.forEach((url) => {
        try {
            const domain = new URL(url).hostname;
            if (!grouped[domain]) grouped[domain] = [];
            grouped[domain].push(url);
        } catch (e) {
            console.warn(`Invalid URL skipped: ${url}`);
        }
    });
    return grouped;
}

function renderTabs(domains) {
    tabsEl.innerHTML = '';
    domains.forEach((domain) => {
        const btn = document.createElement('button');
        btn.textContent = domain;
        btn.className = 'tab-btn';
        if (domain === activeDomain || !activeDomain) {
            btn.classList.add('active');
            activeDomain = domain;
        }
        btn.onclick = () => {
            activeDomain = domain;
            loadUrls(); // re-render
        };
        tabsEl.appendChild(btn);
    });
}

function renderUrls(grouped) {
    urlContainer.innerHTML = '';
    const urls = grouped[activeDomain] || [];
    urls.forEach((urlTemplate) => {
        const div = document.createElement('div');
        div.className = 'url-form';

        let html = urlTemplate;
        const paramMatches = [...urlTemplate.matchAll(/\{(.*?)\}/g)];
        paramMatches.forEach((match) => {
            const name = match[1];
            html = html.replace(
                `{${name}}`,
                `<input type="text"
                         style="width: 40px;"
                         placeholder="${name}"
                         data-param="${name}">`
            );
        });

        const contentSpan = document.createElement('span');
        contentSpan.innerHTML = html;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.dataset.url = encodeURIComponent(urlTemplate);
        removeBtn.textContent = '❌';
        removeBtn.style.cssText = `
            font-size: 12px;
            padding: 2px 6px;
            background-color: transparent;
            color: #c00;
            border: none;
            cursor: pointer;
        `;

        removeBtn.addEventListener('click', (e) => {
            const encoded = e.target.dataset.url;
            const decodedUrl = decodeURIComponent(encoded);
            chrome.storage.local.get([storageKey], (data) => {
                const urls = (data[storageKey] || []).filter(
                    (url) => url !== decodedUrl
                );
                chrome.storage.local.set({ [storageKey]: urls }, loadUrls);
            });
        });

        div.appendChild(contentSpan);
        div.appendChild(removeBtn);
        urlContainer.appendChild(div);

        // Now add event listeners to inputs **after** adding to DOM
        const inputs = contentSpan.querySelectorAll('input[data-param]');
        inputs.forEach((input) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    let finalUrl = urlTemplate;
                    inputs.forEach((inputEl) => {
                        finalUrl = finalUrl.replace(
                            `{${inputEl.dataset.param}}`,
                            encodeURIComponent(inputEl.value.trim())
                        );
                    });
                    chrome.tabs.create({ url: finalUrl });
                }
            });
        });
    });
}


// Handle adding new URL
document.getElementById('add-url-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('new-url');
    const newUrl = input.value.trim();
    if (!newUrl.includes('{') || !newUrl.includes('}')) {
        alert('Please include at least one {param} in the URL.');
        return;
    }

    chrome.storage.local.get([storageKey], (data) => {
        const urls = data[storageKey] || [];
        if (!urls.includes(newUrl)) {
            urls.push(newUrl);
            chrome.storage.local.set({ [storageKey]: urls }, loadUrls);
        }
    });
    input.value = '';
});

// Initial load
loadUrls();


// Set modifier key label based on OS
document.addEventListener('DOMContentLoaded', () => {
    const modifierKeyEl = document.getElementById('modifier-key');
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (modifierKeyEl) {
        modifierKeyEl.textContent = isMac ? 'Cmd' : 'Ctrl';
    }
});


// --- Image Click Viewer Feature Logic ---

const imageViewerKey = 'imageViewer';
let currentTabHostname = null;

function isDomainMatched(currentHostname, configuredDomain) {
    const normalize = (host) => {
        let h = host.toLowerCase().trim();
        // Ignore protocol (if any) and www.
        if (h.includes('://')) {
            try {
                h = new URL(h).hostname;
            } catch (e) {
                h = h.replace(/^(https?:\/\/)?(www\.)?/, '');
            }
        }
        if (h.startsWith('www.')) {
            h = h.substring(4);
        }
        return h;
    };
    const normCurrent = normalize(currentHostname);
    const normConfig = normalize(configuredDomain);
    
    return normCurrent === normConfig || normCurrent.endsWith('.' + normConfig);
}

function cleanAndValidateDomain(input) {
    let domain = input.trim().toLowerCase();
    
    // If they accidentally entered a full URL or starts with //, parse the hostname
    if (domain.includes('://') || domain.startsWith('//')) {
        try {
            const urlString = domain.startsWith('//') ? 'http:' + domain : domain;
            const parsedUrl = new URL(urlString);
            domain = parsedUrl.hostname;
        } catch (e) {
            domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
            domain = domain.split('/')[0];
        }
    } else {
        domain = domain.split('/')[0].split(':')[0];
    }
    
    // Remove leading 'www.' if present
    if (domain.startsWith('www.')) {
        domain = domain.substring(4);
    }
    
    // Allow localhost or standard domain formats
    if (domain === 'localhost') return 'localhost';
    
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
    if (domainRegex.test(domain)) {
        return domain;
    }
    return null;
}

function detectCurrentTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url) {
            try {
                const url = new URL(tab.url);
                if (url.protocol.startsWith('http')) {
                    let host = url.hostname.toLowerCase();
                    if (host.startsWith('www.')) {
                        host = host.substring(4);
                    }
                    currentTabHostname = host;
                }
            } catch (e) {
                console.warn('Could not parse active tab URL:', e);
            }
        }
        if (callback) callback();
    });
}

function loadImageSettings() {
    chrome.storage.local.get([imageViewerKey], (data) => {
        const config = data[imageViewerKey] || { enabled: false, domains: [] };
        
        const toggle = document.getElementById('image-viewer-toggle');
        if (toggle) {
            toggle.checked = !!config.enabled;
        }

        // Current Site toggle UI
        const currentSiteContainer = document.getElementById('current-site-container');
        const currentSiteNameEl = document.getElementById('current-site-name');
        const currentSiteToggle = document.getElementById('current-site-toggle');
        const domainsCollapsible = document.getElementById('domains-collapsible');

        // Apply disabled status conditionally to sub-controls based on global toggle
        if (config.enabled) {
            if (currentSiteContainer) currentSiteContainer.classList.remove('disabled');
            if (domainsCollapsible) domainsCollapsible.classList.remove('disabled');
        } else {
            if (currentSiteContainer) currentSiteContainer.classList.add('disabled');
            if (domainsCollapsible) domainsCollapsible.classList.add('disabled');
        }

        if (currentTabHostname) {
            if (currentSiteContainer && currentSiteNameEl && currentSiteToggle) {
                currentSiteContainer.style.display = 'flex';
                currentSiteNameEl.textContent = currentTabHostname;
                
                const isEnabled = (config.domains || []).some(domain => 
                    isDomainMatched(currentTabHostname, domain)
                );
                currentSiteToggle.checked = isEnabled;
            }
        } else {
            if (currentSiteContainer) {
                currentSiteContainer.style.display = 'none';
            }
        }

        // Update domains count indicator
        const domainsCountEl = document.getElementById('domains-count');
        if (domainsCountEl) {
            domainsCountEl.textContent = (config.domains || []).length;
        }

        renderDomainList(config.domains || []);
    });
}

function renderDomainList(domains) {
    const listEl = document.getElementById('domain-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (domains.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.textContent = 'No allowed domains configured.';
        emptyMsg.style.cssText = 'color: #6b7280; font-size: 11px; font-style: italic; padding: 8px; text-align: center;';
        listEl.appendChild(emptyMsg);
        return;
    }

    domains.forEach((domain) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'domain-item';

        const span = document.createElement('span');
        span.textContent = domain;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '&#x2716;'; // Unicode heavy multiplication X or ❌
        removeBtn.title = 'Remove domain';
        removeBtn.style.cssText = `
            font-size: 11px;
            padding: 2px 6px;
            background-color: transparent;
            color: #c00;
            border: none;
            cursor: pointer;
        `;

        removeBtn.addEventListener('click', () => {
            removeDomain(domain);
        });

        itemDiv.appendChild(span);
        itemDiv.appendChild(removeBtn);
        listEl.appendChild(itemDiv);
    });
}

function removeDomain(domainToRemove) {
    chrome.storage.local.get([imageViewerKey], (data) => {
        const config = data[imageViewerKey] || { enabled: false, domains: [] };
        config.domains = (config.domains || []).filter(d => d !== domainToRemove);
        chrome.storage.local.set({ [imageViewerKey]: config }, loadImageSettings);
    });
}

// Attach image click viewer listeners on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('image-viewer-toggle');
    const currentSiteToggle = document.getElementById('current-site-toggle');

    if (toggle) {
        toggle.addEventListener('change', (e) => {
            chrome.storage.local.get([imageViewerKey], (data) => {
                const config = data[imageViewerKey] || { enabled: false, domains: [] };
                config.enabled = e.target.checked;
                chrome.storage.local.set({ [imageViewerKey]: config }, loadImageSettings);
            });
        });
    }

    if (currentSiteToggle) {
        currentSiteToggle.addEventListener('change', (e) => {
            if (!currentTabHostname) return;
            chrome.storage.local.get([imageViewerKey], (data) => {
                const config = data[imageViewerKey] || { enabled: false, domains: [] };
                if (!config.domains) config.domains = [];

                if (e.target.checked) {
                    if (!config.domains.includes(currentTabHostname)) {
                        config.domains.push(currentTabHostname);
                    }
                } else {
                    config.domains = config.domains.filter(domain => 
                        !isDomainMatched(currentTabHostname, domain) && domain !== currentTabHostname
                    );
                }
                chrome.storage.local.set({ [imageViewerKey]: config }, loadImageSettings);
            });
        });
    }

    detectCurrentTab(() => {
        loadImageSettings();
    });
});