// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GalleryView, type GalleryTile } from '@/components/colleges/gallery-view';

const photo = (n: number): GalleryTile => ({
    kind: 'image',
    url: `/uploads/campus-${n}.jpg`,
    alt: `Campus photo ${n}`,
    caption: `Library wing ${n}`,
});

const video: GalleryTile = {
    kind: 'video',
    url: 'https://youtu.be/dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    videoProvider: 'youtube',
    caption: 'Campus walkthrough',
};

function renderGallery(items: GalleryTile[], tourEmbedUrl?: string) {
    return render(
        <GalleryView items={items} collegeName="Silverpeak Institute" tourEmbedUrl={tourEmbedUrl} />,
    );
}

describe('GalleryView — grid', () => {
    it('renders one tile per item', () => {
        renderGallery([photo(1), photo(2), video]);

        // Scoped to the tile list so the filter buttons are not counted.
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('describes each tile for screen readers with its position', () => {
        renderGallery([photo(1), photo(2)]);

        expect(screen.getByText('Open photo 1 of 2 full screen')).toBeInTheDocument();
        expect(screen.getByText('Open photo 2 of 2 full screen')).toBeInTheDocument();
    });

    it('announces a video tile as playable rather than viewable', () => {
        renderGallery([video]);

        expect(screen.getByText('Play video 1 of 1')).toBeInTheDocument();
    });

    it('shows captions under the tiles', () => {
        renderGallery([photo(1)]);

        expect(screen.getByText('Library wing 1')).toBeInTheDocument();
    });

    it('features the campus tour above the grid when one is set', () => {
        renderGallery([photo(1)], 'https://www.youtube-nocookie.com/embed/abc');

        const tour = screen.getByTitle('Silverpeak Institute campus tour');
        expect(tour).toBeInTheDocument();
        expect(tour).toHaveAttribute('loading', 'lazy');
    });

    /**
     * Mounting an iframe per video would pull in a provider player for content
     * most visitors never play, so tiles must stay images until opened.
     */
    it('does not mount a video player until a tile is opened', () => {
        renderGallery([video]);

        expect(document.querySelectorAll('iframe')).toHaveLength(0);
    });
});

describe('GalleryView — filters', () => {
    it('offers filters only when both photos and videos exist', () => {
        renderGallery([photo(1), photo(2)]);
        expect(screen.queryByRole('group', { name: /filter gallery/i })).not.toBeInTheDocument();
    });

    it('shows filters with counts for a mixed gallery', () => {
        renderGallery([photo(1), photo(2), video]);

        const group = screen.getByRole('group', { name: /filter gallery/i });
        expect(within(group).getByRole('button', { name: /All 3/ })).toBeInTheDocument();
        expect(within(group).getByRole('button', { name: /Photos 2/ })).toBeInTheDocument();
        expect(within(group).getByRole('button', { name: /Videos 1/ })).toBeInTheDocument();
    });

    it('narrows the grid to videos when Videos is chosen', async () => {
        const user = userEvent.setup();
        renderGallery([photo(1), photo(2), video]);

        await user.click(screen.getByRole('button', { name: /Videos 1/ }));

        expect(screen.getByText('Play video 1 of 1')).toBeInTheDocument();
        expect(screen.queryByText(/Open photo/)).not.toBeInTheDocument();
    });

    it('marks the active filter as pressed', async () => {
        const user = userEvent.setup();
        renderGallery([photo(1), video]);

        await user.click(screen.getByRole('button', { name: /Photos 1/ }));

        expect(screen.getByRole('button', { name: /Photos 1/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });
});

describe('GalleryView — lightbox', () => {
    it('opens a modal dialog when a photo is clicked', async () => {
        const user = userEvent.setup();
        renderGallery([photo(1), photo(2)]);

        await user.click(screen.getByText('Open photo 1 of 2 full screen'));

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(within(dialog).getByText('1 of 2')).toBeInTheDocument();
    });

    it('advances with the right arrow key and wraps at the end', async () => {
        const user = userEvent.setup();
        renderGallery([photo(1), photo(2)]);

        await user.click(screen.getByText('Open photo 1 of 2 full screen'));

        await user.keyboard('{ArrowRight}');
        expect(screen.getByText('2 of 2')).toBeInTheDocument();

        // Wrapping means arrow keys never dead-end.
        await user.keyboard('{ArrowRight}');
        expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });

    it('goes back with the left arrow key', async () => {
        const user = userEvent.setup();
        renderGallery([photo(1), photo(2)]);

        await user.click(screen.getByText('Open photo 1 of 2 full screen'));
        await user.keyboard('{ArrowLeft}');

        expect(screen.getByText('2 of 2')).toBeInTheDocument();
    });

    it('closes on Escape', async () => {
        const user = userEvent.setup();
        renderGallery([photo(1)]);

        await user.click(screen.getByText('Open photo 1 of 1 full screen'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('hides the prev/next controls for a single item', async () => {
        const user = userEvent.setup();
        renderGallery([photo(1)]);

        await user.click(screen.getByText('Open photo 1 of 1 full screen'));

        expect(screen.queryByRole('button', { name: /next item/i })).not.toBeInTheDocument();
    });

    it('embeds the player only once a video is opened', async () => {
        const user = userEvent.setup();
        renderGallery([video]);

        await user.click(screen.getByText('Play video 1 of 1'));

        const iframe = within(screen.getByRole('dialog')).getByTitle('Campus walkthrough');
        expect(iframe).toHaveAttribute(
            'src',
            'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
        );
    });

    it('uses a native player for a direct video file', async () => {
        const user = userEvent.setup();
        renderGallery([
            {
                kind: 'video',
                url: 'https://cdn.example.org/tour.mp4',
                embedUrl: 'https://cdn.example.org/tour.mp4',
                videoProvider: 'file',
                caption: 'Tour',
            },
        ]);

        await user.click(screen.getByText('Play video 1 of 1'));

        expect(screen.getByRole('dialog').querySelector('video')).toHaveAttribute(
            'src',
            'https://cdn.example.org/tour.mp4',
        );
    });

    it('locks background scrolling while open', async () => {
        const user = userEvent.setup();
        renderGallery([photo(1)]);

        await user.click(screen.getByText('Open photo 1 of 1 full screen'));
        expect(document.body.style.overflow).toBe('hidden');

        await user.keyboard('{Escape}');
        expect(document.body.style.overflow).not.toBe('hidden');
    });
});
