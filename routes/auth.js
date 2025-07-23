// routes/auth.js
const express = require('express')
const { OAuth2Client } = require('google-auth-library')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const router = express.Router()
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body
    
    // Google ID 토큰 검증
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    })
    
    const payload = ticket.getPayload()
    const { email, name, picture } = payload
    
    // 이메일 도메인 확인 (조직 도메인으로 제한 가능)
    const domain = email.split('@')[1]
    if (domain !== 'lottecard.co.kr') {
      return res.status(403).json({ error: '허용된 도메인의 계정이 아닙니다.' })
    }
    
    // 사용자 찾기 또는 생성
    let user = await User.findOne({ email })
    if (!user) {
      user = new User({
        email,
        name,
        picture,
        role: 'user' // 기본 권한
      })
      await user.save()
    }
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Google 로그인 오류:', error)
    res.status(500).json({ error: '인증 실패' })
  }
})

module.exports = router