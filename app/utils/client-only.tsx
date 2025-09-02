import React, { useState, useEffect } from 'react';

/**
 * Utility component to prevent hydration mismatches
 * by only rendering children on the client side
 */
interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ClientOnly: React.FC<ClientOnlyProps> = ({ 
  children, 
  fallback = null 
}) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Hook to check if component is mounted on client
 */
export const useIsClient = (): boolean => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

/**
 * Hook to safely access window object
 */
export const useWindow = (): Window | undefined => {
  const [windowObj, setWindowObj] = useState<Window | undefined>(undefined);

  useEffect(() => {
    setWindowObj(window);
  }, []);

  return windowObj;
};

/**
 * Higher-order component to wrap components that should only render on client
 */
export function withClientOnly<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function ClientOnlyComponent(props: P) {
    return (
      <ClientOnly fallback={fallback}>
        <Component {...props} />
      </ClientOnly>
    );
  };
}