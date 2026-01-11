import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
    console.log('🔐 Auth middleware called for:', req.path);
    console.log('🔐 Authorization header:', req.headers['authorization'] ? 'Present' : 'MISSING');

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        console.log('❌ No token found in request');
        return res.status(401).json({ error: 'Authentication token required' });
    }

    console.log('🔐 Token extracted, length:', token.length);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token valid for user:', decoded.userId);
        req.user = decoded;
        next();
    } catch (error) {
        console.log('❌ Token validation failed:', error.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

export default authenticateToken;
