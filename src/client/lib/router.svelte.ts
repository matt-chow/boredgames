import { normalizeCode } from '../../shared/protocol';

export type Route = { page: 'hub' } | { page: 'room'; code: string };

function parse(): Route {
  const m = location.pathname.match(/^\/r\/([^/]+)\/?$/);
  const code = m ? normalizeCode(m[1]) : null;
  return code ? { page: 'room', code } : { page: 'hub' };
}

class Router {
  route = $state<Route>(parse());
  constructor() {
    addEventListener('popstate', () => (this.route = parse()));
  }
  go(path: string, replace = false) {
    if (replace) history.replaceState(null, '', path);
    else history.pushState(null, '', path);
    this.route = parse();
  }
}

export const router = new Router();
