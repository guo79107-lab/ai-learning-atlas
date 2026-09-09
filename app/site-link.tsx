import type { ComponentPropsWithoutRef } from 'react';
import { sitePath } from './site-config';

type SiteLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & {
  href: string;
};

// Each route is exported as a complete HTML page. Use native navigation so an
// optional client router cannot intercept clicks and leave the reader stranded.
export default function SiteLink({ href, children, ...props }: SiteLinkProps) {
  return (
    <a {...props} href={sitePath(href)}>
      {children}
    </a>
  );
}
