/* eslint-env jquery */

import {qs, $on} from '/lib/util/view_helpers.js';
import {getItem, isFolder, status, ROOT_ID} from '/lib/redux/ducks/pages.js';

// See https://bugzilla.mozilla.org/show_bug.cgi?id=840640
import dialogPolyfill from
  '/dependencies/module/dialog-polyfill/dist/dialog-polyfill.esm.js';

/**
 * Class representing the Update Scanner Sidebar.
 */
export class SidebarView {
  /**
   * @param {string} sidebarDivSelector - Selector for the div that will contain
   * the Sidebar.
   */
  constructor(sidebarDivSelector) {
    this._newPageHandler = null;
    this._newPageFolderHandler = null;
    this._deleteHandler = null;
    this._moveHandler = null;
    this._scanItemHandler = null;
    this._settingsHandler = null;

    this._refreshing = false;

    this._sidebarDivSelector = sidebarDivSelector;
    $(this._sidebarDivSelector).jstree({
      core: {
        multiple: false,
        themes: {
          icons: false,
          dots: false,
        },
        check_callback: (operation, node, parent, position, more) =>
          this._onTreeChanged(operation, node, parent, position, more),

        // JSTree fails CSP checks if WebWorkers are enabled
        worker: false,
      },

      contextmenu: {
        select_node: false,
        items: this._getContextMenuItems(),
      },

      plugins: [
        'contextmenu',
        'dnd',
      ],
    });
  }

  /**
   * Initialise the sidebar.
   */
  init() {
    // Prevent the contextmenu from being shown - we use our own
    document.addEventListener('contextmenu', (evt) => evt.preventDefault());

    // JSTree in the sidebar doesn't handle unusual clicks very well.
    // Override incorrect click behaviour here.
    document.addEventListener('click', (event) => {
      // Open links in the main window, not the sidebar
      if (event.target.classList.contains('link')) {
        browser.tabs.create({url: event.target.href});
        event.preventDefault();
      }

      // Handle middle-clicks on tree items
      const isJstreeClick = event.target.classList.contains('jstree-anchor');
      if (isJstreeClick && event.button == 1) {
        const data = {
          selected: [event.target.parentNode.id],
          event: event,
        };
        $(this._sidebarDivSelector).trigger('changed.jstree', data);
        event.preventDefault();
      }
    });

    this._initDialog();
  }

  /**
   * Render the tree of pages from the store.
   *
   * @param {object} store - Redux store containing the pages.
   */
  render(store) {
    $(this._sidebarDivSelector).jstree(true).settings.core.data =
      this._generateTree(store, ROOT_ID).children;

    this._refreshing = true;
    $(this._sidebarDivSelector).jstree(true).refresh();

    // (almost) immediately signal that we're no longer refreshing.
    // This gives time for the select event to fire and be ignored.
    window.setTimeout(() => this._refreshing = false, 0);
  }

  /**
   * Generate a JSTree data object from the store state.
   *
   * @param {object} store - Redux store containing the pages.
   * @param {string} rootId - ID to use as the root of the tree.
   *
   * @returns {object} Object containing the JSTree data generated from the
   * store.
   */
  _generateTree(store, rootId) {
    const reducer = (accumulator, id) => {
      const item = getItem(store.getState(), id);

      const result = {
        id,
        text: item.title,
        data: {isFolder: isFolder(item)},
        li_attr: {class: this._getStateClass(item.status)},
      };
      if (isFolder(item)) {
        result.children = item.children.reduce(reducer, []);
      }
      accumulator.push(result);
      return accumulator;
    };

    return [rootId].reduce(reducer, [])[0];
  }

  /**
   * @param {string} pageStatus - Current status of the page.
   *
   * @returns {string} CSS class to use for the tree element.
   */
  _getStateClass(pageStatus) {
    switch (pageStatus) {
      case status.CHANGED:
        return 'changed';
      case status.ERROR:
        return 'error';
    }
    return '';
  }

  /**
   * @param {object} node - JSTree node.
   *
   * @returns {string} ItemId for the specified node.
   */
  _nodeToItemId(node) {
    if (node.id == '#') {
      return ROOT_ID;
    } else {
      return String(node.id);
    }
  }

  /**
   * @returns {object} Object containing sidebar context menu items.
   */
  _getContextMenuItems() {
    return (node) => {
      return {
        newPage: {
          label: 'New Page',
          action: () => this._newPageHandler(node),
        },
        newPageFolder: {
          label: 'New Folder',
          action: () => this._newPageFolderHandler(node),
        },
        delete: {
          separator_before: true,
          label: 'Delete',
          action: () => this._deleteHandler(node),
        },
        scan: {
          separator_before: true,
          label: 'Scan Now',
          action: () => this._scanItemHandler(node),
        },
        settings: {
          label: 'Settings',
          action: () => this._settingsHandler(node),
        },
      };
    };
  }


  /**
   * Called whenever a DnD operation causes the tree to change. See JSTree docs
   * for full details.
   *
   * @param {string} operation - Operation performed on the tree (move_node).
   * @param {object} node - Node that moved.
   * @param {object} parent - New parent of the node.
   * @param {integer} position - New position within the parent.
   * @param {object} more - Other data associated with the operation.
   *
   * @returns {boolean} True if the operation is allowed.
   */
  _onTreeChanged(operation, node, parent, position, more) {
    // Only the move operation is valid
    if (operation != 'move_node') {
      return false;
    }
    // Only allow DnD onto a Folder
    if (parent.id != '#' && !parent.data.isFolder) {
      return false;
    }
    // more.core is true if a drop has occurred
    if (more.core) {
      this._moveHandler(
        this._nodeToItemId(node), this._nodeToItemId(parent), position);
    }
  }

  /**
   * Registers the provided handler function to be called whenever a single
   * item in the sidebar is selected.
   *
   * @param {object} handler - Callback to use whenever the sidebar selection
   * changes.
   */
  registerSelectHandler(handler) {
    $(this._sidebarDivSelector).on('changed.jstree', (event, data) => {
      // Ignore if the event was due to a refresh or if nothing is selected.
      if (!this._refreshing && data.selected.length == 1) {
        const id = data.selected[0];
        // Pass the event that caused the change, not the change event itself
        handler(data.event, id);
      }
    });
  }

  /**
   * Registers the provided handler function to be called to create a new Page.
   *
   * @param {object} handler - Callback to use to create a new Page.
   */
  registerNewPageHandler(handler) {
    this._newPageHandler = (node) => handler(this._nodeToItemId(node));
  }

  /**
   * Registers the provided handler function to be called to create a
   * new PageFolder.
   *
   * @param {object} handler - Callback to use to create a new PageFolder.
   */
  registerNewPageFolderHandler(handler) {
    this._newPageFolderHandler = (node) => handler(this._nodeToItemId(node));
  }

  /**
   * Registers the provided handler function to be called whenever a tree
   * node is to be deleted.
   *
   * @param {object} handler - Callback to use whenever a node is to be deleted.
   */
  registerDeleteHandler(handler) {
    this._deleteHandler = (node) => handler(this._nodeToItemId(node));
  }

  /**
   * Registers the provided handler function to be called whenever a tree
   * node is to be moved due to a DnD operaion.
   *
   * @param {object} handler - Callback to use whenever a node is to be moved.
   */
  registerMoveHandler(handler) {
    this._moveHandler = (itemId, parentId, position) =>
      handler(itemId, parentId, position);
  }

  /**
   * Registers the provided handler function to be called whenever the
   * 'Scan' context menu item is selected..
   *
   * @param {object} handler - Callback to use when 'Scan' is selected.
   */
  registerScanItemHandler(handler) {
    this._scanItemHandler = (node) => handler(this._nodeToItemId(node));
  }

  /**
   * Registers the provided handler function to be called whenever the
   * 'Settings' context menu item is selected..
   *
   * @param {object} handler - Callback to use when 'Settings' is selected.
   */
  registerSettingsHandler(handler) {
    this._settingsHandler = (node) => handler(this._nodeToItemId(node));
  }

  /**
   * Initialise the dialog box.
   */
  _initDialog() {
    const dialog = qs('#dialog-confirm');
    dialogPolyfill.registerDialog(dialog);
  }

  /**
   * Show a dialog asking for confirmation before deleting an item.
   *
   * @returns {boolean} True if the user confirmed the deletion.
   */
  async confirmDelete() {
    const dialog = qs('#dialog-confirm');
    const message = qs('#dialog-confirm-message');

    message.textContent = 'Delete this item - are you sure?';
    dialog.showModal();

    return new Promise((resolve, reject) => {
      $on(dialog, 'close', () => {
        resolve(dialog.returnValue == 'delete');
      });
    });
  }
}
