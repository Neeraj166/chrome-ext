class ImageViewerOverlay {
    constructor(imageSrc) {
        // Prevent duplicate overlays
        if (document.getElementById('st-image-viewer-overlay')) {
            return;
        }
        this.src = imageSrc;
        this.overlay = null;
        this.imgElement = null;
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundClick = this.handleClick.bind(this);
        this.create();
    }

    create() {
        // Create container
        this.overlay = document.createElement('div');
        this.overlay.id = 'st-image-viewer-overlay';
        
        // Style container: dark semi-transparent background, fullscreen, centered
        Object.assign(this.overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: '999999999999', // extremely high z-index to overlay everything
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'zoom-out',
            opacity: '0',
            transition: 'opacity 0.2s ease-in-out',
            userSelect: 'none'
        });

        // Create image element
        this.imgElement = document.createElement('img');
        this.imgElement.src = this.src;
        
        // Style image: centered, max width 95vw, max height 95vh
        Object.assign(this.imgElement.style, {
            maxWidth: '95vw',
            maxHeight: '95vh',
            objectFit: 'contain',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            borderRadius: '6px',
            cursor: 'default',
            opacity: '0',
            transform: 'scale(0.95)',
            transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out'
        });

        this.overlay.appendChild(this.imgElement);
        document.body.appendChild(this.overlay);

        // Add event listeners
        this.overlay.addEventListener('click', this.boundClick);
        document.addEventListener('keydown', this.boundKeyDown);

        // Request animation frame to run the transitions smoothly
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (this.overlay && this.imgElement) {
                    this.overlay.style.opacity = '1';
                    this.imgElement.style.opacity = '1';
                    this.imgElement.style.transform = 'scale(1)';
                }
            });
        });
    }

    handleClick(event) {
        // Close on click outside the image
        if (event.target !== this.imgElement) {
            this.close();
        }
    }

    handleKeyDown(event) {
        // Close on Escape key
        if (event.key === 'Escape') {
            this.close();
        }
    }

    close() {
        if (!this.overlay) return;

        // Transition out
        this.overlay.style.opacity = '0';
        this.imgElement.style.transform = 'scale(0.95)';
        this.imgElement.style.opacity = '0';

        // Remove element from DOM after transition completes
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            this.cleanup();
        }, 200);
    }

    cleanup() {
        // Remove event listeners
        if (this.overlay) {
            this.overlay.removeEventListener('click', this.boundClick);
        }
        document.removeEventListener('keydown', this.boundKeyDown);
        this.overlay = null;
        this.imgElement = null;
    }
}

// Make it globally available on the content script scope
window.ImageViewerOverlay = ImageViewerOverlay;
