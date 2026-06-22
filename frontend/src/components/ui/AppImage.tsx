'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';

interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    fallbackSrc?: string;
}

const AppImage = memo(function AppImage({
    src,
    alt,
    width,
    height,
    className = '',
    fallbackSrc = '/assets/images/no_image.png',
    ...props
}: AppImageProps) {
    const [imageSrc, setImageSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleError = useCallback(() => {
        if (!hasError && imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
            setHasError(true);
        }
        setIsLoading(false);
    }, [hasError, imageSrc, fallbackSrc]);

    const handleLoad = useCallback(() => {
        setIsLoading(false);
        setHasError(false);
    }, []);

    const imageClassName = useMemo(() => {
        const classes = [className];
        if (isLoading) classes.push('bg-gray-200');
        return classes.filter(Boolean).join(' ');
    }, [className, isLoading]);

    return (
        <img
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            className={imageClassName}
            onError={handleError}
            onLoad={handleLoad}
            {...props}
        />
    );
});

AppImage.displayName = 'AppImage';

export default AppImage;