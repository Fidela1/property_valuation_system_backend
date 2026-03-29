import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || "secret"

export const generateToken = (userId: String) => {
    return jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: "7d",
    })
}