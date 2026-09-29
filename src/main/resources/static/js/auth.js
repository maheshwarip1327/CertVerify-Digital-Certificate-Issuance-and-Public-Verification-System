const Auth = (() => {

    const ACCOUNTS_KEY = "certverify_accounts";

    const SESSION_KEYS = {
        loggedIn: "certverify_logged_in",
        user: "certverify_user",
        role: "certverify_role"
    };

    // Only predefined account
    const ADMIN_ACCOUNT = {
        name: "System Administrator",
        username: "admin",
        password: "admin123",
        role: "ADMIN"
    };

    // -----------------------------------------
    // Get registered accounts
    // -----------------------------------------
    function getAccounts() {
        try {
            const stored = localStorage.getItem(ACCOUNTS_KEY);

            if (!stored) {
                return [];
            }

            const accounts = JSON.parse(stored);

            return Array.isArray(accounts) ? accounts : [];

        } catch (error) {
            console.error("Error reading accounts:", error);
            return [];
        }
    }

    // -----------------------------------------
    // Save accounts
    // -----------------------------------------
    function saveAccounts(accounts) {
        localStorage.setItem(
            ACCOUNTS_KEY,
            JSON.stringify(accounts)
        );
    }

    // -----------------------------------------
    // Normalize username
    // -----------------------------------------
    function normalizeUsername(username) {
        return String(username || "")
            .trim()
            .toLowerCase();
    }

    // -----------------------------------------
    // Register USER
    // -----------------------------------------
    function register(name, username, password) {

        name = String(name || "").trim();
        username = normalizeUsername(username);
        password = String(password || "");

        // Validation
        if (!name) {
            return {
                success: false,
                message: "Please enter your full name."
            };
        }

        if (!username) {
            return {
                success: false,
                message: "Please enter a username."
            };
        }

        if (username.length < 3) {
            return {
                success: false,
                message: "Username must contain at least 3 characters."
            };
        }

        if (!password) {
            return {
                success: false,
                message: "Please enter a password."
            };
        }

        if (password.length < 6) {
            return {
                success: false,
                message: "Password must contain at least 6 characters."
            };
        }

        // Prevent admin username
        if (username === "admin") {
            return {
                success: false,
                message: "This username is reserved."
            };
        }

        const accounts = getAccounts();

        // Check duplicate
        const exists = accounts.some(
            account =>
                normalizeUsername(account.username) === username
        );

        if (exists) {
            return {
                success: false,
                message: "Username already exists. Please choose another username."
            };
        }

        // Create USER account
        const newAccount = {
            id: "USR-" + Date.now(),
            name: name,
            username: username,
            password: password,
            role: "USER",
            createdAt: new Date().toISOString()
        };

        accounts.push(newAccount);

        saveAccounts(accounts);

        // IMPORTANT:
        // Verify that account was actually saved
        const verifyAccounts = getAccounts();

        const saved = verifyAccounts.some(
            account =>
                normalizeUsername(account.username) === username
        );

        if (!saved) {
            console.error("Account was not saved correctly.");

            return {
                success: false,
                message: "Account could not be saved. Please try again."
            };
        }


        return {
            success: true,
            message: "Account created successfully."
        };
    }

    // -----------------------------------------
    // Login
    // -----------------------------------------
    function login(username, password) {

        username = normalizeUsername(username);
        password = String(password || "");

        if (!username || !password) {
            return {
                success: false,
                reason: "invalid"
            };
        }

        // -------------------------------------
        // ADMIN LOGIN
        // -------------------------------------
        if (
            username === ADMIN_ACCOUNT.username &&
            password === ADMIN_ACCOUNT.password
        ) {

            createSession({
                name: ADMIN_ACCOUNT.name,
                username: ADMIN_ACCOUNT.username,
                role: ADMIN_ACCOUNT.role
            });

            return {
                success: true,
                user: ADMIN_ACCOUNT
            };
        }

        // -------------------------------------
        // REGISTERED USER LOGIN
        // -------------------------------------
        const accounts = getAccounts();


        const account = accounts.find(
            item =>
                normalizeUsername(item.username) === username
        );

        if (!account) {
            return {
                success: false,
                reason: "not_found"
            };
        }

        if (account.password !== password) {
            return {
                success: false,
                reason: "invalid"
            };
        }

        createSession(account);

        return {
            success: true,
            user: account
        };
    }

    // -----------------------------------------
    // Create session
    // -----------------------------------------
    function createSession(account) {

        localStorage.setItem(
            SESSION_KEYS.loggedIn,
            "true"
        );

        localStorage.setItem(
            SESSION_KEYS.user,
            JSON.stringify({
                id: account.id || null,
                name: account.name,
                username: account.username,
                role: account.role
            })
        );

        localStorage.setItem(
            SESSION_KEYS.role,
            account.role
        );
    }

    // -----------------------------------------
    // Logout
    // -----------------------------------------
    function logout() {

        localStorage.removeItem(
            SESSION_KEYS.loggedIn
        );

        localStorage.removeItem(
            SESSION_KEYS.user
        );

        localStorage.removeItem(
            SESSION_KEYS.role
        );

        window.location.replace("login.html");
    }

    // -----------------------------------------
    // Check login
    // -----------------------------------------
    function isLoggedIn() {

        return (
            localStorage.getItem(
                SESSION_KEYS.loggedIn
            ) === "true"
        );
    }

    // -----------------------------------------
    // Current user
    // -----------------------------------------
    function getCurrentUser() {

        try {

            const user = localStorage.getItem(
                SESSION_KEYS.user
            );

            return user ? JSON.parse(user) : null;

        } catch (error) {

            console.error(
                "Error reading current user:",
                error
            );

            return null;
        }
    }

    // -----------------------------------------
    // Current role
    // -----------------------------------------
    function getCurrentRole() {

        return localStorage.getItem(
            SESSION_KEYS.role
        );
    }

    // -----------------------------------------
    // Authentication guard
    // -----------------------------------------
    function requireAuth() {

        if (!isLoggedIn()) {
            window.location.replace("login.html");
            return false;
        }

        return true;
    }

    // -----------------------------------------
    // Admin check
    // -----------------------------------------
    function isAdmin() {
        return getCurrentRole() === "ADMIN";
    }

    // -----------------------------------------
    // User check
    // -----------------------------------------
    function isUser() {
        return getCurrentRole() === "USER";
    }

    // -----------------------------------------
    // Get all accounts
    // -----------------------------------------
    function getAllAccounts() {

        return [
            ADMIN_ACCOUNT,
            ...getAccounts()
        ];
    }

    // -----------------------------------------
    // Delete registered account
    // -----------------------------------------
    function deleteAccount(username) {

        username = normalizeUsername(username);

        const accounts = getAccounts();

        const filtered = accounts.filter(
            account =>
                normalizeUsername(account.username) !== username
        );

        saveAccounts(filtered);

        return true;
    }


    // -----------------------------------------
    // Update display name (USER accounts only; ADMIN is fixed)
    // -----------------------------------------
    function updateProfile(newName) {
        newName = String(newName || "").trim();
        if (!newName) return { success: false, message: "Full name cannot be empty." };
        const current = getCurrentUser();
        if (!current) return { success: false, message: "You are not signed in." };
        if (current.role === "ADMIN") return { success: false, message: "The administrator profile is fixed and cannot be edited." };
        const accounts = getAccounts();
        const acc = accounts.find(a => normalizeUsername(a.username) === normalizeUsername(current.username));
        if (!acc) return { success: false, message: "Account not found." };
        acc.name = newName;
        saveAccounts(accounts);
        createSession(acc);
        return { success: true, message: "Profile updated successfully." };
    }

    // -----------------------------------------
    // Change password (USER accounts only)
    // -----------------------------------------
    function changePassword(currentPassword, newPassword, confirmPassword) {
        const current = getCurrentUser();
        if (!current) return { success: false, message: "You are not signed in." };
        if (current.role === "ADMIN") return { success: false, message: "The administrator password is fixed and cannot be changed here." };
        const accounts = getAccounts();
        const acc = accounts.find(a => normalizeUsername(a.username) === normalizeUsername(current.username));
        if (!acc) return { success: false, message: "Account not found." };
        if (acc.password !== currentPassword) return { success: false, message: "Current password is incorrect." };
        if (!newPassword || newPassword.length < 6) return { success: false, message: "New password must contain at least 6 characters." };
        if (newPassword !== confirmPassword) return { success: false, message: "New passwords do not match." };
        if (newPassword === currentPassword) return { success: false, message: "New password must be different from the current one." };
        acc.password = newPassword;
        saveAccounts(accounts);
        return { success: true, message: "Password changed successfully." };
    }

    // -----------------------------------------
    // Remember me (stores username only, never the password)
    // -----------------------------------------
    const REMEMBER_KEY = "certverify_remember";
    function getRememberedUsername() { return localStorage.getItem(REMEMBER_KEY) || ""; }
    function setRemembered(username, on) {
        if (on) localStorage.setItem(REMEMBER_KEY, username);
        else localStorage.removeItem(REMEMBER_KEY);
    }

    // -----------------------------------------
    // Early guard: protected pages redirect before any page script runs
    // -----------------------------------------
    const PROTECTED_PAGES = ["dashboard","courses","participants","certificates","issue-certificate","statistics","profile"];
    (function earlyGuard() {
        const page = (location.pathname.split("/").pop() || "").replace(".html", "");
        if (PROTECTED_PAGES.includes(page) && !isLoggedIn()) {
            location.replace("login.html");
        }
    })();

    // -----------------------------------------
    // PUBLIC API
    // -----------------------------------------
    return {
        register,
        login,
        logout,
        isLoggedIn,
        getCurrentUser,
        getCurrentRole,
        requireAuth,
        isAdmin,
        isUser,
        getAllAccounts,
        deleteAccount,
        getAccounts,
        updateProfile,
        changePassword,
        getRememberedUsername,
        setRemembered
    };

})();