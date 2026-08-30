(function () {
    const TARGET_FILL = 1.15;
    const MAX_SCALE = 1.45;
    const MIN_SCALE = 0.5;

    function visibleBounds(image) {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.clearRect(0, 0, size, size);
        context.drawImage(image, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;
        let left = size, top = size, right = -1, bottom = -1;
        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                if (pixels[(y * size + x) * 4 + 3] < 12) continue;
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }
        }
        if (right < left || bottom < top) return null;
        return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1, size };
    }

    function normalize(image) {
        if (!image.complete || !image.naturalWidth) return;
        try {
            const box = visibleBounds(image);
            if (!box) return;
            const visibleRatio = Math.max(box.width, box.height) / box.size;
            const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, TARGET_FILL / visibleRatio));
            const centerX = (box.left + box.right) / 2;
            const centerY = (box.top + box.bottom) / 2;
            const shiftX = (box.size / 2 - centerX) * scale;
            const shiftY = (box.size / 2 - centerY) * scale - 5;
            image.style.transform = `translate(${shiftX}px, ${shiftY}px) scale(${scale})`;
        } catch (error) {
            // If canvas inspection is unavailable, keep the original image untouched.
        }
    }

    function scan() {
        document.querySelectorAll('.page-progress .achievement-medal img').forEach((image) => {
            if (image.dataset.visualNormalized === 'true') return;
            image.dataset.visualNormalized = 'true';
            if (image.complete) normalize(image);
            else image.addEventListener('load', () => normalize(image), { once: true });
        });
    }

    const observer = new MutationObserver(scan);
    function init() {
        scan();
        observer.observe(document.body, { childList: true, subtree: true });
    }
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
