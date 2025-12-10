const ADMIN_USERNAMES = ['admin', 'USER1756355450115337'];

export const checkAdminStatus = (userId) => {
  console.log("Checking admin status for:", userId, "Against:", ADMIN_USERNAMES);
  return ADMIN_USERNAMES.includes(userId);
};

export const checkLGUAdminStatus = (userType) => {
  console.log("Checking LGU Admin status for userType:", userType);
  return userType === "CSWD Admin" || userType === "DRRM Admin" || userType === "Purok Leader";
};

export const isUserAdmin = (userId, userType) => {
  const isAdminUser = checkAdminStatus(userId) || checkLGUAdminStatus(userType);
  console.log("isUserAdmin result - userId:", userId, "userType:", userType, "isAdmin:", isAdminUser);
  return isAdminUser;
};

