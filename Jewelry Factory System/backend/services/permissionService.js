const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PERMISSIONS_FILE = path.join(DATA_DIR, 'user_menu_permissions.json');

// Default menu IDs for standard roles if not customized
const DEFAULT_ROLE_MENUS = {
  admin: ['*'],
  sales: [
    'sales-dashboard',
    'dash-cust',
    'dash-matrix',
    'dash-top-orders',
    'dash-top-orders-analytics',
    'order-tracker',
    'po-tracker',
  ],
};

class PermissionService {
  constructor() {
    this.permissions = {};
    this.loadPermissionsFromDisk();
  }

  ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err) {
      console.error('[PermissionService] Failed to create data dir:', err.message);
    }
  }

  loadPermissionsFromDisk() {
    try {
      this.ensureDataDir();
      if (fs.existsSync(PERMISSIONS_FILE)) {
        const raw = fs.readFileSync(PERMISSIONS_FILE, 'utf8');
        this.permissions = JSON.parse(raw) || {};
      } else {
        // Initialize with default template
        this.permissions = {
          ADMIN: ['*'],
          SALES: [...DEFAULT_ROLE_MENUS.sales],
        };
        this.savePermissionsToDisk();
      }
    } catch (e) {
      console.warn('[PermissionService] Using fallback memory permissions:', e.message);
      this.permissions = {
        ADMIN: ['*'],
        SALES: [...DEFAULT_ROLE_MENUS.sales],
      };
    }
  }

  savePermissionsToDisk() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(this.permissions, null, 2), 'utf8');
    } catch (e) {
      console.error('[PermissionService] Failed to save permissions:', e.message);
    }
  }

  // Only accounts listed in the permissions file have menus. An unlisted account
  // (e.g. any other PCCUser login) gets no menus — web access is granted per user.
  // Callers may still pass a role; it no longer supplies default menus.
  getUserPermissions(username) {
    const key = (username || '').toUpperCase();
    return Array.isArray(this.permissions[key]) ? this.permissions[key] : [];
  }

  /** True when the account is listed with at least one menu (gate for login and every API call). */
  hasWebAccess(username) {
    return this.getUserPermissions(username).length > 0;
  }

  setUserPermissions(username, menuIds) {
    const key = (username || '').toUpperCase();
    if (!Array.isArray(menuIds)) {
      throw new Error('menuIds must be an array of menu item/group IDs');
    }
    this.permissions[key] = menuIds;
    this.savePermissionsToDisk();
    return this.permissions[key];
  }

  getAllPermissions() {
    return this.permissions;
  }
}

const permissionService = new PermissionService();
module.exports = permissionService;
