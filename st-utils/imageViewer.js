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

function initializeImageViewer() {
    // Attach click handler to images using event delegation
    document.addEventListener('click', (event) => {
        // Find if target click is an image
        const img = event.target.closest('img');
        if (!img) return;

        // Use img.currentSrc when available, otherwise img.src
        const src = img.currentSrc || img.src || '';
        if (!src) return;

        const srcLower = src.toLowerCase();

        // Exclude data: URLs and blob: URLs
        if (srcLower.startsWith('data:') || srcLower.startsWith('blob:')) {
            return;
        }

        // Exclude SVG icons (check filename extension or SVG data-uri)
        if (srcLower.includes('.svg') || srcLower.startsWith('data:image/svg+xml')) {
            return;
        }

        // Exclude images smaller than 32x32
        const w = img.naturalWidth || img.clientWidth;
        const h = img.naturalHeight || img.clientHeight;
        if (w < 32 || h < 32) {
            return;
        }

        // Exclude images inside buttons unless they are larger than 100x100
        const buttonAncestor = img.closest('button, [role="button"]');
        if (buttonAncestor) {
            if (w <= 100 || h <= 100) {
                return;
            }
        }

        // Prevent default click actions (such as link navigation) and bubbling
        event.preventDefault();
        event.stopPropagation();

        // If there is 'medium' or 'small' in image url, replace it with 'large'
        const targetSrc = src.replace(/medium/gi, 'large').replace(/small/gi, 'large');

        // Instantiate overlay
        if (window.ImageViewerOverlay) {
            new window.ImageViewerOverlay(targetSrc);
        }
    }, true); // Use capture phase to intercept clicks reliably
}

// Get configurations from local storage
chrome.storage.local.get(['imageViewer'], (data) => {
    const config = data.imageViewer;
    if (config && config.enabled && Array.isArray(config.domains)) {
        const currentHost = window.location.hostname;
        const isMatched = config.domains.some(domain => isDomainMatched(currentHost, domain));
        
        if (isMatched) {
            initializeImageViewer();
        }
    }
});
