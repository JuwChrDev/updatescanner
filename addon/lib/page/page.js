/* exported Page */

/**
 * Class representing a webpage.
 */
class Page {
  /**
   * @returns {string} String denoting the Page object type.
   */
  static get TYPE() {
    return 'Page';
  }

  /**
   * @returns {Object} Enumeration of HTML page types.
   */
  static get pageTypes() {
    return {
      OLD: 'old',
      NEW: 'new',
      CHANGES: 'changes',
    };
  }

  /**
   * @param {string} id - ID of the page.
   * @param {Object} data - Data associated with the page.
   */
  constructor(id, data) {
    this.id = id;
    this.type = Page.TYPE;
    this.name = data.name;
  }
}
