import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

const token = jwt.sign(
  { 
    user_id: 'test-user',
    username: 'test-user',
    email: 'test@example.com'
  },
  JWT_SECRET,
  { expiresIn: '24h' }
)

console.log('Generated Token:')
console.log(token)
