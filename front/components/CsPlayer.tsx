import React, { useEffect, useRef } from 'react';

interface CsPlayerProps {
    videoId: string;
    autoplay?: boolean;
}

declare global {
    interface Window {
        Plyr: any;
    }
}

const CsPlayer: React.FC<CsPlayerProps> = ({ videoId, autoplay = false }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;

        const initPlyr = () => {
            if (!isMounted || !containerRef.current) return;

            if (!window.Plyr) {
                console.log('Waiting for Plyr to load...');
                setTimeout(initPlyr, 200);
                return;
            }

            // Cleanup existing instance if any
            if (playerRef.current) {
                playerRef.current.destroy();
            }

            try {
                const player = new window.Plyr(containerRef.current, {
                    autoplay: autoplay,
                    invertTime: false,
                    toggleInvert: false,
                    youtube: {
                        noCookie: true,
                        rel: 0,
                        showinfo: 0,
                        iv_load_policy: 3,
                        modestbranding: 1
                    },
                    controls: [
                        'play-large',
                        'play',
                        'progress',
                        'current-time',
                        'mute',
                        'volume',
                        'captions',
                        'settings',
                        'pip',
                        'airplay',
                        'fullscreen',
                    ],
                    settings: ['quality', 'speed', 'loop']
                });

                playerRef.current = player;
            } catch (err) {
                console.error('Plyr initialization failed:', err);
            }
        };

        const timerId = setTimeout(initPlyr, 100);

        return () => {
            isMounted = false;
            clearTimeout(timerId);
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    // Ignore destruction errors
                }
            }
        };
    }, [videoId, autoplay]);

    return (
        <div className="w-full h-full bg-black rounded-sm overflow-hidden shadow-2xl">
            <div
                ref={containerRef}
                data-plyr-provider="youtube"
                data-plyr-embed-id={videoId}
            />
        </div>
    );
};

export default CsPlayer;
