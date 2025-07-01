module.exports = (req, res, next) => {
    console.log('🟡 Incoming Request Info');

    console.log(`➡️ ${req.method} ${req.originalUrl}`);

    // 🔐 Check if JWT is present in cookies
    const tokenFromCookie = req.cookies?.token;
    if (tokenFromCookie) {
        console.log('🍪 JWT Cookie: Present');
        console.log('🍪 JWT Cookie Value:', tokenFromCookie);
    } else {
        console.log('🍪 JWT Cookie: Not provided');
    }

    if (req.headers.authorization) {
        console.log('📄 Auth Header: Provided (legacy or fallback)');
    }

    // 📦 Request body
    if (Object.keys(req.body || {}).length > 0) {
        console.log('📦 Body:', req.body);
    } else {
        console.log('📦 Body: Empty or undefined');
    }

    // 📌 Route params
    if (Object.keys(req.params || {}).length > 0) {
        console.log('📌 Params:', req.params);
    } else {
        console.log('📌 Params: None');
    }

    // 🔍 Query parameters
    if (Object.keys(req.query || {}).length > 0) {
        console.log('🔍 Query:', req.query);
    }

    console.log('-----------------------------');

    next();
};
