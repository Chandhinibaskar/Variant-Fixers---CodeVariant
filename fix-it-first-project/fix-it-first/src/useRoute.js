import { useEffect, useState, useCallback } from 'react';

const parse = () => {
  const h = (window.location.hash || '').replace(/^#\/?/, '');
  const [name = '', arg] = h.split('/');
  return { name: name || 'home', arg };
};

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((path) => { window.location.hash = '/' + path; }, []);
  return [route, go];
}
