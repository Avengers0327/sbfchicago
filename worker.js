// Serves the built site (build/dist) through the ASSETS binding in wrangler.jsonc.

/**
 * @typedef {object} Env
 * @property {{ fetch: (request: Request) => Promise<Response> }} ASSETS
 */

export default {
  /**
   * @param {Request} request
   * @param {Env} env
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
