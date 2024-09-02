import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Generate Access Token
export const generateAccessToken = (userId: string) => {
    return jwt.sign({ userId }, process.env.ACCESS_SECRET, { expiresIn: '24h' });
}

// Generate Refresh Token
export const generateRefreshToken = (userId: string) => {
    return jwt.sign({ userId }, process.env.REFRESH_SECRET, { expiresIn: '7d' });
}

// Verify Token
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            status: false,
            message: 'Unauthorized'
        });
    }

    jwt.verify(token, process.env.ACCESS_SECRET, (error, decoded) => {

        if (error) {
            return res.status(403).json({
                status: false,
                message: 'Forbidden'
            });
        }

        req['userId'] = (decoded as { userId: string }).userId;
        next();
    });
}
