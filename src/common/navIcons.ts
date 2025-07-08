export function getNavIcons({
  styles,
}: {
  styles: {
    navIcon: string;
  };
}): {
  prevIcon: SVGElement;
  nextIcon: SVGElement;
} {
  const prevIcon = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  );
  prevIcon.setAttribute('slot', 'previous');
  prevIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  prevIcon.setAttribute('viewBox', '0 0 24 24');
  prevIcon.setAttribute('fill', 'none');
  prevIcon.setAttribute('stroke', 'currentColor');
  prevIcon.setAttribute('stroke-width', '2');
  prevIcon.setAttribute('stroke-linecap', 'round');
  prevIcon.setAttribute('stroke-linejoin', 'round');
  prevIcon.setAttribute('aria-label', 'Previous month');
  prevIcon.setAttribute('class', styles.navIcon);

  const prevTitle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'title',
  );
  prevTitle.textContent = 'Previous month';
  prevIcon.appendChild(prevTitle);

  const prevPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  );
  prevPath.setAttribute('d', 'm15 18-6-6 6-6');
  prevIcon.appendChild(prevPath);

  const nextIcon = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  );
  nextIcon.setAttribute('slot', 'next');
  nextIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  nextIcon.setAttribute('viewBox', '0 0 24 24');
  nextIcon.setAttribute('fill', 'none');
  nextIcon.setAttribute('stroke', 'currentColor');
  nextIcon.setAttribute('stroke-width', '2');
  nextIcon.setAttribute('stroke-linecap', 'round');
  nextIcon.setAttribute('stroke-linejoin', 'round');
  nextIcon.setAttribute('aria-label', 'Next month');
  nextIcon.setAttribute('class', styles.navIcon);

  const nextTitle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'title',
  );
  nextTitle.textContent = 'Next month';
  nextIcon.appendChild(nextTitle);

  const nextPath = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'path',
  );
  nextPath.setAttribute('d', 'm9 18 6-6-6-6');
  nextIcon.appendChild(nextPath);

  return {
    prevIcon,
    nextIcon,
  };
}
