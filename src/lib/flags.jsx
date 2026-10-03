
export function getFlags(user) {
    const role = user?.role?.name;

    return {
        isAdmin: role === "Admin",
        isManager: role === "Manager",

        farm: {
            create: role === "Admin" || role === "Manager",
            assignManager: role === "Admin",
            edit: role === "Admin" || role === "Manager",
        },

        users: {
            createManager: role === "Admin",
            assignManager: role === "Admin",
        }
    };
}